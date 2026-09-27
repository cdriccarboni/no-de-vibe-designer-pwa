import {defFor} from './graph.js';
export class RuntimeEngine{
  constructor(project,{effects={}}={}){this.project=project;this.effects=effects;this.previous=new Map();this.state=new Map();this.lastErrors=[];}
  setProject(p){this.project=p;this.previous.clear();this.state.clear();this.lastErrors=[];}
  async evaluate(patchId=this.project.rootPatchId,externalInputs={},ctx={time:0,dt:1/60,depth:0,stack:[]}){
    if(ctx.depth>32)throw new Error('Profondeur maximale de sous-patch dépassée');if(ctx.stack.includes(patchId))throw new Error('Récursion structurelle de sous-patch détectée');
    const patch=this.project.patches[patchId];if(!patch)throw new Error('Patch runtime introuvable');
    const current=new Map(),done=new Set(),visiting=new Set(),outputs={},errors=[];
    const evalNode=async node=>{
      if(done.has(node.id))return;if(visiting.has(node.id))return;visiting.add(node.id);
      try{
        const def=defFor(this.project,node);const ins={};
        for(const [pid] of def.inputs||[]){const edge=patch.connections.find(c=>c.to.node===node.id&&c.to.port===pid);if(!edge){ins[pid]=undefined;continue;}const src=patch.nodes.find(n=>n.id===edge.from.node);if(src)await evalNode(src);const key=`${patchId}:${edge.from.node}:${edge.from.port}`;ins[pid]=current.has(key)?current.get(key):this.previous.get(key);}
        let result={};if(node.type==='subpatch'){const childInputs={};for(const [pid] of def.inputs)childInputs[pid]=ins[pid];result=await this.evaluate(node.subpatchId,childInputs,{...ctx,depth:ctx.depth+1,stack:[...ctx.stack,patchId]});}else result=await this.runNode(node,ins,{...ctx,patchId,externalInputs});
        for(const [port,val] of Object.entries(result||{}))current.set(`${patchId}:${node.id}:${port}`,val);if(node.type==='patch-out')outputs[node.params.portId]=ins.in;
      }catch(e){errors.push({nodeId:node.id,patchId,message:String(e?.message||e)});}visiting.delete(node.id);done.add(node.id);
    };
    for(const node of patch.nodes)await evalNode(node);for(const [k,v] of current)this.previous.set(k,v);this.lastErrors=errors;return patchId===this.project.rootPatchId?{values:Object.fromEntries(current),outputs,errors}:outputs;
  }
  async runNode(n,i,ctx){const p=n.params||{};switch(n.type){
    case 'number':return {value:Number(p.value)||0};case 'boolean':return {value:Boolean(p.value)};case 'text':return {value:String(p.value??'')};
    case 'add':return {value:(Number(i.a)||0)+(Number(i.b)||0)};case 'multiply':return {value:(Number(i.a)||0)*(Number(i.b)||0)};
    case 'smooth':{const k=`${ctx.patchId}:${n.id}:smooth`;const prev=this.state.get(k)??(Number(i.value)||0);const a=Math.max(0,Math.min(1,Number(p.amount??0.18)));const v=prev+(Number(i.value||0)-prev)*a;this.state.set(k,v);return {value:v};}
    case 'compare':{const a=Number(i.a)||0,b=Number(i.b)||0,op=p.operator||'>';return {result:op==='>'?a>b:op==='<'?a<b:op==='=='?a===b:op==='>='?a>=b:op==='<='?a<=b:a!==b};}
    case 'trigger':return {event:i.gate?{type:'event',time:ctx.time}:undefined};
    case 'timer':{const start=i.start,k=`${ctx.patchId}:${n.id}:timer`;let s=this.state.get(k);if(start&&!s)s=ctx.time;if(s==null)return {time:0};const d=Math.max(.001,Number(p.duration)||1),elapsed=ctx.time-s;if(elapsed>=d){if(p.loop)this.state.set(k,ctx.time);else this.state.delete(k);return {time:d,done:{type:'event',time:ctx.time}};}this.state.set(k,s);return {time:elapsed};}
    case 'feedback':{const k=`${ctx.patchId}:${n.id}:feedback`,out=this.state.get(k);this.state.set(k,i.in);return {out};}
    case 'blackhole':return {visual:{kind:'blackhole',speed:Number(i.speed??p.speed??.65),size:Number(i.size??p.size??.58),accretion:Number(p.accretion??.72),time:ctx.time}};
    case 'transform':return {visual:i.visual?{kind:'transform',source:i.visual,scale:Number(i.scale??p.scale??1),rotation:Number(i.rotation??p.rotation??0)}:undefined};case 'preview':return {visual:i.visual};
    case 'camera':return {visual:this.effects.cameraFrame?.(n)??{kind:'camera',nodeId:n.id,active:!!p.active}};case 'luma-track':return this.effects.trackLuma?.(i.visual,n)??{x:.5,y:.5,level:0};
    case 'midi-in':return this.effects.midiValue?.(n)??{value:0,velocity:0};case 'serial-in':return this.effects.serialValue?.(n)??{value:0,text:''};
    case 'osc-out':if(i.value!==undefined&&this.effects.sendOsc){await this.effects.sendOsc(n,i.value);return {sent:{type:'event',time:ctx.time}};}return {};
    case 'artnet-out':if(i.value!==undefined&&this.effects.sendArtNet){await this.effects.sendArtNet(n,i.value);return {sent:{type:'event',time:ctx.time}};}return {};
    case 'patch-in':return {out:ctx.externalInputs[n.params.portId]};case 'patch-out':return {};default:throw new Error(`Runtime absent pour ${n.type}`);
  }}
}
