// AudioWorkletProcessor « nvd-libpd-player » : lit des blocs stéréo poussés par le thread principal
// (port.postMessage({ type: "push", left, right })) et réclame la suite (« need ») quand la file baisse.
// Sous-alimentation = silence compté (underruns), jamais de son inventé.
class NvdLibpdPlayer extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.queue = []; this.offset = 0; this.queued = 0; this.underruns = 0; this.asked = false;
    this.low = options?.processorOptions?.lowWater ?? 4096;
    this.port.onmessage = e => {
      const d = e.data || {};
      if (d.type === "push") { this.queue.push([d.left, d.right || d.left]); this.queued += d.left.length; this.asked = false; }
      else if (d.type === "clear") { this.queue = []; this.offset = 0; this.queued = 0; }
      else if (d.type === "stats") this.port.postMessage({ type: "stats", queued: this.queued, underruns: this.underruns });
    };
  }
  process(_inputs, outputs) {
    const out = outputs[0]; const L = out[0], R = out[1] || out[0];
    for (let i = 0; i < L.length; i++) {
      const chunk = this.queue[0];
      if (!chunk) { L[i] = 0; R[i] = 0; if (i === 0) this.underruns++; continue; }
      L[i] = chunk[0][this.offset]; R[i] = chunk[1][this.offset];
      this.offset++; this.queued--;
      if (this.offset >= chunk[0].length) { this.queue.shift(); this.offset = 0; }
    }
    if (this.queued < this.low && !this.asked) { this.asked = true; this.port.postMessage({ type: "need", queued: this.queued }); }
    return true;
  }
}
registerProcessor("nvd-libpd-player", NvdLibpdPlayer);
