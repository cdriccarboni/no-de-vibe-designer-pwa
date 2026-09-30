/**
 * Widget catalog for Companion Studio.
 * Presentation-only defaults — bindings attached separately.
 */

export const WIDGET_TYPES = Object.freeze([
  { type: "button", label: "Bouton", category: "control", p0: true },
  { type: "momentary", label: "Momentary", category: "control", p0: true },
  { type: "toggle", label: "Toggle", category: "control", p1: true },
  { type: "fader", label: "Fader", category: "control", p1: true },
  { type: "pot", label: "Potard", category: "control", p1: true },
  { type: "xy", label: "XY", category: "control", p1: true },
  { type: "encoder", label: "Encodeur", category: "control", p1: true },
  { type: "counter", label: "Compteur", category: "display", p1: true },
  { type: "gauge", label: "Jauge", category: "display", p1: true },
  { type: "text", label: "Texte", category: "display", p1: true },
  { type: "chrono", label: "Chrono", category: "display", p1: true },
  { type: "clock", label: "Horloge", category: "display", p1: true },
  { type: "vu", label: "VU", category: "audio", p1: true },
  { type: "waveform", label: "Waveform", category: "audio", p2: true },
  { type: "video-return", label: "Retour vidéo", category: "video", p2: true },
  { type: "node-state", label: "État node", category: "display", p1: true },
  { type: "network", label: "Réseau", category: "status", p1: true },
  { type: "cue-light", label: "Cue light", category: "stage", p1: true },
  { type: "list", label: "Liste", category: "control", p1: true },
  { type: "preset", label: "Preset", category: "control", p1: true },
  { type: "separator", label: "Séparateur", category: "layout", p1: true }
]);

export function widgetDefaults(type = "button") {
  const meta = WIDGET_TYPES.find((w) => w.type === type) || WIDGET_TYPES[0];
  return {
    type: meta.type,
    presentation: {
      label: meta.label,
      secondary: "",
      x: 0,
      y: 0,
      w: type === "fader" ? 1 : 2,
      h: type === "fader" ? 3 : 1,
      color: "#d7b86a",
      textColor: "#0f1113",
      visible: true,
      locked: false,
      active: true
    },
    binding: {
      kind: type === "cue-light" ? "stage" : "action",
      action: type === "cue-light" || type === "button" ? "go" : "ping"
    },
    state: { value: null, feedback: null }
  };
}

export function p0Widgets() {
  return WIDGET_TYPES.filter((w) => w.p0);
}
