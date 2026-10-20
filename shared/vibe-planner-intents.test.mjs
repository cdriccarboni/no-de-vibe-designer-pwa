// Planner local : prompts courts « forme + comportement + source » (FR/EN).
// Chaque patch doit n'utiliser que des nodes exécutables du catalogue (ports.js)
// et des liaisons typées valides, appliquées réellement via applyVibeOps.
import test from "node:test";
import assert from "node:assert/strict";
import { deterministicVibePlan, VIBE_PROMPT_EXAMPLES } from "./vibe-planner.js";
import { applyVibeOps } from "./vibe.js";
import { EXECUTABLE_TYPES, portMeta, typesCompatible } from "./ports.js";
import { validateEdge } from "./graph-engine.js";
import { createDemoProject } from "./ir.js";

function applyPlan(plan, project = { nodes: [], edges: [] }) {
  let seq = 0;
  const result = applyVibeOps(project, plan.ops, {
    addNode: (type, x, y) => { const n = { id: `n${++seq}`, type, title: type, x, y, params: {} }; project.nodes.push(n); return n; },
    addClip: () => {},
    ensureEdges: () => project.edges,
    nodeById: id => project.nodes.find(n => n.id === id)
  });
  return { project, ...result };
}

function assertRealPatch(prompt, { shapeType, sourceType, fxType = null }) {
  const plan = deterministicVibePlan(prompt, { nodes: [], edges: [] });
  assert.equal(plan.coverage.status, "complete", `${prompt} → ${plan.note}`);
  const adds = plan.ops.filter(o => o.op === "addNode");
  const connects = plan.ops.filter(o => o.op === "connect");
  for (const op of adds) assert.ok(EXECUTABLE_TYPES.has(op.type), `${op.type} absent du catalogue`);
  for (const op of connects) {
    const a = portMeta(op.fromType, op.fromPort);
    const b = portMeta(op.toType, op.toPort);
    assert.ok(a && b, `port inexistant ${op.fromType}[${op.fromPort}] → ${op.toType}[${op.toPort}]`);
    assert.equal(a.dir, "out");
    assert.equal(b.dir, "in");
    assert.ok(typesCompatible(a.data, b.data), `${a.data} → ${b.data} incompatible`);
  }
  const types = adds.map(o => o.type);
  assert.ok(types.includes(shapeType), `${prompt} : forme ${shapeType} absente (${types})`);
  assert.ok(types.includes(sourceType), `${prompt} : source ${sourceType} absente (${types})`);
  assert.ok(types.includes("stage-output"), `${prompt} : sortie absente`);
  if (fxType) assert.ok(types.includes(fxType), `${prompt} : ${fxType} absent (${types})`);

  const { project, applied, errors } = applyPlan(plan);
  assert.deepEqual(errors, [], `${prompt} : erreurs ${errors.join(" | ")}`);
  assert.equal(project.edges.length, connects.length, `${prompt} : liaisons perdues`);
  assert.equal(applied.filter(a => a.op === "connect").length, connects.length);
  for (const e of project.edges) assert.ok(validateEdge(project, e.from, e.to).ok);
  // La sortie reçoit bien une vidéo.
  const out = project.nodes.find(n => n.type === "stage-output");
  assert.ok(project.edges.some(e => e.to.node === out.id && e.to.port === 0), `${prompt} : sortie non câblée`);
  // Idempotence : rejouer le prompt ne duplique rien.
  const again = deterministicVibePlan(prompt, project);
  assert.equal(again.ops.length, 0);
  assert.equal(again.coverage.status, "unchanged");
  return { plan, project };
}

test("« un cercle qui pulse sur le son » → audio-in → lissage → échelle → rayon du SDF → sortie", () => {
  const { project } = assertRealPatch("un cercle qui pulse sur le son", { shapeType: "sdf", sourceType: "audio-in" });
  const sdf = project.nodes.find(n => n.type === "sdf");
  const mapper = project.nodes.find(n => n.type === "inputmapper");
  assert.ok(project.edges.some(e => e.from.node === mapper.id && e.to.node === sdf.id && e.to.port === 2), "rayon non piloté");
  assert.equal(project.nodes.find(n => n.type === "audio-in").params.enabled, false, "micro armé automatiquement");
});

test("« un cercle qui pulse avec le micro »", () => {
  const { plan } = assertRealPatch("un cercle qui pulse avec le micro", { shapeType: "sdf", sourceType: "audio-in" });
  assert.equal(plan.diagnostics.source, "mic");
});

test("« cercle audio réactif » (comportement implicite : pulse)", () => {
  const { plan } = assertRealPatch("cercle audio réactif", { shapeType: "sdf", sourceType: "audio-in" });
  assert.equal(plan.diagnostics.behavior, "pulse");
});

test("« a circle pulsing to the audio » (EN)", () => {
  const { plan } = assertRealPatch("a circle pulsing to the audio", { shapeType: "sdf", sourceType: "audio-in" });
  assert.equal(plan.diagnostics.shape, "circle");
  assert.equal(plan.diagnostics.behavior, "pulse");
});

test("échantillon de la matrice formes réalisables × comportements × sources", () => {
  const cases = [
    ["un cercle qui tourne avec le MIDI", "sdf", "midi", "transform"],
    ["a circle that rotates with the camera", "sdf", "camera", "transform"],
    ["un cercle qui grossit avec le micro", "sdf", "audio-in", "transform"],
    ["a circle that grows with midi", "sdf", "midi", "transform"],
    ["un cercle qui change de couleur avec la caméra", "sdf", "camera", "transmute"],
    ["a circle changing color to the sound", "sdf", "audio-in", "transmute"],
    ["une vague qui pulse sur le son", "ripple", "audio-in", null],
    ["a wave pulsing with midi", "ripple", "midi", null],
    ["une vague qui tourne avec la caméra", "ripple", "camera", "transform"],
    ["a wave that grows with the mic", "ripple", "audio-in", "transform"],
    ["une vague qui change de couleur avec le MIDI", "ripple", "midi", "transmute"],
    ["un cercle qui tourne", "sdf", "automation", "transform"]
  ];
  for (const [prompt, shapeType, sourceType, fxType] of cases) {
    assertRealPatch(prompt, { shapeType, sourceType, fxType });
  }
});

test("caméra : mouvement mesuré par Optical Flow, caméra jamais démarrée", () => {
  const { project } = assertRealPatch("un cercle qui pulse avec la caméra", { shapeType: "sdf", sourceType: "camera", fxType: "opticalflow" });
  const cam = project.nodes.find(n => n.type === "camera");
  assert.notEqual(cam.params.permission, true);
});

test("formes sans node dans le catalogue (carré, ligne, étoile) : échec clair, aucun node inventé", () => {
  for (const [prompt, word] of [
    ["un carré qui pulse sur le son", "carré"],
    ["a square rotating with midi", "carré"],
    ["une ligne qui grossit avec le micro", "ligne"],
    ["a line changing color with the camera", "ligne"],
    ["une étoile qui tourne sur le son", "étoile"],
    ["a star pulsing to the audio", "étoile"]
  ]) {
    const plan = deterministicVibePlan(prompt, { nodes: [], edges: [] });
    assert.equal(plan.ops.length, 0, prompt);
    assert.equal(plan.coverage.status, "none", prompt);
    assert.equal(plan.coverage.label, "Combinaison non réalisable");
    assert.match(plan.coverage.missing[0].need, new RegExp(word));
    assert.match(plan.note, /non réalisable/);
    assert.ok(plan.coverage.missing[0].alternative.includes("cercle"));
  }
});

test("prompt inconnu : « Aucune intention reconnue » + exemples de prompts qui marchent", () => {
  const plan = deterministicVibePlan("blablabla qwerty zzz", { nodes: [], edges: [] });
  assert.equal(plan.ops.length, 0);
  assert.equal(plan.coverage.status, "none");
  assert.equal(plan.coverage.label, "Aucune intention reconnue");
  assert.match(plan.note, /aucune intention reconnue/);
  assert.match(plan.note, /un cercle qui pulse sur le son/);
  assert.ok(plan.coverage.missing[0].alternative.includes("a circle pulsing to the audio"));
  assert.ok(plan.coverage.examples.length >= 4);
  // Les exemples affichés fonctionnent réellement.
  for (const example of VIBE_PROMPT_EXAMPLES) {
    assert.equal(deterministicVibePlan(example, { nodes: [], edges: [] }).coverage.status, "complete", example);
  }
});

test("démo « Exemple » : plus de nodes « Test à supprimer », graphe cohérent", () => {
  const p = createDemoProject();
  const removed = ["test-ndi-in", "test-ndi-out", "test-arduino", "test-esp32", "test-gpio-in", "test-gpio-out", "sim-frame", "sim-esp"];
  for (const id of removed) assert.ok(!p.nodes.some(n => n.id === id), `${id} encore présent`);
  assert.ok(!p.nodes.some(n => n.title === "Test à supprimer"));
  const ids = new Set(p.nodes.map(n => n.id));
  for (const e of p.edges) {
    assert.ok(ids.has(e.from.node) && ids.has(e.to.node), `liaison orpheline ${e.id}`);
    const v = validateEdge({ ...p, edges: p.edges.filter(x => x !== e) }, e.from, e.to);
    assert.ok(v.ok, `${e.id} invalide : ${(v.errors || []).join(" | ")}`);
  }
  for (const n of p.nodes) assert.ok(EXECUTABLE_TYPES.has(n.type), `${n.type} non exécutable`);
  // Chaîne principale intacte.
  assert.deepEqual(p.nodes.slice(0, 5).map(n => n.type), ["pointer", "threadcurtain", "ripple", "composite", "transform"]);
  // L'enveloppe n'est plus orpheline : déclenchée par la souris.
  assert.ok(p.edges.some(e => e.to.node === "envelope-adsr" && e.to.port === 0));
});
