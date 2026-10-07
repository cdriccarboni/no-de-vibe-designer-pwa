import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import http from "node:http";

const roots=["desktop","shared","src"];
const files=[];
function walk(dir){
  if(!fs.existsSync(dir))return;
  for(const name of fs.readdirSync(dir)){
    const p=path.join(dir,name),s=fs.statSync(p);
    if(s.isDirectory())walk(p); else if(/\.m?js$/.test(p))files.push(p);
  }
}
for(const root of roots)walk(root);
let syntaxFailed=0;
for(const file of files){
  const r=spawnSync(process.execPath,["--check",file],{encoding:"utf8"});
  if(r.status!==0){syntaxFailed++;console.error("SYNTAX_FAIL",file,"\n",r.stderr||r.stdout);}
}
if(syntaxFailed)throw new Error("syntax failures: "+syntaxFailed);

const { createNodeProcessors }=await import("./shared/node-processors.js");
const { EXECUTABLE_TYPES }=await import("./shared/ports.js");
const { NODE_GROUPS }=await import("./shared/node-specs.js");
const { deterministicVibePlan }=await import("./shared/vibe-planner.js");
const { detectRunnableEngines,drawingScript }=await import("./shared/cx-source.js");
const { createRegiePreset }=await import("./shared/companion-studio/regie-presets.js");

const processorMap=createNodeProcessors();
const radioTypes=["audio-in","broadcast-in","radio-live","stream-studio","audio-mixer","audio-gain","audio-limiter","audio-monitor","radio-bus","radio-out","radio-monitor"];
function assert(ok,msg){if(!ok)throw new Error("ASSERT_FAIL: "+msg);console.log("OK",msg);}
assert(radioTypes.every(t=>EXECUTABLE_TYPES.has(t)),"all radio/audio types executable");
assert(radioTypes.every(t=>processorMap.has(t)),"all radio/audio types have processors");
const library=[...new Set(NODE_GROUPS.flatMap(([,items])=>items.map(([,type])=>type)))];
assert(library.every(t=>EXECUTABLE_TYPES.has(t)),"entire Library has ports");
assert(library.every(t=>processorMap.has(t)||["twozero","td","isadora","chataigne","millumin","touchdesigner","isadorabridge","max","pd","supercollider"].includes(t)),"entire Library has processor or bridge");

const prompt="un chat qui court dans les arbres avec un effet Matrix, boucle propre";
const engines=detectRunnableEngines(prompt);
assert(engines.includes("p5")&&engines.includes("glsl"),"natural Matrix prompt routes to p5 + glsl");
const plan=deterministicVibePlan(prompt,{nodes:[],edges:[]});
assert(plan.ops.some(o=>o.op==="addNode"&&o.type==="p5"),"Matrix prompt creates p5");
assert(plan.ops.some(o=>o.op==="addNode"&&o.type==="shader"),"Matrix prompt creates shader");
assert(/rect\(width\*0\.34/.test(drawingScript(prompt)),"cat silhouette script generated");
const td=deterministicVibePlan("fais-moi ça dans TouchDesigner",{nodes:[],edges:[]});
assert(td.ops.some(o=>o.op==="addNode"&&["td","touchdesigner"].includes(o.type)),"TouchDesigner request creates bridge/tool");

const desktop=fs.readFileSync("desktop/app.js","utf8");
assert(!/rp[12]_[A-Za-z0-9_-]{16,}/.test(desktop),"no static publish token in desktop");
assert(desktop.includes("nvd.radio.owner"),"paired owner stored locally");
assert(desktop.includes("node-on-air")&&desktop.includes("radioOnAirBtn"),"ON AIR UI present");
assert(desktop.includes("Exemples")||fs.readFileSync("desktop/index.html","utf8").includes("Exemples"),"Examples dropdown present");
const preset=createRegiePreset("radio");
assert(preset.pages.some(p=>(p.widgets||[]).some(w=>w.binding?.kind==="broadcast")),"Companion radio preset present");

console.log("VALIDATION_OK",files.length,"js files checked");
if (process.env.CI) process.exit(0);
const port=Number(process.env.PORT)||8080;
http.createServer((req,res)=>{res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify({ok:true,validation:"NVD radio safe"}));}).listen(port,"0.0.0.0",()=>console.log("LISTEN",port));
