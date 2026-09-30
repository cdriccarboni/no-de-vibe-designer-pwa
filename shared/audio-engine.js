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


  async attachPlayerFile(slot, file, opts = {}) {
    const id = `player:${Math.max(1, Math.min(12, Number(slot) || 1))}`;
    await this.resume();
    this.release(id);

    if (!file) throw new Error("Fichier audio manquant");
    const el = document.createElement("audio");
    el.preload = "auto";
    el.playsInline = true;
    el.src = typeof file === "string" ? file : URL.createObjectURL(file);

    await new Promise((resolve, reject) => {
      el.onloadedmetadata = () => resolve();
      el.onerror = () => reject(new Error("Impossible de charger le fichier audio"));
    });

    const source = this.ctx.createMediaElementSource(el);
    const gain = this.ctx.createGain();
    const pan = typeof this.ctx.createStereoPanner === "function" ? this.ctx.createStereoPanner() : null;
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 256;

    source.connect(gain);
    if (pan) {
      gain.connect(pan);
      pan.connect(analyser);
    } else {
      gain.connect(analyser);
    }
    analyser.connect(this.master);

    const state = {
      type:"player",
      slot:Number(slot),
      el, source, gain, pan, analyser,
      objectUrl: typeof file === "string" ? "" : el.src,
      name: opts.name || file?.name || `Player ${slot}`,
      inPoint: Math.max(0, Number(opts.inPoint) || 0),
      loopStart: Math.max(0, Number(opts.loopStart) || 0),
      loopEnd: Math.max(0, Number(opts.loopEnd) || 0),
      outPoint: Math.max(0, Number(opts.outPoint) || 0),
      loop: !!opts.loop
    };
    gain.gain.value = Math.max(0, Math.min(1.5, Number(opts.gain ?? 1)));
    if (pan) pan.pan.value = Math.max(-1, Math.min(1, Number(opts.pan ?? 0)));
    this.nodes.set(id, state);

    el.addEventListener("timeupdate", () => {
      const n = this.nodes.get(id);
      if (!n || n.type !== "player") return;
      const t = el.currentTime || 0;
      if (n.loop && n.loopEnd > n.loopStart && t >= n.loopEnd) {
        el.currentTime = n.loopStart;
        el.play().catch(() => {});
      } else if (n.outPoint > n.inPoint && t >= n.outPoint) {
        el.pause();
        el.currentTime = n.inPoint;
      }
    });

    return this.playerState(slot);
  }

  playerNode(slot) {
    return this.nodes.get(`player:${Math.max(1, Math.min(12, Number(slot) || 1))}`) || null;
  }

  playerState(slot) {
    const n = this.playerNode(slot);
    if (!n || n.type !== "player") {
      return { slot:Number(slot), loaded:false, playing:false, paused:false, name:"", duration:0, currentTime:0, gain:1, pan:0, loop:false, inPoint:0, loopStart:0, loopEnd:0, outPoint:0 };
    }
    return {
      slot:n.slot, loaded:true, playing:!n.el.paused, paused:n.el.paused,
      name:n.name || "", duration:Number(n.el.duration)||0, currentTime:Number(n.el.currentTime)||0,
      gain:Number(n.gain?.gain?.value ?? 1), pan:Number(n.pan?.pan?.value ?? 0),
      loop:!!n.loop, inPoint:n.inPoint||0, loopStart:n.loopStart||0, loopEnd:n.loopEnd||0, outPoint:n.outPoint||0
    };
  }

  playerBankState() {
    return Array.from({ length:12 }, (_, i) => this.playerState(i + 1));
  }

  async controlPlayer(slot, action, value = null) {
    const n = this.playerNode(slot);
    if (!n || n.type !== "player") throw new Error(`Lecteur ${slot} : aucun son chargé`);
    await this.resume();
    const a = String(action || "play").toLowerCase();

    if (a === "play" || a === "go") {
      if (n.el.currentTime < n.inPoint || (n.outPoint > n.inPoint && n.el.currentTime >= n.outPoint)) n.el.currentTime = n.inPoint;
      await n.el.play();
    } else if (a === "pause") {
      n.el.pause();
    } else if (a === "stop") {
      n.el.pause();
      n.el.currentTime = n.inPoint || 0;
    } else if (a === "toggle") {
      if (n.el.paused) await this.controlPlayer(slot, "play");
      else n.el.pause();
    } else if (a === "gain" || a === "level") {
      const v = Math.max(0, Math.min(1.5, Number(value) || 0));
      n.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.015);
    } else if (a === "pan") {
      let v = Number(value);
      if (!Number.isFinite(v)) v = 0;
      // Companion faders are normalized 0..1; map them to stereo -1..1.
      if (v >= 0 && v <= 1) v = v * 2 - 1;
      if (n.pan) n.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, v)), this.ctx.currentTime, 0.015);
    } else if (a === "seek") {
      n.el.currentTime = Math.max(0, Math.min(Number(n.el.duration)||Infinity, Number(value)||0));
    } else if (a === "in") {
      n.inPoint = Math.max(0, Number(value ?? n.el.currentTime) || 0);
    } else if (a === "loop-start") {
      n.loopStart = Math.max(0, Number(value ?? n.el.currentTime) || 0);
    } else if (a === "loop-end") {
      n.loopEnd = Math.max(0, Number(value ?? n.el.currentTime) || 0);
    } else if (a === "out") {
      n.outPoint = Math.max(0, Number(value ?? n.el.currentTime) || 0);
    } else if (a === "loop") {
      n.loop = value == null ? !n.loop : !!value;
    } else {
      throw new Error(`Lecteur ${slot} : action inconnue ${action}`);
    }
    return this.playerState(slot);
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
    try { n.el?.pause?.(); } catch { /* */ }
    try { n.source?.disconnect(); } catch { /* */ }
    try { n.gain?.disconnect(); } catch { /* */ }
    try { n.pan?.disconnect(); } catch { /* */ }
    try { n.filter?.disconnect(); } catch { /* */ }
    try { n.delay?.disconnect(); } catch { /* */ }
    try { n.feedback?.disconnect(); } catch { /* */ }
    try { n.analyser?.disconnect(); } catch { /* */ }
    if (n.stream) n.stream.getTracks().forEach(t => t.stop());
    if (n.objectUrl) {
      try { URL.revokeObjectURL(n.objectUrl); } catch { /* */ }
    }
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
