import { ShaderSurface, DEFAULT_FRAGMENT } from "./adapters/shader-surface.js";
import { evaluateGraph, findVideoOutput } from "./graph-engine.js";
import { createNodeProcessors } from "./node-processors.js";
import { evaluateSubGraph } from "./subpatch.js";
import { sharedAudio } from "./audio-engine.js";
import { createMlRuntime } from "./ml-runtime.js";
import { renderTextPlate } from "./composition.js";

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
    this.remoteVideo = document.createElement("video");
    this.remoteVideo.playsInline = true;
    this.remoteVideo.muted = true;
    this.remoteCamera = { state: "WAITING", live: false, videoEl: null };
    this.shaderSurface = new ShaderSurface();
    this.offscreen = document.createElement("canvas");
    this.resultCanvas = document.createElement("canvas");
    this.nodeFns = createNodeProcessors();
    this.previousOutputs = new Map();
    this.nodeState = new Map();
    this.mlRuntime = createMlRuntime({ onUpdate: () => { if (!this.playing && this.project) this.render(); } });
    this.aiRequest = null;
    this.aiAssetRequest = null;
    this.deviceBus = { lastMidi: null, lastSerial: null };
    this.bridgeSend = null;
    this.serialSend = null;
    this.lastGraph = { errors: [], warnings: [] };
    this.cameraWanted = false;
    this.audioEngine = sharedAudio;
    this.honestFlags = new Set();
    this.sensorBus = null;
    this.mediaElements = new Map();
    this._pixelScratch = null;
    this.frameScratch = new Map();
    this.pointer = { x: 0.5, y: 0.52, speed: 0, active: false, t: 0 };
  }

  setDeviceBus(bus) { this.deviceBus = bus || this.deviceBus; }
  setBridgeSend(fn) { this.bridgeSend = fn; }
  setSerialSend(fn) { this.serialSend = fn || null; }
  setAiRequest(fn) { this.aiRequest = fn || null; }
  setAiAssetRequest(fn) { this.aiAssetRequest = fn || null; }
  setSensorBus(bus) { this.sensorBus = bus || null; }
  setOscUdpSend(fn) { this.oscUdpSend = fn || null; }
  setArtNetUdpSend(fn) { this.artnetUdpSend = fn || null; }
  setPointer(x, y) {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const nx = Math.max(0, Math.min(1, Number(x) || 0));
    const ny = Math.max(0, Math.min(1, Number(y) || 0));
    const dt = Math.max(16, now - (this.pointer?.t || now));
    const dx = nx - (this.pointer?.x ?? nx);
    const dy = ny - (this.pointer?.y ?? ny);
    const speed = Math.min(2, Math.hypot(dx, dy) / (dt / 1000));
    this.pointer = { x: nx, y: ny, speed, active: true, t: now };
  }

  setMediaElement(nodeId, el) {
    if (!nodeId) return;
    if (!el) {
      const prev = this.mediaElements.get(nodeId);
      if (prev?.src && prev.src.startsWith("blob:")) URL.revokeObjectURL(prev.src);
      this.mediaElements.delete(nodeId);
      return;
    }
    this.mediaElements.set(nodeId, el);
  }

  async attachVideoFile(nodeId, fileOrUrl, { loop = true } = {}) {
    if (!nodeId) throw new Error("Node vidéo manquant");
    const video = document.createElement("video");
    video.playsInline = true;
    video.muted = true;
    video.loop = loop;
    video.preload = "auto";
    if (typeof fileOrUrl === "string") {
      video.src = fileOrUrl;
    } else if (fileOrUrl) {
      video.src = URL.createObjectURL(fileOrUrl);
    } else {
      throw new Error("Fichier vidéo manquant");
    }
    await new Promise((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Impossible de décoder le fichier vidéo"));
    });
    this.setMediaElement(nodeId, video);
    return video;
  }

  setProject(project) {
    const previousProject = this.project;
    this.project = project;
    this.honestFlags = new Set();
    this.resize();
    // Release audio for removed nodes
    const ids = new Set((project?.nodes || []).map(n => n.id));
    for (const id of [...this.audioEngine.nodes.keys()]) {
      if (!ids.has(id)) this.audioEngine.release(id);
    }
    for (const node of previousProject?.nodes || []) {
      if ((node.type === "ml5-hand" || node.type === "ml5-body" || node.type === "brain-map") && !ids.has(node.id)) {
        this.mlRuntime?.release?.(node.id);
      }
    }
    if (!this.needsCamera() && this.mediaStream) this.stopCamera();
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

  async syncCameraFromProject({ request = false, facingMode = "environment" } = {}) {
    if (!this.needsCamera()) {
      if (this.mediaStream) this.stopCamera();
      return false;
    }
    if (this.mediaStream && this.video.readyState >= 2) return true;
    if (!request) return false;
    try {
      await this.enableCamera(facingMode);
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
    this.onGraphEvent?.({ type: "camera-state", state: "on" });
    return true;
  }

  stopCamera() {
    if (this.mediaStream) this.mediaStream.getTracks().forEach(t => t.stop());
    this.mediaStream = null;
    try { this.video.pause(); } catch { /* */ }
    this.video.srcObject = null;
    this.cameraWanted = false;
    this.onGraphEvent?.({ type: "camera-state", state: "off" });
    this.render();
  }

  setRemoteCamera(info) {
    this.remoteCamera = {
      state: info?.state || "WAITING",
      live: !!(info?.live || info?.state === "LIVE"),
      videoEl: info?.videoEl || this.remoteVideo,
      metrics: info?.metrics || null,
      room: info?.room || null
    };
    if (info?.stream) {
      this.remoteVideo.srcObject = info.stream;
      this.remoteVideo.play?.().catch?.(() => {});
    }
    if (info?.clear) {
      try { this.remoteVideo.pause(); } catch { /* */ }
      this.remoteVideo.srcObject = null;
    }
    this.render();
  }

  stopRemoteCameraTracks() {
    const stream = this.remoteVideo?.srcObject;
    stream?.getTracks?.().forEach(t => { try { t.stop(); } catch { /* */ } });
    this.remoteVideo.srcObject = null;
    this.remoteCamera = { state: "DISCONNECTED", live: false, videoEl: this.remoteVideo };
    this.render();
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    this.last = performance.now();
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
    this.stopCamera();
    this.stopRemoteCameraTracks();
    for (const node of this.project?.nodes || []) {
      if (node.type === "ml5-hand" || node.type === "ml5-body" || node.type === "brain-map") {
        this.mlRuntime?.release?.(node.id);
      }
    }
    this.frameScratch.clear();
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
      remoteVideoEl: this.remoteVideo,
      remoteCamera: this.remoteCamera || null,
      shaderSurface: this.shaderSurface,
      offscreen: this.offscreen,
      resultCanvas: this.resultCanvas,
      deviceBus: this.deviceBus,
      bridgeSend: this.bridgeSend,
      serialSend: this.serialSend,
      aiRequest: this.aiRequest,
      aiAssetRequest: this.aiAssetRequest,
      nodeState: this.nodeState,
      oscUdpSend: this.oscUdpSend,
      artnetUdpSend: this.artnetUdpSend,
      controls: this.project.controls || [],
      audioEngine: this.audioEngine,
      mlRuntime: this.mlRuntime,
      requestRender: () => { if (!this.playing && this.project) this.render(); },
      sensorBus: this.sensorBus,
      mediaElements: this.mediaElements,
      frameScratch: this.frameScratch,
      pointer: this.pointer,
      project: this.project,
      playing: this.playing,
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

    const graphSig = `${result.errors.join("\n")}\n${result.warnings.join("\n")}`;
    if (graphSig !== this._graphSig) {
      this._graphSig = graphSig;
      if (result.errors.length || result.warnings.length) {
        this.onGraphEvent?.({ type: "graph", errors: result.errors, warnings: result.warnings });
      }
    }

    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);

    const videoOut = findVideoOutput(this.project, result.outputs);
    if (videoOut?.value) {
      this.drawVideoValue(c, w, h, videoOut.value);
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
    for (const node of this.project.nodes || []) {
      if (node.type !== "text" || !node.params?.text) continue;
      const plate = renderTextPlate({ ...node.params, width: w, height: h });
      if (!plate.drawn) continue;
      const image = c.createImageData(plate.width, plate.height);
      image.data.set(plate.pixels);
      c.putImageData(image, 0, 0);
    }

    if (result.errors.length) {
      c.fillStyle = "rgba(120,30,30,.75)";
      c.fillRect(0, 0, w, 36);
      c.fillStyle = "#fff";
      c.font = "14px system-ui";
      c.fillText(result.errors[0].slice(0, 120), 12, 24);
    }
  }

  drawVideoValue(c, w, h, value) {
    try {
      c.globalAlpha = value.opacity ?? 1;
      if (typeof value.draw === "function") {
        value.draw(c, w, h);
      } else if (value.el) {
        c.drawImage(value.el, 0, 0, w, h);
      } else if (value.canvas) {
        c.drawImage(value.canvas, 0, 0, w, h);
      } else if (value.pixels && value.width && value.height) {
        if (!this._pixelScratch || this._pixelScratch.width !== value.width || this._pixelScratch.height !== value.height) {
          this._pixelScratch = (typeof OffscreenCanvas !== "undefined")
            ? new OffscreenCanvas(value.width, value.height)
            : Object.assign(document.createElement("canvas"), { width: value.width, height: value.height });
        }
        const scratch = this._pixelScratch;
        const sctx = scratch.getContext("2d");
        const img = sctx.createImageData(value.width, value.height);
        img.data.set(value.pixels);
        sctx.putImageData(img, 0, 0);
        c.drawImage(scratch, 0, 0, w, h);
      } else {
        this.drawPlaceholder(c, w, h);
      }
      c.globalAlpha = 1;
    } catch {
      c.globalAlpha = 1;
      this.drawPlaceholder(c, w, h);
    }
  }

  drawPlaceholder(c, w, h) {
    // Sortie neutre : aucun visuel de test ne doit être confondu avec une image générée.
    const g = c.createRadialGradient(w * .5, h * .4, 12, w * .5, h * .5, Math.max(w, h) * .7);
    g.addColorStop(0, "#1d2228");
    g.addColorStop(1, "#090b0d");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.save();
    c.strokeStyle = "#252b31";
    c.lineWidth = 1;
    const step = Math.max(48, Math.round(Math.min(w, h) / 12));
    for (let x = step; x < w; x += step) {
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke();
    }
    for (let y = step; y < h; y += step) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
    }
    c.fillStyle = "#7b848e";
    c.font = "600 13px Inter, system-ui, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("Aucun rendu actif", w * .5, h * .5 - 9);
    c.fillStyle = "#59616a";
    c.font = "10px Inter, system-ui, sans-serif";
    c.fillText("Ajoute un node ou lance Vibe", w * .5, h * .5 + 11);
    c.restore();
  }

  setShaderSource(fragment) {
    this.shaderSurface.compile(fragment || DEFAULT_FRAGMENT);
  }
}
