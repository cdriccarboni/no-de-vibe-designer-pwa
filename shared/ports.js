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
  any: "any"
};

/** Compatibilité : source → cible. */
const COMPAT = {
  video: new Set(["video", "any"]),
  number: new Set(["number", "any", "text"]),
  trigger: new Set(["trigger", "number", "any"]),
  midi: new Set(["midi", "number", "any"]),
  text: new Set(["text", "any"]),
  any: new Set(["video", "number", "trigger", "midi", "text", "any"])
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
  audio: [
    { name: "in", dir: "in", data: "number" },
    { name: "process", dir: "in", data: "number" },
    { name: "out", dir: "out", data: "number" }
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
  ]
};

/** Nodes dont le runtime exécute vraiment le travail. */
export const EXECUTABLE_TYPES = new Set(Object.keys(EXECUTABLE_PORTS));

export function portMeta(type, index) {
  const list = EXECUTABLE_PORTS[type];
  if (list && list[index]) return list[index];
  return null;
}

export function portDirection(type, index, count) {
  const meta = portMeta(type, index);
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

export function portDataType(type, index) {
  const meta = portMeta(type, index);
  if (meta) return meta.data;
  return "any";
}

export function isExecutable(type) {
  return EXECUTABLE_TYPES.has(type);
}
