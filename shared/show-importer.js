/**
 * Importeur de conduite JSON pour No-de Vibe Designer.
 * Accepte soit un projet cvd.graph, soit {name,cues:[...]}.
 * L'import est volontairement déclaratif : aucune commande externe n'est exécutée pendant l'import.
 */
function clone(v){return JSON.parse(JSON.stringify(v));}
function num(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}

export function parseShowManifest(raw){
  const value=typeof raw==="string"?JSON.parse(raw):clone(raw||{});
  if(value?.schema==="cvd.graph"){
    return {
      name:value.name||"Projet importé",
      cues:(value.timeline||[]).filter(c=>c?.kind==="cue").map(c=>({
        id:c.id||null,label:c.label||"Cue",time:num(c.start),duration:Math.max(0.01,num(c.duration,1)),
        actions:Array.isArray(c.actions)?clone(c.actions):[]
      })),
      source:"cvd.graph"
    };
  }
  const cues=Array.isArray(value?.cues)?value.cues:[];
  return {
    name:value?.name||"Conduite importée",
    cues:cues.map((c,i)=>({
      id:c?.id||null,
      label:c?.label||c?.name||`Cue ${i+1}`,
      time:num(c?.time??c?.start),
      duration:Math.max(0.01,num(c?.duration,1)),
      actions:Array.isArray(c?.actions)?clone(c.actions):[]
    })),
    source:"show-manifest"
  };
}

export function applyShowManifest(project, raw, { replaceCues=false } = {}){
  const manifest=parseShowManifest(raw);
  project.timeline=Array.isArray(project.timeline)?project.timeline:[];
  if(replaceCues) project.timeline=project.timeline.filter(c=>c?.kind!=="cue");
  const existing=new Set(project.timeline.map(c=>String(c.id)));
  let seq=project.timeline.reduce((m,c)=>Math.max(m,parseInt(String(c.id||"").replace(/\D/g,""))||0),0)+1;
  const added=[];
  for(const cue of manifest.cues){
    let id=cue.id&&String(cue.id);
    if(!id||existing.has(id)){do{id=`c${seq++}`;}while(existing.has(id));}
    existing.add(id);
    const clip={
      id,kind:"cue",track:0,start:cue.time,duration:cue.duration,label:cue.label,actions:clone(cue.actions)
    };
    project.timeline.push(clip);added.push(clip);
  }
  project.timeline.sort((a,b)=>num(a.start)-num(b.start));
  project.meta=project.meta||{};
  project.meta.lastShowImport={name:manifest.name,source:manifest.source,count:added.length,at:new Date().toISOString()};
  return {manifest,added,project};
}

export function showManifestSummary(raw){
  try{
    const m=parseShowManifest(raw);
    return {ok:true,name:m.name,count:m.cues.length,source:m.source};
  }catch(error){
    return {ok:false,name:"",count:0,source:"invalid",error:error?.message||String(error)};
  }
}
