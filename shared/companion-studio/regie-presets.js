import { normalizeWidget, validateCompanionDocument } from "./schema.js";
import { createUniversalRegieLayout } from "./layout-generator.js";

const clone = (v) => JSON.parse(JSON.stringify(v));

function page(doc, role, fallbackName = "Page") {
  let p = (doc.pages || []).find(x => x.role === role);
  if (!p) {
    p = { id:`page-${role}`, name:fallbackName, role, icon:"", cols:4, rows:6, widgets:[] };
    doc.pages.push(p);
  }
  return p;
}

function button(label, secondary, binding, {
  type="button", w=2, h=1, color="#d7b86a"
} = {}) {
  return normalizeWidget({
    type,
    presentation:{ label, secondary, w, h, color },
    binding
  });
}

function rehearsalExpress() {
  const doc = createUniversalRegieLayout({ name:"Répète Express", profileIds:[], includeCore:true });
  doc.meta.presetId = "rehearsal-express";
  doc.meta.quickReady = true;
  const show = page(doc,"show","Conduite");
  show.widgets.unshift(
    button("REPRENDRE", "Play / pause immédiat", { kind:"video", action:"toggle" }, { w:2, h:1, color:"#8fa79d" }),
    button("CAMÉRA", "On / Off", { kind:"camera", action:"toggle" }, { w:2, h:1, color:"#8ca7c2" })
  );
  const stage = page(doc,"stage","Plateau");
  stage.widgets.push(
    button("PING RÉSEAU", "Vérifier le lien", { kind:"action", action:"ping" }, { w:2, h:1, color:"#6e8580" }),
    button("STOP", "Arrêt No-de", { kind:"video", action:"stop" }, { type:"momentary", w:2, h:1, color:"#c97868" })
  );
  return validateCompanionDocument(doc);
}

function soloRegie() {
  const doc = createUniversalRegieLayout({
    name:"Régie Solo",
    profileIds:["generic-osc","generic-dmx"],
    includeCore:true
  });
  doc.meta.presetId = "solo-regie";
  doc.meta.quickReady = true;
  return validateCompanionDocument(doc);
}

function videoRescue() {
  const doc = createUniversalRegieLayout({
    name:"Vidéo Secours",
    profileIds:["qlab5","millumin5","generic-osc"],
    includeCore:true
  });
  doc.meta.presetId = "video-rescue";
  doc.meta.quickReady = true;
  const video = page(doc,"video","Vidéo");
  video.widgets.unshift(
    button("NO-DE PLAY", "Transport local", { kind:"video", action:"play" }, { w:2, h:1, color:"#8ca7c2" }),
    button("NO-DE PAUSE", "Transport local", { kind:"video", action:"pause" }, { w:2, h:1, color:"#8ca7c2" }),
    button("NO-DE STOP", "Transport local", { kind:"video", action:"stop" }, { type:"momentary", w:2, h:1, color:"#c97868" })
  );
  return validateCompanionDocument(doc);
}

function lightingRescue() {
  const doc = createUniversalRegieLayout({
    name:"Lumière Secours",
    profileIds:["generic-dmx"],
    includeCore:true
  });
  doc.meta.presetId = "lighting-rescue";
  doc.meta.quickReady = true;
  const lighting = page(doc,"lighting","Lumière");
  for (let ch=1; ch<=4; ch++) {
    lighting.widgets.push(
      button(`CH ${ch}`, "sACN · U1", { kind:"sacn", action:"send", universe:1, channel:ch }, {
        type:"fader", w:1, h:3, color:"#d7b86a"
      })
    );
  }
  return validateCompanionDocument(doc);
}

function soundRescue() {
  const doc = createUniversalRegieLayout({
    name:"Son Secours · XR/X32",
    profileIds:["behringer-xair","behringer-x32"],
    includeCore:true
  });
  doc.meta.presetId = "sound-rescue";
  doc.meta.quickReady = true;
  return validateCompanionDocument(doc);
}

function stageSimple() {
  const doc = createUniversalRegieLayout({ name:"Plateau Simple", profileIds:[], includeCore:true });
  doc.meta.presetId = "stage-simple";
  doc.meta.quickReady = true;
  doc.pages = doc.pages.filter(p => ["show","stage"].includes(p.role));
  const stage = page(doc,"stage","Plateau");
  stage.widgets.unshift(
    button("GO", "Conduite", { kind:"stage", action:"go" }, { w:2, h:2, color:"#d7b86a" }),
    button("RETOUR VIDÉO", "Monitor via bouton en haut", { kind:"action", action:"ping" }, { w:2, h:1, color:"#8ca7c2" })
  );
  return validateCompanionDocument(doc);
}

function qlabExpress() {
  const doc = createUniversalRegieLayout({
    name:"QLab Express",
    profileIds:["qlab5"],
    includeCore:true
  });
  doc.meta.presetId = "qlab-express";
  doc.meta.quickReady = true;
  return validateCompanionDocument(doc);
}

function milluminExpress() {
  const doc = createUniversalRegieLayout({
    name:"Millumin Express",
    profileIds:["millumin5"],
    includeCore:true
  });
  doc.meta.presetId = "millumin-express";
  doc.meta.quickReady = true;
  return validateCompanionDocument(doc);
}

export const REGIE_PRESETS = Object.freeze([
  {
    id:"rehearsal-express",
    name:"Répète Express",
    badge:"2 min",
    description:"GO, reprise, caméra, réseau et arrêt. Zéro console externe nécessaire.",
    category:"urgence",
    factory:rehearsalExpress
  },
  {
    id:"solo-regie",
    name:"Régie Solo",
    badge:"tout-en-un",
    description:"Conduite + Plateau + OSC + lumière réseau pour une seule personne.",
    category:"urgence",
    factory:soloRegie
  },
  {
    id:"stage-simple",
    name:"Plateau Simple",
    badge:"simple",
    description:"Deux pages seulement : Conduite et Plateau. Gros boutons pour jouer vite.",
    category:"urgence",
    factory:stageSimple
  },
  {
    id:"video-rescue",
    name:"Vidéo Secours",
    badge:"vidéo",
    description:"Transport No-de + QLab + Millumin + OSC générique.",
    category:"metier",
    factory:videoRescue
  },
  {
    id:"lighting-rescue",
    name:"Lumière Secours",
    badge:"lumière",
    description:"4 faders sACN immédiats + Art-Net/sACN générique + conduite.",
    category:"metier",
    factory:lightingRescue
  },
  {
    id:"sound-rescue",
    name:"Son Secours · XR/X32",
    badge:"son",
    description:"Pages Behringer X Air/XR18 et X32/M32 prêtes à personnaliser.",
    category:"metier",
    factory:soundRescue
  },
  {
    id:"qlab-express",
    name:"QLab Express",
    badge:"QLab",
    description:"GO / start / stop QLab + conduite No-de.",
    category:"logiciel",
    factory:qlabExpress
  },
  {
    id:"millumin-express",
    name:"Millumin Express",
    badge:"Millumin",
    description:"Commandes Millumin + transport No-de + conduite.",
    category:"logiciel",
    factory:milluminExpress
  }
]);

export function createRegiePreset(id) {
  const preset = REGIE_PRESETS.find(p => p.id === id);
  if (!preset) throw new Error(`Preset Régie inconnu : ${id}`);
  const doc = preset.factory();
  doc.meta = {
    ...(doc.meta || {}),
    presetId:preset.id,
    presetName:preset.name,
    installedAt:new Date().toISOString(),
    quickReady:true
  };
  return validateCompanionDocument(clone(doc));
}
