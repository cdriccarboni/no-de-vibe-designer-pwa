import { ShaderSurface, DEFAULT_FRAGMENT } from "./adapters/shader-surface.js";
import { evaluateGraph, findVideoOutput } from "./graph-engine.js";
import { createNodeProcessors } from "./node-processors.js";
import { evaluateSubGraph } from "./subpatch.js";
import { sharedAudio } from "./audio-engine.js";

export class Runtime {
  constructor(canvas, { destination = "main-output", onGraphEvent = null } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.destination = destination;
    this.onGraphEvent = onGraphEvent;
    this.project = null;
    this.time = 0;
    this.playing = false;
    this.last = 0;
    this.raf = 0;
    this.mediaStream = null;
    this.video = document.createElement("video");
    this.video.playsInline = true;
    this.video.muted = true;
    this.shaderSurface = new ShaderSurface();
    this.offscreen = document.createElement("canvas");
    this.resultCanvas = document.createElement("canvas");
    this.nodeFns = createNodeProcessors();
    this.previousOutputs = new Map();
    this.deviceBus = { lastMidi: null, lastSerial: null };
    this.bridgeSend = null;
    this.lastGraph = { errors: [], warnings: [] };
    this.cameraWanted = false;
    this.audioEngine = sharedAudio;
    this.honestFlags = new Set();
  }

  setDeviceBus(bus) { this.deviceBus = bus || this.deviceBus; }
  setBridgeSend(fn) { this.bridgeSend = fn; }

  setProject(project) {
    this.project = project;
    this.honestFlags = new Set();
    this.resize();
    // Release audio for removed nodes
    const ids = new Set((project?.nodes || []).map(n => n.id));
    for (const id of [...this.audioEngine.nodes.keys()]) {
      if (!ids.has(id)) this.audioEngine.release(id);
    }
    this.syncCameraFromProject();
    this.render();
  }

  resize() {
    if (!this.project) return;
    this.canvas.width = this.project.output?.width || 1280;
    this.canvas.height = this.project.output?.height || 720;
  }

  needsCamera() {
    if (!this.project) return false;
    return this.project.nodes.some(n =>
      (n.type === "camera" || n.type === "phone-camera-front" || n.type === "phone-camera-back")
      && n.params?.enabled !== false
    );
  }

  async syncCameraFromProject() {
    if (!this.needsCamera()) return false;
    if (this.mediaStream && this.video.readyState >= 2) return true;
    try {
      await this.enableCamera();
      return true;
    } catch (e) {
      this.lastGraph.errors = [`Caméra : ${e.message || e}`];
      this.onGraphEvent?.({ type: "camera-error", error: e.message || String(e) });
      return false;
    }
  }

  async enableCamera(facingMode = "environment") {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Caméra indisponible dans ce navigateur");
    if (this.mediaStream) this.mediaStream.getTracks().forEach(t => t.stop());
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
    this.video.srcObject = this.mediaStream;
    await this.video.play();
    this.cameraWanted = true;
    return true;
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    this.last = performance.now();
    this.syncCameraFromProject();
    this.loop(this.last);
  }
  pause() {
    if (!this.playing) return;
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.render();
  }
  toggle() {
    this.playing ? this.pause() : this.play();
    return this.playing;
  }
  stop() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.time = 0;
    // Arrêt audio : aucun traitement résiduel
    this.audioEngine?.releaseAll();
    this.render();
  }

  async dispose() {
    this.stop();
    if (this.mediaStream) this.mediaStream.getTracks().forEach(t => t.stop());
    this.mediaStream = null;
    await this.audioEngine?.shutdown();
  }

  loop(now) {
    if (!this.playing) return;
    const dt = (now - this.last) / 1000;
    this.last = now;
    this.time = (this.time + dt) % 60;
    this.render();
    this.raf = requestAnimationFrame(t => this.loop(t));
  }

  activeClips() {
    return (this.project?.timeline || []).filter(c => this.time >= c.start && this.time <= c.start + c.duration);
  }

  render() {
    if (!this.project) return;
    const c = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const bg = this.project.output?.background || "#090b0d";

    const ctx = {
      time: this.time,
      width: w,
      height: h,
      background: bg,
      videoEl: this.video,
      shaderSurface: this.shaderSurface,
      offscreen: this.offscreen,
      resultCanvas: this.resultCanvas,
      deviceBus: this.deviceBus,
      bridgeSend: this.bridgeSend,
      controls: this.project.controls || [],
      audioEngine: this.audioEngine,
      honestFlags: this.honestFlags,
      _graphApi: { evaluateGraph, findVideoOutput },
      _subpatchApi: { evaluateSubGraph },
      _subPrev: this._subPrev || new Map(),
      errors: [],
      warnings: []
    };

    const result = evaluateGraph(this.project, this.nodeFns, ctx, this.previousOutputs);
    this.previousOutputs = result.outputs;
    this._subPrev = ctx._subPrev;
    this.lastGraph = result;

    if (result.errors.length || result.warnings.length) {
      this.onGraphEvent?.({ type: "graph", errors: result.errors, warnings: result.warnings });
    }

    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);

    const videoOut = findVideoOutput(this.project, result.outputs);
    if (videoOut?.value?.el) {
      try {
        c.globalAlpha = videoOut.value.opacity ?? 1;
        c.drawImage(videoOut.value.el, 0, 0, w, h);
        c.globalAlpha = 1;
      } catch {
        this.drawPlaceholder(c, w, h);
      }
    } else if (this.needsCamera() && this.video.readyState >= 2) {
      // Camera present but not yet producing via graph (no evaluate output)
      c.drawImage(this.video, 0, 0, w, h);
    } else {
      this.drawPlaceholder(c, w, h);
    }

    // Timeline overlays (points / legacy cues) — secondary to graph
    const active = this.activeClips();
    const wave = active.some(x => x.kind === "points");
    (this.project.controls || []).forEach((pt, i) => {
      let x = pt.x * w, y = pt.y * h;
      if (wave) {
        y += Math.sin(this.time * 4 + i) * 18;
        x += Math.cos(this.time * 2 + i) * 8;
      }
      c.strokeStyle = "#fff";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(x, y, 9, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = "#d7b86a";
      c.beginPath();
      c.arc(x, y, 3, 0, Math.PI * 2);
      c.fill();
    });

    // Error banner (non-blocking)
    if (result.errors.length) {
      c.fillStyle = "rgba(120,30,30,.75)";
      c.fillRect(0, 0, w, 36);
      c.fillStyle = "#fff";
      c.font = "14px system-ui";
      c.fillText(result.errors[0].slice(0, 120), 12, 24);
    }
  }

  drawPlaceholder(c, w, h) {
    const g = c.createRadialGradient(w * .5, h * .35, 20, w * .5, h * .4, w * .65);
    g.addColorStop(0, "#2a3037");
    g.addColorStop(1, "#090b0d");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#30363d";
    c.strokeStyle = "#6f7882";
    c.lineWidth = Math.max(2, w / 500);
    c.beginPath();
    c.moveTo(w * .26, h * .58);
    c.bezierCurveTo(w * .35, h * .36, w * .58, h * .37, w * .72, h * .48);
    c.bezierCurveTo(w * .78, h * .53, w * .82, h * .5, w * .88, h * .44);
    c.bezierCurveTo(w * .83, h * .6, w * .72, h * .69, w * .57, h * .68);
    c.bezierCurveTo(w * .44, h * .69, w * .35, h * .65, w * .26, h * .58);
    c.closePath();
    c.fill();
    c.stroke();
  }

  setShaderSource(fragment) {
    this.shaderSurface.compile(fragment || DEFAULT_FRAGMENT);
  }
}
