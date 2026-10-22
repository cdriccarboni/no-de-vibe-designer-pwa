import { isExecutable, portLabels, portMeta, typesCompatible } from "./ports.js";
import { mergeRunnableSources } from "./runnable-source.js";
import { planFromRecipe } from "./vibe-recipes.js";

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
  ["threadcurtain", ["thread curtain","rideau de fils","rideau de fil","rideaux de fils","rideaux de fil","rideau interactif","rideau de fils numerique","rideau de fil numerique","rideau de fils numérique","rideau de fil numérique","fils numeriques","fils numériques"]],
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

// ---------------------------------------------------------------------------
// Formes simples × comportements × sources (prompts courts FR/EN).
// Uniquement des nodes exécutables existants : `sdf` dessine un cercle, `ripple`
// des ondes (vague). Aucun node du catalogue ne dessine un carré, une ligne ou une
// étoile : ces formes échouent clairement au lieu d'être remplacées en silence.
// ---------------------------------------------------------------------------
export const VIBE_PROMPT_EXAMPLES = Object.freeze([
  "un cercle qui pulse sur le son",
  "un cercle qui pulse avec le micro",
  "cercle audio réactif",
  "a circle pulsing to the audio",
  "un cercle qui tourne avec le MIDI",
  "une vague qui change de couleur avec la caméra",
  "a wave that grows with the mic"
]);

const SHAPE_WORDS = [
  ["circle", /\b(cercles?|ronds?|circles?)\b/],
  ["square", /\b(carres?|squares?)\b/],
  ["line", /\b(lignes?|lines?)\b/],
  ["star", /\b(etoiles?|stars?)\b/],
  ["wave", /\b(vagues?|waves?|ondes?)\b/]
];
const BEHAVIOR_WORDS = [
  ["pulse", /\b(puls\w*|battements?|beats?)\b/],
  ["rotate", /\b(tourn\w*|rotat\w*|spin\w*|pivot\w*)\b/],
  ["grow", /\b(grossi\w*|grandi\w*|agrandi\w*|gonfl\w*|grow\w*|bigger)\b/],
  ["color", /\b(couleurs?|colou?rs?|teintes?|hue)\b/]
];
const SOURCE_WORDS = [
  ["mic", /\b(micro|microphone|mics?)\b/],
  ["audio", /\b(son|sons|sonore|audio|musique|music|sound)\b/],
  ["midi", /\bmidi\b/],
  ["camera", /\b(camera|webcam)\b/]
];
const SHAPE_LABELS = { circle:"cercle", square:"carré", line:"ligne", star:"étoile", wave:"vague" };
const BEHAVIOR_LABELS = { pulse:"pulse", rotate:"tourne", grow:"grossit", color:"change de couleur" };
const SOURCE_LABELS = { mic:"micro", audio:"son", midi:"MIDI", camera:"caméra", lfo:"LFO (aucune source citée)" };
// Formes réellement dessinées par un node exécutable du catalogue.
const SHAPE_NODES = {
  circle:{ type:"sdf", title:"Cercle (SDF)", params:{ x:.5, y:.5, radius:.24 }, out:3, size:2 },
  wave:{ type:"ripple", title:"Vague (Ondes)", params:{ rings:12 }, out:3, size:2 }
};

function matchWords(t, list) {
  return list
    .map(([id, re]) => { const m = re.exec(t); return m ? { id, idx:m.index } : null; })
    .filter(Boolean)
    .sort((a, b) => a.idx - b.idx);
}

function shapeIntentPlan(t, project) {
  const shapes = matchWords(t, SHAPE_WORDS);
  if (!shapes.length) return null;
  const behaviors = matchWords(t, BEHAVIOR_WORDS);
  const sources = matchWords(t, SOURCE_WORDS);
  const reactive = /\breacti\w*/.test(t);
  if (!behaviors.length && !sources.length && !reactive) return null;

  const shape = shapes[0].id;
  const behavior = behaviors[0]?.id || "pulse";
  const source = sources[0]?.id || "lfo";
  const shapeNode = SHAPE_NODES[shape];
  const examples = VIBE_PROMPT_EXAMPLES.slice(0, 4);

  if (!shapeNode) {
    const label = SHAPE_LABELS[shape];
    return {
      engine:"local-planner",
      ops:[],
      note:`Planner local : forme « ${label} » non réalisable avec les nodes existants. Aucun node inventé.`,
      coverage:{
        status:"none",
        recipe:null,
        label:"Combinaison non réalisable",
        fulfilled:[],
        missing:[{
          need:`Forme « ${label} »`,
          reason:`Aucun node exécutable du catalogue ne dessine un${shape === "square" ? "" : "e"} ${label} ; aucun node n'est inventé ni substitué.`,
          alternative:`Formes disponibles : cercle (SDF) et vague (Ondes). Exemples : ${examples.map(x => `« ${x} »`).join(", ")}.`
        }],
        notes:[],
        examples
      },
      diagnostics:{ shape, behavior, source, unsupported:"shape", notes:[] }
    };
  }

  const recipeId = `shape-${shape}-${behavior}-${source}`;
  const label = `${SHAPE_LABELS[shape]} qui ${BEHAVIOR_LABELS[behavior]} · ${SOURCE_LABELS[source]}`;
  const already = (project?.nodes || []).filter(n => n?.params?.vibeRecipe === recipeId);
  if (already.length) {
    return {
      engine:"local-planner",
      ops:[],
      note:`Forme « ${label} » déjà présente · aucune duplication`,
      coverage:{
        status:"unchanged", recipe:recipeId, label,
        fulfilled:[`« ${label} » est déjà présent (${already.length} nœud(s)) : rien n'a été dupliqué.`],
        missing:[], notes:["Pour recommencer, supprimez ces nœuds ou modifiez-les directement dans le graphe."]
      },
      diagnostics:{ recipe:recipeId, shape, behavior, source, notes:[] }
    };
  }

  const ops = [];
  const notes = [];
  const add = (type, x, y, extra = {}) => ops.push({ op:"addNode", type, x, y, allowDuplicate:true, ...extra, params:{ ...(extra.params || {}), vibeRecipe:recipeId } });
  const link = (fromType, fromPort, toType, toPort) => ops.push({ op:"connect", fromType, fromPort, toType, toPort });

  // 1. Source → signal numérique.
  let signal;
  if (source === "mic" || source === "audio") {
    add("audio-in", 60, 120, { title:source === "mic" ? "Micro (désarmé)" : "Entrée son (désarmée)", params:{ enabled:false } });
    signal = ["audio-in", 1];
    notes.push("L'entrée audio est ajoutée DÉSARMÉE : activez « enabled » dans l'inspecteur (autorisation navigateur requise).");
  } else if (source === "midi") {
    add("midi", 60, 120, { title:"MIDI (CC)" });
    signal = ["midi", 1];
    notes.push("Le CC MIDI pilote le comportement ; brancher un contrôleur Web MIDI.");
  } else if (source === "camera") {
    add("camera", 60, 120, { title:"Caméra" });
    add("opticalflow", 280, 120, { title:"Mouvement caméra" });
    link("camera", 0, "opticalflow", 0);
    signal = ["opticalflow", 1];
    notes.push("La caméra n'est pas démarrée automatiquement : l'autorisation du navigateur reste à votre main.");
  } else {
    add("automation", 60, 120, { title:"LFO", params:{ speed:.5, shape:behavior === "rotate" ? "saw" : "sine" } });
    signal = ["automation", 2];
    notes.push("Aucune source citée (son, micro, MIDI, caméra) : un LFO local anime la forme.");
  }

  // 2. Lissage (sauf LFO, déjà continu) puis mise à l'échelle vers le paramètre visé.
  if (source !== "lfo") {
    add("smooth", 500, 120, { title:"Lissage", params:{ amount:behavior === "pulse" ? .45 : .2 } });
    link(signal[0], signal[1], "smooth", 0);
    signal = ["smooth", 1];
  }
  const inMax = source === "mic" || source === "audio" ? .35 : source === "camera" ? .25 : 1;
  const ranges = {
    pulse: shape === "circle" ? [.12, .45] : [.2, 1],
    grow: [.6, 1.8],
    rotate: [0, Math.round(Math.PI * 2 * 1000) / 1000],
    color: [0, 1]
  };
  const [outMin, outMax] = ranges[behavior];
  add("inputmapper", 720, 120, { title:`Échelle · ${BEHAVIOR_LABELS[behavior]}`, params:{ inMin:0, inMax, outMin, outMax } });
  link(signal[0], signal[1], "inputmapper", 0);

  // 3. Forme + effet éventuel + sortie.
  add(shapeNode.type, 500, 320, {
    title:shapeNode.title,
    params:{ ...shapeNode.params, ...(behavior === "rotate" && shape === "circle" ? { x:.66 } : {}) }
  });
  let visual = [shapeNode.type, shapeNode.out];
  if (behavior === "pulse") {
    link("inputmapper", 3, shapeNode.type, shapeNode.size);
  } else if (behavior === "grow" || behavior === "rotate") {
    add("transform", 760, 320, { title:behavior === "grow" ? "Grossit (Transform)" : "Rotation (Transform)" });
    link(visual[0], visual[1], "transform", 0);
    link("inputmapper", 3, "transform", behavior === "grow" ? 1 : 2);
    visual = ["transform", 3];
    if (behavior === "rotate" && shape === "circle") notes.push("Un cercle centré serait invisible en rotation : il est décalé et tourne autour du centre.");
  } else {
    add("transmute", 760, 320, { title:"Change de couleur (Transmute)" });
    link(visual[0], visual[1], "transmute", 0);
    link("inputmapper", 3, "transmute", 1);
    visual = ["transmute", 2];
  }
  add("stage-output", 1020, 320, { title:`Sortie · ${SHAPE_LABELS[shape]}` });
  link(visual[0], visual[1], "stage-output", 0);

  if (behaviors.length > 1) notes.push(`Un seul comportement est appliqué (« ${BEHAVIOR_LABELS[behavior]} ») ; les autres sont ignorés.`);
  if (sources.length > 1) notes.push(`Une seule source est utilisée (« ${SOURCE_LABELS[source]} »).`);

  return {
    engine:"local-planner",
    ops,
    note:`Forme « ${label} » · patch complet`,
    coverage:{
      status:"complete",
      recipe:recipeId,
      label:`Forme · ${label}`,
      fulfilled:[
        `${SHAPE_LABELS[shape]} dessiné par le node ${shapeNode.type}`,
        `${BEHAVIOR_LABELS[behavior]} piloté par ${SOURCE_LABELS[source]}`,
        "sortie vidéo"
      ],
      missing:[],
      notes
    },
    diagnostics:{ recipe:recipeId, shape, behavior, source, notes }
  };
}

export function deterministicVibePlan(text, project = { nodes:[], edges:[] }) {
  const t = normalizeVibeText(text);
  const scenePlan = livingShadowScenePlan(text, t);
  if (scenePlan) return { ...scenePlan, coverage:{ status:"complete", recipe:"scene-language", label:"Scène comprise", fulfilled:[scenePlan.note], missing:[], notes:scenePlan.diagnostics?.notes || [] } };
  // Recettes : intention créative complète (chaîne câblée) plutôt qu'un nœud isolé par mot-clé.
  const recipePlan = planFromRecipe(text, project);
  if (recipePlan) {
    return {
      engine:"local-planner",
      ops:recipePlan.ops,
      note:recipePlan.note,
      coverage:recipePlan.coverage,
      diagnostics:{ recipe:recipePlan.coverage.recipe, notes:recipePlan.coverage.notes }
    };
  }
  // Prompts courts « forme + comportement + source » (« un cercle qui pulse sur le son »).
  const shapePlan = shapeIntentPlan(t, project);
  if (shapePlan) return shapePlan;
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
  if (/thread curtain|rideau(?:x)? de fil(?:s)?|rideau interactif|fils? numeriques?/.test(t)) {
    const existingCurtain = ops.find(o => o.op === "addNode" && o.type === "threadcurtain");
    if (existingCurtain) {
      existingCurtain.x = 500;
      existingCurtain.y = 70;
    } else {
      add("threadcurtain", 500, 70);
    }
    const existingPointer = ops.find(o => o.op === "addNode" && o.type === "pointer");
    if (existingPointer) {
      existingPointer.x = 70;
      existingPointer.y = 70;
    } else {
      add("pointer", 70, 70);
    }
    add("smooth", 260, 70);
    connect("pointer", "smooth", "number");
    connect("smooth", "threadcurtain", "number");
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
  const addedNodes = opsOut.filter(o => o.op === "addNode").length;
  const edgesPlanned = opsOut.filter(o => o.op === "connect").length;
  return {
    engine:"local-planner",
    coverage: opsOut.length ? {
      status:"partial",
      recipe:null,
      label:"Interprétation par mots-clés",
      fulfilled:requested.map(x => x.type),
      missing:[{
        need:"Intention complète non garantie",
        reason: edgesPlanned
          ? `Le planner a reconnu des mots-clés (${addedNodes} nœud(s), ${edgesPlanned} liaison(s)) sans comprendre l'intention globale.`
          : `Le planner a seulement ajouté ${addedNodes} nœud(s) isolé(s), sans câblage.`,
        alternative:"Préciser le prompt (source → traitement → sortie) ou utiliser l'IA locale."
      }],
      notes:[]
    } : { status:"none", recipe:null, label:"Aucune intention reconnue", fulfilled:[], missing:[{ need:"Intention non reconnue", reason:"Aucun nœud exécutable ne correspond au prompt.", alternative:`Reformuler en citant des sources, effets ou sorties du catalogue. Exemples qui marchent : ${VIBE_PROMPT_EXAMPLES.map(x => `« ${x} »`).join(", ")}.` }], notes:[], examples:[...VIBE_PROMPT_EXAMPLES] },
    ops:opsOut,
    note:[
      merged.ops.length ? "Planner local déterministe · intentions + câblage typé." : `Planner local : aucune intention reconnue. Exemples : ${VIBE_PROMPT_EXAMPLES.slice(0, 3).map(x => `« ${x} »`).join(", ")}.`,
      merged.summary
    ].filter(Boolean).join(" · "),
    diagnostics:{ requested:requested.map(x => x.type), notes, engines:merged.engines, unavailable:merged.unavailable }
  };
}
