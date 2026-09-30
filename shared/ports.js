/**
 * Spécifications de ports pour les nodes réellement câblés (P00).
 * Les autres types restent décoratifs (status: unavailable).
 */

export const DATA_TYPES = {
  video: "video",
  number: "number",
  trigger: "trigger",
  midi: "midi",
  text: "text",
  boolean: "boolean",
  any: "any"
};

/** Compatibilité : source → cible. boolean se convertit en nombre 0/1. */
const COMPAT = {
  video: new Set(["video", "any"]),
  number: new Set(["number", "boolean", "any", "text"]),
  trigger: new Set(["trigger", "number", "boolean", "any"]),
  midi: new Set(["midi", "number", "any"]),
  text: new Set(["text", "any"]),
  boolean: new Set(["boolean", "number", "trigger", "text", "any"]),
  any: new Set(["video", "number", "trigger", "midi", "text", "boolean", "any"])
};

export function typesCompatible(fromType, toType) {
  const a = fromType || "any";
  const b = toType || "any";
  return COMPAT[a]?.has(b) || a === b;
}

/** Ports explicites pour nodes exécutables. index = position dans la liste affichée. */
export const EXECUTABLE_PORTS = {
  camera: [
    { name: "video", dir: "out", data: "video" },
    { name: "tracking", dir: "out", data: "number" },
    { name: "out", dir: "out", data: "video" }
  ],
  "remote-camera": [
    { name: "video", dir: "out", data: "video" },
    { name: "status", dir: "out", data: "text" },
    { name: "out", dir: "out", data: "video" }
  ],
  "ndi-out": [
    { name: "video", dir: "in", data: "video" },
    { name: "status", dir: "out", data: "text" }
  ],
  "phone-camera-front": [
    { name: "video", dir: "out", data: "video" },
    { name: "device", dir: "out", data: "text" },
    { name: "out", dir: "out", data: "video" }
  ],
  "phone-camera-back": [
    { name: "video", dir: "out", data: "video" },
    { name: "device", dir: "out", data: "text" },
    { name: "out", dir: "out", data: "video" }
  ],
  pointer: [
    { name: "x", dir: "out", data: "number" },
    { name: "y", dir: "out", data: "number" },
    { name: "speed", dir: "out", data: "number" }
  ],
  whale: [
    { name: "x", dir: "in", data: "number" },
    { name: "y", dir: "in", data: "number" },
    { name: "speed", dir: "in", data: "number" },
    { name: "out", dir: "out", data: "video" }
  ],
  blob: [
    { name: "x", dir: "in", data: "number" },
    { name: "y", dir: "in", data: "number" },
    { name: "size", dir: "in", data: "number" },
    { name: "out", dir: "out", data: "video" }
  ],
  threshold: [
    { name: "video", dir: "in", data: "video" },
    { name: "threshold", dir: "in", data: "number" },
    { name: "out", dir: "out", data: "video" }
  ],
  mirror: [
    { name: "video", dir: "in", data: "video" },
    { name: "out", dir: "out", data: "video" }
  ],
  ghost: [
    { name: "video", dir: "in", data: "video" },
    { name: "amount", dir: "in", data: "number" },
    { name: "out", dir: "out", data: "video" }
  ],
  bodyclone: [
    { name: "video", dir: "in", data: "video" },
    { name: "threshold", dir: "in", data: "number" },
    { name: "out", dir: "out", data: "video" }
  ],
  shader: [
    { name: "texture", dir: "in", data: "video" },
    { name: "glsl", dir: "in", data: "number" },
    { name: "out", dir: "out", data: "video" }
  ],
  midi: [
    { name: "device", dir: "out", data: "midi" },
    { name: "CC", dir: "out", data: "number" },
    { name: "gate", dir: "out", data: "trigger" }
  ],
  osc: [
    { name: "host", dir: "in", data: "text" },
    { name: "address", dir: "in", data: "text" },
    { name: "value", dir: "in", data: "number" }
  ],
  surface: [
    { name: "in", dir: "in", data: "any" },
    { name: "status", dir: "out", data: "text" },
    { name: "out", dir: "out", data: "any" }
  ],
  inputmapper: [
    { name: "value", dir: "in", data: "number" },
    { name: "out min", dir: "in", data: "number" },
    { name: "out max", dir: "in", data: "number" },
    { name: "out", dir: "out", data: "number" }
  ],
  stageio: [
    { name: "in", dir: "in", data: "any" },
    { name: "route", dir: "in", data: "text" },
    { name: "out", dir: "out", data: "any" }
  ],
  tracking: [
    { name: "points", dir: "out", data: "number" },
    { name: "curve", dir: "out", data: "number" },
    { name: "out", dir: "out", data: "number" }
  ],
  subpatch: [
    { name: "in", dir: "in", data: "any" },
    { name: "params", dir: "in", data: "number" },
    { name: "out", dir: "out", data: "any" }
  ],
  number: [
    { name: "value", dir: "out", data: "number" }
  ],
  multiply: [
    { name: "a", dir: "in", data: "number" },
    { name: "b", dir: "in", data: "number" },
    { name: "value", dir: "out", data: "number" }
  ],
  add: [
    { name: "a", dir: "in", data: "number" },
    { name: "b", dir: "in", data: "number" },
    { name: "value", dir: "out", data: "number" }
  ],
  smooth: [
    { name: "value", dir: "in", data: "number" },
    { name: "value", dir: "out", data: "number" }
  ],
  compare: [
    { name: "a", dir: "in", data: "number" },
    { name: "b", dir: "in", data: "number" },
    { name: "result", dir: "out", data: "boolean" }
  ],
  boolean: [
    { name: "value", dir: "out", data: "boolean" }
  ],
  text: [
    { name: "value", dir: "out", data: "text" }
  ],
  timer: [
    { name: "start", dir: "in", data: "trigger" },
    { name: "time", dir: "out", data: "number" },
    { name: "done", dir: "out", data: "trigger" }
  ],
  feedback: [
    { name: "in", dir: "in", data: "any" },
    { name: "out", dir: "out", data: "any" }
  ],
  blackhole: [
    { name: "speed", dir: "in", data: "number" },
    { name: "size", dir: "in", data: "number" },
    { name: "visual", dir: "out", data: "video" }
  ],
  transform: [
    { name: "visual", dir: "in", data: "video" },
    { name: "scale", dir: "in", data: "number" },
    { name: "rotation", dir: "in", data: "number" },
    { name: "out", dir: "out", data: "video" }
  ],
  composite: [
    { name: "base", dir: "in", data: "video" },
    { name: "overlay", dir: "in", data: "video" },
    { name: "out", dir: "out", data: "video" }
  ],
  shadow: [
    { name: "video", dir: "in", data: "video" },
    { name: "threshold", dir: "in", data: "number" },
    { name: "out", dir: "out", data: "video" }
  ],
  videofile: [
    { name: "video", dir: "out", data: "video" },
    { name: "time", dir: "out", data: "number" },
    { name: "out", dir: "out", data: "video" }
  ],
  videoreturn: [
    { name: "video", dir: "in", data: "video" },
    { name: "status", dir: "out", data: "text" },
    { name: "out", dir: "out", data: "video" }
  ],
  mapping: [
    { name: "video", dir: "in", data: "video" },
    { name: "scale", dir: "in", data: "number" },
    { name: "out", dir: "out", data: "video" }
  ],
  anaglyph: [
    { name: "video", dir: "in", data: "video" },
    { name: "depth", dir: "in", data: "number" },
    { name: "out", dir: "out", data: "video" }
  ],
  creativefx: [
    { name: "video", dir: "in", data: "video" },
    { name: "amount", dir: "in", data: "number" },
    { name: "out", dir: "out", data: "video" }
  ],
  storm: [
    { name: "video", dir: "in", data: "video" },
    { name: "amount", dir: "in", data: "number" },
    { name: "out", dir: "out", data: "video" }
  ],
  bending: [
    { name: "video", dir: "in", data: "video" },
    { name: "amount", dir: "in", data: "number" },
    { name: "out", dir: "out", data: "video" }
  ],
  transmute: [
    { name: "video", dir: "in", data: "video" },
    { name: "amount", dir: "in", data: "number" },
    { name: "out", dir: "out", data: "video" }
  ],
  "box-in": [
    { name: "out", dir: "out", data: "any" }
  ],
  "box-out": [
    { name: "in", dir: "in", data: "any" }
  ],
  audio: [
    { name: "in", dir: "in", data: "number" },
    { name: "process", dir: "in", data: "number" },
    { name: "out", dir: "out", data: "number" }
  ],
  audiofilter: [
    { name: "freq", dir: "in", data: "number" },
    { name: "q", dir: "in", data: "number" },
    { name: "level", dir: "out", data: "number" }
  ],
  audiodelay: [
    { name: "time", dir: "in", data: "number" },
    { name: "feedback", dir: "in", data: "number" },
    { name: "level", dir: "out", data: "number" }
  ],
  audiofft: [
    { name: "level", dir: "out", data: "number" },
    { name: "peak", dir: "out", data: "number" },
    { name: "bins", dir: "out", data: "number" }
  ],
  organicaudio: [
    { name: "in", dir: "in", data: "number" },
    { name: "reactive", dir: "in", data: "number" },
    { name: "out", dir: "out", data: "number" }
  ],
  soundmemo: [
    { name: "record", dir: "in", data: "trigger" },
    { name: "tag", dir: "in", data: "text" },
    { name: "out", dir: "out", data: "number" }
  ],
  dmx: [
    { name: "universe", dir: "in", data: "number" },
    { name: "address", dir: "in", data: "number" },
    { name: "value", dir: "in", data: "number" }
  ],
  arduino: [
    { name: "command", dir: "in", data: "text" },
    { name: "trigger", dir: "in", data: "trigger" },
    { name: "status", dir: "out", data: "text" }
  ],
  esp: [
    { name: "command", dir: "in", data: "text" },
    { name: "trigger", dir: "in", data: "trigger" },
    { name: "status", dir: "out", data: "text" }
  ],
  servo: [
    { name: "channel", dir: "in", data: "number" },
    { name: "angle", dir: "in", data: "number" },
    { name: "speed", dir: "in", data: "number" },
    { name: "status", dir: "out", data: "text" }
  ],
  rfid: [
    { name: "tag", dir: "out", data: "text" },
    { name: "present", dir: "out", data: "boolean" },
    { name: "raw", dir: "out", data: "text" }
  ],
  sensors: [
    { name: "sensor", dir: "in", data: "text" },
    { name: "value", dir: "out", data: "number" },
    { name: "status", dir: "out", data: "text" }
  ],
  twozero: [
    { name: "value", dir: "in", data: "number" },
    { name: "trigger", dir: "in", data: "trigger" },
    { name: "status", dir: "out", data: "text" }
  ],
  chataigne: [
    { name: "value", dir: "in", data: "number" },
    { name: "trigger", dir: "in", data: "trigger" },
    { name: "status", dir: "out", data: "text" }
  ],
  millumin: [
    { name: "value", dir: "in", data: "number" },
    { name: "trigger", dir: "in", data: "trigger" },
    { name: "status", dir: "out", data: "text" }
  ],
  touchdesigner: [
    { name: "value", dir: "in", data: "number" },
    { name: "trigger", dir: "in", data: "trigger" },
    { name: "status", dir: "out", data: "text" }
  ],
  isadorabridge: [
    { name: "value", dir: "in", data: "number" },
    { name: "trigger", dir: "in", data: "trigger" },
    { name: "status", dir: "out", data: "text" }
  ],
  max: [
    { name: "value", dir: "in", data: "number" },
    { name: "trigger", dir: "in", data: "trigger" },
    { name: "status", dir: "out", data: "text" }
  ],
  pd: [
    { name: "value", dir: "in", data: "number" },
    { name: "trigger", dir: "in", data: "trigger" },
    { name: "status", dir: "out", data: "text" }
  ],
  supercollider: [
    { name: "value", dir: "in", data: "number" },
    { name: "trigger", dir: "in", data: "trigger" },
    { name: "status", dir: "out", data: "text" }
  ],
  automation: [
    { name: "speed", dir: "in", data: "number" },
    { name: "phase", dir: "in", data: "number" },
    { name: "value", dir: "out", data: "number" }
  ],
  datalab: [
    { name: "value", dir: "in", data: "number" },
    { name: "scale", dir: "in", data: "number" },
    { name: "out", dir: "out", data: "number" }
  ],
  universal: [
    { name: "in", dir: "in", data: "any" },
    { name: "out", dir: "out", data: "any" }
  ],
  connectors: [
    { name: "in", dir: "in", data: "any" },
    { name: "status", dir: "out", data: "text" },
    { name: "out", dir: "out", data: "any" }
  ],
  "phone-mic": [
    { name: "audio", dir: "out", data: "number" },
    { name: "level", dir: "out", data: "number" },
    { name: "out", dir: "out", data: "number" }
  ],
  touch: [
    { name: "x", dir: "out", data: "number" },
    { name: "y", dir: "out", data: "number" },
    { name: "pressure", dir: "out", data: "number" }
  ],
  multitouch: [
    { name: "touches", dir: "out", data: "number" },
    { name: "gesture", dir: "out", data: "text" },
    { name: "out", dir: "out", data: "number" }
  ],
  gyro: [
    { name: "alpha", dir: "out", data: "number" },
    { name: "beta", dir: "out", data: "number" },
    { name: "gamma", dir: "out", data: "number" }
  ],
  accelerometer: [
    { name: "x", dir: "out", data: "number" },
    { name: "y", dir: "out", data: "number" },
    { name: "z", dir: "out", data: "number" }
  ],
  orientation: [
    { name: "portrait", dir: "out", data: "number" },
    { name: "landscape", dir: "out", data: "number" },
    { name: "angle", dir: "out", data: "number" }
  ],
  gps: [
    { name: "lat", dir: "out", data: "number" },
    { name: "lon", dir: "out", data: "number" },
    { name: "accuracy", dir: "out", data: "number" }
  ],
  haptics: [
    { name: "pattern", dir: "in", data: "text" },
    { name: "duration", dir: "in", data: "number" },
    { name: "trigger", dir: "in", data: "trigger" }
  ],
  wifi: [
    { name: "online", dir: "out", data: "number" },
    { name: "type", dir: "out", data: "text" },
    { name: "rtt", dir: "out", data: "number" }
  ],
  bluetooth: [
    { name: "device", dir: "out", data: "text" },
    { name: "service", dir: "out", data: "text" },
    { name: "characteristic", dir: "out", data: "text" }
  ]
};

/** Nodes dont le runtime exécute vraiment le travail. */
export const EXECUTABLE_TYPES = new Set(Object.keys(EXECUTABLE_PORTS));

export function resolvePorts(type, node) {
  if (type === "subpatch" && Array.isArray(node?.params?.ports) && node.params.ports.length) {
    return node.params.ports.map(p => ({
      name: p.name || "port",
      dir: p.dir === "out" || p.dir === "output" ? "out" : "in",
      data: p.data || "any"
    }));
  }
  return EXECUTABLE_PORTS[type] || null;
}

export function portLabels(type, node) {
  const list = resolvePorts(type, node);
  return list ? list.map(p => p.name) : null;
}

export function portMeta(type, index, node) {
  const list = resolvePorts(type, node);
  if (list && list[index]) return list[index];
  return null;
}

export function portDirection(type, index, count, node) {
  const meta = portMeta(type, index, node);
  if (meta) return meta.dir;
  const sourceTypes = new Set([
    "camera", "midi", "sensors", "rfid",
    "phone-camera-front", "phone-camera-back", "phone-mic",
    "gyro", "accelerometer", "orientation", "gps", "touch", "multitouch"
  ]);
  if (sourceTypes.has(type)) return "out";
  if (index === count - 1) return "out";
  return "in";
}

export function portDataType(type, index, node) {
  const meta = portMeta(type, index, node);
  if (meta) return meta.data;
  return "any";
}

export function isExecutable(type) {
  return EXECUTABLE_TYPES.has(type);
}
