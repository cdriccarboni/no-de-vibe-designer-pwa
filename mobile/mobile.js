
import {newProject,addNode,addTimelineClip} from "../shared/ir.js";
import {NODE_GROUPS,spec} from "../shared/node-specs.js";
import {Runtime} from "../shared/runtime.js";
import {MobileSensors} from "../shared/mobile-sensors.js";
import {DESTINATIONS,ensureRouting,effectiveRoute} from "../shared/routing.js";

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let project=newProject(), selected=null, pan={x:0,y:0,scale:1}, gesture=null;
ensureRouting(project);
const runtime=new Runtime($("#stageCanvas"));
const sensors=new MobileSensors(state=>{$("#sensorReadout").textContent=JSON.stringify(state,null,2);$("#sensorStatus").textContent="Capteurs ON";});

function screen(name){
  $$(".screen").forEach(s=>s.classList.toggle("active",s.dataset.screen===name));
  $$("[data-nav]").forEach(b=>b.classList.toggle("active",b.dataset.nav===name));
  $("#screenTitle").textContent=name[0].toUpperCase()+name.slice(1);
}
$$("[data-nav]").forEach(b=>b.onclick=()=>screen(b.dataset.nav));

function renderNodeList(){
  $("#nodeList").innerHTML=NODE_GROUPS.map(([g,items])=>`<h3>${g}</h3>${items.map(([name,type])=>`<button data-type="${type}">${name}</button>`).join("")}`).join("");
  $("#nodeList").querySelectorAll("[data-type]").forEach(b=>b.onclick=()=>{createNode(b.dataset.type);$("#nodeSheet").classList.add("hidden")});
}
function createNode(type){
  const [title]=spec(type), n=addNode(project,type,title,100+project.nodes.length*22,100+project.nodes.length*18);
  drawNode(n); selected=n.id; runtime.setProject(project);
  if(type==="phone-camera-front")runtime.enableCamera("user");
  if(type==="phone-camera-back"||type==="camera")runtime.enableCamera("environment");
}
function drawNode(n){
  const el=document.createElement("div");el.className="mnode";el.dataset.id=n.id;el.style.left=n.x+"px";el.style.top=n.y+"px";
  const ports=spec(n.type)[1];el.innerHTML=`<h4>${n.title}</h4><div class="ports">${ports.map(x=>`<div>• ${x}</div>`).join("")}</div>`;
  $("#patchWorld").appendChild(el);dragNode(el,n);el.onclick=()=>{$$(".mnode").forEach(x=>x.classList.remove("sel"));el.classList.add("sel");selected=n.id}
}
function dragNode(el,n){
  let p=null;el.addEventListener("pointerdown",e=>{if(e.pointerType==="touch"||e.pointerType==="pen"||e.pointerType==="mouse"){p={id:e.pointerId,sx:e.clientX,sy:e.clientY,x:n.x,y:n.y};el.setPointerCapture(e.pointerId);e.stopPropagation()}});
  el.addEventListener("pointermove",e=>{if(!p||e.pointerId!==p.id)return;n.x=p.x+(e.clientX-p.sx)/pan.scale;n.y=p.y+(e.clientY-p.sy)/pan.scale;el.style.left=n.x+"px";el.style.top=n.y+"px"});
  el.addEventListener("pointerup",()=>p=null);
}
function applyTransform(){ $("#patchWorld").style.transform=`translate(${pan.x}px,${pan.y}px) scale(${pan.scale})`; }
const patch=$("#mobilePatch");
patch.addEventListener("pointerdown",e=>{if(e.target.closest(".mnode"))return;gesture={id:e.pointerId,x:e.clientX,y:e.clientY,px:pan.x,py:pan.y};patch.setPointerCapture(e.pointerId)});
patch.addEventListener("pointermove",e=>{if(!gesture||gesture.id!==e.pointerId)return;pan.x=gesture.px+e.clientX-gesture.x;pan.y=gesture.py+e.clientY-gesture.y;applyTransform()});
patch.addEventListener("pointerup",()=>gesture=null);
patch.addEventListener("wheel",e=>{e.preventDefault();pan.scale=Math.max(.45,Math.min(1.8,pan.scale+(e.deltaY<0?.08:-.08)));applyTransform()},{passive:false});

$("#addNodeBtn").onclick=()=>$("#nodeSheet").classList.remove("hidden");
$("#closeNodeSheet").onclick=()=>$("#nodeSheet").classList.add("hidden");
$("#fitBtn").onclick=()=>{pan={x:0,y:0,scale:.8};applyTransform()};

$("#applyVibeBtn").onclick=()=>{
  const t=$("#vibeInput").value.toLowerCase();
  if(t.includes("caméra arrière")&&!project.nodes.some(n=>n.type==="phone-camera-back"))createNode("phone-camera-back");
  if(t.includes("caméra avant")&&!project.nodes.some(n=>n.type==="phone-camera-front"))createNode("phone-camera-front");
  if(t.includes("gyro")||t.includes("gyroscope"))createNode("gyro");
  if(t.includes("osc"))createNode("osc");
  if(t.includes("5 seconde")||t.includes("5s"))addTimelineClip(project,{track:1,start:0,duration:5,label:"Vibe mobile 5s",kind:"points"});
  runtime.setProject(project);screen("patch");
};

$("#playBtn").onclick=()=>{runtime.play();$("#runtimeStatus").textContent="PLAY"};
$("#stopBtn").onclick=()=>{runtime.stop();$("#runtimeStatus").textContent="STOP"};
$("#outputBtn").onclick=()=>{document.documentElement.requestFullscreen?.();runtime.play()};
$$("[data-cue]").forEach(b=>b.onclick=()=>{navigator.vibrate?.(20);$("#runtimeStatus").textContent=`TOP ${b.dataset.cue}`});

$("#frontCam").onclick=async()=>{createNode("phone-camera-front");await runtime.enableCamera("user");screen("stage")};
$("#backCam").onclick=async()=>{createNode("phone-camera-back");await runtime.enableCamera("environment");screen("stage")};
$("#motionBtn").onclick=async()=>{await sensors.requestMotion();await sensors.requestOrientation();$("#sensorStatus").textContent="Mouvement ON"};
$("#gpsBtn").onclick=()=>{sensors.requestGPS();$("#sensorStatus").textContent="GPS ON"};
$("#vibrateBtn").onclick=()=>sensors.vibrate([40,40,80]);

$$("[data-tool]").forEach(b=>b.onclick=()=>{
 const t=b.dataset.tool;
 $("#toolView").innerHTML=`<h3>${b.textContent}</h3><p>Vue mobile dédiée à ${b.textContent}. Elle remplacera la fenêtre flottante desktop par un écran/bottom sheet tactile spécifique.</p>`;
 if(t==="camera")$("#toolView").innerHTML+=`<button id="toolCam" style="width:100%;min-height:48px">Ouvrir caméra arrière</button>`;
 if(t==="routing"){
   ensureRouting(project);
   $("#toolView").innerHTML=`<h3>Routage pistes</h3>${[0,1,2,3,4,5].map(i=>`<button class="mobile-route" data-mobile-route="${i}" style="width:100%;min-height:48px;margin-bottom:6px">${i+1}. ${effectiveRoute(project,i).mode} · ${effectiveRoute(project,i).destinations.join(", ")}</button>`).join("")}`;
   document.querySelectorAll("[data-mobile-route]").forEach(x=>x.onclick=()=>{
     const i=+x.dataset.mobileRoute,r=effectiveRoute(project,i);
     r.mode=r.mode==="main"?"copy":r.mode==="copy"?"only":"main";
     r.destinations=r.mode==="main"?["main-output"]:["local-window"];
     x.textContent=`${i+1}. ${r.mode} · ${r.destinations.join(", ")}`;
   });
 }
 if($("#toolCam"))$("#toolCam").onclick=()=>$("#backCam").click();
});

$("#saveBtn").onclick=()=>localStorage.setItem("cvd.mobile.autosave",JSON.stringify(project));
renderNodeList();
createNode("phone-camera-back");createNode("gyro");createNode("osc");
runtime.setProject(project);runtime.render();

function setMobileMode(mode){document.body.dataset.mobileMode=mode;document.getElementById("mobileBureau").classList.toggle("active",mode==="bureau");document.getElementById("mobilePlateau").classList.toggle("active",mode==="plateau");localStorage.setItem("cvd.mobile.mode",mode);if(mode==="plateau")screen("stage");else screen("patch")}
document.getElementById("mobileBureau").onclick=()=>setMobileMode("bureau");document.getElementById("mobilePlateau").onclick=()=>setMobileMode("plateau");
document.getElementById("mobilePrefs").onclick=()=>document.getElementById("mobilePreferences").classList.remove("hidden");document.getElementById("closeMobilePrefs").onclick=()=>document.getElementById("mobilePreferences").classList.add("hidden");
function applyMobileAppearance(){const a=document.getElementById("mobileAccent").value,b=document.getElementById("mobileSecondary").value;document.documentElement.style.setProperty("--accent",a);document.documentElement.style.setProperty("--accent2",b);localStorage.setItem("cvd.mobile.appearance",JSON.stringify({a,b}))}
document.getElementById("mobileAccent").oninput=applyMobileAppearance;document.getElementById("mobileSecondary").oninput=applyMobileAppearance;document.getElementById("mobileResetAppearance").onclick=()=>{document.getElementById("mobileAccent").value="#d7b86a";document.getElementById("mobileSecondary").value="#8fa79d";applyMobileAppearance()};
try{const ap=JSON.parse(localStorage.getItem("cvd.mobile.appearance")||"null");if(ap){document.getElementById("mobileAccent").value=ap.a;document.getElementById("mobileSecondary").value=ap.b;applyMobileAppearance()}}catch{}
setMobileMode(localStorage.getItem("cvd.mobile.mode")||"plateau");
