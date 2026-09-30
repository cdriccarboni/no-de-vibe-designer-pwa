import { extractSilhouette, mirrorFrame } from "./shadow.js";

function clamp01(v){ return Math.max(0,Math.min(1,Number(v)||0)); }
function ensure(frame){
  if(!frame?.pixels||!frame.width||!frame.height) throw new Error("Ombre Vivante : image absente");
}
function blank(w,h,source="living-shadow"){
  return {kind:"video",source,width:w,height:h,pixels:new Uint8ClampedArray(w*h*4)};
}
function bounds(frame){
  ensure(frame);
  let minX=frame.width,minY=frame.height,maxX=-1,maxY=-1,count=0,sumX=0,sumY=0;
  for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++){
    const a=frame.pixels[(y*frame.width+x)*4+3];
    if(a<24)continue;
    minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
    count++;sumX+=x;sumY+=y;
  }
  if(!count)return null;
  return {minX,minY,maxX,maxY,width:maxX-minX+1,height:maxY-minY+1,cx:sumX/count/frame.width,cy:sumY/count/frame.height,area:count/(frame.width*frame.height)};
}
function crop(frame,b){
  const out=blank(b.width,b.height,"living-shadow-crop");
  for(let y=0;y<b.height;y++)for(let x=0;x<b.width;x++){
    const si=((b.minY+y)*frame.width+(b.minX+x))*4,di=(y*b.width+x)*4;
    out.pixels[di]=frame.pixels[si];out.pixels[di+1]=frame.pixels[si+1];out.pixels[di+2]=frame.pixels[si+2];out.pixels[di+3]=frame.pixels[si+3];
  }
  return out;
}
function zoneRect(w,h,zone="cour"){
  const z=String(zone||"cour").toLowerCase();
  if(z==="jardin"||z==="left"||z==="gauche") return {x:0,y:0,w:w*.5,h};
  if(z==="cour"||z==="right"||z==="droite") return {x:w*.5,y:0,w:w*.5,h};
  if(z==="centre"||z==="center") return {x:w*.2,y:0,w:w*.6,h};
  return {x:0,y:0,w,h};
}
function drawScaled(src,out,rect,{mirror=false,scale=.9,dx=0,dy=0,rotation=0}={}){
  ensure(src);ensure(out);
  const maxW=rect.w*Math.max(.05,scale),maxH=rect.h*Math.max(.05,scale);
  const s=Math.min(maxW/src.width,maxH/src.height);
  const dw=Math.max(1,src.width*s),dh=Math.max(1,src.height*s);
  const cx=rect.x+rect.w*.5+dx,cy=rect.y+rect.h*.5+dy;
  const cos=Math.cos(rotation),sin=Math.sin(rotation);
  for(let y=0;y<dh;y++)for(let x=0;x<dw;x++){
    const nx=x-dw*.5,ny=y-dh*.5;
    const rx=nx*cos-ny*sin,ry=nx*sin+ny*cos;
    const ox=Math.round(cx+rx),oy=Math.round(cy+ry);
    if(ox<0||oy<0||ox>=out.width||oy>=out.height)continue;
    const u=mirror?1-x/Math.max(1,dw-1):x/Math.max(1,dw-1);
    const v=y/Math.max(1,dh-1);
    const sx=Math.max(0,Math.min(src.width-1,Math.round(u*(src.width-1))));
    const sy=Math.max(0,Math.min(src.height-1,Math.round(v*(src.height-1))));
    const si=(sy*src.width+sx)*4,di=(oy*out.width+ox)*4,a=src.pixels[si+3]/255;
    if(a<=0)continue;
    const shade=20;
    out.pixels[di]=shade;out.pixels[di+1]=shade;out.pixels[di+2]=shade;
    out.pixels[di+3]=Math.max(out.pixels[di+3],Math.round(235*a));
  }
}
function organicTransform(time,amount=0){
  const a=clamp01(amount);
  return {
    dx:Math.sin(time*.73)*18*a+Math.sin(time*1.91)*6*a,
    dy:Math.cos(time*.61)*10*a+Math.sin(time*1.37)*5*a,
    rotation:Math.sin(time*.43)*.12*a,
    scale:.9+Math.sin(time*.83)*.055*a
  };
}

export function analyzePresence(frame,{threshold=.45,invert=false}={}){
  const sil=extractSilhouette(frame,{threshold,invert}),b=bounds(sil);
  return {silhouette:sil,bounds:b,visible:!!b,x:b?.cx??.5,y:b?.cy??.5,activity:b?.area??0};
}

export function renderLivingShadow({
  frame,time=0,mode="mirror",sourceZone="jardin",shadowZone="cour",
  threshold=.45,invert=false,autonomy=.55,detachedFrame=null
}={}){
  const analysis=analyzePresence(frame,{threshold,invert});
  const out=blank(frame.width,frame.height,"living-shadow");
  const liveCrop=analysis.bounds?crop(analysis.silhouette,analysis.bounds):null;
  const autonomous=mode==="autonomous"||mode==="detached";
  const source=autonomous?(detachedFrame||liveCrop):liveCrop;
  if(!source)return {frame:out,analysis,capture:null,state:"NO SILHOUETTE"};

  const target=zoneRect(out.width,out.height,shadowZone);
  const motion=autonomous?organicTransform(time,autonomy):{dx:0,dy:0,rotation:0,scale:.9};
  drawScaled(source,out,target,{
    mirror:mode==="mirror"||mode==="dance",
    scale:motion.scale,dx:motion.dx,dy:motion.dy,rotation:motion.rotation
  });
  return {
    frame:out,
    analysis,
    capture:liveCrop,
    state:autonomous?"AUTONOMOUS":(mode==="mirror"||mode==="dance"?"MIRROR":"ATTACHED"),
    sourceZone,shadowZone
  };
}
