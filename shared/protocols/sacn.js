/**
 * ANSI E1.31 / sACN — Data Packet minimal, pur JS.
 * Le navigateur ne peut pas envoyer l'UDP directement : Electron/Node sert de pont.
 */

export const SACN_CAPABILITY = {
  udp: "node-or-electron",
  browser: "bridge-only",
  note: "sACN/E1.31 UDP, multicast par défaut."
};

const ACN_ID = new Uint8Array([0x41,0x53,0x43,0x2d,0x45,0x31,0x2e,0x31,0x37,0x00,0x00,0x00]);

function put16(buf,off,v){ buf[off]=(v>>8)&0xff; buf[off+1]=v&0xff; }
function put32(buf,off,v){ buf[off]=(v>>>24)&0xff;buf[off+1]=(v>>>16)&0xff;buf[off+2]=(v>>>8)&0xff;buf[off+3]=v&0xff; }
function flagsLength(n){ return 0x7000 | (n & 0x0fff); }

function cidBytes(cid){
  if(cid instanceof Uint8Array && cid.length===16) return cid;
  if(typeof cid==="string"){
    const hex=cid.replace(/-/g,"");
    if(/^[0-9a-f]{32}$/i.test(hex)){
      const out=new Uint8Array(16);
      for(let i=0;i<16;i++) out[i]=parseInt(hex.slice(i*2,i*2+2),16);
      return out;
    }
  }
  return new Uint8Array(16);
}

export function sacnMulticastAddress(universe=1){
  const u=Math.max(1,Math.min(63999,Number(universe)||1));
  return `239.255.${(u>>8)&0xff}.${u&0xff}`;
}

export function encodeSacnDmx({
  universe=1,data,sequence=0,priority=100,sourceName="No-de Vibe Designer",cid=null
}={}){
  const uni=Math.max(1,Math.min(63999,Number(universe)||1));
  let payload;
  if(data instanceof Uint8Array) payload=data;
  else if(Array.isArray(data)) payload=Uint8Array.from(data.map(v=>Math.max(0,Math.min(255,Number(v)||0))));
  else throw new Error("sACN : données DMX manquantes");
  if(payload.length<1||payload.length>512) throw new Error("sACN : longueur DMX invalide (1–512)");

  const packet=new Uint8Array(126+payload.length);
  put16(packet,0,0x0010);
  put16(packet,2,0x0000);
  packet.set(ACN_ID,4);

  // Root layer
  put16(packet,16,flagsLength(packet.length-16));
  put32(packet,18,0x00000004);
  packet.set(cidBytes(cid),22);

  // Framing layer
  put16(packet,38,flagsLength(packet.length-38));
  put32(packet,40,0x00000002);
  const nameBytes=new TextEncoder().encode(String(sourceName||"No-de").slice(0,63));
  packet.set(nameBytes,44);
  packet[108]=Math.max(0,Math.min(200,Number(priority)||100));
  put16(packet,109,0);
  packet[111]=Number(sequence)&0xff;
  packet[112]=0;
  put16(packet,113,uni);

  // DMP layer
  put16(packet,115,flagsLength(packet.length-115));
  packet[117]=0x02;
  packet[118]=0xa1;
  put16(packet,119,0);
  put16(packet,121,1);
  put16(packet,123,payload.length+1);
  packet[125]=0; // DMX start code
  packet.set(payload,126);
  return packet;
}

export function encodeSacnChannel({universe=1,channel=1,value=0,...rest}={}){
  const ch=Math.max(1,Math.min(512,Number(channel)||1));
  const data=new Uint8Array(ch);
  data[ch-1]=Math.max(0,Math.min(255,Number(value)||0));
  return encodeSacnDmx({universe,data,...rest});
}
