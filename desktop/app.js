
import {newProject,validateProject,exportProject} from "../shared/ir.js";
import {Runtime} from "../shared/runtime.js";
import {DESTINATIONS,ROUTE_MODES,ensureRouting,setRoute,effectiveRoute} from "../shared/routing.js";
import {DeviceManager} from "../shared/device-manager.js";

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let project=newProject(), nodeSeq=0, clipSeq=0, pointSeq=0, selectedNode=null;
const runtime=new Runtime($("#previewCanvas"));
const devices=new DeviceManager(e=>{ if(e.type==="midi-in")log(`MIDI ${e.message.type} ch${e.message.channel} #${e.message.number} ${e.message.value}`); else if(e.type==="serial-line")log(`SERIAL < ${e.line}`); else if(e.type==="bridge-message")log(`BRIDGE < ${typeof e.data==="string"?e.data:JSON.stringify(e.data).slice(0,160)}`); else if(e.type==="bridge-state")log(`BRIDGE · ${e.state}`); else if(e.type==="serial-state")log(`SERIAL · ${e.state}`); else if(e.type==="midi-state")log(`MIDI · ${e.inputs.length} IN / ${e.outputs.length} OUT`); });
ensureRouting(project);

const LIB=[
 ["Vidéo / caméra",[["Caméra live","camera"],["Retour vidéo régie","videoreturn"],["Mapping vidéo","mapping"],["Tracking / points","tracking"],["Ombre miroir","shadow"],["Anaglyphe","anaglyph"]]],
 ["Shaders / visuels",[["Shader Lab","shader"],["Creative FX","creativefx"],["Storm Forge","storm"],["Bending Lab","bending"],["Transmute","transmute"]]],
 ["Code / génératif",[["Processing / p5.js","p5"],["TouchDesigner tools","td"],["Mini Isadora","isadora"],["Sketch Lab","sketch"]]],
 ["Audio",[["Audio Lab","audio"],["Organic Audio","organicaudio"],["Mémo sonore","soundmemo"]]],
 ["Contrôle scène",[["MIDI Hub","midi"],["OSC","osc"],["Art-Net / DMX","dmx"],["Control surfaces","surface"],["Input Mapper","inputmapper"],["Stage I/O","stageio"]]],
 ["Arduino / devices",[["AutoCode / Arduino IDE","arduino"],["ESP32 / Wemos","esp"],["Servos","servo"],["RFID / QR","rfid"],["Capteurs","sensors"]]],
 ["Passerelles",[["TWOZERO / TD Vibe","twozero"],["Chataigne Bridge","chataigne"],["Millumin Bridge","millumin"],["TouchDesigner Bridge","touchdesigner"],["Isadora Bridge","isadorabridge"],["Max/MSP Bridge","max"],["Pure Data Bridge","pd"],["SuperCollider Bridge","supercollider"]]],
 ["Projet / automation",[["Show Importer","showimport"],["Automation","automation"],["Dream Engine","dream"],["Data Lab","datalab"],["Universal Wire","universal"],["Connectors","connectors"]]]
];
const spec=t=>({
 camera:["Caméra live",["video","tracking","out"]],videoreturn:["Retour vidéo régie",["source","preview","out"]],mapping:["Mapping vidéo",["surface","warp","out"]],
 tracking:["Tracking / points",["points","curve","out"]],shadow:["Ombre miroir",["silhouette","mirror","separate"]],anaglyph:["Anaglyphe",["left","right","depth"]],
 shader:["Shader Lab",["texture","glsl","out"]],creativefx:["Creative FX",["in","fx","out"]],storm:["Storm Forge",["in","storm","out"]],bending:["Bending Lab",["in","warp","out"]],transmute:["Transmute",["in","transform","out"]],
 p5:["Processing / p5.js",["sketch","params","out"]],td:["TouchDesigner tools",["TOP","CHOP","out"]],isadora:["Mini Isadora",["actor","link","out"]],sketch:["Sketch Lab",["code","preview","out"]],
 audio:["Audio Lab",["in","process","out"]],organicaudio:["Organic Audio",["in","reactive","out"]],soundmemo:["Mémo sonore",["record","tag","out"]],
 midi:["MIDI Hub",["device","CC","gate"]],osc:["OSC",["host","address","value"]],dmx:["Art-Net / DMX",["universe","address","value"]],surface:["Control surfaces",["in","map","out"]],inputmapper:["Input Mapper",["source","map","target"]],stageio:["Stage I/O",["in","route","out"]],
 arduino:["AutoCode / Arduino IDE",["board","code","upload"]],esp:["ESP32 / Wemos",["device","wifi","io"]],servo:["Servo",["channel","angle","speed"]],rfid:["RFID / QR",["reader","id","trigger"]],sensors:["Capteurs",["sensor","filter","out"]],
 twozero:["TWOZERO / TD Vibe",["prompt","MCP","TD patch"]],chataigne:["Chataigne Bridge",["module","route","target"]],millumin:["Millumin Bridge",["OSC","layer","cue"]],touchdesigner:["TouchDesigner Bridge",["Python","COMP","tox"]],isadorabridge:["Isadora Bridge",["OSC","actor","trigger"]],max:["Max/MSP Bridge",["maxpat","OSC","MIDI"]],pd:["Pure Data Bridge",["pd patch","OSC","MIDI"]],supercollider:["SuperCollider Bridge",["OSC","synth","bus"]],
 showimport:["Show Importer",["file","map","project"]],automation:["Automation",["trigger","curve","target"]],dream:["Dream Engine",["intent","graph","result"]],datalab:["Data Lab",["data","transform","out"]],universal:["Universal Wire",["input","route","output"]],connectors:["Connectors",["source","protocol","target"]]
}[t]||[t,["input","process","output"]]);

function log(msg){const t=new Date().toLocaleTimeString("fr-FR",{hour12:false});$("#termLog").insertAdjacentHTML("beforeend",`<div>[${t}] ${msg}</div>`);$("#termLog").scrollTop=$("#termLog").scrollHeight}
function buildLibrary(){
  $("#libraryList").innerHTML=LIB.map(([title,items])=>`<div class="lib-section"><div class="lib-title">${title}</div>${items.map(([n,t])=>`<div class="lib-item" data-add="${t}"><span>${n}</span><span>＋</span></div>`).join("")}</div>`).join("");
  $$("[data-add]").forEach(x=>x.onclick=()=>addNode(x.dataset.add));
}
function nodeById(id){return project.nodes.find(n=>n.id===id)}
function ensureEdges(){ project.edges ||= []; return project.edges; }
let wireDraft=null, wireSeq=0;

function portDirection(type,index,count){
  const sourceTypes=new Set(["camera","midi","sensors","rfid","phone-camera-front","phone-camera-back","phone-mic","gyro","accelerometer","orientation","gps","touch","multitouch"]);
  if(sourceTypes.has(type)) return "out";
  if(index===count-1) return "out";
  return "in";
}
function ensureWireLayer(){
  let svg=$("#wireLayer");
  if(svg) return svg;
  svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.id="wireLayer"; svg.classList.add("patch-wires");
  svg.innerHTML='<g id="wirePaths"></g><path id="wireDraftPath" class="wire draft" d=""/>';
  $("#patchSpace").prepend(svg);
  return svg;
}
function portCenter(dot){
  const pr=$("#patchSpace").getBoundingClientRect(), r=dot.getBoundingClientRect();
  return {x:r.left-pr.left+r.width/2+$("#patchSpace").scrollLeft,y:r.top-pr.top+r.height/2+$("#patchSpace").scrollTop};
}
function edgePath(a,b){
  const span=Math.max(60,Math.abs(b.x-a.x)*.45);
  const h1=a.x+(b.x>=a.x?span:-span), h2=b.x-(b.x>=a.x?span:-span);
  return `M ${a.x} ${a.y} C ${h1} ${a.y}, ${h2} ${b.y}, ${b.x} ${b.y}`;
}
function findPort(nodeId,index,dir){
  return document.querySelector(`.port-dot[data-node="${nodeId}"][data-port-index="${index}"][data-dir="${dir}"]`);
}
function renderWires(){
  ensureEdges(); const svg=ensureWireLayer(), group=$("#wirePaths");
  const space=$("#patchSpace"); svg.setAttribute("width",Math.max(space.scrollWidth,space.clientWidth)); svg.setAttribute("height",Math.max(space.scrollHeight,space.clientHeight));
  group.innerHTML="";
  for(const edge of project.edges){
    const from=findPort(edge.from.node,edge.from.port,"out"), to=findPort(edge.to.node,edge.to.port,"in");
    if(!from||!to) continue;
    const path=document.createElementNS("http://www.w3.org/2000/svg","path");
    path.classList.add("wire"); path.dataset.edgeId=edge.id; path.setAttribute("d",edgePath(portCenter(from),portCenter(to)));
    path.addEventListener("dblclick",e=>{e.stopPropagation();project.edges=project.edges.filter(x=>x.id!==edge.id);renderWires();log("Connexion supprimée")});
    group.appendChild(path);
  }
}
function beginWire(e,dot){
  if(e.button!==0) return; e.preventDefault(); e.stopPropagation();
  const start={node:dot.dataset.node,port:+dot.dataset.portIndex,dir:dot.dataset.dir,dot};
  wireDraft=start; const p=portCenter(dot), draft=$("#wireDraftPath"); draft.setAttribute("d",edgePath(p,p)); draft.classList.add("active");
  try{dot.setPointerCapture(e.pointerId)}catch{}
}
function moveWire(e){
  if(!wireDraft) return; const space=$("#patchSpace"), r=space.getBoundingClientRect();
  const a=portCenter(wireDraft.dot), b={x:e.clientX-r.left+space.scrollLeft,y:e.clientY-r.top+space.scrollTop};
  $("#wireDraftPath").setAttribute("d",edgePath(a,b));
}
function finishWire(e){
  if(!wireDraft) return;
  const target=e.target?.closest?.(".port-dot"); const start=wireDraft; wireDraft=null; $("#wireDraftPath")?.classList.remove("active"); $("#wireDraftPath")?.setAttribute("d","");
  if(!target || target===start.dot || target.dataset.dir===start.dir) return;
  let from,to;
  if(start.dir==="out"){from={node:start.node,port:start.port};to={node:target.dataset.node,port:+target.dataset.portIndex};}
  else {from={node:target.dataset.node,port:+target.dataset.portIndex};to={node:start.node,port:start.port};}
  if(from.node===to.node) return;
  ensureEdges();
  // One incoming wire per input: reconnecting replaces the old source.
  project.edges=project.edges.filter(x=>!(x.to.node===to.node&&x.to.port===to.port));
  if(!project.edges.some(x=>x.from.node===from.node&&x.from.port===from.port&&x.to.node===to.node&&x.to.port===to.port)){
    wireSeq++; project.edges.push({id:`e${Date.now()}-${wireSeq}`,from,to}); log(`Connexion · ${nodeById(from.node)?.title||from.node} → ${nodeById(to.node)?.title||to.node}`);
  }
  renderWires(); localStorage.setItem("cvd.autosave",exportProject(project));
}
function attachPortInteractions(el){
  el.querySelectorAll(".port-dot").forEach(dot=>dot.addEventListener("pointerdown",e=>beginWire(e,dot)));
}
window.addEventListener("pointermove",moveWire);
window.addEventListener("pointerup",finishWire);
window.addEventListener("resize",()=>requestAnimationFrame(renderWires));

function addNode(type,x=50+(nodeSeq%4)*180,y=60+Math.floor(nodeSeq/4)*110){
  nodeSeq++;const [title,ports]=spec(type);const n={id:`n${nodeSeq}`,type,title,x,y,params:{enabled:true,duration:5,opacity:1}};project.nodes.push(n);drawNode(n);selectNode(n.id);
  if(type==="camera")runtime.enableCamera().then(()=>log("Caméra active")).catch(e=>log("Caméra : "+e.message));runtime.render();log("Node ajouté · "+title);return n
}
function drawNode(n){
  const el=document.createElement("div");el.className="node";el.dataset.id=n.id;el.style.left=n.x+"px";el.style.top=n.y+"px";
  const ports=spec(n.type)[1];el.innerHTML=`<div class="nh">${n.title}</div><div class="nb">${ports.map((p,i)=>{const dir=portDirection(n.type,i,ports.length);return `<div class="port port-${dir}">${dir==="in"?`<span class="port-dot input" data-node="${n.id}" data-port-index="${i}" data-dir="in" title="Entrée ${p}"></span>`:""}<span class="port-label">${p}</span>${dir==="out"?`<span class="port-dot output" data-node="${n.id}" data-port-index="${i}" data-dir="out" title="Sortie ${p}"></span>`:""}</div>`}).join("")}</div>`;
  $("#patchSpace").appendChild(el);el.onmousedown=()=>selectNode(n.id);attachPortInteractions(el);makeDraggable(el,n);requestAnimationFrame(renderWires)
}
function makeDraggable(el,n){const h=el.querySelector(".nh");let d=false,sx=0,sy=0,ox=0,oy=0;h.onmousedown=e=>{d=true;sx=e.clientX;sy=e.clientY;ox=n.x;oy=n.y;e.preventDefault()};window.addEventListener("mousemove",e=>{if(!d)return;n.x=Math.max(0,ox+e.clientX-sx);n.y=Math.max(0,oy+e.clientY-sy);el.style.left=n.x+"px";el.style.top=n.y+"px";renderWires()});window.addEventListener("mouseup",()=>{if(d){d=false;renderWires()}})}
function selectNode(id){selectedNode=id;$$(".node").forEach(n=>n.classList.toggle("sel",n.dataset.id===id));const n=nodeById(id);if(!n)return;$("#inspectorType").textContent=n.title;$("#inspectorBody").innerHTML=`<div class="field"><label>Durée</label><input id="nDur" type="number" min=".1" step=".1" value="${n.params.duration}"></div><div class="field"><label>Opacité</label><input id="nOpa" type="range" min="0" max="1" step=".01" value="${n.params.opacity}"></div><div class="field"><label>Actif</label><select id="nEnabled"><option value="true">Oui</option><option value="false">Non</option></select></div><button id="toolBtn" class="smallbtn">Ouvrir outil ↗</button>`;$("#nEnabled").value=String(n.params.enabled);$("#nDur").onchange=e=>n.params.duration=+e.target.value;$("#nOpa").oninput=e=>{n.params.opacity=+e.target.value;runtime.render()};$("#nEnabled").onchange=e=>{n.params.enabled=e.target.value==="true";runtime.render()};$("#toolBtn").onclick=()=>log("Outil contextuel demandé · "+n.title)}
function addPoint(x,y){pointSeq++;project.controls.push({id:`p${pointSeq}`,type:"point2d",x,y});drawPoint(project.controls.at(-1),pointSeq);runtime.render()}
function drawPoint(p,i){const d=document.createElement("div");d.className="point";d.style.left=(p.x*100)+"%";d.style.top=(p.y*100)+"%";d.textContent=i;$("#previewOverlay").appendChild(d)}
function addClip(track,start,duration,label,kind="effect"){clipSeq++;const c={id:`c${clipSeq}`,track,start,duration,label,kind};project.timeline.push(c);drawClip(c);return c}
function drawClip(c){const el=document.createElement("div");el.className=`clip ${c.kind}`;el.dataset.id=c.id;el.style.left=(c.start/60*100)+"%";el.style.width=(c.duration/60*100)+"%";el.innerHTML=`${c.label}<span class="resize"></span>`;document.querySelector(`.track[data-track="${c.track}"]`).appendChild(el);clipDrag(el,c)}
function clipDrag(el,c){let m=null,sx=0,s=0,d=0;el.onmousedown=e=>{m=e.target.classList.contains("resize")?"resize":"move";sx=e.clientX;s=c.start;d=c.duration;e.preventDefault()};window.addEventListener("mousemove",e=>{if(!m)return;const w=$(".tracks").getBoundingClientRect().width;const delta=(e.clientX-sx)/w*60;if(m==="move")c.start=Math.max(0,Math.min(60-c.duration,s+delta));else c.duration=Math.max(.25,Math.min(60-c.start,d+delta));el.style.left=(c.start/60*100)+"%";el.style.width=(c.duration/60*100)+"%"});window.addEventListener("mouseup",()=>{if(m){log(`Timeline · ${c.label} ${c.start.toFixed(1)}s / ${c.duration.toFixed(1)}s`);m=null}})}
function redraw(){
  ensureRouting(project); updateRouteButtons();
  $("#patchSpace").innerHTML="";ensureWireLayer();$("#previewOverlay").innerHTML="";$$(".track").forEach(t=>t.innerHTML="");nodeSeq=0;clipSeq=0;pointSeq=0;
  for(const n of project.nodes){nodeSeq=Math.max(nodeSeq,+n.id.replace(/\D/g,"")||0);drawNode(n)} project.controls.forEach((p,i)=>{pointSeq=i+1;drawPoint(p,i+1)});for(const c of project.timeline){clipSeq=Math.max(clipSeq,+c.id.replace(/\D/g,"")||0);drawClip(c)}
  runtime.setProject(project);requestAnimationFrame(renderWires)
}

$("#previewOverlay").onclick=e=>{const r=e.currentTarget.getBoundingClientRect();addPoint((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);log("Point image ajouté")};
$("#clearPoints").onclick=()=>{project.controls=[];$("#previewOverlay").innerHTML="";runtime.render();log("Points effacés")};
$("#addCue").onclick=()=>addClip(4,Math.random()*45,2,"Cue","cue");$("#addEffect").onclick=()=>addClip(1,Math.random()*40,6,"Effet","effect");
function syncPlayButton(){const b=$("#play");if(b){b.textContent=runtime.playing?"Ⅱ":"▶";b.title=runtime.playing?"Pause (Espace)":"Lecture (Espace)"}}
function togglePlay(){const playing=runtime.toggle();syncPlayButton();log(playing?"Lecture":"Pause")}
$("#play").onclick=togglePlay;$("#stop").onclick=()=>{runtime.stop();syncPlayButton();log("Stop")};
setInterval(()=>{$("#timecode").textContent=`00:${String(runtime.time.toFixed(1)).padStart(4,"0")}`;$("#playhead").style.left=`calc(92px + ${(runtime.time/60)*100}% * .86)`},100);

$("#applyVibe").onclick=()=>{
  const t=$("#vibeText").value.toLowerCase();
  if(t.includes("point")&&!project.nodes.some(n=>n.type==="tracking"))addNode("tracking");
  if(t.includes("shader")&&!project.nodes.some(n=>n.type==="shader"))addNode("shader");
  if(t.includes("ombre")&&!project.nodes.some(n=>n.type==="shadow"))addNode("shadow");
  if(t.includes("5 seconde")||t.includes("5s"))addClip(1,12,5,"Anim points","effect");
  if(t.includes("top")||t.includes("cue"))addClip(4,10,1.5,"Top","cue");
  runtime.render();log("Vibe · graphe mis à jour")
};

$("#saveProject").onclick=()=>{const blob=new Blob([exportProject(project)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=(project.name||"projet")+".cvd.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),500);localStorage.setItem("cvd.autosave",exportProject(project));log("Projet enregistré")};
$("#loadProject").onclick=()=>$("#projectFile").click();$("#projectFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;project=validateProject(JSON.parse(await f.text()));redraw();log("Projet chargé · "+project.name)};
window.addEventListener("beforeunload",()=>localStorage.setItem("cvd.autosave",exportProject(project)));

async function openOutput(destination="main-output"){
  const w=window.open(`./output.html?route=${encodeURIComponent(destination)}`,`cvd-output-${destination}`,"popup=yes,width=960,height=540,resizable=yes");
  if(!w){alert("Autorise les pop-ups pour OUTPUT.");return}
  const send=()=>{if(!w.closed)w.postMessage({type:"cvd-project",project},"*")};setTimeout(send,500);window._cvdOutputTimer=setInterval(()=>{if(w.closed)return clearInterval(window._cvdOutputTimer);send()},250);log("OUTPUT ouvert")
}
$("#outputBtn").onclick=openOutput;

function setWorkspaceMode(mode){ document.body.dataset.workspace=mode; $("#modeBureau").classList.toggle("active",mode==="bureau"); $("#modePlateau").classList.toggle("active",mode==="plateau"); localStorage.setItem("cvd.workspace",mode); log(`Mode ${mode==="bureau"?"Bureau":"Plateau"}`); }
$("#modeBureau").onclick=()=>setWorkspaceMode("bureau");
$("#modePlateau").onclick=()=>setWorkspaceMode("plateau");
function applyAppearance(a){ const r=document.documentElement; r.style.setProperty("--accent",a.accent||"#d7b86a"); r.style.setProperty("--accent2",a.secondary||"#8fa79d"); document.body.classList.toggle("gradient-off",a.gradient==="off"); document.body.classList.toggle("gradient-strong",a.gradient==="strong"); const intensity=Number(a.intensity??35)/100; r.style.setProperty("--gradient-alpha",String(intensity)); localStorage.setItem("cvd.appearance",JSON.stringify(a)); }
function readAppearance(){ try{return JSON.parse(localStorage.getItem("cvd.appearance"))||{}}catch{return {}} }
$("#preferencesBtn").onclick=()=>$("#preferencesModal").classList.remove("hidden");
$("#preferencesClose").onclick=()=>$("#preferencesModal").classList.add("hidden");
for(const id of ["accentColor","secondaryColor","gradientMode","gradientIntensity"]){ $("#"+id).oninput=()=>applyAppearance({accent:$("#accentColor").value,secondary:$("#secondaryColor").value,gradient:$("#gradientMode").value,intensity:$("#gradientIntensity").value}); }
$("#appearanceReset").onclick=()=>{ $("#accentColor").value="#d7b86a";$("#secondaryColor").value="#8fa79d";$("#gradientMode").value="subtle";$("#gradientIntensity").value="35";applyAppearance({accent:"#d7b86a",secondary:"#8fa79d",gradient:"subtle",intensity:35}); };
const savedAppearance=readAppearance(); if(savedAppearance.accent){ $("#accentColor").value=savedAppearance.accent;$("#secondaryColor").value=savedAppearance.secondary||"#8fa79d";$("#gradientMode").value=savedAppearance.gradient||"subtle";$("#gradientIntensity").value=String(savedAppearance.intensity??35);applyAppearance(savedAppearance);}
setWorkspaceMode(localStorage.getItem("cvd.workspace")||"bureau");
// Barre espace = Play/Pause global, sans intercepter la saisie texte/code.
document.addEventListener("keydown",e=>{
  if(e.code!=="Space"||e.repeat||e.metaKey||e.ctrlKey||e.altKey) return;
  const t=e.target, tag=t?.tagName?.toLowerCase?.();
  if(tag==="input"||tag==="textarea"||tag==="select"||t?.isContentEditable||t?.closest?.("[contenteditable=true], .code-editor, .monaco-editor")) return;
  e.preventDefault(); togglePlay();
});

$$(".collapse").forEach(b=>b.onclick=()=>b.closest(".panel").classList.toggle("collapsed"));
$("#search").oninput=e=>$$(".lib-item").forEach(x=>x.style.display=x.textContent.toLowerCase().includes(e.target.value.toLowerCase())?"flex":"none");
$("#termSend").onclick=runCmd;$("#termCmd").onkeydown=e=>{if(e.key==="Enter")runCmd()};
async function runCmd(){
  const i=$("#termCmd"),raw=i.value.trim(),v=raw.toLowerCase();if(!v)return;log("> "+raw);
  try{ if(v==="output"||v==="output main")openOutput("main-output"); else if(v==="output secondary")openOutput("local-window"); else if(await devices.command(raw)){} else{ const types=["camera","tracking","shader","shadow","osc","midi","dmx","arduino","esp","servo","twozero","chataigne","millumin","max","pd"]; const found=types.find(x=>v.includes(x)); if(found)addNode(found); else log("Commande reçue · aucune action reconnue"); } }catch(e){log("ERREUR · "+(e?.message||e))}
  i.value="";
}


let routingTrack=0;

function routeSummary(track){
  const r=effectiveRoute(project,track);
  if(r.mode==="main") return "Principal";
  const labels=r.destinations.map(id=>DESTINATIONS.find(d=>d.id===id)?.label||id);
  if(r.mode==="only") return labels.length===1?labels[0]:"Uniq. "+labels.length;
  return labels.length===1?"Copie "+labels[0]:"Copie "+labels.length;
}
function updateRouteButtons(){
  document.querySelectorAll("[data-track-route]").forEach(b=>{
    const t=+b.dataset.trackRoute;
    b.textContent=routeSummary(t);
    b.title=`Piste ${t+1} · ${routeSummary(t)}`;
  });
}
function openRouteSheet(track){
  routingTrack=track;
  ensureRouting(project);
  const r=effectiveRoute(project,track);
  $("#routeSheetTitle").textContent=`Routage piste ${track+1}`;
  $$("[data-route-mode]").forEach(b=>b.classList.toggle("active",b.dataset.routeMode===r.mode));
  $("#routeDestinations").innerHTML=DESTINATIONS.map(d=>{
    const checked=r.destinations.includes(d.id)?"checked":"";
    const status=d.status==="adapter"?"<span class='adapter'>adaptateur</span>":d.status==="planned"?"<small>passerelle</small>":"<small>prêt</small>";
    return `<label class="route-dest"><input type="checkbox" data-route-dest="${d.id}" ${checked}><span>${d.label}</span>${status}</label>`;
  }).join("");
  $("#routeSheet").classList.remove("hidden");
}
document.querySelectorAll("[data-track-route]").forEach(b=>b.onclick=()=>openRouteSheet(+b.dataset.trackRoute));
$("#routeSheetClose").onclick=()=>$("#routeSheet").classList.add("hidden");
$$("[data-route-mode]").forEach(b=>b.onclick=()=>{
  const r=effectiveRoute(project,routingTrack);
  r.mode=b.dataset.routeMode;
  if(r.mode==="main") r.destinations=["main-output"];
  $$("[data-route-mode]").forEach(x=>x.classList.toggle("active",x===b));
  updateRouteButtons();
});
$("#routeDestinations").addEventListener("change",()=>{
  const ids=$$("#routeDestinations [data-route-dest]:checked").map(x=>x.dataset.routeDest);
  const r=effectiveRoute(project,routingTrack);
  if(r.mode==="main"){ r.destinations=["main-output"]; }
  else { r.destinations=ids.length?ids:["main-output"]; }
  updateRouteButtons();
  localStorage.setItem("cvd.autosave",exportProject(project));
  log(`Routage piste ${routingTrack+1} · ${ROUTE_MODES[r.mode]} · ${r.destinations.join(", ")}`);
});

ensureRouting(project);ensureEdges();
updateRouteButtons();
buildLibrary();
const autosave=localStorage.getItem("cvd.autosave");
if(autosave){try{project=validateProject(JSON.parse(autosave));log("Autosave restaurée")}catch{}}
if(project.nodes.length===0){addNode("camera",40,55);addNode("tracking",220,110);addNode("shader",400,170);addClip(1,10,5,"Anim points","effect");addClip(2,18,10,"Shader eau","shader");addClip(4,9,1.5,"Top craie finie","cue")}
redraw();log("Code Vibe Designer · PHASE 1 démarrée");
