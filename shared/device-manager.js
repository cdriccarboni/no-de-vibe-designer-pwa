import {MidiAdapter} from "./adapters/midi.js";
import {SerialAdapter} from "./adapters/serial.js";
import {WebSocketBridge,makeOscPacket,makeArtNetPacket} from "./adapters/websocket-bridge.js";
export class DeviceManager{
  constructor(onEvent=()=>{}){this.onEvent=onEvent;this.midi=new MidiAdapter(e=>onEvent(e));this.serial=new SerialAdapter(e=>onEvent(e));this.bridge=new WebSocketBridge(e=>onEvent(e));}
  async command(text){const raw=String(text||"").trim(),q=raw.toLowerCase();if(q==="midi connect")return this.midi.connect();if(q==="midi off"){this.midi.disconnect();return true}if(q==="serial connect")return this.serial.connect();if(q==="serial off")return this.serial.disconnect();if(q.startsWith("serial send "))return this.serial.send(raw.slice(12));if(q.startsWith("bridge connect "))return this.bridge.connect(raw.slice(15).trim());if(q==="bridge ping")return this.bridge.ping();if(q.startsWith("osc ")){const [,target,address,...args]=raw.split(/\s+/);return this.bridge.send(makeOscPacket(target,address,args.map(v=>isNaN(Number(v))?v:Number(v))))}if(q.startsWith("artnet ")){const [,u,ch,v]=raw.split(/\s+/);return this.bridge.send(makeArtNetPacket(u,ch,v))}return false;}
}
