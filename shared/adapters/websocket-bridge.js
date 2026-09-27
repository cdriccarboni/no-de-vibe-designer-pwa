export class WebSocketBridge {
  constructor(onEvent=()=>{}){this.socket=null;this.onEvent=onEvent;}
  connect(url){ this.close(); return new Promise((resolve,reject)=>{ let settled=false; const ws=new WebSocket(url); this.socket=ws; const timer=setTimeout(()=>{if(ws.readyState!==WebSocket.OPEN){ws.close();if(!settled){settled=true;reject(new Error("Timeout WebSocket"));}}},4500); ws.onopen=()=>{clearTimeout(timer);this.onEvent({type:"bridge-state",state:"online",url});if(!settled){settled=true;resolve(true)}}; ws.onmessage=e=>{let data=e.data;try{data=JSON.parse(e.data)}catch{}this.onEvent({type:"bridge-message",data})}; ws.onerror=()=>this.onEvent({type:"bridge-state",state:"error",url}); ws.onclose=()=>{clearTimeout(timer);this.onEvent({type:"bridge-state",state:"offline",url});if(this.socket===ws)this.socket=null}; }); }
  send(packet){ if(!this.socket||this.socket.readyState!==WebSocket.OPEN)throw new Error("Bridge non connecté"); this.socket.send(typeof packet==="string"?packet:JSON.stringify(packet)); this.onEvent({type:"bridge-out",packet}); }
  ping(target="generic"){return this.send({type:"ping",source:"No-de Vibe Designer",target,answer:42,time:Date.now()});}
  close(){try{this.socket?.close()}catch{}this.socket=null;}
}
export const makeOscPacket=(target,address,args=[])=>({type:"osc",target,address,args});
export const makeArtNetPacket=(universe=0,channel=1,value=0)=>({type:"artnet",universe:Math.max(0,Math.min(32767,+universe||0)),channel:Math.max(1,Math.min(512,+channel||1)),value:Math.max(0,Math.min(255,+value||0))});
