import {addNode,connect,wrapNodesInSubpatch,NODE_DEFS} from './graph.js';
const lower=s=>String(s||'').toLocaleLowerCase('fr-FR').normalize('NFD').replace(/\p{Diacritic}/gu,'');
export function planVibe(prompt,project,patchId,selection=[]){
  const t=lower(prompt),ops=[];let explanation='';
  if(/trou noir/.test(t)){ops.push({op:'addNode',key:'speed',type:'number',name:'Vitesse',x:90,y:120,params:{value:.72}},{op:'addNode',key:'blackhole',type:'blackhole',x:310,y:120},{op:'addNode',key:'preview',type:'preview',x:560,y:120},{op:'connect',from:'speed',fromPort:'value',to:'blackhole',toPort:'speed'},{op:'connect',from:'blackhole',fromPort:'visual',to:'preview',toPort:'visual'});explanation='Trou noir animé créé et relié à Preview / OUTPUT.';}
  else if(/liss/.test(t)){const patch=project.patches[patchId],edge=patch.connections.find(c=>!selection.length||selection.includes(c.to.node)||selection.includes(c.from.node));if(edge)ops.push({op:'insertOnEdge',edgeId:edge.id,type:'smooth'});else explanation='Aucune connexion numérique trouvée pour insérer le lissage.';}
  else if(/(dans une boite|dans une boîte|regroupe|sous.?patch)/.test(t)){if(selection.length)ops.push({op:'wrapSelection',name:'Sous-patch'});else explanation='Sélectionne au moins un node avant de demander de le mettre dans une boîte.';}
  else if(/remplace.*midi.*osc|midi.*(?:par|vers).*osc/.test(t)){const midi=project.patches[patchId].nodes.find(n=>n.type==='midi-in');if(midi)ops.push({op:'replaceNode',nodeId:midi.id,type:'osc-out'});else explanation='Aucun node MIDI n’est présent dans ce patch.';}
  else if(/midi/.test(t)&&/osc/.test(t)){ops.push({op:'addNode',key:'midi',type:'midi-in',x:100,y:100},{op:'addNode',key:'osc',type:'osc-out',x:360,y:100},{op:'connect',from:'midi',fromPort:'value',to:'osc',toPort:'value'});explanation='Entrée MIDI reliée à une sortie OSC.';}
  else explanation='La règle locale ne reconnaît pas encore cette intention. Je peux tenter le modèle IA local si Ollama est disponible.';return {operations:ops,explanation};
}
export function applyVibePlan(plan,project,patchId,selection=[]){const refs={},patch=project.patches[patchId],created=[];for(const op of plan.operations||[]){
  if(op.op==='addNode'){if(!NODE_DEFS[op.type])throw new Error(`Vibe a demandé un node inexistant : ${op.type}`);const n=addNode(project,patchId,op.type,op);if(op.key)refs[op.key]=n.id;created.push(n.id);}
  else if(op.op==='connect')connect(project,patchId,refs[op.from]||op.from,op.fromPort,refs[op.to]||op.to,op.toPort);
  else if(op.op==='setParam'){const n=patch.nodes.find(x=>x.id===(refs[op.node]||op.node));if(!n)throw new Error('Node à modifier introuvable');n.params[op.param]=op.value;}
  else if(op.op==='wrapSelection'){const b=wrapNodesInSubpatch(project,patchId,selection,op.name||'Boîte');created.push(b.id);}
  else if(op.op==='insertOnEdge'){const edge=patch.connections.find(e=>e.id===op.edgeId);if(!edge)throw new Error('Connexion à lisser introuvable');patch.connections.splice(patch.connections.indexOf(edge),1);const n=addNode(project,patchId,op.type,{x:300,y:200});connect(project,patchId,edge.from.node,edge.from.port,n.id,'value');connect(project,patchId,n.id,'value',edge.to.node,edge.to.port);created.push(n.id);}
  else if(op.op==='replaceNode'){const n=patch.nodes.find(x=>x.id===op.nodeId);if(!n)throw new Error('Node à remplacer introuvable');const old=n.type;n.type=op.type;n.name=NODE_DEFS[op.type].label;n.params={...(NODE_DEFS[op.type].params||{})};patch.connections=patch.connections.filter(e=>e.from.node!==n.id&&e.to.node!==n.id);plan.explanation=`${NODE_DEFS[old]?.label||old} remplacé par ${n.name}. Les liaisons incompatibles ont été retirées.`;}
}return {created,explanation:plan.explanation||''};}
export function graphSummary(project,patchId){const p=project.patches[patchId];return JSON.stringify({patch:p?.name,nodes:(p?.nodes||[]).map(n=>({id:n.id,type:n.type,name:n.name,params:n.params})),connections:p?.connections||[]});}
