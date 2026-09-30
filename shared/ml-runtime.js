/**
 * Optional local ML runtime for No-de.
 * First activation loads pinned browser libraries; inference then runs in the browser.
 * No camera is opened here: callers pass an existing HTML video/canvas element.
 */
const ML5_SRC = "https://unpkg.com/ml5@1.4.0/dist/ml5.min.js";
const BRAIN_SRC = "https://unpkg.com/brain.js@2.0.0-beta.24";

const scriptPromises = new Map();

function loadScript(src, globalName) {
  if (typeof globalThis !== "undefined" && globalThis[globalName]) return Promise.resolve(globalThis[globalName]);
  if (typeof document === "undefined") return Promise.reject(new Error(globalName + " nécessite un navigateur"));
  if (!scriptPromises.has(src)) {
    scriptPromises.set(src, new Promise((resolve, reject) => {
      const existing = [...document.scripts].find(s => s.src === src);
      const script = existing || document.createElement("script");
      const done = () => globalThis[globalName]
        ? resolve(globalThis[globalName])
        : reject(new Error(globalName + " chargé mais global absent"));
      script.addEventListener("load", done, { once:true });
      script.addEventListener("error", () => reject(new Error("Chargement " + globalName + " impossible")), { once:true });
      if (!existing) {
        script.src = src;
        script.async = true;
        script.crossOrigin = "anonymous";
        document.head.appendChild(script);
      } else if (globalThis[globalName]) {
        done();
      }
    }));
  }
  return scriptPromises.get(src);
}

function point(result, names = []) {
  for (const name of names) {
    if (result?.[name] && Number.isFinite(Number(result[name].x))) return result[name];
    const kp = result?.keypoints?.find?.(p => p?.name === name || p?.part === name);
    if (kp && Number.isFinite(Number(kp.x))) return kp;
  }
  return null;
}

function normalizePoint(p, media) {
  const w = Math.max(1, Number(media?.videoWidth || media?.width || 1));
  const h = Math.max(1, Number(media?.videoHeight || media?.height || 1));
  return {
    x: Math.max(0, Math.min(1, Number(p?.x || 0) / w)),
    y: Math.max(0, Math.min(1, Number(p?.y || 0) / h))
  };
}

export function createMlRuntime({ onUpdate = () => {} } = {}) {
  const states = new Map();
  const trackers = new Map();
  const brainNets = new Map();

  const set = (id, patch) => {
    states.set(id, { ...(states.get(id) || {}), ...patch, updatedAt:Date.now() });
    onUpdate(id, states.get(id));
  };

  async function ensureTracker(id, kind, media, options = {}) {
    if (!id || !media) return null;
    const current = trackers.get(id);
    if (current?.kind === kind && current.media === media) return current;

    current?.model?.detectStop?.();
    set(id, { status:"LOADING", results:[], error:"" });
    try {
      const ml5 = await loadScript(ML5_SRC, "ml5");
      const model = kind === "hand"
        ? await ml5.handPose(options.model || undefined)
        : await ml5.bodyPose(options.model || undefined);
      const tracker = { kind, media, model };
      trackers.set(id, tracker);
      model.detectStart(media, results => {
        set(id, { status:"LIVE", results:Array.isArray(results) ? results : [], error:"" });
      });
      set(id, { status:"READY", results:[], error:"" });
      return tracker;
    } catch (error) {
      set(id, { status:"ERROR", results:[], error:error?.message || String(error) });
      throw error;
    }
  }

  function readTracker(id, kind, media) {
    const state = states.get(id) || { status:"IDLE", results:[] };
    const first = state.results?.[0];
    if (!first) return { ...state, x:0, y:0, activity:0, pinch:0 };
    if (kind === "hand") {
      const index = point(first, ["index_finger_tip","indexFingerTip"]);
      const thumb = point(first, ["thumb_tip","thumbTip"]);
      const p = normalizePoint(index || thumb, media);
      const t = normalizePoint(thumb || index, media);
      return {
        ...state,
        x:p.x,
        y:p.y,
        pinch:index && thumb ? Math.max(0, Math.min(1, 1 - Math.hypot(p.x - t.x, p.y - t.y) * 6)) : 0,
        activity:state.results.length
      };
    }
    const center = point(first, ["nose","left_hip","leftHip"]) || first?.keypoints?.[0];
    const p = normalizePoint(center, media);
    const confidence = Number(first?.confidence ?? center?.confidence ?? center?.score ?? 0);
    return { ...state, x:p.x, y:p.y, activity:Math.max(0, Math.min(1, confidence || (state.results.length ? 1 : 0))) };
  }

  async function runBrain(id, input, networkJson) {
    if (!networkJson) {
      set(id, { status:"NEEDS MODEL", output:0, error:"" });
      return 0;
    }
    set(id, { status:"LOADING", error:"" });
    let brain;
    try {
      brain = await loadScript(BRAIN_SRC, "brain");
    } catch (error) {
      set(id, { status:"ERROR", output:0, error:error?.message || String(error) });
      throw error;
    }
    let parsed;
    try { parsed = typeof networkJson === "string" ? JSON.parse(networkJson) : networkJson; }
    catch {
      const error = new Error("Brain.js : JSON réseau invalide");
      set(id, { status:"ERROR", output:0, error:error.message });
      throw error;
    }
    const signature = JSON.stringify(parsed);
    let cached = brainNets.get(id);
    if (!cached || cached.signature !== signature) {
      const net = new brain.NeuralNetwork();
      net.fromJSON(parsed);
      cached = { signature, net };
      brainNets.set(id, cached);
    }
    const result = cached.net.run(Array.isArray(input) ? input : [Number(input) || 0]);
    const value = Array.isArray(result)
      ? Number(result[0]) || 0
      : Number(result?.value ?? Object.values(result || {})[0]) || 0;
    set(id, { status:"READY", output:value });
    return value;
  }

  function release(id) {
    trackers.get(id)?.model?.detectStop?.();
    trackers.delete(id);
    brainNets.delete(id);
    states.delete(id);
  }

  return {
    ensureTracker,
    readTracker,
    runBrain,
    read:id => states.get(id) || { status:"IDLE", results:[], output:0 },
    release,
    sources:{ ml5:ML5_SRC, brain:BRAIN_SRC }
  };
}
