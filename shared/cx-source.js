/**
 * Sources réellement exécutées par No[co]de Vibe Designer.
 * ShaderSurface compile du GLSL WebGL1 (gl_FragColor).
 * Les nodes p5 et sketch exécutent le sous-ensemble background/fill/circle/rect/line/wave.
 * Aucun eval de JavaScript, aucun IDE Processing, aucun hôte externe.
 */
import { portLabels, portMeta } from "./ports.js";

function norm(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

const INSTALLS = [
  ["processing", /\bprocessing\b|\bp5(?:\.js)?\b/, {
    title: "Processing",
    cope: "Le node p5 exécute déjà le dessin dans le patch (background, fill, circle, rect, line, wave).",
    steps: [
      "brew install --cask processing",
      "https://processing.org/download"
    ],
    note: "La copie dans /Applications peut demander le mot de passe. L'application Processing ne compte comme moteur externe qu'après un test qui renvoie une valeur."
  }],
  ["unity", /\bunity\b/, {
    title: "Unity",
    cope: "",
    steps: ["https://unity.com/download"],
    note: "Installeur graphique et licence Unity. Le patch ne lance pas Unity tant qu'un test n'a pas renvoyé une valeur."
  }],
  ["unreal", /\bunreal\b/, {
    title: "Unreal",
    cope: "",
    steps: ["https://www.unrealengine.com/download"],
    note: "Installeur Epic et compte. Le patch ne lance pas Unreal tant qu'un test n'a pas renvoyé une valeur."
  }],
  ["touchdesigner", /\btouchdesigner\b|\btouch designer\b/, {
    title: "TouchDesigner",
    cope: "Le node td reste un pont de valeurs dans le patch.",
    steps: [
      "Ouvre /Applications/TouchDesigner.app s'il est déjà là.",
      "https://derivative.ca/download"
    ],
    note: "Installeur Derivative. Un réseau TouchDesigner n'est pas rendu ici tant qu'un test n'a pas produit une image."
  }],
  ["metal", /\bmetal\b/, {
    title: "Metal",
    cope: "Le node Shader exécute le fragment en GLSL WebGL1.",
    steps: ["xcode-select --install"],
    note: "Les outils Apple peuvent demander une confirmation graphique. Metal n'est pas validé tant qu'un test n'a pas lu un pixel."
  }],
  ["webgpu", /\bwgsl\b|\bwebgpu\b/, {
    title: "WebGPU",
    cope: "Le node Shader exécute le fragment en GLSL WebGL1.",
    steps: ["Utilise un navigateur avec WebGPU activé, puis relance un test de compilation WGSL."],
    note: "Pas de succès WebGPU tant que ce test n'a pas renvoyé une valeur."
  }],
  ["houdini", /\bhoudini\b/, {
    title: "Houdini",
    cope: "",
    steps: ["https://www.sidefx.com/download/"],
    note: "Installeur et licence SideFX. Houdini n'est pas lancé tant qu'un test n'a pas renvoyé une valeur."
  }],
  ["blender", /\bblender\b/, {
    title: "Blender",
    cope: "",
    steps: ["brew install --cask blender", "https://www.blender.org/download/"],
    note: "La copie dans /Applications peut demander le mot de passe. Blender n'est pas lancé tant qu'un test n'a pas renvoyé une valeur."
  }],
  ["resolume", /\bresolume\b/, {
    title: "Resolume",
    cope: "",
    steps: ["https://resolume.com/download/"],
    note: "Installeur et licence Resolume. Resolume n'est pas lancé tant qu'un test n'a pas renvoyé une valeur."
  }],
  ["notch", /\bnotch\b/, {
    title: "Notch",
    cope: "",
    steps: ["https://www.notch.one/"],
    note: "Installeur et licence Notch. Notch n'est pas lancé tant qu'un test n'a pas renvoyé une valeur."
  }],
  ["aftereffects", /\bafter effects\b|\baftereffects\b/, {
    title: "After Effects",
    cope: "",
    steps: ["https://www.adobe.com/products/aftereffects.html"],
    note: "Installeur Creative Cloud et licence Adobe. After Effects n'est pas lancé tant qu'un test n'a pas renvoyé une valeur."
  }],
  ["max", /\bmax\/msp\b|\bmax msp\b/, {
    title: "Max/MSP",
    cope: "L'export .maxpat reste un fichier générable, pas une session Max.",
    steps: ["https://cycling74.com/downloads"],
    note: "Installeur Cycling '74. Max n'est pas ouvert tant qu'un test n'a pas renvoyé une valeur."
  }],
  ["puredata", /\bpure data\b|\bpuredata\b/, {
    title: "Pure Data",
    cope: "L'export .pd reste un fichier générable, pas une session Pd.",
    steps: ["brew install --cask pure-data", "https://puredata.info/downloads"],
    note: "La copie dans /Applications peut demander le mot de passe. Pure Data n'est pas ouvert tant qu'un test n'a pas renvoyé une valeur."
  }]
];

export function installProposals(text = "") {
  const t = norm(text);
  return INSTALLS.filter(([, re]) => re.test(t)).map(([id, , spec]) => ({
    id,
    title: spec.title,
    cope: spec.cope,
    steps: spec.steps,
    note: spec.note,
    reason: ["Installation proposée · " + spec.title, spec.cope, ...spec.steps, spec.note].filter(Boolean).join(" ")
  }));
}

export function unavailableHosts(text = "") {
  return installProposals(text);
}

export function detectRunnableEngines(text = "") {
  const t = norm(text);
  const engines = [];
  const push = id => { if (!engines.includes(id)) engines.push(id); };
  if (/\bglsl\b|\bfragment\b|\bshader\b|\bisf\b/.test(t)) push("glsl");
  if (/\bp5(?:\.js)?\b|\bprocessing\b/.test(t)) push("p5");
  if (/\bjavascript\b|\bjava script\b|\bsketch\b/.test(t)) push("sketch");
  return engines;
}

export function wantsOutputMix(text = "") {
  return /melang|mix|combin|assembl|ensemble|together|\+/.test(norm(text));
}

function palette(text) {
  const t = norm(text);
  const table = [
    [/rouge|red/, [214, 64, 52]],
    [/bleu|blue/, [64, 132, 214]],
    [/vert|green/, [64, 176, 112]],
    [/violet|purple/, [156, 92, 196]],
    [/or\b|gold|dore/, [214, 176, 84]],
    [/rose|pink/, [220, 112, 156]],
    [/blanc|white/, [232, 232, 236]]
  ];
  for (const [re, rgb] of table) if (re.test(t)) return rgb;
  return [126, 186, 204];
}

function mood(text) {
  const t = norm(text);
  return {
    rgb: palette(text),
    waves: /onde|wave|ripple|fluide|lumiere|lumineuse/.test(t),
    circles: /cercle|circle|bulle|particule|point/.test(t),
    mouse: /souris|mouse|pointeur|pointer|main/.test(t)
  };
}

export function glslRunsHere(source = "") {
  const s = String(source || "");
  if (!s.trim()) return false;
  if (/#version\s+300|out\s+vec4\b|\btexture\s*\(/.test(s)) return false;
  return /gl_FragColor/.test(s) && /void\s+main\s*\(/.test(s) && /precision\s+mediump\s+float/.test(s);
}

export function sketchRunsHere(script = "") {
  return /^\s*(background|fill|circle|rect|line|wave)\s*\(/m.test(String(script || ""));
}

export function webglFragment(text = "") {
  const { rgb, waves, circles } = mood(text);
  const [r, g, b] = rgb.map(n => (n / 255).toFixed(3));
  const freq = waves ? "22.0" : "10.0";
  const disc = circles || !waves
    ? "float disc = smoothstep(0.18, 0.0, length(uv - vec2(0.5 + 0.08 * sin(u_time), 0.5))); col = mix(col, vec3(1.0), disc * 0.35 * u_intensity);"
    : "float band = 0.5 + 0.5 * sin(uv.x * 6.0 + u_time); col = mix(col, vec3(1.0), band * 0.15);";
  return [
    "precision mediump float;",
    "uniform float u_time;",
    "uniform float u_intensity;",
    "uniform vec2 u_resolution;",
    "varying vec2 v_uv;",
    "void main(){",
    "  vec2 uv = v_uv;",
    `  float w = 0.5 + 0.5 * sin(uv.y * ${freq} + u_time * 2.0 + sin(uv.x * 8.0));`,
    `  vec3 col = mix(vec3(0.02, 0.04, 0.06), vec3(${r}, ${g}, ${b}), w * u_intensity);`,
    `  ${disc}`,
    "  gl_FragColor = vec4(col, 0.9);",
    "}"
  ].join("\n");
}

export function drawingScript(text = "") {
  const { rgb, waves, circles, mouse } = mood(text);
  const [r, g, b] = rgb;
  const lines = ["background(8,10,14)", `fill(${r},${g},${b},200)`];
  if (circles || mouse || !waves) lines.push(mouse ? "circle(mouseX,mouseY,78)" : "circle(width*0.5,height*0.48,90)");
  if (waves || !circles) lines.push("wave(height*0.58,34,0.02,1.6)");
  lines.push(`fill(${Math.max(0, r - 40)},${Math.min(255, g + 20)},${b},140)`);
  lines.push("rect(width*0.12,height*0.72,width*0.76,8)");
  return lines.join("\n");
}

function videoOutPort(type) {
  const labels = portLabels(type) || [];
  for (let i = 0; i < labels.length; i++) {
    const meta = portMeta(type, i);
    if (meta?.dir === "out" && (meta.data === "video" || meta.data === "any")) return i;
  }
  return null;
}

function cloneOps(ops) {
  return (ops || []).map(op => ({
    ...op,
    ...(op.params && typeof op.params === "object" ? { params: { ...op.params } } : {})
  }));
}

function pushConnect(ops, fromType, fromPort, toType, toPort) {
  const key = `${fromType}:${fromPort}>${toType}:${toPort}`;
  if (ops.some(o => o.op === "connect" && `${o.fromType}:${o.fromPort}>${o.toType}:${o.toPort}` === key)) return false;
  ops.push({ op: "connect", fromType, fromPort, toType, toPort });
  return true;
}

function ensureNode(ops, type, make) {
  const found = ops.find(o => o.op === "addNode" && o.type === type);
  if (found) {
    found.params = { ...(found.params || {}) };
    return { node: found, created: false };
  }
  const node = make();
  node.params = { ...(node.params || {}) };
  ops.push(node);
  return { node, created: true };
}

export function mergeRunnableSources(text = "", ops = []) {
  const next = cloneOps(ops);
  const engines = detectRunnableEngines(text);
  const unavailable = installProposals(text);
  let changed = false;
  const script = drawingScript(text);
  const fragment = webglFragment(text);

  if (engines.includes("glsl")) {
    const { node, created } = ensureNode(next, "shader", () => ({
      op: "addNode", type: "shader", x: 380, y: 90, allowDuplicate: true, title: "Shader · GLSL"
    }));
    if (created) changed = true;
    if (!glslRunsHere(node.params.glsl)) {
      node.params.glsl = fragment;
      node.params.intensity = node.params.intensity ?? 1;
      node.params.opacity = node.params.opacity ?? 0.9;
      if (!node.title) node.title = "Shader · GLSL";
      changed = true;
    }
  }
  if (engines.includes("p5")) {
    const { node, created } = ensureNode(next, "p5", () => ({
      op: "addNode", type: "p5", x: 70, y: 80, allowDuplicate: true, title: "Processing · p5"
    }));
    if (created) changed = true;
    if (!sketchRunsHere(node.params.script)) {
      node.params.script = script;
      node.params.seed = node.params.seed ?? 1;
      node.params.energy = node.params.energy ?? 0.7;
      if (!node.title) node.title = "Processing · p5";
      changed = true;
    }
  }
  if (engines.includes("sketch")) {
    const { node, created } = ensureNode(next, "sketch", () => ({
      op: "addNode", type: "sketch", x: 70, y: 250, allowDuplicate: true, title: "Sketch · JavaScript"
    }));
    if (created) changed = true;
    if (!sketchRunsHere(node.params.script)) {
      node.params.script = script;
      node.params.seed = node.params.seed ?? 2;
      node.params.energy = node.params.energy ?? 0.6;
      if (!node.title) node.title = "Sketch · JavaScript";
      changed = true;
    }
  }

  const drawings = ["p5", "sketch"].filter(type => engines.includes(type === "p5" ? "p5" : "sketch") || next.some(o => o.op === "addNode" && o.type === type && sketchRunsHere(o.params?.script)));
  if (engines.includes("glsl") && drawings.length) {
    const from = drawings[0];
    const port = videoOutPort(from);
    if (port != null && pushConnect(next, from, port, "shader", 0)) changed = true;
  }

  const mix = engines.length >= 2 || (wantsOutputMix(text) && videoProducers(next).length >= 2);
  if (mix) {
    const producers = videoProducers(next).filter(type => type !== "composite");
    if (producers.length >= 2) {
      const { created } = ensureNode(next, "composite", () => ({
        op: "addNode", type: "composite", x: 700, y: 90, allowDuplicate: true, title: "Mix"
      }));
      if (created) changed = true;
      const a = videoOutPort(producers[0]);
      const b = videoOutPort(producers[1]);
      if (a != null && pushConnect(next, producers[0], a, "composite", 0)) changed = true;
      if (b != null && pushConnect(next, producers[1], b, "composite", 1)) changed = true;
    }
  }

  const labels = [];
  if (engines.includes("glsl")) labels.push("GLSL");
  if (engines.includes("p5")) labels.push("Processing/p5");
  if (engines.includes("sketch")) labels.push("Sketch");
  const summary = changed && labels.length
    ? `CX · ${labels.join(" + ")} exécutable dans le même patch`
    : "";
  return { ops: next, engines, unavailable, summary };
}

function videoProducers(ops) {
  const types = [];
  for (const op of ops) {
    if (op.op !== "addNode" || types.includes(op.type)) continue;
    if (videoOutPort(op.type) != null) types.push(op.type);
  }
  return types;
}

export function cxChatReply({ ops = [], note = "", unavailable = [], proposals = null } = {}) {
  const hosts = (proposals || unavailable || []).map(item => item.reason).filter(Boolean);
  if (!ops.length) {
    return hosts.length ? `Rien n'a été généré pour le patch. ${hosts.join("\n")}` : "Rien n'a été généré.";
  }
  const lines = [`${ops.length} opération(s) prêtes. Le graphe ne change qu'après confirmation.`];
  if (ops.some(o => o.op === "addNode" && o.type === "shader" && glslRunsHere(o.params?.glsl))) {
    lines.push("GLSL : fragment WebGL1 (gl_FragColor, u_time, u_resolution, u_intensity) exécuté par le node Shader.");
  }
  if (ops.some(o => o.op === "addNode" && o.type === "p5" && sketchRunsHere(o.params?.script))) {
    lines.push("Processing / p5.js : le node p5 exécute background, fill, circle, rect, line et wave.");
  }
  if (ops.some(o => o.op === "addNode" && o.type === "sketch" && sketchRunsHere(o.params?.script))) {
    lines.push("JavaScript : le node Sketch exécute ce même dessin. Aucun JavaScript arbitraire n'est évalué.");
  }
  if (ops.some(o => o.op === "addNode" && o.type === "composite")) {
    lines.push("Mix : les sorties vidéo nommées sont reliées dans un node Composite.");
  }
  const types = [...new Set(ops.filter(o => o.op === "addNode").map(o => o.type))];
  if (types.length) lines.push("Nodes : " + types.join(", ") + ".");
  if (hosts.length) lines.push(hosts.join(" "));
  if (note) lines.push(String(note));
  return lines.join("\n");
}
