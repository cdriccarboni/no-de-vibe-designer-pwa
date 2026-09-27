import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createProject,addNode,addBoxPort,connect,serializeProject,deserializeProject,wrapNodesInSubpatch} from '../app/shared/graph.js';
import {RuntimeEngine} from '../app/shared/runtime-core.js';
import {planVibe,applyVibePlan} from '../app/shared/vibe.js';
import {exportMax,exportTouchDesigner} from '../app/shared/exporters.js';

test('critical nested boxes transport a real value and survive save/reload',async()=>{
 const p=createProject('Nested critical'),root=p.patches[p.rootPatchId],source=addNode(p,root.id,'number',{params:{value:3}}),A=addNode(p,root.id,'subpatch',{name:'A'}),Ain=addBoxPort(p,A,'input','A in','number'),Aout=addBoxPort(p,A,'output','A out','number');
 connect(p,root.id,source.id,'value',A.id,Ain.portId);
 const ap=p.patches[A.subpatchId],B=addNode(p,ap.id,'subpatch',{name:'B'}),Bin=addBoxPort(p,B,'input','B in','number'),Bout=addBoxPort(p,B,'output','B out','number');
 connect(p,ap.id,Ain.node.id,'out',B.id,Bin.portId);connect(p,ap.id,B.id,Bout.portId,Aout.node.id,'in');
 const bp=p.patches[B.subpatchId],times=addNode(p,bp.id,'multiply',{name:'× 2'}),two=addNode(p,bp.id,'number',{params:{value:2}});
 connect(p,bp.id,Bin.node.id,'out',times.id,'a');connect(p,bp.id,two.id,'value',times.id,'b');connect(p,bp.id,times.id,'value',Bout.node.id,'in');
 let r=await new RuntimeEngine(p).evaluate();assert.equal(r.values[root.id+':'+A.id+':'+Aout.portId],6);
 const restored=deserializeProject(serializeProject(p));assert.equal(Object.keys(restored.patches).length,3);r=await new RuntimeEngine(restored).evaluate();assert.equal(r.values[restored.rootPatchId+':'+A.id+':'+Aout.portId],6);
});
test('typed connections reject incompatible visual/number wiring',()=>{const p=createProject(),root=p.patches[p.rootPatchId],n=addNode(p,root.id,'number'),preview=addNode(p,root.id,'preview');assert.throws(()=>connect(p,root.id,n.id,'value',preview.id,'visual'),/incompatible/);});
test('cycles use previous-frame fallback without crashing',async()=>{const p=createProject(),root=p.patches[p.rootPatchId],one=addNode(p,root.id,'number',{params:{value:1}}),add=addNode(p,root.id,'add'),fb=addNode(p,root.id,'feedback');connect(p,root.id,one.id,'value',add.id,'b');connect(p,root.id,add.id,'value',fb.id,'in');connect(p,root.id,fb.id,'out',add.id,'a');const e=new RuntimeEngine(p);let r;for(let i=0;i<5;i++)r=await e.evaluate(root.id,{}, {time:i/60,dt:1/60,depth:0,stack:[]});assert.equal(r.errors.length,0);assert.ok(Number.isFinite(r.values[root.id+':'+add.id+':value']));});
test('Vibe creates then modifies a real graph',()=>{const p=createProject(),root=p.patches[p.rootPatchId],plan=planVibe('un trou noir qui tourne',p,root.id,[]);applyVibePlan(plan,p,root.id,[]);assert.ok(root.nodes.some(n=>n.type==='blackhole'));assert.equal(root.connections.length,2);const before=root.nodes.length,target=root.nodes.find(n=>n.type==='blackhole');applyVibePlan(planVibe('ajoute un lissage',p,root.id,[target.id]),p,root.id,[target.id]);assert.equal(root.nodes.length,before+1);assert.ok(root.nodes.some(n=>n.type==='smooth'));});
test('manual wrap creates a genuine subpatch',()=>{const p=createProject(),root=p.patches[p.rootPatchId],a=addNode(p,root.id,'number'),b=addNode(p,root.id,'multiply');connect(p,root.id,a.id,'value',b.id,'a');const box=wrapNodesInSubpatch(p,root.id,[a.id,b.id],'Math Box');assert.equal(root.nodes.length,1);assert.equal(p.patches[box.subpatchId].nodes.filter(n=>!n.type.startsWith('patch-')).length,2);});
test('Max and TouchDesigner exports are structurally valid',()=>{const p=createProject(),root=p.patches[p.rootPatchId],n=addNode(p,root.id,'number',{params:{value:.5}}),smooth=addNode(p,root.id,'smooth');connect(p,root.id,n.id,'value',smooth.id,'value');assert.ok(JSON.parse(exportMax(p).content).patcher.boxes.length>=2);const td=exportTouchDesigner(p),file=path.join(os.tmpdir(),'node-vibe-td-export.py');fs.writeFileSync(file,td.content);const c=spawnSync('python3',['-m','py_compile',file]);assert.equal(c.status,0,c.stderr?.toString());});
test('legacy flat graph migrates to Graph IR v2',()=>{const p=deserializeProject({schema:'cvd.graph',schemaVersion:1,name:'Old',nodes:[{id:'a',type:'midi',x:1,y:2},{id:'b',type:'shader',x:4,y:5}],edges:[]});assert.equal(p.schema,'nodevibe.graph');assert.equal(p.schemaVersion,2);assert.equal(p.patches[p.rootPatchId].nodes.length,2);});
