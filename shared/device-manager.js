import {MidiAdapter} from "./adapters/midi.js";
import {SerialAdapter} from "./adapters/serial.js";
import {WebSocketBridge,makeOscPacket,makeArtNetPacket} from "./adapters/websocket-bridge.js";

export class DeviceManager{
  constructor(onEvent=()=>{}){
    this.onEvent=onEvent;
    this.midi=new MidiAdapter(e=>onEvent(e));
    this.serial=new SerialAdapter(e=>onEvent(e));
    this.bridge=new WebSocketBridge(e=>onEvent(e));
    this.lastProbe=null;
  }

  async probe({autoReconnectSerial=true,autoConnectGrantedMidi=true}={}){
    const result={
      midi:{supported:this.midi.supported(),permission:"unknown",connected:!!this.midi.access,inputs:this.midi.inputs.length,outputs:this.midi.outputs.length},
      serial:{supported:this.serial.supported(),authorized:0,connected:!!this.serial.port?.readable,reconnected:false}
    };

    if(result.midi.supported && typeof navigator!=="undefined" && navigator.permissions?.query){
      try{
        const permission=await navigator.permissions.query({name:"midi",sysex:false});
        result.midi.permission=permission?.state||"unknown";
        if(autoConnectGrantedMidi && permission?.state==="granted" && !this.midi.access){
          await this.midi.connect();
          result.midi.connected=!!this.midi.access;
          result.midi.inputs=this.midi.inputs.length;
          result.midi.outputs=this.midi.outputs.length;
        }
      }catch{/* permissions.query("midi") not supported everywhere */}
    }

    if(result.serial.supported){
      try{
        const ports=await navigator.serial.getPorts();
        result.serial.authorized=ports.length;
        if(autoReconnectSerial && ports.length && !this.serial.port?.readable){
          const port=await this.serial.reconnect();
          result.serial.reconnected=!!port;
          result.serial.connected=!!port;
        }
      }catch(error){
        result.serial.error=String(error?.message||error);
      }
    }

    this.lastProbe=result;
    this.onEvent({type:"pnp-probe",result});
    return result;
  }

  async connectMidi(){
    const res=await this.midi.connect();
    await this.probe({autoReconnectSerial:false,autoConnectGrantedMidi:false});
    return res;
  }

  async connectSerial(){
    const res=await this.serial.connect();
    await this.probe({autoReconnectSerial:false,autoConnectGrantedMidi:false});
    return res;
  }

  async command(text){
    const raw=String(text||"").trim(),q=raw.toLowerCase();
    if(q==="midi connect")return this.connectMidi();
    if(q==="midi off"){this.midi.disconnect();return true}
    if(q==="serial connect")return this.connectSerial();
    if(q==="serial reconnect"){const p=await this.serial.reconnect();if(!p)throw new Error("Aucun port série autorisé à reconnecter");return p}
    if(q==="serial off")return this.serial.disconnect();
    if(q.startsWith("serial send "))return this.serial.send(raw.slice(12));
    if(q.startsWith("bridge connect "))return this.bridge.connect(raw.slice(15).trim());
    if(q==="bridge ping")return this.bridge.ping();
    if(q.startsWith("osc ")){const [,target,address,...args]=raw.split(/\s+/);return this.bridge.send(makeOscPacket(target,address,args.map(v=>isNaN(Number(v))?v:Number(v))))}
    if(q.startsWith("artnet ")){const [,u,ch,v]=raw.split(/\s+/);return this.bridge.send(makeArtNetPacket(u,ch,v))}
    return false;
  }
}
