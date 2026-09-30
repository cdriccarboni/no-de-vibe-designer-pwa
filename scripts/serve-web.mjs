import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4175);
const host = process.env.HOST || "0.0.0.0";

const types = {
  ".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".webmanifest":"application/manifest+json; charset=utf-8",
  ".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".ico":"image/x-icon",".woff2":"font/woff2"
};
function safeFile(urlPath){
  const raw=decodeURIComponent((urlPath||"/").split("?")[0]);
  const rel=raw.replace(/^\/+/, "") || "index.html";
  const full=path.normalize(path.join(root,rel));
  if(!full.startsWith(root)) return null;
  if(fs.existsSync(full) && fs.statSync(full).isDirectory()) return path.join(full,"index.html");
  return full;
}
const server=http.createServer((req,res)=>{
  if(req.url?.split("?")[0]==="/health"){
    res.writeHead(200,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});
    res.end(JSON.stringify({ok:true,app:"No-de Vibe Designer",version:"1.3.1"}));
    return;
  }
  const file=safeFile(req.url);
  if(!file){res.writeHead(403);res.end("Forbidden");return;}
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end("Not found");return;}
  res.writeHead(200,{
    "Content-Type":types[path.extname(file).toLowerCase()]||"application/octet-stream",
    "Cache-Control":file.endsWith("sw.js")||file.endsWith("index.html")?"no-cache":"public, max-age=300",
    "X-Content-Type-Options":"nosniff"
  });
  fs.createReadStream(file).pipe(res);
});
server.listen(port,host,()=>console.log(`No-de Web · http://${host}:${port}`));