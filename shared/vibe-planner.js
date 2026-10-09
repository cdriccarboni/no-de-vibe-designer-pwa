import { isExecutable, portLabels, portMeta, typesCompatible } from "./ports.js";
import { mergeRunnableSources } from "./cx-source.js";

export function normalizeVibeText(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

const INTENTS = [
  ["presence", ["presence","présence","interprete","interprète"]],
  ["livingshadow", ["ombre vivante","ombre autonome","ombre qui se detache","ombre qui se détache"]],
  ["stage-output", ["sortie scene","sortie scène","sortie video","sortie vidéo"]],
  ["remote-camera", ["remote camera","camera distante","camera telephone","camera téléphone"]],
  ["phone-camera-back", ["camera arriere","camera arrière","camera back"]],
  ["phone-camera-front", ["camera avant","camera front"]],
  ["camera", ["webcam","camera live","camera","video live"]],
  ["videofile", ["fichier video","fichier vidéo","video fichier","clip video"]],
  ["whale", ["baleine","whale"]],
  ["blob", ["blob","forme organique"]],
  ["threadcurtain", ["thread curtain","rideau de fils numerique","rideau de fil numerique","rideau de fils numérique","rideau de fil numérique","fils numeriques","fils numériques"]],
  ["flowfield", ["flow field","champ de flux","particules flux","body particles"]],
  ["reactiondiffusion", ["reaction diffusion","reaction-diffusion","réaction diffusion"]],
  ["ribbontrail", ["ribbon trail","rubans","ruban lumineux","trails ruban"]],
  ["metaballs", ["metaballs","metaball","sdf organique"]],
  ["sand", ["interactive sand","sable interactif","sable numerique","sable numérique"]],
  ["swarm", ["swarm","boids","essaim","nuée","nuee"]],
  ["ripple", ["ripple","ondes","champ d ondes","ondes interactives","point lumineux","lumiere interactive","lumière interactive"]],
  ["dream", ["dream","reve","rêve","visuel onirique"]],
  ["p5", ["p5","processing"]],
  ["sketch", ["sketch","dessin generatif","dessin génératif"]],
  ["blackhole", ["trou noir","black hole","blackhole"]],
  ["threshold", ["threshold","seuil","silhouette","detourage","détourage"]],
  ["depthmask", ["depth mask","silhouette mask","masque profondeur","masque silhouette"]],
  ["opticalflow", ["optical flow","flux optique","mouvement video","mouvement vidéo"]],
  ["feedbackfx", ["ghost feedback","feedback video","feedback vidéo"]],
  ["fluidwarp", ["fluid warp","warp fluide","deformation fluide","déformation fluide"]],
  ["refraction", ["refraction","réfraction","glass","verre","lentille"]],
  ["pointcloud", ["point cloud","nuage de points","depth points"]],
  ["ghost", ["ghost","fantome","fantôme","trainee","traînée","trail"]],
  ["mirror", ["miroir","mirror"]],
  ["shadow", ["ombre","shadow"]],
  ["bodyclone", ["body clone","clone corps","dedouble","dédouble"]],
  ["anaglyph", ["anaglyphe","3d rouge cyan","rouge cyan"]],
  ["creativefx", ["creative fx","effet creatif","effet créatif"]],
  ["storm", ["storm","orage","tempete","tempête"]],
  ["bending", ["bending","deformation","déformation","distorsion"]],
  ["transmute", ["transmute","transmutation","mutation couleur"]],
  ["shader", ["shader","glsl","ondul","lumiere","lumière","lumineux","lumineuse"]],
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
  ["force", ["force"]],
  ["noise", ["noise","bruit procedural","bruit procédural"]],
  ["curlfield", ["curl field","champ curl","tourbillon vectoriel"]],
  ["particle", ["particle","particule"]],
  ["trail", ["trail node","trainee video","traînée vidéo"]],
  ["spring", ["spring","ressort","inertie ressort"]],
  ["sdf", ["sdf","signed distance","champ de distance"]],
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
  ["libpd", ["libpd"]],
  ["pd", ["pure data","puredata"]],
  ["supercollider", ["supercollider"]]
];

const VIDEO_CHAIN = new Set([
  "threshold","depthmask","opticalflow","ghost","feedbackfx","mirror","shadow","bodyclone","fluidwarp","refraction","pointcloud","anaglyph","creativefx","storm",
  "bending","transmute","shader","mapping","videoreturn","transform","trail"
]);
const VIDEO_SOURCES = ["remote-camera","phone-camera-back","phone-camera-front","camera","videofile","whale","blob","threadcurtain","flowfield","reactiondiffusion","ribbontrail","metaballs","sand","swarm","ripple","dream","p5","sketch","blackhole","particle","sdf"];
const CONTROL_SOURCES = ["midi","gyro","accelerometer","orientation","touch","multitouch","sensors","automation","noise","curlfield","spring","force","timer","number"];

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
    let offset = 0;
    while (offset <= t.length - n.length) {
      const i = t.indexOf(n, offset);
      if (i < 0) break;
      const before = t[i - 1] || "";
      // Intent words must not match inside another word: "ombre" is not
      // requested by "nombre". We deliberately accept a word ending after a
      // recognized stem ("ondul" → "onduler").
      const startsInsideWord = /[a-z0-9]/.test(before) && /^[a-z0-9]/.test(n);
      if (!startsInsideWord) {
        if (i < best) best = i;
        break;
      }
      offset = i + 1;
    }
  }
  return best;
}


function extractPerformerName(rawText) {
  const raw = String(rawText || "");
  const direct = raw.match(/(?:capte|capter|filmer|filme|suit|suivre|presence de|présence de|ombre de|retour de)\s+([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ-]{1,30})/i);
  if (direct?.[1]) return direct[1][0].toUpperCase() + direct[1].slice(1).toLowerCase();
  const stop = new Set(["Je","Il","Elle","On","En","Et","Puis","Quand","Cette","Ce","La","Le","Les","Une","Un","Bon","Voilà","Selon","Max","Node","No","Vibe","Designer","Ombre","Rideau","Camera","Caméra","Retour","Sortie","Jardin","Cour"]);
  const candidates = raw.match(/\b[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ-]{2,30}\b/g) || [];
  return candidates.find(x => !stop.has(x)) || "Interprète";
}

function extractStageSurface(t) {
  if (/rideau de fil|rideau de fils/.test(t)) return "Rideau de fils";
  if (/cyclo|cyclorama/.test(t)) return "Cyclo";
  if (/tulle/.test(t)) return "Tulle";
  if (/ecran fond|écran fond|fond de scene|fond de scène/.test(t)) return "Écran fond";
  if (/ecran|écran/.test(t)) return "Écran";
  if (/sol|plancher/.test(t)) return "Sol";
  return "Sortie Scène";
}

function sceneZones(t) {
  let sourceZone = /(?:interprete|interprète|comedien|comédien|acteur|actrice|personne|[a-z]+)\s+(?:sera|est|se place|va)\s+(?:a|à)\s+jardin/.test(t) || /a jardin|à jardin/.test(t) ? "jardin" : null;
  let shadowZone = /ombre[^.]{0,80}(?:a|à)\s+cour/.test(t) ? "cour" : null;
  if (!sourceZone && /jardin/.test(t)) sourceZone = "jardin";
  if (!shadowZone && /cour/.test(t)) shadowZone = "cour";
  sourceZone ||= "jardin";
  shadowZone ||= sourceZone === "jardin" ? "cour" : sourceZone === "cour" ? "jardin" : "cour";
  return { sourceZone, shadowZone };
}

function livingShadowScenePlan(rawText, t) {
  const shadowLanguage = /ombre|silhouette/.test(t);
  const stageLanguage = /danse|miroir|decroch|décroch|autonom|prend vie|prendre vie|retour video|retour vidéo|jardin|cour/.test(t);
  if (!shadowLanguage || !stageLanguage) return null;

  const person = extractPerformerName(rawText);
  const { sourceZone, shadowZone } = sceneZones(t);
  const surface = extractStageSurface(t);
  const mirrorDance = /miroir|danse|danser/.test(t);
  const autonomous = /autonom|prend vie|prendre vie|vit seule|vie propre/.test(t);
  const sourceType = /remote camera|camera distante|caméra distante|telephone|téléphone/.test(t) ? "remote-camera" : "camera";
  const mode = mirrorDance ? "mirror" : autonomous ? "autonomous" : "attached";

  const ops = [
    { op:"addNode", type:sourceType, x:60, y:80, allowDuplicate:true, title:`Caméra · ${person}`, params:{ sourceName:person } },
    { op:"addNode", type:"presence", x:300, y:80, allowDuplicate:true, title:`Présence · ${person}`, params:{ person, zone:sourceZone, sourceZone, threshold:.45 } },
    { op:"addNode", type:"videoreturn", x:550, y:20, allowDuplicate:true, title:`Retour · ${person}`, params:{ person } },
    { op:"addNode", type:"livingshadow", x:560, y:180, allowDuplicate:true, title:`Ombre Vivante · ${person}`, params:{
      person, sourceZone, shadowZone, mode, autonomy:autonomous ? .7 : .58, threshold:.45, detachable:true
    }},
    { op:"addNode", type:"mapping", x:830, y:180, allowDuplicate:true, title:`Mapping · ${surface}`, params:{ surfaceName:surface, scale:1 } },
    { op:"addNode", type:"stage-output", x:1070, y:180, allowDuplicate:true, title:`Sortie · ${surface}`, params:{ surfaceName:surface } },

    { op:"connect", fromType:sourceType, fromPort:0, toType:"presence", toPort:0 },
    { op:"connect", fromType:"presence", fromPort:4, toType:"videoreturn", toPort:0 },
    { op:"connect", fromType:"presence", fromPort:4, toType:"livingshadow", toPort:0 },
    { op:"connect", fromType:"livingshadow", fromPort:3, toType:"mapping", toPort:0 },
    { op:"connect", fromType:"mapping", fromPort:2, toType:"stage-output", toPort:0 }
  ];

  return {
    engine:"scene-language",
    ops,
    note:`Scène comprise · ${person} (${sourceZone}) → Ombre Vivante (${shadowZone}) → ${surface}.`,
    diagnostics:{
      performer:person, sourceZone, shadowZone, surface,
      behavior:{ mirrorDance, autonomous, detachable:true },
      notes:[
        "La caméra est ajoutée sans demander automatiquement la permission.",
        "L’ombre peut être décrochée par le bouton de l’Inspector ou par son entrée Trigger.",
        "La sortie scénique reste locale : aucun appareil externe n’est armé automatiquement."
      ]
    }
  };
}

export function deterministicVibePlan(text, project = { nodes:[], edges:[] }) {
  const t = normalizeVibeText(text);
  const scenePlan = livingShadowScenePlan(text, t);
  if (scenePlan) return scenePlan;
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
  if (/\b(souris|mouse|curseur|pointeur)\b/.test(t)) add("pointer", 70, 360);
  if (has("pointer") && has("ripple")) connect("pointer", "ripple", "number");
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

  // Macros interactives issues de la veille TouchDesigner.
  if (/thread curtain|rideau de fils numerique|rideau de fil numerique|rideau de fils numérique|rideau de fil numérique|fils numeriques|fils numériques/.test(t)) {
    add("pointer",70,70); add("smooth",260,70); add("threadcurtain",500,70);
    connect("pointer","smooth","number");
    connect("smooth","threadcurtain","number");
    notes.push("Thread Curtain local : souris/main → lissage → rideau, sans caméra obligatoire.");
  }
  if (/essaim|swarm|boids/.test(t)) {
    add("pointer",70,70); add("spring",280,70); add("swarm",520,70);
    connect("pointer","spring","number");
    connect("spring","swarm","number");
  }
  if (/sable interactif|interactive sand/.test(t)) {
    add("pointer",70,70); add("sand",360,70); connect("pointer","sand","number");
  }
  if (/reaction diffusion|reaction-diffusion|réaction diffusion/.test(t)) {
    add("reactiondiffusion",300,70);
  }
  if (/point cloud|nuage de points/.test(t) && !source) {
    add("camera",70,70); add("pointcloud",360,70); connect("camera","pointcloud","video");
  }
  if (/fluid warp|warp fluide|refraction|réfraction|glass/.test(t) && !source) {
    add("camera",70,70);
    const target=/refraction|réfraction|glass/.test(t)?"refraction":"fluidwarp";
    add(target,360,70); connect("camera",target,"video");
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

  const explicit = t.match(/\bnode\s+([a-z0-9][a-z0-9-]{1,})\b/);
  if (explicit && !isExecutable(explicit[1])) {
    notes.push(`Node ${explicit[1]} absent du catalogue. Aucun node inventé.`);
  }
  if (/\bpurr data\b|\bplugdata\b/.test(t)) {
    notes.push("Purr Data et PlugData ne sont pas ajoutés. L'audio embarqué reste libpd.");
  }

  const merged = mergeRunnableSources(text, ops);
  const opsOut = merged.ops.filter(op => !(op.op === "addNode" && existing.has(op.type)));
  return {
    engine:"local-planner",
    ops:opsOut,
    note:[
      merged.ops.length ? "Planner local déterministe · intentions + câblage typé." : "Planner local : aucune intention reconnue.",
      merged.summary
    ].filter(Boolean).join(" · "),
    diagnostics:{ requested:requested.map(x => x.type), notes, engines:merged.engines, unavailable:merged.unavailable }
  };
}
