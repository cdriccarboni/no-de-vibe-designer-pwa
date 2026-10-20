// No[co]de · contrôleur GO unique de la conduite.
// Toutes les sources (bouton, clavier, OSC, Companion/téléphone, MIDI) passent par ici :
//  - modèle « standby » (playhead de conduite) : GO déclenche la cue en attente puis avance ; fin de conduite = refus, jamais de retour à la première cue ;
//  - protection double-GO commune à toutes les sources (délai minimal entre deux GO acceptés) ;
//  - requêtes rejouées (même requestId, ex. renvoi réseau) ignorées ;
//  - pré-attente, enchaînements auto-continue / auto-follow programmés et annulés par PANIC/STOP ;
//  - journal horodaté de chaque commande (acceptée ou refusée, avec la raison).
// Références : QLab (délai minimal entre GO en secondes, appliqué au GO de l'espace de travail ; pre/post-wait,
// auto-continue, auto-follow) — documentation/forum officiels ; ici la protection couvre aussi OSC et Companion.
import { listCues, setCuePlayhead, advanceCuePlayhead, CUE_CONTINUE } from "./cues.js";

export const GO_DEFAULTS = Object.freeze({ minIntervalMs: 350, journalLimit: 300, dedupeWindowMs: 10_000 });

export function createGoController({
  getProject,
  fire,                       // (cue, { source }) → exécution réelle (inchangée)
  onPanic = () => {},
  onChange = () => {},
  now = () => Date.now(),
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = id => clearTimeout(id),
  minIntervalMs = GO_DEFAULTS.minIntervalMs,
  journalLimit = GO_DEFAULTS.journalLimit
} = {}) {
  let lastGoAt = -Infinity;
  const journal = [];
  const seen = new Map(); // requestId → t
  const timers = new Set();
  let settings = { minIntervalMs };

  function log(entry) {
    const item = { t: now(), ...entry };
    journal.push(item);
    if (journal.length > journalLimit) journal.splice(0, journal.length - journalLimit);
    onChange(item);
    return item;
  }

  function schedule(fn, ms) {
    const id = setTimer(() => { timers.delete(id); fn(); }, Math.max(0, ms));
    timers.add(id);
    return id;
  }

  function cancelAll() {
    for (const id of timers) clearTimer(id);
    const n = timers.size;
    timers.clear();
    return n;
  }

  const cueLabel = cue => cue ? `${cue.number ? cue.number + " · " : ""}${cue.label || cue.id}` : "—";

  function execute(cue, source, chained = false) {
    const project = getProject();
    const pre = Number(cue.preWait) || 0;
    const run = () => {
      try {
        fire(cue, { source });
        log({ kind: "fire", source, cueId: cue.id, label: cueLabel(cue), accepted: true, chained });
      } catch (error) {
        log({ kind: "fire", source, cueId: cue.id, label: cueLabel(cue), accepted: false, reason: error?.message || String(error) });
        return;
      }
      // Enchaînement : la suivante part après la post-attente (auto-continue) ou à la fin de l'action (auto-follow).
      const cues = listCues(getProject());
      const next = cues[cues.findIndex(c => c.id === cue.id) + 1];
      if (!next) return;
      const mode = cue.continueMode;
      if (mode === CUE_CONTINUE.AUTO_CONTINUE || mode === CUE_CONTINUE.AUTO_FOLLOW) {
        const wait = mode === CUE_CONTINUE.AUTO_CONTINUE ? Number(cue.postWait) || 0 : Number(cue.duration) || 0;
        log({ kind: "schedule", source: "auto", cueId: next.id, label: cueLabel(next), accepted: true, inMs: Math.round(wait * 1000), mode });
        schedule(() => {
          const p = getProject();
          // N'enchaîne que si la conduite n'a pas été déplacée entre-temps (sinon : pas de déclenchement surprise).
          if (standingByCueOrNull(p)?.id !== next.id) { log({ kind: "skip", source: "auto", cueId: next.id, label: cueLabel(next), accepted: false, reason: "standby déplacé" }); return; }
          advanceCuePlayhead(p, next.id);
          execute(next, "auto", true);
        }, wait * 1000);
      }
    };
    if (pre > 0) {
      log({ kind: "prewait", source, cueId: cue.id, label: cueLabel(cue), accepted: true, inMs: Math.round(pre * 1000) });
      schedule(run, pre * 1000);
    } else run();
    return project;
  }

  function gate(source, requestId) {
    const t = now();
    if (requestId) {
      for (const [id, at] of seen) if (t - at > GO_DEFAULTS.dedupeWindowMs) seen.delete(id);
      if (seen.has(requestId)) return "requête déjà traitée";
      seen.set(requestId, t);
    }
    if (t - lastGoAt < settings.minIntervalMs) return `double GO bloqué (< ${settings.minIntervalMs} ms)`;
    return null;
  }

  return {
    go({ source = "ui", requestId = null } = {}) {
      const project = getProject();
      const cue = standingByCueOrNull(project);
      const refusal = gate(source, requestId) || (cue ? null : "aucune cue en attente (fin de conduite)");
      if (refusal) { log({ kind: "go", source, cueId: cue?.id || null, label: cueLabel(cue), accepted: false, reason: refusal }); return { ok: false, reason: refusal, cue: null }; }
      lastGoAt = now();
      const cues = listCues(project);
      const isLast = cues[cues.length - 1]?.id === cue.id;
      advanceCuePlayhead(project, cue.id);
      if (isLast) project.meta.cuePlayheadId = null; // fin : pas de retour silencieux à la première cue
      log({ kind: "go", source, cueId: cue.id, label: cueLabel(cue), accepted: true });
      execute(cue, source);
      return { ok: true, cue, standby: standingByCueOrNull(project) };
    },
    // Déplacer le standby ne déclenche jamais rien (comme les commandes « standby » des logiciels de régie).
    standby(delta, { source = "ui" } = {}) {
      const project = getProject();
      const cues = listCues(project);
      if (!cues.length) return { ok: false, reason: "aucune cue" };
      const cur = standingByCueOrNull(project);
      const idx = cur ? cues.findIndex(c => c.id === cur.id) : cues.length; // fin de conduite = après la dernière
      const j = Math.min(cues.length - 1, Math.max(0, idx + delta));
      setCuePlayhead(project, cues[j].id);
      log({ kind: "standby", source, cueId: cues[j].id, label: cueLabel(cues[j]), accepted: true });
      return { ok: true, cue: cues[j] };
    },
    setStandby(cueId, { source = "ui" } = {}) {
      const project = getProject();
      const cue = listCues(project).find(c => c.id === cueId);
      if (!cue) return { ok: false, reason: "cue inconnue" };
      setCuePlayhead(project, cue.id);
      log({ kind: "standby", source, cueId: cue.id, label: cueLabel(cue), accepted: true });
      return { ok: true, cue };
    },
    // PANIC et STOP ne sont jamais bloqués : ils annulent toute pré-attente et tout enchaînement programmé.
    panic({ source = "ui" } = {}) {
      const cancelled = cancelAll();
      log({ kind: "panic", source, accepted: true, cancelled });
      onPanic({ source });
      return { ok: true, cancelled };
    },
    stopChains({ source = "ui" } = {}) {
      const cancelled = cancelAll();
      if (cancelled) log({ kind: "stop", source, accepted: true, cancelled });
      return { ok: true, cancelled };
    },
    standingBy() { return standingByCueOrNull(getProject()); },
    pending() { return timers.size; },
    journal() { return journal.slice(); },
    configure(next = {}) {
      if (Number.isFinite(next.minIntervalMs) && next.minIntervalMs >= 0 && next.minIntervalMs <= 5000) settings = { ...settings, minIntervalMs: next.minIntervalMs };
      return { ...settings };
    },
    settings() { return { ...settings }; }
  };
}

// Standby explicite : null en fin de conduite (standingByCue renverrait la première cue).
export function standingByCueOrNull(project) {
  const cues = listCues(project);
  if (!cues.length) return null;
  const meta = project?.meta || {};
  if (meta.cuePlayheadId === null && meta.lastCueId) return null;
  return cues.find(c => c.id === meta.cuePlayheadId) || (meta.lastCueId ? null : cues[0]);
}
