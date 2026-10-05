/**
 * libpd embarqué (build wasm vérifié, Pd 0.56).
 * Une valeur n'est publiée que si le runtime renvoie un float.
 * Node ne lance pas ce wasm : pas de succès inventé.
 */
import { LIBPD_FREE_BUILD } from "./engine-downloads.js";

export { LIBPD_FREE_BUILD };

export const LIBPD_PROBE_PATCH = [
  "#N canvas 0 0 450 300 10;",
  "#X obj 20 20 loadbang;",
  "#X msg 20 60 42;",
  "#X obj 20 100 s probe;",
  "#X connect 0 0 1 0;",
  "#X connect 1 0 2 0;"
].join("\n") + "\n";

export const LIBPD_AUDIO_PATCH = [
  "#N canvas 0 0 450 300 10;",
  "#X obj 20 20 osc~ 440;",
  "#X obj 20 70 *~ 0.5;",
  "#X obj 20 120 dac~;",
  "#X connect 0 0 1 0;",
  "#X connect 1 0 2 0;",
  "#X connect 1 0 2 1;"
].join("\n") + "\n";

const results = new Map();
const inflight = new Map();
let queue = Promise.resolve();
let modulePromise = null;

export function libpdWasmAvailable() {
  return typeof globalThis.window !== "undefined" && typeof globalThis.document !== "undefined";
}

export function libpdResult(patch) {
  return results.get(String(patch || "")) || null;
}

function remember(patch, result) {
  results.set(String(patch || ""), result);
  return result;
}

async function loadModule() {
  if (!modulePromise) {
    const imported = await import("./vendor/libpd/libpd.js");
    const factory = imported.default;
    modulePromise = factory({
      locateFile: (file) => new URL("./vendor/libpd/" + file, import.meta.url).href
    });
  }
  return modulePromise;
}

async function execute(patch, receiver) {
  if (!libpdWasmAvailable()) {
    return remember(patch, {
      ok: false,
      ran: false,
      value: null,
      engine: "libpd-wasm",
      error: "runtime libpd wasm non lancé",
      downloadUrl: LIBPD_FREE_BUILD
    });
  }
  try {
    const m = await loadModule();
    if (!m.__nvdReady) {
      const init = m._libpd_init();
      const audio = m._libpd_init_audio(1, 2, 44100);
      if (init !== 0 || audio !== 0) {
        throw new Error(`libpd_init ${init} audio ${audio}`);
      }
      m.__nvdFloats = [];
      m.__nvdPrints = [];
      const hook = m.addFunction((recvPtr, value) => {
        m.__nvdFloats.push({ recv: m.UTF8ToString(recvPtr), value: Number(value) });
      }, "vif");
      const printHook = m.addFunction((msgPtr) => {
        m.__nvdPrints.push(m.UTF8ToString(msgPtr));
      }, "vi");
      m._libpd_set_floathook(hook);
      m._libpd_set_printhook(printHook);
      m.__nvdBind = m.cwrap("libpd_bind", "number", ["string"]);
      m.__nvdFinish = m.cwrap("libpd_finish_message", "number", ["string", "string"]);
      m.__nvdBlock = m._libpd_blocksize();
      m.__nvdIn = 1;
      m.__nvdOut = 2;
      m.__nvdReady = true;
    }
    const name = `nvd-${results.size + 1}.pd`;
    const before = m.__nvdFloats.length;
    m.__nvdBind(receiver);
    m.FS.writeFile("/" + name, String(patch));
    const opened = m.ccall("libpd_openfile", "number", ["string", "string"], [name, "/"]);
    if (!opened) {
      return remember(patch, {
        ok: false,
        ran: true,
        value: null,
        engine: "libpd-wasm",
        error: "patch non ouvert",
        downloadUrl: ""
      });
    }
    const started = m._libpd_start_message(1);
    m._libpd_add_float(1);
    const dsp = m.__nvdFinish("pd", "dsp");
    if (started !== 0 || dsp !== 0) {
      throw new Error(`pd dsp start ${started} finish ${dsp}`);
    }
    const ticks = 8;
    const block = m.__nvdBlock || 64;
    const inSamples = ticks * block * (m.__nvdIn || 1);
    const outSamples = ticks * block * (m.__nvdOut || 2);
    const inPtr = m._malloc(inSamples * 4);
    const outPtr = m._malloc(outSamples * 4);
    let peak = 0;
    let processed = 0;
    try {
      for (let pass = 0; pass < 2; pass++) {
        m.HEAPF32.fill(0, inPtr >> 2, (inPtr >> 2) + inSamples);
        m.HEAPF32.fill(0, outPtr >> 2, (outPtr >> 2) + outSamples);
        processed = m._libpd_process_float(ticks, inPtr, outPtr);
        const view = m.HEAPF32.subarray(outPtr >> 2, (outPtr >> 2) + outSamples);
        for (let i = 0; i < view.length; i++) peak = Math.max(peak, Math.abs(view[i] || 0));
      }
    } finally {
      m._free(inPtr);
      m._free(outPtr);
      if (m.__nvdLast) {
        try { m._libpd_closefile(m.__nvdLast); } catch { /* le patch lu reste dans le cache */ }
      }
      m.__nvdLast = opened;
    }
    const got = m.__nvdFloats.slice(before).filter(item => item.recv === receiver && Number.isFinite(item.value));
    const value = got.length ? got[got.length - 1].value : null;
    const audioRan = peak > 0.0001;
    if (value == null && !audioRan) {
      const prints = (m.__nvdPrints || []).slice(-6).join(" | ");
      return remember(patch, {
        ok: false,
        ran: true,
        value: null,
        peak: 0,
        audio: false,
        engine: "libpd-wasm",
        error: prints ? `aucune valeur libpd · ${prints}` : `aucune valeur libpd · process ${processed}`,
        downloadUrl: ""
      });
    }
    return remember(patch, {
      ok: true,
      ran: true,
      value,
      peak: audioRan ? peak : 0,
      audio: audioRan,
      engine: "libpd-wasm",
      error: "",
      downloadUrl: ""
    });
  } catch (error) {
    modulePromise = null;
    return remember(patch, {
      ok: false,
      ran: false,
      value: null,
      engine: "libpd-wasm",
      error: error?.message || String(error),
      downloadUrl: LIBPD_FREE_BUILD
    });
  }
}

export function runLibpdPatch(patch = LIBPD_PROBE_PATCH, receiver = "probe") {
  const key = String(patch || "");
  if (results.has(key)) return Promise.resolve(results.get(key));
  if (!libpdWasmAvailable()) {
    return Promise.resolve(remember(key, {
      ok: false,
      ran: false,
      value: null,
      engine: "libpd-wasm",
      error: "runtime libpd wasm non lancé",
      downloadUrl: LIBPD_FREE_BUILD
    }));
  }
  if (inflight.has(key)) return inflight.get(key);
  const job = queue
    .then(() => execute(key, receiver))
    .finally(() => inflight.delete(key));
  inflight.set(key, job);
  queue = job.then(() => undefined, () => undefined);
  return job;
}

export function requestLibpd(patch = LIBPD_PROBE_PATCH, receiver = "probe") {
  return runLibpdPatch(patch, receiver);
}
