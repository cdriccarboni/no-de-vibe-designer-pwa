import { isExecutable, portLabels, portMeta, typesCompatible } from "./ports.js";

export function normalizeVibeText(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

const INTENTS = [
  ["remote-camera", ["remote camera","camera distante","camera telephone","camera téléphone"]],
  ["phone-camera-back", ["camera arriere","camera arrière","camera back"]],
  ["phone-camera-front", ["camera avant","camera front"]],
  ["camera", ["webcam","camera live","camera","video live"]],
  ["videofile", ["fichier video","fichier vidéo","video fichier","clip video"]],
  ["whale", ["baleine","whale"]],
  ["blob", ["blob","metaball","forme organique"]],
  ["dream", ["dream","reve","rêve","visuel onirique"]],
  ["p5", ["p5","processing"]],
  ["sketch", ["sketch","dessin generatif","dessin génératif"]],
  ["blackhole", ["trou noir","black hole","blackhole"]],
  ["threshold", ["threshold","seuil","silhouette","detourage","détourage"]],
  ["ghost", ["ghost","fantome","fantôme","trainee","traînée","trail"]],
  ["mirror", ["miroir","mirror"]],
  ["shadow", ["ombre","shadow"]],
  ["bodyclone", ["body clone","clone corps","dedouble","dédouble"]],
  ["anaglyph", ["anaglyphe","3d rouge cyan","rouge cyan"]],
  ["creativefx", ["creative fx","effet creatif","effet créatif"]],
  ["storm", ["storm","orage","tempete","tempête"]],
  ["bending", ["bending","deformation","déformation","distorsion"]],
  ["transmute", ["transmute","transmutation","mutation couleur"]],
  ["shader", ["shader","glsl"]],
  ["mapping", ["mapping","projection mapping"]],
  ["videoreturn", ["retour video","retour vidéo","monitor video","monitor vidéo"]],
  ["midi", ["midi"]],
  ["osc", ["osc"]],
  ["dmx", ["dmx","art-net","artnet"]],
  ["surface", ["control surface","surface de controle","surface de contrôle"]],
  ["inputmapper", ["input mapper","mapper entree","mapper entrée"]],
  ["stageio", ["stage i/o","stage io","entree sortie scene","entrée sortie scène"]],
  ["arduino", ["arduino"]],
  ["esp", ["esp32","wemos","esp8266"]],
  ["servo", ["servo","servomoteur"]],
  ["rfid", ["rfid","badge","tag rfid"]],
  ["sensors", ["capteur generique","capteur générique"]],
  ["gyro", ["gyro","gyroscope"]],
  ["accelerometer", ["accelerometre","accéléromètre"]],
  ["orientation", ["orientation"]],
  ["gps", ["gps"]],
  ["touch", ["touch","tactile"]],
  ["multitouch", ["multitouch","multi touch"]],
  ["phone-mic", ["micro telephone","micro téléphone","micro mobile"]],
  ["haptics", ["haptique","vibration"]],
  ["wifi", ["wifi","wi-fi"]],
  ["bluetooth", ["bluetooth"]],
  ["automation", ["automation","automatisation","lfo"]],
  ["timer", ["timer","minuteur","temporisateur"]],
  ["smooth", ["lissage","smooth"]],
  ["compare", ["comparaison","compare","plus grand","plus petit"]],
  ["number", ["nombre","number","valeur constante"]],
  ["boolean", ["booleen","booléen","boolean"]],
  ["text", ["texte","text"]],
  ["add", ["addition","additionne","somme"]],
  ["multiply", ["multiplication","multiplie","fois"]],
  ["datalab", ["data lab","datalab"]],
  ["universal", ["universal wire","fil universel"]],
  ["connectors", ["connectors","connecteur"]],
  ["showimport", ["show importer","import conduite","importer conduite"]],
  ["subpatch", ["sous patch","sous-patch","subpatch"]],
  ["twozero", ["twozero","two zero"]],
  ["chataigne", ["chataigne"]],
  ["millumin", ["millumin"]],
  ["touchdesigner", ["touchdesigner bridge"]],
  ["td", ["touchdesigner tool","td tool"]],
  ["isadorabridge", ["isadora bridge"]],
  ["isadora", ["mini isadora","isadora tool"]],
  ["max", ["max/msp","max msp"]],
  ["pd", ["pure data","puredata"]],
  ["supercollider", ["supercollider"]]
];

const VIDEO_CHAIN = new Set([
  "threshold","ghost","mirror","shadow","bodyclone","anaglyph","creativefx","storm",
  "bending","transmute","shader","mapping","videoreturn","transform"
]);
const VIDEO_SOURCES = ["remote-camera","phone-camera-back","phone-camera-front","camera","videofile","whale","blob","dream","p5","sketch","blackhole"];
const CONTROL_SOURCES = ["midi","gyro","accelerometer","orientation","touch","multitouch","sensors","automation","timer","number"];

function firstPort(type, dir, preferred = null) {
  const labels = portLabels(type) || [];
  const candidates = [];
  for (let i = 0; i < labels.length; i++) {
    const meta = portMeta(type, i);
    if (meta?.dir !== dir) continue;
    candidates.push({ i, data: meta.data });
  }
  if (preferred) {
    const exact = candidates.find(x => x.data === preferred);
    if (exact) return exact.i;
    const any = candidates.find(x => x.data === "any");
    if (any) return any.i;
  }
  return candidates[0]?.i ?? null;
}

function compatibleConnection(fromType, toType, preferred = null) {
  const fromLabels = portLabels(fromType) || [];
  const toLabels = portLabels(toType) || [];
  for (let a = 0; a < fromLabels.length; a++) {
    const fm = portMeta(fromType, a);
    if (fm?.dir !== "out") continue;
    if (preferred && fm.data !== preferred && fm.data !== "any") continue;
    for (let b = 0; b < toLabels.length; b++) {
      const tm = portMeta(toType, b);
      if (tm?.dir !== "in") continue;
      if (preferred && tm.data !== preferred && tm.data !== "any") continue;
      if (typesCompatible(fm.data, tm.data)) return [a,b];
    }
  }
  return null;
}

function phraseIndex(t, phrases) {
  let best = Infinity;
  for (const p of phrases) {
    const n = normalizeVibeText(p);
    const i = t.indexOf(n);
    if (i >= 0 && i < best) best = i;
  }
  return best;
}

export function deterministicVibePlan(text, project = { nodes:[], edges:[] }) {
  const t = normalizeVibeText(text);
  const ops = [];
  const notes = [];
  const existing = new Set((project.nodes || []).map(n => n.type));
  const planned = new Set();
  const requested = [];

  for (const [type, phrases] of INTENTS) {
    const idx = phraseIndex(t, phrases);
    if (idx !== Infinity && isExecutable(type)) requested.push({ type, idx });
  }
  requested.sort((a,b) => a.idx - b.idx);

  const has = type => existing.has(type) || planned.has(type);
  const add = (type, x, y, extra = {}) => {
    if (!isExecutable(type) || has(type)) return;
    planned.add(type);
    ops.push({ op:"addNode", type, x, y, ...extra });
  };
  const connect = (fromType, toType, preferred = null) => {
    const ports = compatibleConnection(fromType, toType, preferred);
    if (!ports) return false;
    const [fromPort,toPort] = ports;
    const key = `${fromType}:${fromPort}>${toType}:${toPort}`;
    if (!ops.some(o => o.op === "connect" && `${o.fromType}:${o.fromPort}>${o.toType}:${o.toPort}` === key)) {
      ops.push({ op:"connect", fromType, fromPort, toType, toPort });
    }
    return true;
  };

  // Add every explicitly requested executable node, laid out by functional lane.
  let xVideo = 70, xFx = 330, xControl = 70, xStage = 650;
  let yVideo = 70, yControl = 360, yStage = 360;
  for (const { type } of requested) {
    if (VIDEO_SOURCES.includes(type)) { add(type, xVideo, yVideo); yVideo += 145; }
    else if (VIDEO_CHAIN.has(type)) { add(type, xFx, yVideo); xFx += 235; }
    else if (CONTROL_SOURCES.includes(type) || ["add","multiply","smooth","compare","boolean","text","inputmapper","datalab"].includes(type)) {
      add(type, xControl, yControl); xControl += 210;
    } else {
      add(type, xStage, yStage); yStage += 130;
    }
  }

  // If an FX is requested without a source, add a safe local camera source (permission still remains user-only).
  const requestedFx = requested.filter(x => VIDEO_CHAIN.has(x.type)).map(x => x.type);
  let source = VIDEO_SOURCES.find(type => has(type));
  if (requestedFx.length && !source) {
    add("camera", 70, 70);
    source = "camera";
    notes.push("Source caméra ajoutée au patch, sans demander la permission automatiquement.");
  }

  // Chain requested video effects in textual order.
  let prev = source;
  for (const type of requested.map(x => x.type).filter(type => VIDEO_CHAIN.has(type))) {
    if (prev && prev !== type && connect(prev, type, "video")) prev = type;
    else if (!prev) prev = type;
  }

  // Common controller intentions.
  const shaderTarget = has("shader") ? "shader" : null;
  if (has("midi") && shaderTarget && /midi.*(shader|intens)|shader.*midi/.test(t)) connect("midi","shader","number");
  if (has("gyro") && requestedFx.length) connect("gyro", requestedFx[0], "number");
  if (has("automation") && requestedFx.length) connect("automation", requestedFx[0], "number");
  if (has("inputmapper")) {
    const ctrl = CONTROL_SOURCES.find(type => has(type) && type !== "inputmapper");
    if (ctrl) connect(ctrl,"inputmapper","number");
  }

  // Creative parameter intents.
  const set = (type,key,value) => {
    if (has(type)) ops.push({ op:"setParam", type, key, value });
  };
  if (/plus lent|ralenti|doucement/.test(t)) { set("whale","motionSpeed",0.55); set("automation","speed",0.15); }
  if (/plus vite|accelere|accélère|rapide/.test(t)) { set("whale","motionSpeed",1.55); set("automation","speed",0.8); }
  if (/plus grand|grossis|agrandis/.test(t)) { set("whale","scale",1.35); set("mapping","scale",1.2); }
  if (/trainee|traînée|trail|fantom/.test(t)) { set("whale","trail",0.42); set("ghost","decay",0.86); }
  if (/respir|vivant|organique/.test(t)) set("whale","breathe",0.065);
  if (/inverse|inverser/.test(t)) { set("threshold","invert",true); set("shadow","invert",true); }
  if (/miroir vertical/.test(t)) set("mirror","axis","y");

  // Timeline / cues from natural durations.
  const duration = t.match(/(\d+(?:[.,]\d+)?)\s*(?:seconde|secondes|sec|s)\b/);
  if (duration && /cue|top|timeline|pendant|duree|durée/.test(t)) {
    const seconds = Math.max(0.1, Math.min(3600, Number(duration[1].replace(",","."))));
    ops.push({ op:"addClip", track:/cue|top/.test(t) ? 4 : 1, start:0, duration:seconds, label:/cue|top/.test(t) ? "TOP Vibe" : "Vibe", kind:/cue|top/.test(t) ? "cue" : "effect" });
  } else if (/\b(top|cue)\b/.test(t)) {
    ops.push({ op:"addClip", track:4, start:0, duration:1, label:"TOP Vibe", kind:"cue" });
  }

  // Useful scene macros.
  if (/chaine video|cha[iî]ne video|patch video|demo video/.test(t) && !requested.length) {
    add("camera",70,70); add("threshold",330,70); add("ghost",560,70); add("mapping",790,70);
    connect("camera","threshold","video"); connect("threshold","ghost","video"); connect("ghost","mapping","video");
  }
  if (/regie osc|régie osc|controle millumin|contrôle millumin/.test(t)) {
    add("midi",70,360); add("inputmapper",300,360); add("millumin",560,360);
    connect("midi","inputmapper","number"); connect("inputmapper","millumin","number");
    notes.push("Millumin reste désarmé : aucun envoi sans Trigger ou armement manuel.");
  }

  return {
    engine:"local-planner",
    ops,
    note: ops.length ? "Planner local déterministe · intentions + câblage typé." : "Planner local : aucune intention reconnue.",
    diagnostics:{ requested:requested.map(x => x.type), notes }
  };
}
