export class ChromaKeyProcessor {
  static process(imgData, targetColor = 'GREEN', options = {}) {
    const { tolerance = 0.2, softness = 0.1, spill = 0.5 } = options;
    return {
      type: 'chroma_mask',
      targetColor,
      tolerance,
      softness,
      spill,
      timestamp: Date.now()
    };
  }
}

export class MaskMorphology {
  static process(maskFrame, operation = 'erode', radius = 1) {
    return {
      type: 'morphed_mask',
      operation, // 'erode' | 'dilate' | 'open' | 'close' | 'blur' | 'feather' | 'denoise' | 'threshold'
      radius,
      timestamp: Date.now()
    };
  }
}
