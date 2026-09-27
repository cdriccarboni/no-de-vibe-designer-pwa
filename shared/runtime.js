import {ShaderSurface} from "./adapters/shader-surface.js";
import {ensureRouting,effectiveRoute} from "./routing.js";

export class Runtime {
  constructor(canvas,{destination="main-output"}={}){
    this.canvas=canvas; this.ctx=canvas.getContext("2d"); this.destination=destination;
    this.project=null; this.time=0; this.playing=false; this.last=0; this.raf=0;
    this.mediaStream=null; this.video=document.createElement("video"); this.video.playsInline=true; this.video.muted=true;
    this.shaderSurface=new ShaderSurface();
  }
  setProject(project){ this.project=project; this.resize(); this.render(); }
  resize(){
    if(!this.project)return;
    this.canvas.width=this.project.output?.width||1280;
    this.canvas.height=this.project.output?.height||720;
  }
  async enableCamera(facingMode="environment"){
    if(!navigator.mediaDevices?.getUserMedia) throw new Error("Caméra indisponible");
    if(this.mediaStream) this.mediaStream.getTracks().forEach(t=>t.stop());
    this.mediaStream=await navigator.mediaDevices.getUserMedia({video:{facingMode},audio:false});
    this.video.srcObject=this.mediaStream; await this.video.play(); return true;
  }
  play(){ if(this.playing)return; this.playing=true; this.last=performance.now(); this.loop(this.last); }
  pause(){ if(!this.playing)return; this.playing=false; cancelAnimationFrame(this.raf); this.render(); }
  toggle(){ this.playing?this.pause():this.play(); return this.playing; }
  stop(){ this.playing=false; cancelAnimationFrame(this.raf); this.time=0; this.render(); }
  loop(now){
    if(!this.playing)return;
    const dt=(now-this.last)/1000; this.last=now; this.time=(this.time+dt)%60;
    this.render(); this.raf=requestAnimationFrame(t=>this.loop(t));
  }
  activeClips(){return (this.project?.timeline||[]).filter(c=>this.time>=c.start && this.time<=c.start+c.duration)}
  render(){
    if(!this.project)return;
    const c=this.ctx,w=this.canvas.width,h=this.canvas.height;
    c.fillStyle=this.project.output?.background||"#090b0d"; c.fillRect(0,0,w,h);
    const hasCamera=this.project.nodes.some(n=>n.type==="camera"||n.type==="phone-camera-front"||n.type==="phone-camera-back");
    if(hasCamera && this.video.readyState>=2){ c.drawImage(this.video,0,0,w,h); }
    else{
      const g=c.createRadialGradient(w*.5,h*.35,20,w*.5,h*.4,w*.65);
      g.addColorStop(0,"#2a3037");g.addColorStop(1,"#090b0d");c.fillStyle=g;c.fillRect(0,0,w,h);
      c.fillStyle="#30363d";c.strokeStyle="#6f7882";c.lineWidth=Math.max(2,w/500);
      c.beginPath();c.moveTo(w*.26,h*.58);c.bezierCurveTo(w*.35,h*.36,w*.58,h*.37,w*.72,h*.48);
      c.bezierCurveTo(w*.78,h*.53,w*.82,h*.5,w*.88,h*.44);c.bezierCurveTo(w*.83,h*.6,w*.72,h*.69,w*.57,h*.68);
      c.bezierCurveTo(w*.44,h*.69,w*.35,h*.65,w*.26,h*.58);c.closePath();c.fill();c.stroke();
    }
    const active=this.activeClips(), wave=active.some(x=>x.kind==="points"), shader=active.some(x=>x.kind==="shader"), shadow=active.some(x=>x.kind==="shadow");
    if(shader){c.save();c.globalCompositeOperation="screen";c.fillStyle="rgba(80,120,135,.13)";for(let y=0;y<h;y+=32)c.fillRect(0,y+Math.sin(this.time*2+y*.02)*8,w,8);c.restore()}
    (this.project.controls||[]).forEach((pt,i)=>{let x=pt.x*w,y=pt.y*h;if(wave){y+=Math.sin(this.time*4+i)*18;x+=Math.cos(this.time*2+i)*8}c.strokeStyle="#fff";c.lineWidth=2;c.beginPath();c.arc(x,y,9,0,Math.PI*2);c.stroke();c.fillStyle="#d7b86a";c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fill()});
    if(shadow){c.fillStyle="rgba(0,0,0,.45)";c.fillRect(w*.61+Math.sin(this.time)*30,h*.25,w*.12,h*.5)}
  }
}
