/**
 * Effets vidéo raster légers destinés à la scène.
 * Aucun backend natif : uniquement des pixels déjà rasterisés.
 */
function source(frame) {
  if (!frame?.pixels || !frame.width || !frame.height) throw new Error("Frame raster absente");
  return frame;
}
function clamp01(n) { return Math.max(0, Math.min(1, Number(n) || 0)); }
function clamp255(n) { return Math.max(0, Math.min(255, Math.round(n))); }
function outFrame(frame, pixels, name) {
  return { width: frame.width, height: frame.height, pixels, kind: "video", source: name };
}
export function anaglyphFrame(input, { depth = 0.035 } = {}) {
  const frame = source(input), { width:w, height:h, pixels:src } = frame;
  const out = new Uint8ClampedArray(src.length);
  const shift = Math.max(1, Math.round(clamp01(depth) * Math.max(2, w * 0.12)));
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    const l=(y*w+Math.max(0,x-shift))*4, r=(y*w+Math.min(w-1,x+shift))*4, d=(y*w+x)*4;
    out[d]=src[l]; out[d+1]=src[r+1]; out[d+2]=src[r+2]; out[d+3]=src[d+3];
  }
  return outFrame(frame,out,"anaglyph");
}
export function bendFrame(input,{amount=0.18,time=0}={}) {
  const frame=source(input), {width:w,height:h,pixels:src}=frame;
  const out=new Uint8ClampedArray(src.length), amp=clamp01(amount)*Math.max(2,w*0.12);
  for(let y=0;y<h;y++){const shift=Math.round(Math.sin(y*0.075+Number(time)*2.2)*amp);
    for(let x=0;x<w;x++){const sx=Math.max(0,Math.min(w-1,x+shift)),s=(y*w+sx)*4,d=(y*w+x)*4;
      out[d]=src[s];out[d+1]=src[s+1];out[d+2]=src[s+2];out[d+3]=src[s+3];}}
  return outFrame(frame,out,"bending");
}
export function creativeFxFrame(input,{amount=0.55,time=0}={}) {
  const frame=source(input),a=clamp01(amount),src=frame.pixels,out=new Uint8ClampedArray(src.length);
  const pulse=0.92+0.08*Math.sin(Number(time)*2.4),contrast=1+a*0.65;
  for(let i=0;i<src.length;i+=4){const r=(src[i]-128)*contrast+128,g=(src[i+1]-128)*contrast+128,b=(src[i+2]-128)*contrast+128;
    out[i]=clamp255((r*(1+a*0.12)+b*a*0.08)*pulse);out[i+1]=clamp255(g*(1-a*0.05));out[i+2]=clamp255(b*(1+a*0.18));out[i+3]=src[i+3];}
  return outFrame(frame,out,"creativefx");
}
export function stormFrame(input,{amount=0.6,time=0}={}) {
  const frame=source(input),a=clamp01(amount),src=frame.pixels,out=new Uint8ClampedArray(src.length);
  const flash=Math.pow(Math.max(0,Math.sin(Number(time)*5.7)),18)*180*a;
  for(let i=0;i<src.length;i+=4){const lum=src[i]*0.299+src[i+1]*0.587+src[i+2]*0.114,c=clamp255((lum-128)*(1+a*1.1)+128+flash);
    out[i]=clamp255(c*(0.82-a*0.08));out[i+1]=clamp255(c*(0.9+a*0.04));out[i+2]=clamp255(c*(1.05+a*0.18));out[i+3]=src[i+3];}
  return outFrame(frame,out,"storm");
}
export function transmuteFrame(input,{amount=0.5}={}) {
  const frame=source(input),a=clamp01(amount),src=frame.pixels,out=new Uint8ClampedArray(src.length);
  for(let i=0;i<src.length;i+=4){const r=src[i],g=src[i+1],b=src[i+2];
    out[i]=clamp255(r*(1-a)+g*a);out[i+1]=clamp255(g*(1-a)+b*a);out[i+2]=clamp255(b*(1-a)+r*a);out[i+3]=src[i+3];}
  return outFrame(frame,out,"transmute");
}
