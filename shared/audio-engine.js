/**
 * Moteur audio Web Audio — démarrage/arrêt propres, pas de traitement résiduel.
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.nodes = new Map(); // nodeId -> { osc, gain, analyser, mic, stream, type }
    this.pending = new Map(); // nodeId -> Promise, avoids duplicate permission/graph creation per frame
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

  async ensureInput(nodeId, {
    deviceId = "",
    echoCancellation = false,
    noiseSuppression = false,
    autoGainControl = false,
    channelCount = 1,
    sampleRate = 48000,
    latency = 0.02,
    inputGain = 1,
    highpassHz = 20,
    compressor = false,
    compressorThreshold = -18,
    limiter = false,
    limiterThreshold = -3,
    monitor = 0
  } = {}) {
    if (this.pending.has(nodeId)) return this.pending.get(nodeId);
    const task = (async () => {
      await this.resume();
      this.release(nodeId);
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Entrée audio indisponible");

      const audio = {
        echoCancellation: !!echoCancellation,
        noiseSuppression: !!noiseSuppression,
        autoGainControl: !!autoGainControl,
        channelCount: { ideal: Math.max(1, Math.min(2, Number(channelCount) || 1)) },
        sampleRate: { ideal: Math.max(8000, Number(sampleRate) || 48000) },
        latency: { ideal: Math.max(0, Number(latency) || 0) }
      };
      if (deviceId) audio.deviceId = { exact: deviceId };

      const captureStream = await navigator.mediaDevices.getUserMedia({ audio, video: false });
      const source = this.ctx.createMediaStreamSource(captureStream);
      const preGain = this.ctx.createGain();
      const highpass = this.ctx.createBiquadFilter();
      const comp = this.ctx.createDynamicsCompressor();
      const limit = this.ctx.createDynamicsCompressor();
      const analyser = this.ctx.createAnalyser();
      const destination = this.ctx.createMediaStreamDestination();
      const monitorGain = this.ctx.createGain();

      preGain.gain.value = Math.max(0, Math.min(4, Number(inputGain) || 0));
      highpass.type = "highpass";
      highpass.frequency.value = Math.max(10, Math.min(400, Number(highpassHz) || 20));
      highpass.Q.value = 0.707;

      comp.threshold.value = Math.max(-60, Math.min(0, Number(compressorThreshold) || -18));
      comp.knee.value = 12;
      comp.ratio.value = compressor ? 4 : 1;
      comp.attack.value = 0.008;
      comp.release.value = 0.18;

      limit.threshold.value = Math.max(-20, Math.min(0, Number(limiterThreshold) || -3));
      limit.knee.value = 0;
      limit.ratio.value = limiter ? 20 : 1;
      limit.attack.value = 0.002;
      limit.release.value = 0.08;

      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.72;
      monitorGain.gain.value = Math.max(0, Math.min(1, Number(monitor) || 0));

      source.connect(preGain);
      preGain.connect(highpass);
      highpass.connect(comp);
      comp.connect(limit);
      limit.connect(analyser);
      analyser.connect(destination);
      limit.connect(monitorGain);
      monitorGain.connect(this.master);

      const outputStream = destination.stream;
      const track = captureStream.getAudioTracks()[0] || null;
      const settings = track?.getSettings?.() || {};
      this.nodes.set(nodeId, {
        type: "input",
        source,
        mic: source,
        preGain,
        highpass,
        compressor: comp,
        limiter: limit,
        analyser,
        destination,
        monitorGain,
        stream: outputStream,
        captureStream,
        track,
        settings,
        ownsStream: true
      });
      return this.nodes.get(nodeId);
    })();
    this.pending.set(nodeId, task);
    try {
      return await task;
    } finally {
      if (this.pending.get(nodeId) === task) this.pending.delete(nodeId);
    }
  }

  async ensureMic(nodeId, options = {}) {
    return this.ensureInput(nodeId, options);
  }

  audioValue(nodeId) {
    const n = this.nodes.get(nodeId);
    if (!n?.stream) return null;
    return {
      kind: "audio",
      stream: n.stream,
      analyser: n.analyser || null,
      nodeId
    };
  }

  async ensureStreamProcessor(nodeId, inputValue, {
    kind = "gain",
    gain = 1,
    threshold = -6,
    monitor = 0
  } = {}) {
    await this.resume();
    const stream = inputValue?.stream;
    if (!stream?.getAudioTracks?.().length) throw new Error("Flux audio entrant absent");
    let n = this.nodes.get(nodeId);
    if (!n || n.type !== `stream-${kind}` || n.inputStream !== stream) {
      this.release(nodeId);
      const source = this.ctx.createMediaStreamSource(stream);
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 256;
      const destination = this.ctx.createMediaStreamDestination();
      let processor;
      if (kind === "limiter") {
        processor = this.ctx.createDynamicsCompressor();
        processor.knee.value = 3;
        processor.ratio.value = 20;
        processor.attack.value = 0.003;
        processor.release.value = 0.12;
      } else {
        processor = this.ctx.createGain();
      }
      source.connect(processor);
      processor.connect(analyser);
      analyser.connect(destination);
      const monitorGain = this.ctx.createGain();
      monitorGain.gain.value = 0;
      processor.connect(monitorGain);
      monitorGain.connect(this.master);
      n = {
        type: `stream-${kind}`,
        source,
        processor,
        analyser,
        destination,
        monitorGain,
        stream: destination.stream,
        inputStream: stream,
        ownsStream: true
      };
      this.nodes.set(nodeId, n);
    }
    if (kind === "limiter" && n.processor?.threshold) {
      n.processor.threshold.setTargetAtTime(Math.max(-60, Math.min(0, Number(threshold) || -6)), this.ctx.currentTime, 0.01);
    } else if (n.processor?.gain) {
      n.processor.gain.setTargetAtTime(Math.max(0, Math.min(4, Number(gain) || 0)), this.ctx.currentTime, 0.01);
    }
    if (n.monitorGain?.gain) {
      n.monitorGain.gain.setTargetAtTime(Math.max(0, Math.min(1, Number(monitor) || 0)), this.ctx.currentTime, 0.01);
    }
    return this.audioValue(nodeId);
  }

  async ensureMixer(nodeId, aValue, bValue, { gainA = 1, gainB = 1 } = {}) {
    await this.resume();
    const a = aValue?.stream;
    const b = bValue?.stream;
    if (!a?.getAudioTracks?.().length && !b?.getAudioTracks?.().length) throw new Error("Mixer : aucun flux audio entrant");
    let n = this.nodes.get(nodeId);
    if (!n || n.type !== "stream-mixer" || n.inputA !== a || n.inputB !== b) {
      this.release(nodeId);
      const destination = this.ctx.createMediaStreamDestination();
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 256;
      const mix = this.ctx.createGain();
      mix.gain.value = 1;
      mix.connect(analyser);
      analyser.connect(destination);
      const sources = [null, null];
      const gains = [null, null];
      for (const [index, stream, value] of [[0, a, gainA], [1, b, gainB]]) {
        if (!stream?.getAudioTracks?.().length) continue;
        const source = this.ctx.createMediaStreamSource(stream);
        const g = this.ctx.createGain();
        g.gain.value = Math.max(0, Math.min(4, Number(value) || 0));
        source.connect(g);
        g.connect(mix);
        sources[index] = source;
        gains[index] = g;
      }
      n = {
        type: "stream-mixer",
        sources,
        gains,
        mix,
        analyser,
        destination,
        stream: destination.stream,
        inputA: a,
        inputB: b,
        ownsStream: true
      };
      this.nodes.set(nodeId, n);
    }
    if (n.gains[0]) n.gains[0].gain.setTargetAtTime(Math.max(0, Math.min(4, Number(gainA) || 0)), this.ctx.currentTime, 0.01);
    if (n.gains[1]) n.gains[1].gain.setTargetAtTime(Math.max(0, Math.min(4, Number(gainB) || 0)), this.ctx.currentTime, 0.01);
    return this.audioValue(nodeId);
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

  readPeak(nodeId) {
    const n = this.nodes.get(nodeId);
    if (!n?.analyser) return 0;
    const buf = new Uint8Array(n.analyser.fftSize);
    n.analyser.getByteTimeDomainData(buf);
    let peak = 0;
    for (const sample of buf) peak = Math.max(peak, Math.abs((sample - 128) / 128));
    return peak;
  }

  readEnvelope(nodeId) {
    const n = this.nodes.get(nodeId);
    if (!n?.analyser) return 0;
    const level = this.readLevel(nodeId);
    n.envelope = Number.isFinite(n.envelope) ? (n.envelope * 0.82 + level * 0.18) : level;
    return n.envelope;
  }

  readFftEnergy(nodeId) {
    const n = this.nodes.get(nodeId);
    if (!n?.analyser) return 0;
    const buf = new Uint8Array(n.analyser.frequencyBinCount);
    n.analyser.getByteFrequencyData(buf);
    if (!buf.length) return 0;
    let sum = 0;
    for (const value of buf) sum += value;
    return Math.max(0, Math.min(1, sum / (buf.length * 255)));
  }

  inputInfo(nodeId) {
    const n = this.nodes.get(nodeId);
    if (!n || n.type !== "input") return null;
    const track = n.track || n.captureStream?.getAudioTracks?.()[0] || null;
    const settings = track?.getSettings?.() || n.settings || {};
    return {
      label: track?.label || "Entrée audio",
      deviceId: settings.deviceId || "",
      channelCount: settings.channelCount || 0,
      sampleRate: settings.sampleRate || this.ctx?.sampleRate || 0,
      latency: settings.latency || 0
    };
  }

  release(nodeId) {
    const n = this.nodes.get(nodeId);
    if (!n) return;
    try { n.osc?.stop(); } catch { /* */ }
    try { n.osc?.disconnect(); } catch { /* */ }
    try { n.mic?.disconnect(); } catch { /* */ }
    try { n.source?.disconnect(); } catch { /* */ }
    try { n.sources?.forEach(source => source.disconnect()); } catch { /* */ }
    try { n.gain?.disconnect(); } catch { /* */ }
    try { n.gains?.forEach(gain => gain.disconnect()); } catch { /* */ }
    try { n.processor?.disconnect(); } catch { /* */ }
    try { n.preGain?.disconnect(); } catch { /* */ }
    try { n.highpass?.disconnect(); } catch { /* */ }
    try { n.compressor?.disconnect(); } catch { /* */ }
    try { n.limiter?.disconnect(); } catch { /* */ }
    try { n.mix?.disconnect(); } catch { /* */ }
    try { n.monitorGain?.disconnect(); } catch { /* */ }
    try { n.destination?.disconnect?.(); } catch { /* */ }
    try { n.filter?.disconnect(); } catch { /* */ }
    try { n.delay?.disconnect(); } catch { /* */ }
    try { n.feedback?.disconnect(); } catch { /* */ }
    try { n.analyser?.disconnect(); } catch { /* */ }
    if (n.ownsStream && n.stream) n.stream.getTracks().forEach(t => t.stop());
    if (n.captureStream && n.captureStream !== n.stream) n.captureStream.getTracks().forEach(t => t.stop());
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
    this.pending.clear();
    this.level = 0;
  }
}

export const sharedAudio = new AudioEngine();
