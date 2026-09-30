/**
 * Image → Vibe V3.
 * Analyse locale déterministe d'une image puis génération d'un point de départ
 * exécutable pour No-de, sans prétendre faire de vision sémantique.
 */

function clamp(v,a=0,b=1){v=Number(v)||0;return Math.max(a,Math.min(b,v));}
function hex(n){return Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,"0");}
function rgbHex([r,g,b]){return `#${hex(r)}${hex(g)}${hex(b)}`;}

export const IMAGE_VIBE_TARGETS = Object.freeze([
  { id:"auto", label:"Auto" },
  { id:"p5", label:"p5 / Canvas" },
  { id:"glsl", label:"GLSL" },
  { id:"particles", label:"Particules" },
  { id:"sdf", label:"SDF / Metaballs" }
]);

export function analyzeImagePixels(imageData, { maxSamples = 12000 } = {}) {
  const width = Number(imageData?.width)||0;
  const height = Number(imageData?.height)||0;
  const data = imageData?.data;
  if (!width || !height || !data?.length) throw new Error("Image illisible");

  const total = width*height;
  const step = Math.max(1, Math.floor(total/maxSamples));
  let count=0, lumSum=0, lumSq=0, satSum=0, edgeSum=0;
  let rSum=0,gSum=0,bSum=0;
  const buckets = new Map();
  const luma = (r,g,b)=>0.2126*r+0.7152*g+0.0722*b;

  for(let p=0;p<total;p+=step){
    const i=p*4, a=data[i+3]??255;
    if(a<24) continue;
    const r=data[i],g=data[i+1],b=data[i+2];
    const mx=Math.max(r,g,b),mn=Math.min(r,g,b);
    const sat=mx===0?0:(mx-mn)/mx;
    const lum=luma(r,g,b);
    rSum+=r;gSum+=g;bSum+=b;lumSum+=lum;lumSq+=lum*lum;satSum+=sat;count++;
    const br=Math.round(r/32)*32,bg=Math.round(g/32)*32,bb=Math.round(b/32)*32;
    const key=`${Math.min(255,br)},${Math.min(255,bg)},${Math.min(255,bb)}`;
    buckets.set(key,(buckets.get(key)||0)+1);

    const x=p%width,y=Math.floor(p/width);
    if(x+1<width){
      const j=i+4;
      edgeSum+=Math.abs(lum-luma(data[j],data[j+1],data[j+2]))/255;
    }
    if(y+1<height){
      const j=i+width*4;
      edgeSum+=Math.abs(lum-luma(data[j],data[j+1],data[j+2]))/255;
    }
  }
  count=Math.max(1,count);
  const brightness=lumSum/count/255;
  const variance=Math.max(0,lumSq/count-(lumSum/count)**2);
  const contrast=Math.sqrt(variance)/128;
  const saturation=satSum/count;
  const edgeDensity=edgeSum/(count*2);
  const palette=[...buckets.entries()]
    .sort((a,b)=>b[1]-a[1]).slice(0,5)
    .map(([key])=>key.split(",").map(Number));
  if(!palette.length) palette.push([rSum/count,gSum/count,bSum/count]);

  return {
    width,height,
    aspect: width/height,
    orientation: width>height*1.15?"landscape":height>width*1.15?"portrait":"square",
    brightness:clamp(brightness),
    contrast:clamp(contrast),
    saturation:clamp(saturation),
    edgeDensity:clamp(edgeDensity*2.2),
    average:[Math.round(rSum/count),Math.round(gSum/count),Math.round(bSum/count)],
    palette,
    paletteHex:palette.map(rgbHex)
  };
}

export function imageVibeSummary(a){
  if(!a) return "Aucune image";
  return [
    `${a.width}×${a.height} ${a.orientation}`,
    `luminosité ${Math.round(a.brightness*100)}%`,
    `contraste ${Math.round(a.contrast*100)}%`,
    `saturation ${Math.round(a.saturation*100)}%`,
    `contours ${Math.round(a.edgeDensity*100)}%`,
    `palette ${a.paletteHex.join(" ")}`
  ].join(" · ");
}

export function imageVibePrompt(userText, analysis, target="auto"){
  const targetLabel=IMAGE_VIBE_TARGETS.find(x=>x.id===target)?.label||target;
  return [
    String(userText||"Donne vie à cette image.").trim(),
    "",
    "[Image → Vibe : analyse locale non sémantique]",
    imageVibeSummary(analysis),
    `Cible souhaitée : ${targetLabel}.`,
    "Utilise cette palette, ce contraste et cette densité de contours comme direction visuelle.",
    "Crée une animation interactive légère, modifiable dans No-de, sans activer de périphérique automatiquement."
  ].join("\n");
}

function paletteColor(a,i,fallback=[160,180,210]){
  return a?.palette?.[i]||a?.palette?.[0]||fallback;
}

export function autoImageVibeTarget(a){
  if(!a) return "glsl";
  if(a.edgeDensity>.46 && a.saturation<.38) return "p5";
  if(a.edgeDensity>.56) return "sdf";
  if(a.saturation>.58) return "particles";
  return "glsl";
}

export function imageVibeOps(analysis, target="auto", userText=""){
  if(!analysis) return [];
  const chosen=target==="auto"?autoImageVibeTarget(analysis):target;
  const c0=paletteColor(analysis,0,[40,50,70]);
  const c1=paletteColor(analysis,1,[190,150,110]);
  const c2=paletteColor(analysis,2,[100,160,190]);
  const energy=clamp(.35+analysis.contrast*.35+analysis.saturation*.3);
  const speed=(.35+analysis.edgeDensity*2.2).toFixed(2);

  if(chosen==="p5"){
    const script=[
      `background(${Math.round(c0[0]*.18)},${Math.round(c0[1]*.18)},${Math.round(c0[2]*.18)})`,
      `fill(${c1[0]},${c1[1]},${c1[2]},150)`,
      `wave(height*0.48,${Math.round(28+analysis.contrast*95)},0.014,${speed})`,
      `fill(${c2[0]},${c2[1]},${c2[2]},130)`,
      `circle(mouseX,mouseY,${Math.round(60+analysis.edgeDensity*150)})`
    ].join("\n");
    return [{op:"addNode",type:"p5",title:"Image Vibe · p5",allowDuplicate:true,params:{
      script,seed:1,energy,sourceTarget:"p5",imageVibe:true,imageAnalysis:analysis,userIntent:String(userText||"").slice(0,500)
    }}];
  }

  if(chosen==="particles"){
    return [{op:"addNode",type:"flowfield",title:"Image Vibe · Particules",allowDuplicate:true,params:{
      energy,particles:Math.round(350+analysis.edgeDensity*1600),
      speed:Number(speed),palette:analysis.paletteHex,imageVibe:true,imageAnalysis:analysis
    }}];
  }

  if(chosen==="sdf"){
    return [{op:"addNode",type:"metaballs",title:"Image Vibe · SDF",allowDuplicate:true,params:{
      energy,points:Math.round(5+analysis.edgeDensity*18),
      softness:clamp(.15+(1-analysis.contrast)*.5),palette:analysis.paletteHex,imageVibe:true,imageAnalysis:analysis
    }}];
  }

  const toVec=(c)=>c.map(v=>(v/255).toFixed(4)).join(",");
  const glsl=`precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_intensity;
void main(){
  vec2 uv=gl_FragCoord.xy/u_resolution.xy;
  vec2 p=uv-.5;
  p.x*=u_resolution.x/max(1.0,u_resolution.y);
  float t=u_time*${speed};
  float waves=sin((p.x*10.0)+(p.y*7.0)+t)+sin(length(p)*18.0-t*1.4);
  float pulse=.5+.5*sin(t+length(p)*12.0);
  vec3 a=vec3(${toVec(c0)});
  vec3 b=vec3(${toVec(c1)});
  vec3 c=vec3(${toVec(c2)});
  vec3 col=mix(a,b,.5+.5*waves);
  col=mix(col,c,pulse*.35*u_intensity);
  gl_FragColor=vec4(col,1.0);
}`;
  return [{op:"addNode",type:"shader",title:"Image Vibe · GLSL",allowDuplicate:true,params:{
    glsl,intensity:energy,opacity:.92,sourceTarget:"glsl",imageVibe:true,imageAnalysis:analysis,userIntent:String(userText||"").slice(0,500)
  }}];
}


export async function analyzeImageFile(file, { sampleSize = 160 } = {}) {
  if (!file) throw new Error("Fichier image manquant");
  if (file.type && !String(file.type).startsWith("image/")) throw new Error("Le fichier choisi n’est pas une image");
  if (typeof document === "undefined") throw new Error("Analyse de fichier image réservée au navigateur");
  const url = URL.createObjectURL(file);
  try {
    let source;
    if (typeof createImageBitmap === "function") {
      source = await createImageBitmap(file);
    } else {
      source = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Impossible de lire l’image"));
        img.src = url;
      });
    }
    const sw = Number(source.width || source.naturalWidth) || 1;
    const sh = Number(source.height || source.naturalHeight) || 1;
    const scale = Math.min(1, sampleSize / Math.max(sw, sh));
    const w = Math.max(1, Math.round(sw * scale));
    const h = Math.max(1, Math.round(sh * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, w, h);
    const analysis = analyzeImagePixels(ctx.getImageData(0, 0, w, h));
    analysis.originalWidth = sw;
    analysis.originalHeight = sh;
    analysis.fileName = String(file.name || "image").slice(0, 200);
    analysis.fileType = String(file.type || "");
    source.close?.();
    return { analysis, previewUrl: url };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}
