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
  const doc = createUniversalRegieLayout({ name:"Répète", profileIds:[], includeCore:true });
  doc.meta.presetId = "rehearsal";
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
    name:"Vidéo",
    profileIds:["qlab5","millumin5","generic-osc"],
    includeCore:true
  });
  doc.meta.presetId = "video";
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
    name:"Lumière",
    profileIds:["generic-dmx"],
    includeCore:true
  });
  doc.meta.presetId = "lighting";
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
    name:"Son · XR/X32",
    profileIds:["behringer-xair","behringer-x32"],
    includeCore:true
  });
  doc.meta.presetId = "sound-xr-x32";
  doc.meta.quickReady = true;
  return validateCompanionDocument(doc);
}

function stageSimple() {
  const doc = createUniversalRegieLayout({ name:"Plateau", profileIds:[], includeCore:true });
  doc.meta.presetId = "stage";
  doc.meta.quickReady = true;
  doc.pages = doc.pages.filter(p => ["show","stage"].includes(p.role));
  const stage = page(doc,"stage","Plateau");
  stage.widgets.unshift(
    button("GO", "Conduite", { kind:"stage", action:"go" }, { w:2, h:1, color:"#d7b86a" }),
    button("RETOUR VIDÉO", "Monitor via bouton en haut", { kind:"action", action:"ping" }, { w:2, h:1, color:"#8ca7c2" })
  );
  return validateCompanionDocument(doc);
}

function qlabExpress() {
  const doc = createUniversalRegieLayout({
    name:"QLab",
    profileIds:["qlab5"],
    includeCore:true
  });
  doc.meta.presetId = "qlab";
  doc.meta.quickReady = true;
  return validateCompanionDocument(doc);
}

function milluminExpress() {
  const doc = createUniversalRegieLayout({
    name:"Millumin",
    profileIds:["millumin5"],
    includeCore:true
  });
  doc.meta.presetId = "millumin";
  doc.meta.quickReady = true;
  return validateCompanionDocument(doc);
}

export const REGIE_PRESETS = Object.freeze([
  {
    id:"rehearsal",
    name:"Répète",
    badge:"répète",
    description:"Conduite, reprise, caméra, réseau et arrêt dans un layout compact.",
    category:"pratique",
    factory:rehearsalExpress
  },
  {
    id:"solo-regie",
    name:"Régie Solo",
    badge:"solo",
    description:"Conduite + Plateau + OSC + lumière réseau pour une seule personne.",
    category:"pratique",
    factory:soloRegie
  },
  {
    id:"stage",
    name:"Plateau",
    badge:"plateau",
    description:"Deux pages seulement : Conduite et Plateau, sans surcharge.",
    category:"pratique",
    factory:stageSimple
  },
  {
    id:"video",
    name:"Vidéo",
    badge:"vidéo",
    description:"Transport No-de + QLab + Millumin + OSC générique.",
    category:"pratique",
    factory:videoRescue
  },
  {
    id:"lighting",
    name:"Lumière",
    badge:"lumière",
    description:"4 faders sACN compacts + Art-Net/sACN générique + conduite.",
    category:"pratique",
    factory:lightingRescue
  },
  {
    id:"sound-xr-x32",
    name:"Son · XR/X32",
    badge:"son",
    description:"Pages Behringer X Air/XR18 et X32/M32 prêtes à personnaliser.",
    category:"pratique",
    factory:soundRescue
  },
  {
    id:"qlab",
    name:"QLab",
    badge:"QLab",
    description:"GO / start / stop QLab + conduite No-de.",
    category:"pratique",
    factory:qlabExpress
  },
  {
    id:"millumin",
    name:"Millumin",
    badge:"Millumin",
    description:"Commandes Millumin + transport No-de + conduite.",
    category:"pratique",
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
