export class DepthUniversal {
  constructor() {
    this.id = 'node_depth_universal';
    this.name = 'Depth Universal';
    this.status = '🧪 EXPÉRIMENTAL';
    this.hasNativeHardware = false;
  }

  async detectHardware() {
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.hasDepthSensor) {
      this.hasNativeHardware = await window.electronAPI.hasDepthSensor();
    }
    return this.hasNativeHardware;
  }

  process(videoFrame) {
    return {
      type: 'depthmap',
      width: videoFrame ? videoFrame.width || 512 : 512,
      height: videoFrame ? videoFrame.height || 512 : 512,
      hardwareUsed: this.hasNativeHardware ? 'Native LiDAR/ToF/Kinect' : 'Local Heuristic Fallback',
      status: this.status
    };
  }
}
