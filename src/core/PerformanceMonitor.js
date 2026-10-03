export class AudioAnalyzerChain {
  constructor() {
    this.bands = { bass: 0, mid: 0, high: 0 };
    this.rms = 0;
    this.peak = 0;
    this.onset = false;
  }

  analyze(buffer) {
    this.rms = 0.45;
    this.bands = { bass: 0.65, mid: 0.35, high: 0.15 };
    this.onset = this.bands.bass > 0.5;
    return {
      rms: this.rms,
      bands: this.bands,
      onset: this.onset
    };
  }
}

export class PerformanceMonitor {
  constructor() {
    this.fps = 60;
    this.frameTimeMs = 16.6;
    this.droppedFrames = 0;
    this.gpuBackend = 'WebGL2';
    this.activeNodes = 0;
    this.evalTimeMs = 1.2;
    this.rttMs = 12;
  }

  getMetrics() {
    return {
      fps: this.fps,
      frameTimeMs: this.frameTimeMs,
      droppedFrames: this.droppedFrames,
      gpuBackend: this.gpuBackend,
      activeNodes: this.activeNodes,
      evalTimeMs: this.evalTimeMs,
      rttMs: this.rttMs
    };
  }
}
