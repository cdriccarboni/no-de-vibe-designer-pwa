const {app, BrowserWindow, ipcMain, dialog, shell} = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const dgram = require('node:dgram');

const PRODUCT='No-de Vibe Designer';
const VERSION='0.8.0';

function createWindow(){
  const win = new BrowserWindow({
    width:1540,height:960,minWidth:1100,minHeight:720,
    title:`${PRODUCT} ${VERSION}`,backgroundColor:'#101214',
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:false}
  });
  if(process.argv.includes('--smoke-test')){
    const timeout=setTimeout(()=>{console.error('PACKAGED_SELF_TEST_TIMEOUT');app.exit(3);},20000);
    win.webContents.once('did-finish-load',async()=>{
      try{
        const result=await win.webContents.executeJavaScript("window.__nodeVibeSelfTest ? window.__nodeVibeSelfTest() : Promise.resolve({ok:false,error:'self-test hook missing'})");
        clearTimeout(timeout);
        console.log('PACKAGED_SELF_TEST',JSON.stringify(result));
        if(result?.ok) app.quit(); else app.exit(2);
      }catch(e){clearTimeout(timeout);console.error('PACKAGED_SELF_TEST_ERROR',e);app.exit(2);}
    });
  }
  win.loadFile(path.join(__dirname,'desktop','index.html'));
  return win;
}
app.whenReady().then(()=>{app.setName(PRODUCT);createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});

ipcMain.handle('app:info',()=>({name:PRODUCT,version:VERSION,platform:process.platform,arch:process.arch}));
ipcMain.handle('project:save',async(_e,{suggestedName='Projet.nodevibe.json',data})=>{
  const r=await dialog.showSaveDialog({title:'Enregistrer le projet No-de',defaultPath:suggestedName,filters:[{name:'No-de Project',extensions:['json']}]});
  if(r.canceled||!r.filePath)return {canceled:true};await fs.writeFile(r.filePath,data,'utf8');return {canceled:false,path:r.filePath};
});
ipcMain.handle('project:open',async()=>{
  const r=await dialog.showOpenDialog({title:'Ouvrir un projet No-de',properties:['openFile'],filters:[{name:'No-de Project',extensions:['json']}]});
  if(r.canceled||!r.filePaths[0])return {canceled:true};const filePath=r.filePaths[0];return {canceled:false,path:filePath,data:await fs.readFile(filePath,'utf8')};
});
ipcMain.handle('export:file',async(_e,{suggestedName,data,encoding='utf8'})=>{
  const ext=(suggestedName.split('.').pop()||'txt').toLowerCase();const r=await dialog.showSaveDialog({title:'Exporter',defaultPath:suggestedName,filters:[{name:'Export',extensions:[ext]}]});
  if(r.canceled||!r.filePath)return {canceled:true};await fs.writeFile(r.filePath,data,encoding);return {canceled:false,path:r.filePath};
});
function oscPad4(buf){const n=(4-(buf.length%4))%4;return n?Buffer.concat([buf,Buffer.alloc(n)]):buf;}
function oscString(s){return oscPad4(Buffer.concat([Buffer.from(String(s)),Buffer.from([0])]));}
function oscMessage(address,args=[]){const tags=[','],payload=[];for(const a of args){if(Number.isInteger(a)){tags.push('i');const b=Buffer.alloc(4);b.writeInt32BE(a);payload.push(b);}else if(typeof a==='number'){tags.push('f');const b=Buffer.alloc(4);b.writeFloatBE(a);payload.push(b);}else if(typeof a==='boolean'){tags.push(a?'T':'F');}else{tags.push('s');payload.push(oscString(String(a)));}}return Buffer.concat([oscString(address),oscString(tags.join('')),...payload]);}
function udpSend(host,port,buffer){return new Promise((resolve,reject)=>{const s=dgram.createSocket('udp4');s.send(buffer,Number(port),host,e=>{s.close();e?reject(e):resolve(true);});});}
ipcMain.handle('network:osc',async(_e,{host='127.0.0.1',port=8000,address='/nodevibe',args=[]})=>{try{await udpSend(host,port,oscMessage(address,args));return {ok:true};}catch(e){return {ok:false,error:String(e?.message||e)};}});
ipcMain.handle('network:artnet',async(_e,{host='127.0.0.1',universe=0,channel=1,value=0})=>{try{const dmx=Buffer.alloc(512);dmx[Math.max(0,Math.min(511,Number(channel)-1))]=Math.max(0,Math.min(255,Number(value)||0));const h=Buffer.alloc(18);Buffer.from('Art-Net\0').copy(h,0);h.writeUInt16LE(0x5000,8);h.writeUInt16BE(14,10);h[12]=0;h[13]=0;h.writeUInt16LE(Number(universe)||0,14);h.writeUInt16BE(512,16);await udpSend(host,6454,Buffer.concat([h,dmx]));return {ok:true};}catch(e){return {ok:false,error:String(e?.message||e)};}});
async function ollamaGenerate(prompt,graphSummary){
  const base='http://127.0.0.1:11434';const tags=await fetch(base+'/api/tags').then(r=>{if(!r.ok)throw new Error('Ollama indisponible');return r.json();});
  const models=(tags.models||[]).map(x=>x.name).filter(Boolean);if(!models.length)throw new Error('Ollama est lancé mais aucun modèle n’est installé');
  const model=models.find(x=>/qwen.*coder/i.test(x))||models.find(x=>/qwen/i.test(x))||models[0];
  const system='Tu pilotes No-de Vibe Designer. Réponds UNIQUEMENT en JSON compact. Opérations autorisées: addNode, connect, setParam, wrapSelection, explain. Types connus: number,add,multiply,smooth,compare,text,trigger,timer,blackhole,transform,preview,midi-in,osc-out,artnet-out,camera,luma-track,subpatch. N’invente jamais de type.';
  const body={model,stream:false,format:'json',prompt:`${system}\nGraphe actuel: ${graphSummary}\nDemande: ${prompt}`};
  const out=await fetch(base+'/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).then(r=>{if(!r.ok)throw new Error('Ollama HTTP '+r.status);return r.json();});
  return {model,data:JSON.parse(out.response||'{}')};
}
ipcMain.handle('vibe:ollama',async(_e,{prompt,graphSummary})=>{try{return {ok:true,...await ollamaGenerate(prompt,graphSummary)};}catch(e){return {ok:false,error:String(e?.message||e)};}});
ipcMain.handle('system:openPath',async(_e,p)=>shell.openPath(p));
