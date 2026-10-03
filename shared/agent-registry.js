/**
 * Registre central des agents de No[co]de Vibe Designer.
 * Un fichier de configuration ne rend aucun agent actif.
 * DISPONIBLE exige une sonde sur cette machine qui a renvoyé une valeur.
 */
import { executeWaveShader } from "./shader-agent.js";

export const AGENT_STATUSES = Object.freeze([
  "NON TESTÉ",
  "EXPÉRIMENTAL",
  "VALIDÉ",
  "VALIDÉ PARTIELLEMENT",
  "ÉCHEC",
  "NON DISPONIBLE"
]);

const P1 = 1;
const P2 = 2;
const P3 = 3;

function row(id, agent, language, engine, capabilities, priority) {
  const native = priority < 3;
  return {
    id,
    agent,
    language,
    engine,
    capabilities,
    priority,
    native,
    defaultStatus: "NON TESTÉ",
    executable: native,
    windowsTested: false
  };
}

export const AGENT_CATALOG = Object.freeze([
  row("javascript", "JavaScript", "javascript", "node", ["script", "realtime", "2d"], P1),
  row("node", "Node.js", "javascript", "node", ["script", "realtime"], P1),
  row("typescript", "TypeScript", "typescript", "tsc", ["script"], P1),
  row("python", "Python", "python", "python3", ["script"], P1),
  row("java", "Java", "java", "java", ["script"], P1),
  row("glsl", "GLSL", "glsl", "webgl2", ["shaders"], P1),
  row("webgl", "WebGL", "glsl", "webgl2", ["2d", "video", "gpu", "shaders"], P1),
  row("webgpu", "WebGPU", "wgsl", "webgpu", ["gpu"], P1),
  row("wgsl", "WGSL", "wgsl", "webgpu", ["shaders", "gpu"], P1),
  row("c", "C", "c", "clang", ["native"], P1),
  row("cpp", "C++", "c++", "clang++", ["native"], P1),
  row("rust", "Rust", "rust", "rustc", ["native"], P1),
  row("swift", "Swift", "swift", "swiftc", ["native"], P1),
  row("metal", "Metal", "metal", "metal", ["gpu"], P1),
  row("ffmpeg", "FFmpeg", "ffmpeg", "ffmpeg", ["video", "audio"], P1),
  row("dsp", "Audio/DSP", "dsp", "coreaudio", ["audio"], P1),
  row("opencv", "OpenCV", "python", "opencv", ["vision"], P1),
  row("osc", "OSC", "osc", "osc", ["osc"], P1),
  row("midi", "MIDI", "midi", "coremidi", ["midi"], P1),
  row("dmx", "DMX", "dmx", "dmx", ["dmx"], P1),
  row("artnet", "Art-Net", "art-net", "artnet", ["dmx", "artnet"], P1),
  row("sacn", "sACN", "sacn", "sacn", ["dmx", "sacn"], P1),
  row("ndi", "NDI", "c", "ndi", ["video"], P1),
  row("touchdesigner", "TouchDesigner", "python", "touchdesigner", ["2d", "3d", "video"], P1),
  row("godot", "Godot", "gdscript", "godot", ["3d"], P2),
  row("unreal", "Unreal", "c++", "unreal", ["3d"], P2),
  row("openframeworks", "openFrameworks", "c++", "openframeworks", ["2d", "3d"], P2),
  row("cinder", "Cinder", "c++", "cinder", ["2d", "3d"], P2),
  row("juce", "JUCE", "c++", "juce", ["audio"], P2),
  row("faust", "Faust", "faust", "faust", ["audio", "dsp"], P2),
  row("supercollider", "SuperCollider", "supercollider", "sclang", ["audio"], P2),
  row("puredata", "Pure Data", "puredata", "pd", ["audio"], P2),
  row("processing", "Processing", "processing", "processing", ["2d"], P2),
  row("p5", "p5.js", "javascript", "p5", ["2d"], P2),
  row("unity", "Unity", "csharp", "unity", ["3d"], P2),
  row("vvvv", "vvvv/VL", "vl", "vvvv", ["2d", "3d"], P3)
]);

export function normalizeRequest(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function stamp(base, patch = {}) {
  const status = AGENT_STATUSES.includes(patch.status) ? patch.status : base.defaultStatus;
  const executable = base.priority === 3 ? patch.windowsTested === true : patch.executable !== false;
  return {
    id: base.id,
    agent: base.agent,
    name: base.agent,
    label: base.agent,
    language: base.language,
    engine: base.engine,
    version: patch.version || "",
    status,
    state: status,
    capabilities: base.capabilities,
    lastTest: patch.lastTest || "",
    error: patch.error || (status === "NON TESTÉ" ? "pas encore sondé" : ""),
    value: patch.value ?? null,
    priority: base.priority,
    native: base.native,
    executable,
    windowsTested: patch.windowsTested === true,
    platform: base.priority === 3 ? "non-mac" : "macOS",
    test: patch.lastTest || "",
    proof: patch.value == null || patch.value === "" ? "" : String(patch.value),
    detect: patch.lastTest || "",
    install: "",
    installUrl: "",
    launch: base.engine,
    talk: base.priority === 3 ? "non proposé" : base.engine
  };
}

export function defaultRegistry(meta = {}) {
  return {
    product: "No[co]de Vibe Designer",
    probed: false,
    probedAt: "",
    host: meta.host || "",
    os: meta.os || "",
    arch: meta.arch || "",
    note: "Aucun agent n'est actif tant qu'une sonde n'a pas renvoyé une valeur.",
    rows: AGENT_CATALOG.map(base => stamp(base))
  };
}

export function registryFromProbes(patches = {}, meta = {}) {
  return {
    product: "No[co]de Vibe Designer",
    probed: true,
    probedAt: meta.probedAt || "",
    host: meta.host || "",
    os: meta.os || "",
    arch: meta.arch || "",
    note: "Statuts issus d'une sonde sur cette machine, pas d'un fichier de configuration.",
    rows: AGENT_CATALOG.map(base => stamp(base, patches[base.id] || {}))
  };
}

export function disponibleRows(registry) {
  if (!registry?.probed) return [];
  return (registry.rows || []).filter(row =>
    row.status === "VALIDÉ"
    && row.executable !== false
    && row.value !== null
    && row.value !== undefined
    && row.value !== ""
    && (row.priority !== 3 || row.windowsTested === true)
  );
}

function rankRequest(text, registry) {
  const available = new Map(disponibleRows(registry).map(row => [row.id, row]));
  const t = normalizeRequest(text);
  const wanted = [];
  const add = (...ids) => {
    for (const id of ids) if (!wanted.includes(id)) wanted.push(id);
  };
  if (/ondul|shader|glsl/.test(t)) add("glsl", "webgl", "javascript");
  if (/webgpu|\bwgsl\b/.test(t)) add("webgpu", "wgsl");
  if (/python/.test(t)) add("python");
  if (/typescript|\btsc\b/.test(t)) add("typescript");
  if (/\bnode\b/.test(t)) add("node");
  if (/\brust\b/.test(t)) add("rust");
  if (/\bswift\b/.test(t)) add("swift");
  if (/metal/.test(t)) add("metal");
  if (/ffmpeg/.test(t)) add("ffmpeg");
  if (/opencv|vision/.test(t)) add("opencv");
  if (/\bosc\b/.test(t)) add("osc");
  if (/midi/.test(t)) add("midi");
  if (/\bdmx\b/.test(t)) add("dmx");
  if (/art-?net/.test(t)) add("artnet");
  if (/sacn|e1\.31/.test(t)) add("sacn");
  if (/\bndi\b/.test(t)) add("ndi");
  if (/touchdesigner/.test(t)) add("touchdesigner");
  if (/c\+\+|clang\+\+/.test(t)) add("cpp");
  if (/(^|[^a-z])c([^a-z+]|$)|langage c/.test(t)) add("c");
  if (/audio|\bdsp\b/.test(t)) add("dsp");
  if (!wanted.length) add("javascript");
  return { wanted, available };
}

export function selectAgentsForRequest(text, registry) {
  const { wanted, available } = rankRequest(text, registry);
  return wanted.map(id => available.get(id)).filter(Boolean).slice(0, 3);
}

export function experimentalMark(status) {
  return status === "EXPÉRIMENTAL" || status === "VALIDÉ PARTIELLEMENT" ? "EXPÉRIMENTAL" : "";
}

export function consultAgents(text, registry) {
  const agents = selectAgentsForRequest(text, registry);
  const byId = new Map((registry?.rows || []).map(row => [row.id, row]));
  const { wanted } = rankRequest(text, registry);
  const experimental = wanted.map(id => byId.get(id)).filter(row =>
    row && experimentalMark(row.status) && !agents.some(agent => agent.id === row.id && agent.status === "VALIDÉ")
    && (row.status === "EXPÉRIMENTAL" || row.status === "VALIDÉ PARTIELLEMENT")
  );
  const chosenPartial = agents.filter(agent => experimentalMark(agent.status));
  const named = [...experimental, ...chosenPartial];
  const notice = named.length
    ? `EXPÉRIMENTAL · ${named.map(agent => agent.agent + " · " + agent.status).join(", ")}`
    : "";
  return {
    consulted: Boolean(registry?.probed),
    claimsWebcam: false,
    agents,
    experimental: named,
    notice
  };
}

export function dspChecksum() {
  let y = 0;
  let acc = 0;
  for (let i = 0; i < 64; i += 1) {
    const x = i === 0 ? 1 : 0;
    y += 0.25 * (x - y);
    acc += y;
  }
  return Math.round(acc * 1000);
}

export function browserProbeRegistry(gl, meta = {}) {
  const patches = {};
  let value = null;
  let error = "";
  try {
    value = Function("return 40 + 2")();
  } catch (err) {
    error = err?.message || String(err);
  }
  const jsTest = "Function('return 40 + 2')()";
  if (value === 42) {
    patches.javascript = { status: "VALIDÉ", version: "navigateur", lastTest: jsTest, error: "", value: 42 };
  } else {
    patches.javascript = { status: "ÉCHEC", version: "", lastTest: jsTest, error: error || "valeur différente de 42", value: null };
  }
  const wave = executeWaveShader(gl);
  const glslTest = "WebGL2Backend.compile + lecture du pixel";
  if (wave.compile === true && wave.observed === true && Array.isArray(wave.pixel)) {
    const pixel = wave.pixel.join(",");
    patches.glsl = { status: "VALIDÉ", version: "WebGL 2.0", lastTest: glslTest, error: "", value: pixel };
    patches.webgl = { status: "VALIDÉ", version: "WebGL 2.0", lastTest: glslTest, error: "", value: pixel };
  } else {
    const reason = wave.error || "compilation non observée";
    patches.glsl = { status: "ÉCHEC", version: "", lastTest: glslTest, error: reason, value: null };
    patches.webgl = { status: "ÉCHEC", version: "", lastTest: glslTest, error: reason, value: null };
  }
  return registryFromProbes(patches, {
    ...meta,
    note: "Sonde navigateur : seuls JavaScript et GLSL/WebGL peuvent être validés ici."
  });
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[ch]));
}

export function renderAgentTable(registry) {
  const rows = registry?.rows || [];
  const head = "<tr><th>Agent</th><th>Langage</th><th>Moteur</th><th>Version</th><th>Statut</th><th>Capacités</th><th>Dernier test</th><th>Erreur</th><th></th></tr>";
  const body = rows.map(row => {
    const mark = experimentalMark(row.status);
    const status = mark && !String(row.status).includes("EXPÉRIMENTAL") ? `${row.status} · EXPÉRIMENTAL` : row.status;
    const action = row.status === "ÉCHEC" ? "RÉESSAYER" : "TESTER";
    return `<tr><td>${esc(row.agent)}</td><td>${esc(row.language)}</td><td>${esc(row.engine)}</td><td>${esc(row.version)}</td><td>${esc(status)}</td><td>${esc((row.capabilities || []).join(", "))}</td><td>${esc(row.lastTest)}</td><td>${esc(row.error)}</td><td><button type="button" data-test-agent="${esc(row.id)}">${action}</button></td></tr>`;
  }).join("");
  const ready = disponibleRows(registry).map(row => row.agent);
  const lead = registry?.probed
    ? `Sonde ${esc(registry.probedAt || "")} · ${esc(registry.host || "")} · ${esc(registry.os || "")} ${esc(registry.arch || "")}. VALIDÉ : ${esc(ready.join(", ") || "aucun")}. Les autres lignes restent visibles.`
    : "NON TESTÉ. Un fichier de configuration n'active aucun agent.";
  return `<p>${lead}</p><table class="agent-registry">${head}${body}</table>`;
}
