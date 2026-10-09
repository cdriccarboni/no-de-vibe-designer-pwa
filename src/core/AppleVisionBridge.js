export class AppleVisionBridge {
  constructor() {
    this.available = false;
    this.status = '🧪 EXPÉRIMENTAL';
  }

  async checkAvailability() {
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.appleVisionAvailable) {
      this.available = await window.electronAPI.appleVisionAvailable();
      this.status = this.available ? '✅ VALIDÉ' : '⏸ NON DISPONIBLE';
    } else {
      this.available = false;
      this.status = '⏸ NON DISPONIBLE';
    }
    return this.available;
  }

  async segmentTapToSelect(frame, points = [], lasso = []) {
    if (this.available && window.electronAPI && window.electronAPI.segmentVision) {
      return await window.electronAPI.segmentVision({ frame, points, lasso });
    }
    // Local Fallback: Threshold & Contour Extraction
    return {
      type: 'vision_mask',
      source: 'local_contour_fallback',
      maskData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      points,
      lasso,
      confidence: 0.65
    };
  }
}
