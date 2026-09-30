/**
 * Backend WebGPU V3.
 * Le runtime principal garde son fallback 2D/WebGL2 ; ce backend fournit
 * la voie compute/render moderne aux moteurs V3 qui la demandent.
 */

export function hasWebGPU() {
  return typeof navigator !== "undefined" && !!navigator.gpu;
}

export class WebGPUBackend {
  constructor({ powerPreference = "high-performance" } = {}) {
    this.powerPreference = powerPreference;
    this.adapter = null;
    this.device = null;
    this.ready = false;
    this.lost = false;
  }

  async init() {
    if (!hasWebGPU()) throw new Error("WebGPU indisponible");
    this.adapter = await navigator.gpu.requestAdapter({ powerPreference: this.powerPreference });
    if (!this.adapter) throw new Error("Aucun adaptateur WebGPU");
    this.device = await this.adapter.requestDevice();
    this.ready = true;
    this.device.lost.then(() => {
      this.lost = true;
      this.ready = false;
    }).catch(() => {});
    return this;
  }

  requireDevice() {
    if (!this.device || !this.ready) throw new Error("WebGPU non initialisé");
    return this.device;
  }

  createShaderModule(code, label = "No-de WGSL") {
    if (!String(code || "").trim()) throw new Error("WGSL vide");
    return this.requireDevice().createShaderModule({ code: String(code), label });
  }

  async compileWGSL(code, label = "No-de WGSL") {
    const module = this.createShaderModule(code, label);
    if (typeof module.getCompilationInfo === "function") {
      const info = await module.getCompilationInfo();
      const errors = info.messages.filter(m => m.type === "error");
      if (errors.length) throw new Error(errors.map(e => e.message).join(" · "));
      return { module, messages: info.messages };
    }
    return { module, messages: [] };
  }

  createStorageBuffer(byteLength, usage = null) {
    const GPUUsage = typeof GPUBufferUsage !== "undefined" ? GPUBufferUsage : null;
    if (!GPUUsage) throw new Error("GPUBufferUsage indisponible");
    return this.requireDevice().createBuffer({
      size: Math.max(4, Math.ceil(Number(byteLength) / 4) * 4),
      usage: usage ?? (GPUUsage.STORAGE | GPUUsage.COPY_DST | GPUUsage.COPY_SRC)
    });
  }

  createRenderTarget(width, height, format = "rgba8unorm") {
    const GPUUsage = typeof GPUTextureUsage !== "undefined" ? GPUTextureUsage : null;
    if (!GPUUsage) throw new Error("GPUTextureUsage indisponible");
    return this.requireDevice().createTexture({
      size: [Math.max(1, width | 0), Math.max(1, height | 0), 1],
      format,
      usage: GPUUsage.RENDER_ATTACHMENT | GPUUsage.TEXTURE_BINDING | GPUUsage.COPY_SRC | GPUUsage.COPY_DST | GPUUsage.STORAGE_BINDING
    });
  }

  capabilities() {
    return {
      backend: "webgpu",
      ready: this.ready,
      compute: true,
      storageBuffers: true,
      shaderLanguage: "WGSL",
      adapter: this.adapter?.name || null
    };
  }
}
