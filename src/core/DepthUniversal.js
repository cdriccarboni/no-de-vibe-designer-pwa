export class DepthSource {
  constructor(options = {}) {
    this.sourceId = options.sourceId || 'depth_stream_0';
    this.width = options.width || 640;
    this.height = options.height || 480;
    this.depthFormat = options.depthFormat || 'U16';
    this.timestamp = Date.now();
    this.confidence = options.confidence ?? (options.realDepth ? 0.98 : 0.72);
    this.realDepth = Boolean(options.realDepth); // REAL DEPTH vs ESTIMATED DEPTH
    this.status = options.status || (this.realDepth ? '✅ VALIDÉ' : '🧪 EXPÉRIMENTAL');
  }
}

export class DepthUniversal {
  constructor() {
    this.id = 'node_depth_universal';
    this.name = 'Depth Universal';
    this.mode = 'ESTIMATED DEPTH'; // 'REAL DEPTH' | 'ESTIMATED DEPTH' | 'NO DEPTH'
  }

  async detectHardware() {
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.hasDepthSensor) {
      const hasHW = await window.electronAPI.hasDepthSensor();
      if (hasHW) {
        this.mode = 'REAL DEPTH';
        return true;
      }
    }
    this.mode = 'ESTIMATED DEPTH';
    return false;
  }

  processFrame(frame, params = {}) {
    if (!frame) {
      return new DepthSource({ realDepth: false, status: '⏸ NON DISPONIBLE' });
    }
    const real = this.mode === 'REAL DEPTH';
    return new DepthSource({
      width: frame.width || 640,
      height: frame.height || 480,
      realDepth: real,
      confidence: real ? 0.98 : 0.75,
      status: real ? '✅ VALIDÉ' : '🧪 EXPÉRIMENTAL'
    });
  }
}

export class DepthMaskProcessor {
  static process(depthSource, config = {}) {
    const {
      near = 0.1,
      far = 0.8,
      range = 0.5,
      softness = 0.2,
      feather = 0.1,
      invert = false,
      blur = 0.0,
      threshold = 0.5,
      smooth = 0.5,
      temporalStability = 0.8
    } = config;

    return {
      type: 'mask_frame',
      width: depthSource ? depthSource.width : 640,
      height: depthSource ? depthSource.height : 480,
      isRealDepth: depthSource ? depthSource.realDepth : false,
      params: { near, far, range, softness, feather, invert, blur, threshold, smooth, temporalStability },
      timestamp: Date.now()
    };
  }
}
