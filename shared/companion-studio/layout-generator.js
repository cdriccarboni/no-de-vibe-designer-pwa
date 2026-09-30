import { newCompanionDocument, normalizeWidget, validateCompanionDocument } from "./schema.js";
import { profileById } from "./console-profiles.js";

const PAGE_META = {
  show:{name:"Conduite",emoji:"▶",category:"show"},
  sound:{name:"Son",emoji:"◉",category:"sound"},
  lighting:{name:"Lumière",emoji:"✦",category:"lighting"},
  video:{name:"Vidéo",emoji:"▣",category:"video"},
  stage:{name:"Plateau",emoji:"◆",category:"stage"},
  utility:{name:"Outils",emoji:"⌁",category:"utility"}
};

function makePage(id){
  const m=PAGE_META[id]||PAGE_META.utility;
  return {id:`page-${id}`,name:m.name,role:id,icon:m.emoji,cols:4,rows:6,widgets:[]};
}

function widgetFromAction(profile,action,index,settings={}){
  const binding={...(action.binding||{}),profileId:profile.id,profileName:profile.name};
  if(binding.kind==="osc"){
    binding.oscHost=settings.host||binding.oscHost||"127.0.0.1";
    binding.oscPort=Number(settings.port||binding.oscPort||profile.defaults?.oscPort||9000);
  }
  if(binding.kind==="artnet"){
    binding.artnetHost=settings.host||binding.artnetHost||"255.255.255.255";
    binding.artnetPort=Number(settings.port||binding.artnetPort||6454);
  }
  if(binding.kind==="sacn"){
    binding.sacnHost=settings.host||binding.sacnHost||"";
    binding.sacnPort=Number(settings.port||binding.sacnPort||5568);
  }
  return normalizeWidget({
    type:action.type||"button",
    presentation:{
      label:action.label,
      secondary:action.secondary||profile.name,
      x:index%4,y:Math.floor(index/4),
      w:action.type==="fader"?1:2,
      h:action.type==="fader"?3:1,
      color:profile.category==="lighting"?"#d7b86a":profile.category==="sound"?"#8fa79d":profile.category==="video"?"#8ca7c2":"#b5a0c8"
    },
    binding
  });
}

function coreShowWidgets(){
  return [
    normalizeWidget({id:"show-go",type:"button",presentation:{label:"GO",secondary:"Conduite",w:2,h:2,color:"#d7b86a"},binding:{kind:"stage",action:"go"}}),
    normalizeWidget({id:"show-prev",type:"button",presentation:{label:"PREV",secondary:"Cue précédent",w:1,h:1,color:"#8fa79d"},binding:{kind:"stage",action:"prev"}}),
    normalizeWidget({id:"show-next",type:"button",presentation:{label:"NEXT",secondary:"Cue suivant",w:1,h:1,color:"#8fa79d"},binding:{kind:"stage",action:"next"}}),
    normalizeWidget({id:"show-panic",type:"momentary",presentation:{label:"STOP / PANIC",secondary:"Arrêt scène",w:2,h:1,color:"#c97868"},binding:{kind:"stage",action:"panic",momentary:true}})
  ];
}

function coreStageWidgets(){
  return [
    normalizeWidget({type:"button",presentation:{label:"Play / Pause",secondary:"No-de",w:2,h:1,color:"#8fa79d"},binding:{kind:"video",action:"toggle"}}),
    normalizeWidget({type:"button",presentation:{label:"Caméra",secondary:"On / Off",w:2,h:1,color:"#8ca7c2"},binding:{kind:"camera",action:"toggle"}}),
    normalizeWidget({type:"cue-light",presentation:{label:"Cue Light",secondary:"Plateau",w:2,h:1,color:"#d7b86a"},binding:{kind:"stage",action:"go"}}),
    normalizeWidget({type:"network",presentation:{label:"Réseau",secondary:"RTT / état",w:2,h:1,color:"#6e8580"},binding:{kind:"action",action:"ping"}})
  ];
}

export function createUniversalRegieLayout({
  name="Régie spectacle",
  profileIds=[],
  profileSettings={},
  includeCore=true
}={}){
  const doc=newCompanionDocument({name});
  doc.pages=[];
  const pages=new Map();
  const ensure=(role)=>{
    if(!pages.has(role)){ const p=makePage(role); pages.set(role,p); doc.pages.push(p); }
    return pages.get(role);
  };
  if(includeCore){
    ensure("show").widgets.push(...coreShowWidgets());
    ensure("stage").widgets.push(...coreStageWidgets());
  }

  for(const id of profileIds){
    const profile=profileById(id);
    if(!profile) continue;
    const role=profile.category==="sound"?"sound":profile.category==="lighting"?"lighting":profile.category==="video"?"video":"utility";
    const page=ensure(role);
    const base=page.widgets.length;
    const settings=profileSettings[id]||{};
    for(let i=0;i<(profile.actions||[]).length;i++) page.widgets.push(widgetFromAction(profile,profile.actions[i],base+i,settings));
  }

  for(const role of ["show","sound","lighting","video","stage"]) if(pages.has(role)){
    const p=pages.get(role); doc.pages=doc.pages.filter(x=>x!==p); doc.pages.push(p);
  }
  doc.meta={...(doc.meta||{}),role:"regie",navigation:"horizontal-swipe",profileIds:[...profileIds],universalRegie:true};
  return validateCompanionDocument(doc);
}

export function mergeRegieProfiles(doc,profileIds=[],profileSettings={}){
  const generated=createUniversalRegieLayout({name:doc?.name||"Régie spectacle",profileIds,profileSettings,includeCore:true});
  generated.meta={...(doc?.meta||{}),...(generated.meta||{})};
  return generated;
}
