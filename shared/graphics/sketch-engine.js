/**
 * Moteur de sketch génératif offline pour No-de Vibe Designer.
 * Sous-ensemble volontaire et déterministe inspiré de p5/Processing :
 * background(), fill(), circle(), rect(), line(), wave().
 * Variables: width, height, time, frameCount, mouseX, mouseY.
 * Aucun eval/Function: le script ne peut pas exécuter de JS arbitraire.
 */
function clamp255(n){return Math.max(0,Math.min(255,Math.round(Number(n)||0)));}
function frame(width,height){
  const w=Math.max(16,Math.round(width||640)),h=Math.max(16,Math.round(height||360));
  return {kind:"video",source:"sketch",width:w,height:h,pixels:new Uint8ClampedArray(w*h*4)};
}
function setPixel(f,x,y,c){
  x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=f.width||y>=f.height)return;
  const i=(y*f.width+x)*4,a=(c[3]??255)/255;
  f.pixels[i]=clamp255(f.pixels[i]*(1-a)+c[0]*a);
  f.pixels[i+1]=clamp255(f.pixels[i+1]*(1-a)+c[1]*a);
  f.pixels[i+2]=clamp255(f.pixels[i+2]*(1-a)+c[2]*a);
  f.pixels[i+3]=255;
}
function fillAll(f,c){
  for(let i=0;i<f.pixels.length;i+=4){f.pixels[i]=c[0];f.pixels[i+1]=c[1];f.pixels[i+2]=c[2];f.pixels[i+3]=c[3]??255;}
}
function circle(f,cx,cy,d,c){
  const r=Math.max(0,d/2),x0=Math.floor(cx-r),x1=Math.ceil(cx+r),y0=Math.floor(cy-r),y1=Math.ceil(cy+r),r2=r*r;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const dx=x-cx,dy=y-cy;if(dx*dx+dy*dy<=r2)setPixel(f,x,y,c);}
}
function rect(f,x,y,w,h,c){
  for(let yy=Math.floor(y);yy<Math.ceil(y+h);yy++)for(let xx=Math.floor(x);xx<Math.ceil(x+w);xx++)setPixel(f,xx,yy,c);
}
function line(f,x0,y0,x1,y1,c){
  x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
  const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy;
  while(true){setPixel(f,x0,y0,c);if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>=dy){err+=dy;x0+=sx;}if(e2<=dx){err+=dx;y0+=sy;}}
}
function resolve(token,vars){
  const s=String(token??"").trim();
  if(s in vars)return Number(vars[s])||0;
  const m=s.match(/^([a-zA-Z]+)s*([*/+-])s*(-?\d+(?:\.\d+)?)$/);
  if(m&&m[1] in vars){const a=Number(vars[m[1]])||0,b=Number(m[3])||0;return m[2]==="*"?a*b:m[2]==="/"?a/(b||1):m[2]==="+"?a+b:a-b;}
  const n=Number(s);return Number.isFinite(n)?n:0;
}
function args(text,vars){return text.split(",").map(v=>resolve(v,vars));}
export const DEFAULT_P5_SCRIPT=`background(8,10,16)
fill(210,190,130,190)
circle(mouseX,mouseY,72)
fill(90,130,160,120)
wave(height*0.55,42,0.018,2)`;
export const DEFAULT_SKETCH_SCRIPT=`background(4,6,10)
fill(210,210,220,120)
wave(height*0.50,70,0.012,1.2)
fill(145,115,175,150)
circle(width*0.5,height*0.5,120)`;

export function renderSketch({
  width=640,height=360,time=0,pointer=null,script=DEFAULT_SKETCH_SCRIPT,seed=1
}={}){
  const f=frame(width,height),vars={
    width:f.width,height:f.height,time:Number(time)||0,frameCount:Math.floor((Number(time)||0)*60),
    mouseX:(pointer?.x??0.5)*f.width,mouseY:(pointer?.y??0.5)*f.height,seed:Number(seed)||1
  };
  let color=[255,255,255,255];fillAll(f,[0,0,0,255]);
  const statements=String(script||"").split(/[;\n]+/).map(s=>s.trim()).filter(Boolean);
  for(const stmt of statements){
    const m=stmt.match(/^([a-zA-Z][\w]*)\s*\((.*)\)$/);if(!m)continue;
    const name=m[1],a=args(m[2],vars);
    if(name==="background")fillAll(f,[clamp255(a[0]),clamp255(a[1]),clamp255(a[2]),clamp255(a[3]??255)]);
    else if(name==="fill")color=[clamp255(a[0]),clamp255(a[1]),clamp255(a[2]),clamp255(a[3]??255)];
    else if(name==="circle")circle(f,a[0],a[1],a[2],color);
    else if(name==="rect")rect(f,a[0],a[1],a[2],a[3],color);
    else if(name==="line")line(f,a[0],a[1],a[2],a[3],color);
    else if(name==="wave"){
      const base=a[0]||f.height/2,amp=a[1]||40,freq=a[2]||0.02,speed=a[3]||1;
      let px=0,py=base;
      for(let x=1;x<f.width;x++){const y=base+Math.sin(x*freq+vars.time*speed+vars.seed)*amp;line(f,px,py,x,y,color);px=x;py=y;}
    }
  }
  return f;
}

export function renderDream({width=640,height=360,time=0,seed=1,intensity=.7,pointer=null}={}){
  const i=Math.max(0,Math.min(1,Number(intensity)||0));
  const script=[
    "background(3,5,11)",
    `fill(${Math.round(80+120*i)},${Math.round(90+80*i)},${Math.round(150+80*i)},120)`,
    `wave(height*0.45,${Math.round(20+110*i)},0.01,${(0.5+2*i).toFixed(2)})`,
    "fill(215,195,150,100)",
    `wave(height*0.60,${Math.round(15+70*i)},0.017,${(0.8+1.5*i).toFixed(2)})`,
    `fill(170,200,220,${Math.round(60+100*i)})`,
    `circle(mouseX,mouseY,${Math.round(50+160*i)})`
  ].join("\n");
  const out=renderSketch({width,height,time,pointer,script,seed});
  out.source="dream";
  return out;
}
