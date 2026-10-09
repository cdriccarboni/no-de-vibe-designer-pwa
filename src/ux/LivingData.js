export class LivingData {
  static getSensorState() {
    return {
      pointer: window.lastPointerState || { x: 0, y: 0 },
      orientation: window.lastOrientationState || { alpha: 0, beta: 0, gamma: 0 },
      audioLevel: window.lastAudioLevel || 0,
      motionDelta: window.lastMotionDelta || 0
    };
  }
}
