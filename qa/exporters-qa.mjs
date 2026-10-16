// QA exports Max / Pure Data / TouchDesigner : structure et câblage par index d'entrée.
// Si Pure Data est installé (PD_BIN ou /Applications/Pd-*.app), le patch est réellement ouvert en batch.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { exportMax, exportPureData, exportTouchDesigner } from "../shared/exporters.js";

const project = {
  name: "qa-export",
  nodes: [
    { id: "n1", type: "number", title: "A", x: 40, y: 80, params: { value: 2 } },
    { id: "n2", type: "number", title: "B", x: 200, y: 80, params: { value: 3 } },
    { id: "n3", type: "multiply", title: "Mul", x: 120, y: 200, params: {} },
    { id: "n4", type: "osc", title: "OSC", x: 120, y: 300, params: { host: "127.0.0.1", port: 9001, address: "/layer/1/opacity" } },
    { id: "n5", type: "camera", title: "Cam", x: 400, y: 80, params: {} }
  ],
  edges: [
    { id: "e1", from: { node: "n1", port: 0 }, to: { node: "n3", port: 0 } },
    { id: "e2", from: { node: "n2", port: 0 }, to: { node: "n3", port: 1 } },
    { id: "e3", from: { node: "n3", port: 2 }, to: { node: "n4", port: 2 } }
  ]
};
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; console.log("✓", m); };

// Max
const max = exportMax(project);
const mp = JSON.parse(max.content).patcher;
const boxById = new Map(mp.boxes.map(b => [b.box.id, b.box]));
const mul = mp.boxes.find(b => b.box.text === "* 1.").box.id;
ok(mp.lines.some(l => l.patchline.destination[0] === mul && l.patchline.destination[1] === 1), "Max : B → inlet droit de [* 1.]");
ok(mp.lines.some(l => l.patchline.destination[0] === mul && l.patchline.destination[1] === 0), "Max : A → inlet gauche de [* 1.]");
const pre = mp.boxes.find(b => /^prepend \/layer\/1\/opacity$/.test(b.box.text));
ok(pre && mp.lines.some(l => l.patchline.source[0] === mul && l.patchline.destination[0] === pre.box.id), "Max : résultat → [prepend /adresse]");
ok(mp.lines.some(l => l.patchline.source[0] === pre.box.id && /^udpsend 127\.0\.0\.1 9001$/.test(boxById.get(l.patchline.destination[0]).text)), "Max : [prepend] → [udpsend hôte port]");
ok(mp.boxes.some(b => b.box.text === "loadmess 2"), "Max : valeur initiale du Nombre conservée (loadmess)");
ok(max.unsupported.includes("Cam"), "Max : node non mappé listé, jamais simulé");
for (const l of mp.lines) ok(boxById.has(l.patchline.source[0]) && boxById.has(l.patchline.destination[0]), `Max : câble ${l.patchline.source[0]}→${l.patchline.destination[0]} vers des boxes existantes`);

// Pure Data
const pd = exportPureData(project).content;
const recs = pd.trim().split("\n");
ok(recs[0].startsWith("#N canvas"), "Pd : en-tête canvas");
ok(!/#X obj -?\d+ -?\d+ floatatom/.test(pd) && /#X floatatom /.test(pd), "Pd : floatatom natif (pas un objet inexistant)");
ok(!/udpsend/.test(pd) && /netsend -u -b/.test(pd) && /oscformat layer 1 opacity/.test(pd), "Pd : OSC vanilla [oscformat] + [netsend -u -b]");
const objs = recs.filter(r => /^#X (obj|msg|floatatom)/.test(r));
const mulIdx = objs.findIndex(r => / \*;$/.test(r));
ok(recs.some(r => new RegExp(`^#X connect \\d+ 0 ${mulIdx} 1;$`).test(r)), "Pd : B → inlet droit de [*]");
for (const c of recs.filter(r => r.startsWith("#X connect"))) {
  const [, a, , b] = c.match(/#X connect (\d+) (\d+) (\d+) (\d+);/).map(Number);
  ok(a < objs.length && b < objs.length, `Pd : ${c} pointe vers des objets existants`);
}

// TouchDesigner
const td = exportTouchDesigner(project).content;
ok(/par\.chopop = 'mul'/.test(td), "TD : Math CHOP en multiplication");
ok(/setInput\(1, created\["n2"\]\)/.test(td), "TD : B → entrée 1 du Math CHOP");
ok(/par\.netaddress = "127\.0\.0\.1"/.test(td) && !/networkaddress/.test(td), "TD : paramètre netaddress (nom réel de l'OSC Out CHOP)");

// Ouverture réelle dans Pure Data si disponible
const pdBin = process.env.PD_BIN || ["/Applications"].flatMap(d => { try { return fs.readdirSync(d).filter(x => /^Pd.*\.app$/.test(x)).map(x => path.join(d, x, "Contents/Resources/bin/pd")); } catch { return []; } }).find(f => fs.existsSync(f));
if (pdBin) {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "nvd-pd-")), "qa.pd");
  fs.writeFileSync(f, pd);
  let out = "";
  try { out = execFileSync(pdBin, ["-nogui", "-noaudio", "-nomidi", "-stderr", "-send", "pd quit", "-open", f], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 15000 }); }
  catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
  ok(!/couldn't create|bad arguments|error/i.test(out), `Pd réel (${pdBin}) : patch ouvert sans « couldn't create »${out.trim() ? " · " + out.trim().split("\n").slice(0, 2).join(" ") : ""}`);
} else {
  console.log("· Pure Data non installé : ouverture réelle non testée");
}
console.log(`\n✓ QA exports : ${pass} vérifications`);
