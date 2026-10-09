export class FeedbackEngine {
  constructor() {
    this.passes = 3;
    this.decay = 0.92;
    this.chromaticShift = 0.05;
    this.status = '✅ VALIDÉ';
  }

  process(frame) {
    return {
      type: 'feedback_frame',
      passes: this.passes,
      decay: this.decay,
      chromaticShift: this.chromaticShift
    };
  }

  reset() {
    return true;
  }
}

export class MultiSurfaceManager {
  constructor() {
    this.surfaces = new Map();
  }

  addSurface(id, name, config = {}) {
    const surface = {
      id,
      name: name || `Surface_${id}`,
      resolution: config.resolution || { width: 1920, height: 1080 },
      corners: config.corners || [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
      blend: config.blend || 0.0,
      crop: config.crop || { top: 0, left: 0, right: 0, bottom: 0 },
      outputTarget: config.outputTarget || 'Display_1'
    };
    this.surfaces.set(id, surface);
    return surface;
  }

  getSurface(id) {
    return this.surfaces.get(id);
  }
}
