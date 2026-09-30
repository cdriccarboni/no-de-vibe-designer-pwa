/**
 * SuperNodes V3.
 * Un SuperNode est un preset de moteur, pas une nouvelle usine à panneaux.
 * Les presets restent sérialisables dans les paramètres d'un node existant.
 */

export const SUPERNODE_PRESETS = Object.freeze([
  {
    id: "digital-curtain",
    title: "Digital Curtain",
    engine: "threadcurtain",
    family: "body",
    defaults: { strands: 118, force: 0.92, wave: 0.34, opacity: 1 }
  },
  {
    id: "living-shadow",
    title: "Living Shadow",
    engine: "livingshadow",
    family: "body",
    defaults: { autonomy: 0.58, threshold: 0.45, mode: "mirror", opacity: 1 }
  },
  {
    id: "feedback-dream",
    title: "Feedback Dream",
    engine: "feedbackfx",
    family: "feedback",
    defaults: { decay: 0.88, amount: 0.7, opacity: 1 }
  },
  {
    id: "particle-field",
    title: "Particle Field",
    engine: "flowfield",
    family: "particles",
    defaults: { energy: 0.75, strength: 0.65, opacity: 1 }
  },
  {
    id: "quick-map",
    title: "Quick Map",
    engine: "mapping",
    family: "mapping",
    defaults: {
      mappingV3: true,
      corners: [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],
      opacity: 1
    }
  }
]);

export function superNodePreset(id) {
  return SUPERNODE_PRESETS.find(p => p.id === id) || null;
}

export function applySuperNodePreset(node, id) {
  const preset = superNodePreset(id);
  if (!preset) throw new Error(`SuperNode inconnu : ${id}`);
  node.type = preset.engine;
  node.title = preset.title;
  node.params = {
    ...(node.params || {}),
    ...preset.defaults,
    superNode: id,
    superNodeV3: true
  };
  return node;
}
