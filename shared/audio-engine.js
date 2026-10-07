/**
 * Moteur audio Web Audio — démarrage/arrêt propres, pas de traitement résiduel.
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.nodes = new Map(); // nodeId -> { osc, gain, analyser, mic, stream, type }
    this.level = 0;
  }

  ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error("Web Audio API indisponible");
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  async resume() {
    const ctx = this.ensure();
    if (ctx.state === "suspended") await ctx.resume();
    return ctx;
  }

  async ensureTone(nodeId, { freq = 220, gain = 0.2 } = {}) {
    await this.resume();
    this.release(nodeId);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 256;
    osc.type = "sine";
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(analyser);
    analyser.connect(this.master);
    osc.start();
    this.nodes.set(nodeId, { type: "tone", osc, gain: g, analyser });
    return this.nodes.get(nodeId);
  }

  async ensureMic(nodeId) {
    await this.resume();
    this.release(nodeId);
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Micro indisponible");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const mic = this.ctx.createMediaStreamSource(stream);
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 256;
    const g = this.ctx.createGain();
    g.gain.value = 0.0; // monitoring off by default (évite larsen) — niveau via analyseur
    mic.connect(analyser);
    analyser.connect(g);
    // ne pas connecter au master pour éviter feedback haut-parleur
    this.nodes.set(nodeId, { type: "mic", mic, gain: g, analyser, stream });
    return this.nodes.get(nodeId);
  }

  setToneParams(nodeId, { freq, gain } = {}) {
    const n = this.nodes.get(nodeId);
    if (!n || n.type !== "tone") return;
    if (freq != null) n.osc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.02);
    if (gain != null) n.gain.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.02);
  }

  async ensureFilter(nodeId, { type = "lowpass", frequency = 800, q = 1, gain = 1 } = {}) {
    await this.resume();
    this.release(nodeId);
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 256;
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 110;
    osc.connect(filter);
    filter.connect(g);
    g.connect(analyser);
    analyser.connect(this.master);
    osc.start();
    this.nodes.set(nodeId, { type: "filter", osc, filter, gain: g, analyser });
    return this.nodes.get(nodeId);
  }

  setFilterParams(nodeId, { frequency, q, gain, type } = {}) {
    const n = this.nodes.get(nodeId);
    if (!n || n.type !== "filter") return;
    if (type) n.filter.type = type;
    if (frequency != null) n.filter.frequency.setTargetAtTime(frequency, this.ctx.currentTime, 0.02);
    if (q != null) n.filter.Q.setTargetAtTime(q, this.ctx.currentTime, 0.02);
    if (gain != null) n.gain.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.02);
  }

  async ensureDelay(nodeId, { delayTime = 0.25, feedback = 0.3, gain = 0.5 } = {}) {
    await this.resume();
    this.release(nodeId);
    const delay = this.ctx.createDelay(2.0);
    delay.delayTime.value = Math.max(0, Math.min(2, Number(delayTime) || 0));
    const fb = this.ctx.createGain();
    fb.gain.value = Math.max(0, Math.min(0.95, Number(feedback) || 0));
    const g = this.ctx.createGain();
    g.gain.value = Number(gain) || 0.5;
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 256;
    const osc = this.ctx.createOscillator();
    osc.frequency.value = 220;
    osc.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(g);
    g.connect(analyser);
    analyser.connect(this.master);
    osc.start();
    this.nodes.set(nodeId, { type: "delay", osc, delay, feedback: fb, gain: g, analyser });
    return this.nodes.get(nodeId);
  }

  readFft(nodeId) {
    const n = this.nodes.get(nodeId);
    if (!n?.analyser) return [];
    const buf = new Uint8Array(n.analyser.frequencyBinCount);
    n.analyser.getByteFrequencyData(buf);
    return Array.from(buf);
  }

  readLevel(nodeId) {
    const n = this.nodes.get(nodeId);
    if (!n?.analyser) return 0;
    const buf = new Uint8Array(n.analyser.frequencyBinCount);
    n.analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / buf.length);
  }

  release(nodeId) {
    const n = this.nodes.get(nodeId);
    if (!n) return;
    try { n.osc?.stop(); } catch { /* */ }
    try { n.osc?.disconnect(); } catch { /* */ }
    try { n.mic?.disconnect(); } catch { /* */ }
    try { n.gain?.disconnect(); } catch { /* */ }
    try { n.filter?.disconnect(); } catch { /* */ }
    try { n.delay?.disconnect(); } catch { /* */ }
    try { n.feedback?.disconnect(); } catch { /* */ }
    try { n.analyser?.disconnect(); } catch { /* */ }
    if (n.stream) n.stream.getTracks().forEach(t => t.stop());
    this.nodes.delete(nodeId);
  }

  releaseAll() {
    for (const id of [...this.nodes.keys()]) this.release(id);
  }

  /** Arrêt total : plus de traitement résiduel. */
  async shutdown() {
    this.releaseAll();
    if (this.ctx) {
      try { await this.ctx.close(); } catch { /* */ }
    }
    this.ctx = null;
    this.master = null;
    this.level = 0;
  }
}

export const sharedAudio = new AudioEngine();
