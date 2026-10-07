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

function button(label, secondary, binding, { type="button", w=2, h=1, color="#d7b86a" } = {}) {
  return normalizeWidget({ type, presentation:{ label, secondary, w, h, color }, binding });
}

function conduite() {
  const doc=createUniversalRegieLayout({name:"Conduite",profileIds:[],includeCore:true});
  doc.pages=doc.pages.filter(p=>["show","stage"].includes(p.role));
  doc.meta.presetId="conduite";
  return validateCompanionDocument(doc);
}

function son() {
  const doc=createUniversalRegieLayout({name:"Son",profileIds:[],includeCore:true});
  doc.pages=doc.pages.filter(p=>["show","sound","stage"].includes(p.role));
  const p=page(doc,"sound","Son");
  p.widgets.push(
    button("OSC A","À configurer",{kind:"osc",action:"send",oscAddress:"/control/a",oscPort:9000},{type:"fader",w:1,h:3,color:"#8fa79d"}),
    button("Mute A","À configurer",{kind:"osc",action:"send",oscAddress:"/control/mute",oscPort:9000},{type:"toggle",w:2,h:1,color:"#8fa79d"})
  );
  doc.meta.presetId="son";
  return validateCompanionDocument(doc);
}

function lumiere() {
  const doc=createUniversalRegieLayout({name:"Lumière",profileIds:[],includeCore:true});
  doc.pages=doc.pages.filter(p=>["show","lighting","stage"].includes(p.role));
  const p=page(doc,"lighting","Lumière");
  for(let ch=1;ch<=4;ch++){
    p.widgets.push(button(`CH ${ch}`,"sACN · U1",{kind:"sacn",action:"send",universe:1,channel:ch},{type:"fader",w:1,h:3,color:"#d7b86a"}));
  }
  doc.meta.presetId="lumiere";
  return validateCompanionDocument(doc);
}

function video() {
  const doc=createUniversalRegieLayout({name:"Vidéo",profileIds:[],includeCore:true});
  doc.pages=doc.pages.filter(p=>["show","video","stage"].includes(p.role));
  const p=page(doc,"video","Vidéo");
  p.widgets.unshift(
    button("Play","No-de",{kind:"video",action:"play"},{color:"#8ca7c2"}),
    button("Pause","No-de",{kind:"video",action:"pause"},{color:"#8ca7c2"}),
    button("Stop","No-de",{kind:"video",action:"stop"},{type:"momentary",color:"#c97868"})
  );
  doc.meta.presetId="video";
  return validateCompanionDocument(doc);
}

function plateau() {
  const doc=createUniversalRegieLayout({name:"Plateau",profileIds:[],includeCore:true});
  doc.pages=doc.pages.filter(p=>["show","stage"].includes(p.role));
  const p=page(doc,"stage","Plateau");
  p.widgets.push(
    button("Caméra","On / Off",{kind:"camera",action:"toggle"},{color:"#8ca7c2"}),
    button("Réseau","Ping",{kind:"action",action:"ping"},{color:"#6e8580"})
  );
  doc.meta.presetId="plateau";
  return validateCompanionDocument(doc);
}

function lecteurs12() {
  const doc=createUniversalRegieLayout({name:"12 Players",profileIds:[],includeCore:false});
  doc.pages=[];
  for(let group=0;group<3;group++){
    const start=group*4+1;
    const p={id:`page-audio-players-${group+1}`,name:`Players ${start}–${start+3}`,role:"audio-players",icon:"♪",cols:4,rows:4,widgets:[]};
    for(let offset=0;offset<4;offset++){
      const slot=start+offset;
      const y=offset;
      const make=(label,action,x,w,color)=>normalizeWidget({
        type:"button",
        presentation:{label,secondary:`Player ${slot}`,x,y,w,h:1,color},
        binding:{kind:"audioplayer",action,playerSlot:slot}
      });
      p.widgets.push(
        make(`P${slot} ▶`,"play",0,2,"#8fa79d"),
        make("Ⅱ","pause",2,1,"#d7b86a"),
        make("■","stop",3,1,"#c97868")
      );
    }
    doc.pages.push(p);
  }
  doc.meta.presetId="lecteurs12";
  return validateCompanionDocument(doc);
}

export const REGIE_PRESETS=Object.freeze([
  {id:"conduite",name:"Conduite",badge:"base",description:"Cues et commandes de spectacle.",factory:conduite},
  {id:"son",name:"Son",badge:"son",description:"Page son compacte, à relier au profil de console utilisé.",factory:son},
  {id:"lumiere",name:"Lumière",badge:"lumière",description:"Page lumière compacte avec faders réseau prêts à configurer.",factory:lumiere},
  {id:"video",name:"Vidéo",badge:"vidéo",description:"Transport No-de et page vidéo prête à compléter.",factory:video},
  {id:"plateau",name:"Plateau",badge:"plateau",description:"Commandes plateau, caméra et état réseau.",factory:plateau},
  {id:"lecteurs12",name:"12 Players",badge:"audio",description:"Douze lecteurs stéréo répartis sur trois pages compactes.",factory:lecteurs12}
]);

export function createRegiePreset(id){
  const preset=REGIE_PRESETS.find(p=>p.id===id);
  if(!preset) throw new Error(`Preset Régie inconnu : ${id}`);
  const doc=preset.factory();
  doc.meta={...(doc.meta||{}),presetId:preset.id,presetName:preset.name,installedAt:new Date().toISOString(),quickReady:true};
  return validateCompanionDocument(clone(doc));
}
