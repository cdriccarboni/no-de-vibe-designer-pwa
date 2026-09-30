/**
 * Moteurs visuels interactifs offline inspirés des familles TouchDesigner
 * étudiées pour No-de : rideau de fils, flow fields, trails, fluid warp,
 * reaction-diffusion, metaballs/SDF, point cloud, sable, swarm, ripple,
 * refraction/glass. Tous les moteurs restent locaux et déterministes.
 */

function clamp01(v){ return Math.max(0,Math.min(1,Number(v)||0)); }
function clamp255(v){ return Math.max(0,Math.min(255,Math.round(Number(v)||0))); }
function frame(width,height,source){
  const w=Math.max(16,Math.round(width||320)),h=Math.max(16,Math.round(height||180));
  return {kind:"video",source,width:w,height:h,pixels:new Uint8ClampedArray(w*h*4)};
}
function setPixel(f,x,y,r,g,b,a=255){
  x=Math.round(x);y=Math.round(y);
  if(x<0||y<0||x>=f.width||y>=f.height)return;
  const i=(y*f.width+x)*4;
  f.pixels[i]=clamp255(r);f.pixels[i+1]=clamp255(g);f.pixels[i+2]=clamp255(b);f.pixels[i+3]=clamp255(a);
}
function addPixel(f,x,y,r,g,b,a=255){
  x=Math.round(x);y=Math.round(y);
  if(x<0||y<0||x>=f.width||y>=f.height)return;
  const i=(y*f.width+x)*4,k=clamp01(a/255);
  f.pixels[i]=clamp255(f.pixels[i]+r*k);
  f.pixels[i+1]=clamp255(f.pixels[i+1]+g*k);
  f.pixels[i+2]=clamp255(f.pixels[i+2]+b*k);
  f.pixels[i+3]=255;
}
function line(f,x0,y0,x1,y1,color=[255,255,255,255],add=false){
  x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
  const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy;
  while(true){
    (add?addPixel:setPixel)(f,x0,y0,color[0],color[1],color[2],color[3]);
    if(x0===x1&&y0===y1)break;
    const e2=2*err;if(e2>=dy){err+=dy;x0+=sx;}if(e2<=dx){err+=dx;y0+=sy;}
  }
}
function circle(f,cx,cy,r,color=[255,255,255,255],add=false){
  const rr=Math.max(0,Number(r)||0),x0=Math.floor(cx-rr),x1=Math.ceil(cx+rr),y0=Math.floor(cy-rr),y1=Math.ceil(cy+rr),r2=rr*rr;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const dx=x-cx,dy=y-cy;if(dx*dx+dy*dy<=r2)(add?addPixel:setPixel)(f,x,y,color[0],color[1],color[2],color[3]);
  }
}
function hash(n){ const x=Math.sin(n*12.9898+78.233)*43758.5453; return x-Math.floor(x); }
function sample(src,x,y){
  const w=src.width,h=src.height;
  x=Math.max(0,Math.min(w-1,Math.round(x)));y=Math.max(0,Math.min(h-1,Math.round(y)));
  const i=(y*w+x)*4;return [src.pixels[i],src.pixels[i+1],src.pixels[i+2],src.pixels[i+3]];
}
function copyFrame(src,source){
  return {kind:"video",source:source||src.source,width:src.width,height:src.height,pixels:new Uint8ClampedArray(src.pixels)};
}
function pointerPx(pointer,w,h){
  return {x:clamp01(pointer?.x??0.5)*w,y:clamp01(pointer?.y??0.5)*h,speed:Math.max(0,Number(pointer?.speed)||0)};
}

export function renderThreadCurtain({width=320,height=180,time=0,pointer=null,strands=96,force=.85,wave=.28}={}){
  const f=frame(width,height,"thread-curtain"),p=pointerPx(pointer,f.width,f.height);
  const count=Math.max(12,Math.min(220,Math.round(strands))),fx=clamp01(force),wv=clamp01(wave);
  for(let s=0;s<count;s++){
    const baseX=(s+0.5)/count*f.width;
    let px=baseX,py=0;
    for(let y=2;y<f.height;y+=3){
      const d=Math.hypot(baseX-p.x,y-p.y),radius=Math.max(24,f.width*.22);
      const influence=Math.max(0,1-d/radius);
      const side=Math.sign(baseX-p.x||1);
      const push=side*influence*influence*fx*f.width*.09;
      const sway=Math.sin(y*.035+s*.23+time*1.7)*wv*6;
      const x=baseX+push+sway;
      line(f,px,py,x,y,[160+60*influence,190+40*influence,220+30*influence,190],true);
      px=x;py=y;
    }
  }
  return f;
}

export function renderFlowField({width=320,height=180,time=0,pointer=null,count=360,energy=.65,seed=1}={}){
  const f=frame(width,height,"flow-field"),p=pointerPx(pointer,f.width,f.height),e=clamp01(energy);
  const n=Math.max(40,Math.min(1200,Math.round(count)));
  for(let i=0;i<n;i++){
    let x=hash(i*17+seed*31)*f.width,y=hash(i*29+seed*7)*f.height;
    let px=x,py=y;
    const steps=4+Math.round(e*7);
    for(let k=0;k<steps;k++){
      const nx=x/f.width,ny=y/f.height;
      const ang=Math.sin(nx*8+time*.8+seed)+Math.cos(ny*7-time*.55)+Math.sin((nx+ny)*5);
      const pdx=(p.x-x)/Math.max(1,f.width),pdy=(p.y-y)/Math.max(1,f.height);
      const a=ang+Math.atan2(pdy,pdx)*.18*e;
      x+=Math.cos(a)*(1.2+e*2.2);y+=Math.sin(a)*(1.2+e*2.2);
      line(f,px,py,x,y,[90+120*e,145+70*hash(i),210,120],true);px=x;py=y;
    }
  }
  return f;
}

export function renderRibbonTrails({width=320,height=180,time=0,pointer=null,ribbons=9,energy=.7}={}){
  const f=frame(width,height,"ribbon-trails"),p=pointerPx(pointer,f.width,f.height),e=clamp01(energy);
  const n=Math.max(2,Math.min(24,Math.round(ribbons)));
  for(let r=0;r<n;r++){
    let px=p.x,py=p.y;
    const phase=r/n*Math.PI*2;
    for(let k=1;k<90;k++){
      const age=k/90;
      const x=p.x-k*(1.8+e*1.5)+Math.sin(time*1.8-k*.11+phase)*18*(1-age*.3);
      const y=p.y+Math.sin(time*1.2-k*.07+phase)*28+Math.cos(k*.05+phase)*10;
      line(f,px,py,x,y,[120+80*Math.sin(phase)*.5+40,170+50*e,230,180*(1-age)],true);px=x;py=y;
    }
  }
  return f;
}

export function fluidWarpFrame(src,{pointer=null,amount=.45,time=0}={}){
  const out=frame(src.width,src.height,"fluid-warp"),p=pointerPx(pointer,src.width,src.height),a=clamp01(amount);
  const radius=Math.max(18,Math.min(src.width,src.height)*(.12+.28*a));
  for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){
    const dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy),inf=Math.max(0,1-d/radius);
    const ang=Math.atan2(dy,dx)+inf*inf*a*1.7+Math.sin(time*1.4+d*.03)*.05*a;
    const rr=d*(1-.18*inf*a);
    const sx=p.x+Math.cos(ang)*rr,sy=p.y+Math.sin(ang)*rr;
    const c=sample(src,sx,sy);setPixel(out,x,y,c[0],c[1],c[2],c[3]);
  }
  return out;
}

export function refractionFrame(src,{pointer=null,amount=.55}={}){
  const out=frame(src.width,src.height,"refraction"),p=pointerPx(pointer,src.width,src.height),a=clamp01(amount);
  const radius=Math.max(20,Math.min(src.width,src.height)*(.16+.24*a));
  for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){
    const dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy),u=d/radius;
    let sx=x,sy=y;
    if(u<1){
      const bend=(1-u*u)*a*.36;
      sx=x+dx*bend;sy=y+dy*bend;
    }
    const c=sample(src,sx,sy);
    const edge=u<1?Math.pow(Math.max(0,1-u),3)*70*a:0;
    setPixel(out,x,y,c[0]+edge,c[1]+edge,c[2]+edge*1.2,c[3]);
  }
  return out;
}

export function renderMetaballs({width=320,height=180,time=0,pointer=null,count=7,energy=.65,seed=1}={}){
  const f=frame(width,height,"metaballs"),p=pointerPx(pointer,f.width,f.height),e=clamp01(energy);
  const balls=[{x:p.x,y:p.y,r:22+e*30}];
  for(let i=1;i<Math.max(2,Math.min(18,Math.round(count)));i++){
    balls.push({
      x:(.5+.42*Math.sin(time*(.18+.03*i)+i*1.7+seed))*f.width,
      y:(.5+.38*Math.cos(time*(.22+.02*i)+i*2.1+seed*.5))*f.height,
      r:10+hash(i+seed)*24
    });
  }
  for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++){
    let field=0;
    for(const b of balls){const dx=x-b.x,dy=y-b.y;field+=(b.r*b.r)/(dx*dx+dy*dy+18);}
    const edge=clamp01((field-.82)*2.8),core=clamp01((field-1.15)*2.1);
    if(edge>0)setPixel(f,x,y,70+100*core,120+90*core,180+70*core,255*edge);
  }
  return f;
}

export function renderPointCloudDepth(src,{step=7,depth=.7}={}){
  const f=frame(src.width,src.height,"point-cloud"),st=Math.max(3,Math.min(18,Math.round(step))),d=clamp01(depth);
  for(let y=st/2;y<src.height;y+=st)for(let x=st/2;x<src.width;x+=st){
    const c=sample(src,x,y),lum=(c[0]*.299+c[1]*.587+c[2]*.114)/255;
    const r=1+lum*(1.2+d*2.8),off=(lum-.5)*d*st*1.8;
    circle(f,x+off,y-off*.35,r,[c[0],c[1],c[2],170+85*lum],true);
  }
  return f;
}

export function renderInteractiveSand({width=320,height=180,time=0,pointer=null,grains=900,energy=.6,seed=1}={}){
  const f=frame(width,height,"interactive-sand"),p=pointerPx(pointer,f.width,f.height),e=clamp01(energy);
  const n=Math.max(120,Math.min(2600,Math.round(grains)));
  for(let i=0;i<n;i++){
    const bx=hash(i*17+seed*13)*f.width,baseY=hash(i*31+seed*5)*f.height;
    const fall=(time*(8+18*e)+hash(i)*f.height)%(f.height+20)-10;
    let x=bx,y=(baseY*.35+fall*.65)%f.height;
    const dx=x-p.x,dy=y-p.y,dist=Math.hypot(dx,dy),rad=Math.max(20,50+e*60);
    if(dist<rad){const k=(1-dist/rad)*(18+38*e);x+=dx/(dist||1)*k;y+=dy/(dist||1)*k*.55;}
    const twinkle=.55+.45*Math.sin(time*2+i*.17);
    setPixel(f,x,y,170+55*twinkle,150+45*twinkle,105+30*twinkle,210);
  }
  return f;
}

export function renderSwarm({width=320,height=180,time=0,pointer=null,count=220,energy=.65,seed=1}={}){
  const f=frame(width,height,"swarm"),p=pointerPx(pointer,f.width,f.height),e=clamp01(energy);
  const n=Math.max(30,Math.min(700,Math.round(count)));
  for(let i=0;i<n;i++){
    const phase=hash(i+seed)*Math.PI*2,rad=(18+hash(i*9+seed)*Math.min(f.width,f.height)*.42);
    const speed=.25+hash(i*13)*.8+e*.9;
    const x=p.x+Math.cos(time*speed+phase)*rad+Math.sin(time*.7+i)*12*e;
    const y=p.y+Math.sin(time*(speed*.83)+phase)*rad*.58+Math.cos(time*.9+i*.23)*8*e;
    const vx=-Math.sin(time*speed+phase)*3,vy=Math.cos(time*speed+phase)*2;
    line(f,x-vx*2,y-vy*2,x,y,[120+100*e,185,235,190],true);
    circle(f,x,y,1.1+[hash(i*5)*1.8],[195,220,245,220],true);
  }
  return f;
}

export function renderRippleField({width=320,height=180,time=0,pointer=null,energy=.7,rings=12}={}){
  const f=frame(width,height,"ripple-field"),p=pointerPx(pointer,f.width,f.height),e=clamp01(energy);
  const n=Math.max(3,Math.min(24,Math.round(rings)));
  for(let r=0;r<n;r++){
    const radius=((time*(22+30*e)+r*(Math.min(f.width,f.height)/n))%(Math.min(f.width,f.height)*.75));
    const alpha=1-radius/(Math.min(f.width,f.height)*.75);
    let prev=null;
    for(let a=0;a<=Math.PI*2+.08;a+=.08){
      const wobble=Math.sin(a*5+time*2+r)*3*e;
      const x=p.x+Math.cos(a)*(radius+wobble),y=p.y+Math.sin(a)*(radius*.62+wobble);
      if(prev)line(f,prev.x,prev.y,x,y,[90+120*alpha,160+60*e,230,170*alpha],true);
      prev={x,y};
    }
  }
  return f;
}

export function createReactionState(width=128,height=72,seed=1){
  const w=Math.max(24,Math.min(192,Math.round(width))),h=Math.max(16,Math.min(108,Math.round(height)));
  const a=new Float32Array(w*h),b=new Float32Array(w*h);a.fill(1);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x,n=hash(i+seed*19);
    if(n>.94 || Math.hypot(x-w*.5,y-h*.5)<Math.min(w,h)*.09){b[i]=.88;a[i]=.15;}
  }
  return {w,h,a,b,seed};
}
function lap(buf,w,h,x,y){
  const at=(xx,yy)=>buf[Math.max(0,Math.min(h-1,yy))*w+Math.max(0,Math.min(w-1,xx))];
  return at(x-1,y)+at(x+1,y)+at(x,y-1)+at(x,y+1)-4*at(x,y);
}
export function stepReaction(state,{feed=.036,kill=.061,steps=1,pointer=null}={}){
  const {w,h}=state,p=pointerPx(pointer,w,h);
  for(let s=0;s<Math.max(1,Math.min(6,Math.round(steps)));s++){
    const na=new Float32Array(state.a.length),nb=new Float32Array(state.b.length);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=y*w+x,A=state.a[i],B=state.b[i],reaction=A*B*B;
      na[i]=clamp01(A+(1*lap(state.a,w,h,x,y)-reaction+feed*(1-A)));
      nb[i]=clamp01(B+(.5*lap(state.b,w,h,x,y)+reaction-(kill+feed)*B));
      const pd=Math.hypot(x-p.x,y-p.y);
      if(pd<5){nb[i]=Math.max(nb[i],.75*(1-pd/5));na[i]=Math.min(na[i],.25);}
    }
    state.a=na;state.b=nb;
  }
  return state;
}
export function reactionFrame(state){
  const f=frame(state.w,state.h,"reaction-diffusion");
  for(let i=0;i<state.a.length;i++){
    const v=clamp01(state.a[i]-state.b[i]+.5),b=clamp01(state.b[i]*1.4);
    const j=i*4;f.pixels[j]=clamp255(25+90*v);f.pixels[j+1]=clamp255(65+150*b);f.pixels[j+2]=clamp255(110+140*v);f.pixels[j+3]=255;
  }
  return f;
}

export function depthMaskFrame(src,{threshold=.45,invert=false}={}){
  const out=frame(src.width,src.height,"depth-mask"),t=clamp01(threshold);
  for(let i=0;i<src.pixels.length;i+=4){
    const lum=(src.pixels[i]*.299+src.pixels[i+1]*.587+src.pixels[i+2]*.114)/255;
    const v=(invert?lum<t:lum>=t)?255:0;out.pixels[i]=out.pixels[i+1]=out.pixels[i+2]=v;out.pixels[i+3]=255;
  }
  return out;
}

export function opticalFlowMagnitude(prev,cur,{step=8}={}){
  if(!prev||!cur||prev.width!==cur.width||prev.height!==cur.height)return 0;
  const st=Math.max(2,Math.round(step));let total=0,n=0;
  for(let y=0;y<cur.height;y+=st)for(let x=0;x<cur.width;x+=st){
    const i=(y*cur.width+x)*4;
    const pa=(prev.pixels[i]+prev.pixels[i+1]+prev.pixels[i+2])/3;
    const ca=(cur.pixels[i]+cur.pixels[i+1]+cur.pixels[i+2])/3;
    total+=Math.abs(ca-pa)/255;n++;
  }
  return n?total/n:0;
}

export function sdfField({width=320,height=180,time=0,pointer=null,radius=.22}={}){
  const f=frame(width,height,"sdf"),p=pointerPx(pointer,f.width,f.height),r=Math.max(4,Math.min(f.width,f.height)*clamp01(radius));
  for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++){
    const d=Math.hypot(x-p.x,y-p.y)-r,edge=Math.exp(-Math.abs(d)*.12),inside=d<0?1:0;
    setPixel(f,x,y,40+100*inside,90+100*edge,170+75*edge,255*Math.max(edge,inside*.15));
  }
  return f;
}

export function noiseValue(time=0,seed=1,speed=1){
  const t=(Number(time)||0)*(Number(speed)||1),i=Math.floor(t),f=t-i;
  const a=hash(i+seed*101),b=hash(i+1+seed*101),u=f*f*(3-2*f);
  return a+(b-a)*u;
}

export function curlVector(x=.5,y=.5,time=0,strength=1){
  const ang=Math.sin((Number(x)||0)*7+time*.7)+Math.cos((Number(y)||0)*9-time*.5);
  const s=Number(strength)||1;return {x:Math.cos(ang)*s,y:Math.sin(ang)*s};
}
