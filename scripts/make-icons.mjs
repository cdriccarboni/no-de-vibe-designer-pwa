import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"..");

function crc32(buf){let c=~0;for(let i=0;i<buf.length;i++){c^=buf[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return ~c>>>0;}
function chunk(type,data){const t=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length,0);const body=Buffer.concat([t,data]);crc.writeUInt32BE(crc32(body),0);return Buffer.concat([len,body,crc]);}
function png(width,height,paint){
 const raw=Buffer.alloc((width*4+1)*height);
 for(let y=0;y<height;y++){const row=y*(width*4+1);raw[row]=0;for(let x=0;x<width;x++){const [r,g,b,a]=paint(x,y,width,height);const i=row+1+x*4;raw[i]=r;raw[i+1]=g;raw[i+2]=b;raw[i+3]=a;}}
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",ihdr),chunk("IDAT",zlib.deflateSync(raw)),chunk("IEND",Buffer.alloc(0))]);
}
const ringDefs=[
 [.39,[215,184,106],.28],
 [.31,[143,167,157],.34],
 [.23,[215,184,106],.46],
 [.15,[143,167,157],.58],
 [.07,[215,184,106],.78]
];
function paintRings(x,y,w,h,{transparent=false,safe=.92}={}){
 const cx=(w-1)/2,cy=(h-1)/2,min=Math.min(w,h)*safe,dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy);
 let base=transparent?[0,0,0,0]:[5,6,7,255];
 const width=Math.max(1,min*.018);
 for(const [ratio,color,alpha] of ringDefs){
   const r=min*ratio;
   const delta=Math.abs(d-r);
   if(delta<=width){
     const aa=Math.max(0,Math.min(1,(width-delta)/Math.max(1,width*.55)));
     const a=alpha*aa;
     const oldA=base[3]/255,newA=a+oldA*(1-a);
     if(newA<=0)return[0,0,0,0];
     base=[
       Math.round((color[0]*a+base[0]*oldA*(1-a))/newA),
       Math.round((color[1]*a+base[1]*oldA*(1-a))/newA),
       Math.round((color[2]*a+base[2]*oldA*(1-a))/newA),
       Math.round(newA*255)
     ];
   }
 }
 return base;
}
function write(rel,w,h=w,opts={}){const out=path.join(root,rel);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,png(w,h,(x,y,W,H)=>paintRings(x,y,W,H,opts)));}
for(const dir of ["icons","mobile/icons"]){
 write(`${dir}/icon-192.png`,192);write(`${dir}/icon-512.png`,512);
 write(`${dir}/icon-maskable-192.png`,192,192,{safe:.78});write(`${dir}/icon-maskable-512.png`,512,512,{safe:.78});
}
write("build/icon.png",1024);

const res=path.join(root,"android/app/src/main/res");
if(fs.existsSync(res)){
 const launcher={mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192};
 const foreground={mdpi:108,hdpi:162,xhdpi:216,xxhdpi:324,xxxhdpi:432};
 for(const [density,size] of Object.entries(launcher)){
   for(const name of ["ic_launcher.png","ic_launcher_round.png"])write(`android/app/src/main/res/mipmap-${density}/${name}`,size);
   write(`android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`,foreground[density],foreground[density],{transparent:true,safe:.72});
 }
 const values=path.join(res,"values");fs.mkdirSync(values,{recursive:true});
 fs.writeFileSync(path.join(values,"ic_launcher_background.xml"),'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n  <color name="ic_launcher_background">#050607</color>\n</resources>\n');
 const splash=[
  ["drawable/splash.png",1024,1024],
  ["drawable-land-mdpi/splash.png",480,320],["drawable-land-hdpi/splash.png",800,480],["drawable-land-xhdpi/splash.png",1280,720],["drawable-land-xxhdpi/splash.png",1600,960],["drawable-land-xxxhdpi/splash.png",1920,1280],
  ["drawable-port-mdpi/splash.png",320,480],["drawable-port-hdpi/splash.png",480,800],["drawable-port-xhdpi/splash.png",720,1280],["drawable-port-xxhdpi/splash.png",960,1600],["drawable-port-xxxhdpi/splash.png",1280,1920]
 ];
 for(const [rel,w,h] of splash)write(`android/app/src/main/res/${rel}`,w,h,{safe:.62});
}
console.log("No[co]de brand assets generated");
