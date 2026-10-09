export class RenderRecorder {
  constructor() {
    this.status = 'READY'; // 'READY' | 'RECORDING' | 'RENDERING' | 'ERROR'
    this.recordedFrames = [];
  }

  startRecord(stream) {
    if (!stream) {
      this.status = 'ERROR';
      return false;
    }
    this.status = 'RECORDING';
    return true;
  }

  stopRecord() {
    if (this.status === 'RECORDING') {
      this.status = 'READY';
      return true;
    }
    return false;
  }

  captureFrame(canvas) {
    if (!canvas || typeof canvas.toDataURL !== 'function') return null;
    return canvas.toDataURL('image/png');
  }
}
