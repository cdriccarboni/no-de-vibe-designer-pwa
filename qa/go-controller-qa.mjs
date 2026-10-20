// QA du contrôleur GO unique : standby, fin de conduite, double-GO multi-sources, requêtes rejouées,
// pré-attente, auto-continue / auto-follow, PANIC qui annule tout, standby déplacé = pas d'enchaînement surprise.
import { createGoController } from "../shared/stage/go-controller.js";
let fail = 0; const ok = (c, m, d = "") => { console.log(`${c ? "✓" : "✗"} ${m}${d ? " · " + d : ""}`); if (!c) fail = 1; };

function harness(timeline, opts = {}) {
  let clock = 0; const timers = new Map(); let seq = 0;
  const project = { timeline: timeline.map((c, i) => ({ kind: "cue", number: String(i + 1), duration: 0, ...c })), meta: {} };
  const fired = [];
  const ctl = createGoController({
    getProject: () => project, fire: (cue, { source }) => fired.push(`${cue.id}@${clock}:${source}`),
    now: () => clock, setTimer: (fn, ms) => { const id = ++seq; timers.set(id, { at: clock + ms, fn }); return id; }, clearTimer: id => timers.delete(id), ...opts
  });
  const advance = ms => { const end = clock + ms; for (;;) { const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0]; if (!due) break; timers.delete(due[0]); clock = due[1].at; due[1].fn(); } clock = end; };
  return { ctl, project, fired, advance, timers };
}

{ // standby simple + fin de conduite
  const h = harness([{ id: "a", start: 0 }, { id: "b", start: 5 }, { id: "c", start: 9 }]);
  ok(h.ctl.standingBy().id === "a", "standby initial = première cue");
  h.ctl.go(); h.advance(1000); h.ctl.go(); h.advance(1000); h.ctl.go(); h.advance(1000);
  ok(h.fired.map(f => f.split("@")[0]).join() === "a,b,c", "GO ×3 : a, b, c dans l'ordre");
  const r = h.ctl.go();
  ok(!r.ok && /fin de conduite/.test(r.reason) && h.fired.length === 3, "GO après la dernière : refusé, pas de retour à la première", r.reason);
  ok(h.ctl.standingBy() === null, "standby vide en fin de conduite");
}
{ // double GO, toutes sources
  const h = harness([{ id: "a", start: 0 }, { id: "b", start: 5 }, { id: "c", start: 9 }]);
  h.ctl.go({ source: "ui" });
  const r1 = h.ctl.go({ source: "osc" }); h.advance(100); const r2 = h.ctl.go({ source: "companion" });
  ok(!r1.ok && !r2.ok && h.fired.length === 1, "double GO bloqué quelle que soit la source (ui→osc→companion)");
  h.advance(400); ok(h.ctl.go({ source: "osc" }).ok, "GO accepté après le délai minimal");
  const j = h.ctl.journal();
  ok(j.filter(e => e.kind === "go" && !e.accepted).length === 2 && j.every(e => typeof e.t === "number" && e.source), "journal : refus horodatés avec source et raison");
}
{ // requêtes rejouées
  const h = harness([{ id: "a", start: 0 }, { id: "b", start: 5 }]);
  ok(h.ctl.go({ requestId: "r1" }).ok, "requête r1 acceptée");
  h.advance(2000);
  ok(!h.ctl.go({ requestId: "r1" }).ok && h.fired.length === 1, "même requestId rejoué (reconnexion) : ignoré");
}
{ // pré-attente + auto-continue + auto-follow
  const h = harness([
    { id: "a", start: 0, preWait: 1, continueMode: "auto-continue", postWait: 2 },
    { id: "b", start: 5, continueMode: "auto-follow", duration: 3 },
    { id: "c", start: 9 },
    { id: "d", start: 12 }
  ]);
  h.ctl.go();
  ok(h.fired.length === 0 && h.ctl.pending() === 1, "pré-attente : rien avant 1 s");
  h.advance(1000); ok(h.fired[0] === "a@1000:ui", "a part à 1 s", h.fired[0]);
  h.advance(2000); ok(h.fired[1] === "b@3000:auto", "auto-continue : b 2 s après a", h.fired[1]);
  h.advance(3000); ok(h.fired[2] === "c@6000:auto", "auto-follow : c à la fin de b (3 s)", h.fired[2]);
  h.advance(5000); ok(h.fired.length === 3 && h.ctl.standingBy().id === "d", "c en manuel : d attend un GO");
}
{ // PANIC annule pré-attente et enchaînements
  const h = harness([{ id: "a", start: 0, preWait: 2 }, { id: "b", start: 5 }]);
  h.ctl.go(); const p = h.ctl.panic(); h.advance(5000);
  ok(p.cancelled === 1 && h.fired.length === 0, "PANIC annule la pré-attente en cours");
}
{ // standby déplacé pendant un enchaînement
  const h = harness([{ id: "a", start: 0, continueMode: "auto-continue", postWait: 2 }, { id: "b", start: 5 }, { id: "c", start: 9 }]);
  h.ctl.go(); h.ctl.standby(+1); h.advance(3000);
  ok(h.fired.length === 1 && h.ctl.journal().some(e => e.kind === "skip"), "standby déplacé : l'enchaînement programmé ne déclenche rien");
}
{ // standby ne déclenche rien ; bornes
  const h = harness([{ id: "a", start: 0 }, { id: "b", start: 5 }]);
  h.ctl.standby(+1); h.ctl.standby(+1); ok(h.ctl.standingBy().id === "b" && h.fired.length === 0, "Cue ▶ déplace le standby sans déclencher, borné à la dernière");
  h.ctl.standby(-5); ok(h.ctl.standingBy().id === "a", "◀ Cue borné à la première");
  ok(h.ctl.setStandby("b").ok && h.ctl.standingBy().id === "b", "choisir la cue en attente");
  ok(!h.ctl.setStandby("zz").ok, "cue inconnue refusée");
}
{ // erreur d'exécution journalisée, réglages bornés
  const project = { timeline: [{ kind: "cue", id: "a", start: 0 }], meta: {} };
  const ctl = createGoController({ getProject: () => project, fire: () => { throw new Error("sortie absente"); } });
  ctl.go(); ok(ctl.journal().some(e => e.kind === "fire" && !e.accepted && e.reason === "sortie absente"), "erreur d'exécution journalisée");
  ok(ctl.configure({ minIntervalMs: 99999 }).minIntervalMs === 350 && ctl.configure({ minIntervalMs: 1000 }).minIntervalMs === 1000, "délai double-GO configurable et borné (0–5000 ms)");
}
{ // performance : 10 000 GO refusés/acceptés
  const tl = Array.from({ length: 2000 }, (_, i) => ({ id: "c" + i, start: i }));
  const h = harness(tl, { minIntervalMs: 0 });
  const t0 = performance.now(); for (let i = 0; i < 2000; i++) h.ctl.go(); const ms = performance.now() - t0;
  ok(h.fired.length === 2000, "2000 GO successifs", `${ms.toFixed(0)} ms (${(ms / 2000).toFixed(3)} ms/GO)`);
}
process.exit(fail);
