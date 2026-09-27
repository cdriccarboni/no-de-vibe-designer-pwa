export const SCHEMA = 'nodevibe.graph';
export const SCHEMA_VERSION = 2;

let seq = 0;
export function uid(prefix='id') {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq.toString(36)}_${Math.random().toString(36).slice(2,7)}`;
}

export const NODE_DEFS = {
  number:{label:'Nombre',category:'Logique',inputs:[],outputs:[['value','number']],params:{value:1}},
  boolean:{label:'Booléen',category:'Logique',inputs:[],outputs:[['value','boolean']],params:{value:false}},
  text:{label:'Texte',category:'Logique',inputs:[],outputs:[['value','text']],params:{value:''}},
  add:{label:'Addition',category:'Logique',inputs:[['a','number'],['b','number']],outputs:[['value','number']],params:{}},
  multiply:{label:'Multiplication',category:'Logique',inputs:[['a','number'],['b','number']],outputs:[['value','number']],params:{}},
  smooth:{label:'Lissage',category:'Logique',inputs:[['value','number']],outputs:[['value','number']],params:{amount:0.18}},
  compare:{label:'Comparaison',category:'Logique',inputs:[['a','number'],['b','number']],outputs:[['result','boolean']],params:{operator:'>'}},
  trigger:{label:'Trigger',category:'Temps',inputs:[['gate','boolean']],outputs:[['event','event']],params:{}},
  timer:{label:'Timer',category:'Temps',inputs:[['start','event']],outputs:[['time','number'],['done','event']],params:{duration:1,loop:false}},
  feedback:{label:'Feedback / Frame Delay',category:'Logique',inputs:[['in','any']],outputs:[['out','any']],params:{}},
  blackhole:{label:'Trou noir',category:'Visuel',inputs:[['speed','number'],['size','number']],outputs:[['visual','visual']],params:{speed:0.65,size:0.58,accretion:0.72}},
  transform:{label:'Transform',category:'Visuel',inputs:[['visual','visual'],['scale','number'],['rotation','number']],outputs:[['visual','visual']],params:{scale:1,rotation:0}},
  preview:{label:'Preview / OUTPUT',category:'Sortie',inputs:[['visual','visual']],outputs:[['visual','visual']],params:{}},
  camera:{label:'Caméra',category:'Entrée',inputs:[],outputs:[['visual','visual']],params:{deviceId:'',facingMode:'user',active:false}},
  'luma-track':{label:'Tracking luminance',category:'Visuel',inputs:[['visual','visual']],outputs:[['x','number'],['y','number'],['level','number']],params:{threshold:0.65}},
  'midi-in':{label:'MIDI In',category:'Entrée',inputs:[],outputs:[['value','number'],['velocity','number'],['event','event']],params:{device:'',channel:1,cc:1}},
  'osc-out':{label:'OSC Out',category:'Sortie',inputs:[['value','any'],['trigger','event']],outputs:[['sent','event']],params:{host:'127.0.0.1',port:8000,address:'/nodevibe'}},
  'artnet-out':{label:'Art-Net / DMX Out',category:'Sortie',inputs:[['value','number'],['trigger','event']],outputs:[['sent','event']],params:{host:'127.0.0.1',universe:0,channel:1}},
  'serial-in':{label:'Serial In',category:'Entrée',inputs:[],outputs:[['value','number'],['text','text'],['event','event']],params:{baudRate:115200}},
  subpatch:{label:'Boîte',category:'Structure',inputs:[],outputs:[],params:{},dynamic:true},
  'patch-in':{label:'Entrée de boîte',category:'Interne',inputs:[],outputs:[['out','any']],params:{portId:'in',name:'In',dataType:'any'},internal:true},
  'patch-out':{label:'Sortie de boîte',category:'Interne',inputs:[['in','any']],outputs:[],params:{portId:'out',name:'Out',dataType:'any'},internal:true}
};

export function createProject(name='Sans titre') {
  const root = uid('patch');
  return {
    schema:SCHEMA, schemaVersion:SCHEMA_VERSION, appVersion:'0.8.0', id:uid('project'), name,
    rootPatchId:root,
    patches:{[root]:{id:root,name:'Patch principal',parentNodeId:null,nodes:[],connections:[]}},
    timeline:{cues:[],playhead:0},
    workspace:{currentPatchId:root,zoomByPatch:{[root]:1},panByPatch:{[root]:{x:0,y:0}}},
    meta:{createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}
  };
}

export function defFor(project,node) {
  const base=NODE_DEFS[node.type];
  if(!base) throw new Error(`Type de node inconnu : ${node.type}`);
  if(node.type!=='subpatch') return base;
  const child=project.patches[node.subpatchId];
  if(!child) return {...base,inputs:[],outputs:[]};
  const ins=child.nodes.filter(n=>n.type==='patch-in').map(n=>[n.params.portId,n.params.dataType||'any',n.params.name||n.params.portId]);
  const outs=child.nodes.filter(n=>n.type==='patch-out').map(n=>[n.params.portId,n.params.dataType||'any',n.params.name||n.params.portId]);
  return {...base,inputs:ins,outputs:outs};
}

export function addNode(project,patchId,type,opts={}) {
  const patch=project.patches[patchId];
  if(!patch) throw new Error(`Patch introuvable : ${patchId}`);
  const def=NODE_DEFS[type];
  if(!def) throw new Error(`Node non disponible : ${type}`);
  const node={id:opts.id||uid('node'),type,name:opts.name||def.label,x:Number(opts.x??80),y:Number(opts.y??80),params:{...(def.params||{}),...(opts.params||{})}};
  if(type==='subpatch') {
    const childId=opts.subpatchId||uid('patch');
    node.subpatchId=childId;
    project.patches[childId]={id:childId,name:opts.name||'Boîte',parentNodeId:node.id,nodes:[],connections:[]};
  }
  patch.nodes.push(node); touch(project); return node;
}

export function addBoxPort(project,subpatchNode,direction,name,dataType='any') {
  if(subpatchNode.type!=='subpatch') throw new Error('Le node ciblé n’est pas une boîte');
  const child=project.patches[subpatchNode.subpatchId];
  if(!child) throw new Error('Sous-patch introuvable');
  const portId=uid(direction==='input'?'in':'out');
  const type=direction==='input'?'patch-in':'patch-out';
  const node=addNode(project,child.id,type,{name,params:{portId,name,dataType},x:direction==='input'?40:620,y:80+child.nodes.length*54});
  return {portId,node};
}

export function removeNode(project,patchId,nodeId) {
  const patch=project.patches[patchId]; if(!patch) return false;
  const idx=patch.nodes.findIndex(n=>n.id===nodeId); if(idx<0) return false;
  const [node]=patch.nodes.splice(idx,1);
  patch.connections=patch.connections.filter(c=>c.from.node!==nodeId&&c.to.node!==nodeId);
  if(node.type==='subpatch') deletePatchTree(project,node.subpatchId);
  touch(project); return true;
}
function deletePatchTree(project,patchId){
  const p=project.patches[patchId]; if(!p)return;
  for(const n of p.nodes) if(n.type==='subpatch') deletePatchTree(project,n.subpatchId);
  delete project.patches[patchId];
}

export function portInfo(project,patchId,nodeId,portId,direction){
  const patch=project.patches[patchId]; const node=patch?.nodes.find(n=>n.id===nodeId); if(!node)return null;
  const def=defFor(project,node); const list=direction==='input'?def.inputs:def.outputs;
  const raw=list.find(p=>p[0]===portId); if(!raw)return null;
  return {id:raw[0],type:raw[1]||'any',label:raw[2]||raw[0],node};
}
export function compatible(fromType,toType){
  if(fromType==='any'||toType==='any'||fromType===toType)return true;
  if(fromType==='event'&&toType==='boolean')return true;
  if(fromType==='boolean'&&toType==='number')return true;
  return false;
}
export function connect(project,patchId,fromNode,fromPort,toNode,toPort,opts={}){
  const patch=project.patches[patchId]; if(!patch)throw new Error('Patch introuvable');
  if(fromNode===toNode&&fromPort===toPort)throw new Error('Une sortie ne peut pas être reliée à elle-même');
  const a=portInfo(project,patchId,fromNode,fromPort,'output'); const b=portInfo(project,patchId,toNode,toPort,'input');
  if(!a)throw new Error(`Sortie introuvable : ${fromPort}`); if(!b)throw new Error(`Entrée introuvable : ${toPort}`);
  if(!compatible(a.type,b.type))throw new Error(`Connexion incompatible : ${a.type} → ${b.type}`);
  const dupe=patch.connections.find(c=>c.from.node===fromNode&&c.from.port===fromPort&&c.to.node===toNode&&c.to.port===toPort);
  if(dupe)return dupe;
  if(!opts.allowMultipleInput) patch.connections=patch.connections.filter(c=>!(c.to.node===toNode&&c.to.port===toPort));
  const c={id:uid('edge'),from:{node:fromNode,port:fromPort},to:{node:toNode,port:toPort}};patch.connections.push(c);touch(project);return c;
}
export function disconnect(project,patchId,edgeId){const p=project.patches[patchId];if(!p)return false;const n=p.connections.length;p.connections=p.connections.filter(c=>c.id!==edgeId);touch(project);return p.connections.length<n;}

export function wrapNodesInSubpatch(project,patchId,nodeIds,name='Boîte'){
  const patch=project.patches[patchId]; if(!patch)throw new Error('Patch introuvable');
  const set=new Set(nodeIds); const selected=patch.nodes.filter(n=>set.has(n.id)); if(!selected.length)throw new Error('Aucun node à ranger dans la boîte');
  const box=addNode(project,patchId,'subpatch',{name,x:Math.min(...selected.map(n=>n.x)),y:Math.min(...selected.map(n=>n.y))});
  const child=project.patches[box.subpatchId];
  const internalEdges=patch.connections.filter(c=>set.has(c.from.node)&&set.has(c.to.node));
  const incoming=patch.connections.filter(c=>!set.has(c.from.node)&&set.has(c.to.node));
  const outgoing=patch.connections.filter(c=>set.has(c.from.node)&&!set.has(c.to.node));
  child.nodes.push(...selected); child.connections.push(...internalEdges);
  patch.nodes=patch.nodes.filter(n=>!set.has(n.id));
  patch.connections=patch.connections.filter(c=>!set.has(c.from.node)&&!set.has(c.to.node));
  for(const e of incoming){
    const target=portInfo({...project,patches:{...project.patches,[patchId]:{...patch,nodes:[...patch.nodes,...selected]}}},patchId,e.to.node,e.to.port,'input');
    const {portId,node:pin}=addBoxPort(project,box,'input',target?.label||e.to.port,target?.type||'any');
    connect(project,child.id,pin.id,'out',e.to.node,e.to.port);
    connect(project,patchId,e.from.node,e.from.port,box.id,portId);
  }
  for(const e of outgoing){
    const srcDef=NODE_DEFS[selected.find(n=>n.id===e.from.node)?.type];
    const raw=srcDef?.outputs?.find(p=>p[0]===e.from.port); const dtype=raw?.[1]||'any';
    const {portId,node:pout}=addBoxPort(project,box,'output',raw?.[2]||e.from.port,dtype);
    connect(project,child.id,e.from.node,e.from.port,pout.id,'in');
    connect(project,patchId,box.id,portId,e.to.node,e.to.port);
  }
  touch(project);return box;
}

export function breadcrumbs(project,patchId){
  const out=[]; let current=project.patches[patchId]; const guard=new Set();
  while(current&&!guard.has(current.id)){guard.add(current.id);out.unshift({patchId:current.id,name:current.name});if(!current.parentNodeId)break;const parentPatch=Object.values(project.patches).find(p=>p.nodes.some(n=>n.id===current.parentNodeId));current=parentPatch;}
  return out;
}
export function parentPatchId(project,patchId){const p=project.patches[patchId];if(!p?.parentNodeId)return null;return Object.values(project.patches).find(x=>x.nodes.some(n=>n.id===p.parentNodeId))?.id||null;}

export function cloneProject(p){return JSON.parse(JSON.stringify(p));}
export function serializeProject(project){touch(project);return JSON.stringify(project,null,2);}
export function deserializeProject(input){
  const raw=typeof input==='string'?JSON.parse(input):cloneProject(input);
  if(raw.schema===SCHEMA&&raw.schemaVersion===2)return normalize(raw);
  if(raw.schema==='cvd.graph'||raw.schemaVersion===1||Array.isArray(raw.nodes))return migrateV1(raw);
  throw new Error('Format de projet non reconnu');
}
function normalize(p){p.timeline ||= {cues:[],playhead:0};p.workspace ||= {currentPatchId:p.rootPatchId,zoomByPatch:{},panByPatch:{}};p.meta ||= {};for(const patch of Object.values(p.patches||{})){patch.nodes ||= [];patch.connections ||= patch.edges||[];}return p;}
function migrateV1(old){
  const p=createProject(old.name||old.projectName||'Projet migré'); const root=p.patches[p.rootPatchId];
  const nodes=old.nodes||old.graph?.nodes||[]; const edges=old.edges||old.connections||old.graph?.edges||[];
  const idMap=new Map();
  for(const n of nodes){const type=NODE_DEFS[n.type]?n.type:(n.type==='points'?'luma-track':n.type==='shader'?'blackhole':'number');const nn=addNode(p,root.id,type,{id:n.id||undefined,name:n.name||n.title,x:n.x??n.position?.x??80,y:n.y??n.position?.y??80,params:n.params||{}});idMap.set(n.id,nn.id);}
  for(const e of edges){try{const f=e.from||e.source||{};const t=e.to||e.target||{};const fn=idMap.get(f.node||e.source)||f.node||e.source;const tn=idMap.get(t.node||e.target)||t.node||e.target;const fd=defFor(p,root.nodes.find(n=>n.id===fn));const td=defFor(p,root.nodes.find(n=>n.id===tn));if(fd?.outputs?.[0]&&td?.inputs?.[0])connect(p,root.id,fn,f.port||fd.outputs[0][0],tn,t.port||td.inputs[0][0]);}catch{}}
  p.meta.migratedFrom=old.schema||'v1';return p;
}
export function touch(project){if(project?.meta)project.meta.updatedAt=new Date().toISOString();}
