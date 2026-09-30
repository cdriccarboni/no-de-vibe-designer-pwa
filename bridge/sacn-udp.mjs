/**
 * Envoi sACN/E1.31 UDP. Node/Electron uniquement.
 */
import dgram from "node:dgram";
import crypto from "node:crypto";
import { encodeSacnChannel, encodeSacnDmx, sacnMulticastAddress } from "../shared/protocols/sacn.js";

const CID = crypto.randomBytes(16);
let sequence = 0;

export function sacnUdpAvailable(){ return true; }

export function sendSacnUdp({
  host="",port=5568,universe=1,channel=1,value=0,data=null,
  priority=100,sourceName="No-de Vibe Designer"
}={}){
  const udpPort=Number(port);
  if(!Number.isInteger(udpPort)||udpPort<1||udpPort>65535) return Promise.reject(new Error("Port sACN invalide"));
  const target=(typeof host==="string"&&host.trim())?host.trim():sacnMulticastAddress(universe);
  sequence=(sequence+1)&0xff;
  const packet=data
    ? encodeSacnDmx({universe,data,sequence,priority,sourceName,cid:CID})
    : encodeSacnChannel({universe,channel,value,sequence,priority,sourceName,cid:CID});
  return new Promise((resolve,reject)=>{
    const socket=dgram.createSocket("udp4");
    const fail=(error)=>{try{socket.close();}catch{};reject(error instanceof Error?error:new Error(String(error)));};
    socket.once("error",fail);
    try{ socket.setMulticastTTL?.(1); }catch{}
    socket.send(packet,udpPort,target,(error)=>{
      if(error) fail(error);
      else{socket.close();resolve({host:target,port:udpPort,bytes:packet.length,universe,sequence});}
    });
  });
}
