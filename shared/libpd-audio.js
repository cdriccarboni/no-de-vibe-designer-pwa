/**
 * Voix libpd audible : AudioWorklet (libpd-worklet.js) → gain de niveau → enveloppe (trigger AR) → sortie.
 * `render` fournit les blocs (par défaut libpd réel via renderLibpdFrames) ; injectable pour les tests.
 */
import { renderLibpdFrames, LIBPD_SAMPLE_RATE } from "./libpd-runtime.js";

export const LIBPD_WORKLET_URL = new URL("./libpd-worklet.js", import.meta.url).href;

export class LibpdVoice {
  constructor(ctx, { destination = ctx.destination, level = 0.5, render = renderLibpdFrames, chunk = 2048 } = {}) {
    this.ctx = ctx; this.render = render; this.chunk = chunk; this.destination = destination;
    this.levelValue = level; this.node = null; this.pumping = false;
  }
  async init() {
    if (this.ctx.sampleRate !== LIBPD_SAMPLE_RATE) throw new Error(`libpd rend à ${LIBPD_SAMPLE_RATE} Hz ; AudioContext à ${this.ctx.sampleRate} Hz`);
    await this.ctx.audioWorklet.addModule(LIBPD_WORKLET_URL);
    this.node = new AudioWorkletNode(this.ctx, "nvd-libpd-player", { numberOfInputs: 0, outputChannelCount: [2], processorOptions: { lowWater: this.chunk * 2 } });
    this.level = new GainNode(this.ctx, { gain: this.levelValue });
    this.env = new GainNode(this.ctx, { gain: 0 }); // muette jusqu’au trigger ou gate(true)
    this.node.connect(this.level).connect(this.env);
    this.route(this.destination);
    this.node.port.onmessage = e => { if (e.data?.type === "need") this.pump(); };
    return this;
  }
  /** Routage : change la sortie (master, bus, analyseur…). */
  route(destination) { this.env.disconnect(); this.env.connect(destination); this.destination = destination; return this; }
  setLevel(v, t = this.ctx.currentTime) { this.level.gain.setTargetAtTime(Math.max(0, Math.min(1, Number(v) || 0)), t, 0.01); }
  /** Enveloppe : coupe, puis attaque → maintien → relâchement à partir de `time`. */
  trigger({ time = this.ctx.currentTime, attack = 0.01, hold = 0.2, release = 0.3, peak = 1 } = {}) {
    const g = this.env.gain; g.cancelScheduledValues(time); g.setValueAtTime(0, time);
    g.linearRampToValueAtTime(peak, time + attack); g.setValueAtTime(peak, time + attack + hold);
    g.linearRampToValueAtTime(0, time + attack + hold + release);
  }
  gate(open, time = this.ctx.currentTime) { this.env.gain.cancelScheduledValues(time); this.env.gain.setValueAtTime(open ? 1 : 0, time); }
  /** Pousse `frames` trames calculées par libpd dans la file du worklet. */
  async push(frames = this.chunk) {
    const [left, right] = await this.render(frames);
    this.node.port.postMessage({ type: "push", left, right }, [left.buffer, right.buffer]);
    return left.length;
  }
  async pump() { if (this.pumping) return; this.pumping = true; try { await this.push(this.chunk); await this.push(this.chunk); } finally { this.pumping = false; } }
  stop() { try { this.node?.port.postMessage({ type: "clear" }); this.env?.disconnect(); this.node?.disconnect(); } catch { /* déjà arrêté */ } }
}
