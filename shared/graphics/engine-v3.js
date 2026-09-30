/**
 * Graphics Engine V3 — registre commun.
 * Les moteurs/effets utilisent la même API, quelle que soit la voie
 * WebGPU / WebGL2 / CPU choisie par la machine.
 */

import { hasWebGPU, WebGPUBackend } from "./webgpu-v3.js";

export const GRAPHICS_BACKENDS = Object.freeze(["webgpu", "webgl2", "cpu"]);

export const V3_EFFECT_FAMILIES = Object.freeze({
  texture: ["composite", "transform", "threshold", "mirror", "refraction", "fluidwarp"],
  feedback: ["feedbackfx", "reactiondiffusion", "ribbontrail", "ripple"],
  particles: ["flowfield", "swarm", "sand", "pointcloud"],
  body: ["presence", "livingshadow", "bodyclone", "threadcurtain"],
  shader: ["shader", "creativefx", "storm", "bending", "transmute"],
  mapping: ["mapping", "stage-output"]
});

export function detectGraphicsCapabilities() {
  let webgl2 = false;
  try {
    if (typeof document !== "undefined") {
      const c = document.createElement("canvas");
      webgl2 = !!c.getContext("webgl2");
    }
  } catch { webgl2 = false; }
  return {
    webgpu: hasWebGPU(),
    webgl2,
    cpu: true,
    compute: hasWebGPU(),
    preferred: hasWebGPU() ? "webgpu" : (webgl2 ? "webgl2" : "cpu")
  };
}

export async function createGraphicsEngineV3({
  preferred = "auto",
  powerPreference = "high-performance"
} = {}) {
  const caps = detectGraphicsCapabilities();
  const wanted = preferred === "auto" ? caps.preferred : preferred;
  if (!GRAPHICS_BACKENDS.includes(wanted)) throw new Error(`Backend graphique inconnu : ${wanted}`);

  if (wanted === "webgpu" && caps.webgpu) {
    try {
      const backend = await new WebGPUBackend({ powerPreference }).init();
      return {
        version: 3,
        backend: "webgpu",
        driver: backend,
        capabilities: backend.capabilities(),
        effectFamilies: V3_EFFECT_FAMILIES
      };
    } catch (error) {
      if (preferred !== "auto") throw error;
    }
  }

  if ((wanted === "webgl2" || preferred === "auto") && caps.webgl2) {
    return {
      version: 3,
      backend: "webgl2",
      driver: null,
      capabilities: { backend: "webgl2", ready: true, compute: false, shaderLanguage: "GLSL" },
      effectFamilies: V3_EFFECT_FAMILIES
    };
  }

  return {
    version: 3,
    backend: "cpu",
    driver: null,
    capabilities: { backend: "cpu", ready: true, compute: false, shaderLanguage: null },
    effectFamilies: V3_EFFECT_FAMILIES
  };
}
