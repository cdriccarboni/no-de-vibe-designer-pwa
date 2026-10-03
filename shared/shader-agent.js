/**
 * Agent shader. Il n'est actif que si GLSL et WebGL sont déjà prouvés.
 * Le succès exige une compilation observée et une image exécutée, jamais le texte seul.
 */
export const WAVE_PARAMS = Object.freeze({
  amplitude: 0.08,
  frequency: 6,
  speed: 1.2,
  phase: 0.4
});

const BLOCKED = ["faust", "rust", "touchdesigner", "cpp", "webgpu", "wgsl"];

export function nativeBridgeLabel(health) {
  return health?.ok && health.commit
    ? `CX ${health.commit}`
    : "Pont local arrêté : fonctions natives indisponibles";
}

export function activeAgents(doc, probes = {}) {
  const rows = Object.fromEntries((doc?.rows || []).map(row => [row.id, row.state || row.status]));
  const active = [];
  if (rows.python === "DISPONIBLE" && probes.python === 42) active.push("python");
  if (rows.javascript === "DISPONIBLE" && probes.javascript === 42) active.push("javascript");
  if (rows.glsl === "DISPONIBLE" && rows.webgl === "DISPONIBLE") active.push("shader");
  return { active, inactive: BLOCKED.filter(id => !active.includes(id)) };
}

export function waveShaderSource() {
  return {
    vertex: `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`,
    fragment: `#version 300 es
precision mediump float;
uniform sampler2D u_image;
uniform float u_amplitude;
uniform float u_frequency;
uniform float u_speed;
uniform float u_phase;
uniform float u_time;
in vec2 v_uv;
out vec4 outColor;
void main() {
  vec2 uv = v_uv;
  uv.x += sin(uv.y * u_frequency + u_time * u_speed + u_phase) * u_amplitude;
  outColor = texture(u_image, uv);
}`
  };
}

export function correctedWaveShaderSource() {
  return {
    vertex: `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`,
    fragment: `#version 300 es
precision mediump float;
uniform float u_amplitude;
uniform float u_frequency;
uniform float u_speed;
uniform float u_phase;
uniform float u_time;
out vec4 outColor;
void main() {
  float wave = sin(gl_FragCoord.y * u_frequency * 0.02 + u_time * u_speed + u_phase);
  outColor = vec4(0.2 + u_amplitude * wave, 0.45, 0.8, 1.0);
}`
  };
}

function isWaveRequest(text) {
  return /ondul|shader|glsl/.test(String(text || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""));
}

function sawFrame(result) {
  return Boolean(result?.compile === true && result?.observed === true && Array.isArray(result?.pixel) && result.pixel.length >= 3);
}

export function attachWave(project, source, preview = "") {
  const camera = (project.nodes || []).find(node => node.type === "camera");
  const shader = (project.nodes || []).find(node => node.type === "shader");
  if (!camera || !shader) return { ok: false, error: "caméra ou shader absent" };
  camera.title = "Caméra";
  shader.title = "Ondulation";
  shader.params = {
    ...(shader.params || {}),
    ...WAVE_PARAMS,
    vertex: source.vertex,
    fragment: source.fragment,
    preview: preview || ""
  };
  return {
    ok: true,
    camera: camera.title,
    shader: shader.title,
    cameraId: camera.id,
    shaderId: shader.id
  };
}

export async function runShaderAgent(session, text, compileAndRun, { eligible = false } = {}) {
  const steps = [{ stage: "intent", agent: eligible ? "shader" : "inactif" }];
  if (!eligible) return { ran: false, steps, error: "agent shader inactif" };
  if (!isWaveRequest(text)) return { ran: false, steps, error: "demande hors shader" };
  if (typeof compileAndRun !== "function") return { ran: false, steps, error: "aucun moteur de compilation" };

  let source = waveShaderSource();
  steps.push({ stage: "code", language: "glsl" });
  let result = await compileAndRun(source);
  steps.push({ stage: "run", compile: result?.compile === true, observed: result?.observed === true });
  steps.push({ stage: "test", pass: sawFrame(result) });
  if (!sawFrame(result)) {
    steps.push({ stage: "diagnose", detail: String(result?.error || "compilation ou image absente") });
    source = correctedWaveShaderSource();
    steps.push({ stage: "correct", language: "glsl" });
    result = await compileAndRun(source);
    steps.push({ stage: "run", compile: result?.compile === true, observed: result?.observed === true });
    steps.push({ stage: "test", pass: sawFrame(result) });
    if (!sawFrame(result)) {
      steps.push({ stage: "return", ran: false });
      return { ran: false, steps, error: String(result?.error || "shader non exécuté") };
    }
  }
  const attached = attachWave(session.project, source, result.preview || "");
  if (!attached.ok) return { ran: false, steps, error: attached.error };
  steps.push({ stage: "return", pixel: result.pixel, preview: result.preview || "" });
  return {
    ran: true,
    compile: true,
    pixel: result.pixel,
    preview: result.preview || "",
    ...attached,
    steps
  };
}
