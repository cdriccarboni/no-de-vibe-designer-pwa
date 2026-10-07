import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const roots=["desktop","shared","mobile","companion","show","studio"];
const files=[];
function walk(p){for(const name of readdirSync(p)){const f=join(p,name);const s=statSync(f);if(s.isDirectory())walk(f);else if(/\.m?js$/.test(f))files.push(f)}}
for(const root of roots){try{walk(root)}catch{}}
let failed=0;
for(const file of files){const r=spawnSync(process.execPath,["--check",file],{encoding:"utf8"});if(r.status!==0){failed++;console.error("\nFAIL",file,"\n",r.stderr||r.stdout)}}
console.log("checked",files.length,"failed",failed);
if(failed)process.exit(1);
console.log("SYNTAX_OK");
setInterval(()=>{},1<<30);
