export class MidiAdapter {
  constructor(onEvent=()=>{}){ this.access=null; this.onEvent=onEvent; this.inputs=[]; this.outputs=[]; }
  supported(){ return typeof navigator!=="undefined" && typeof navigator.requestMIDIAccess==="function"; }
  async connect(){
    if(!this.supported()) throw new Error("Web MIDI indisponible");
    this.access=await navigator.requestMIDIAccess({sysex:false}); this.refresh(); this.access.onstatechange=()=>this.refresh();
    return {inputs:this.inputs,outputs:this.outputs};
  }
  refresh(){
    if(!this.access)return; this.inputs=[...this.access.inputs.values()]; this.outputs=[...this.access.outputs.values()];
    for(const input of this.inputs) input.onmidimessage=e=>this.handle(input,e.data);
    this.onEvent({type:"midi-state",inputs:this.inputs.map(p=>({id:p.id,name:p.name,manufacturer:p.manufacturer,state:p.state})),outputs:this.outputs.map(p=>({id:p.id,name:p.name,manufacturer:p.manufacturer,state:p.state}))});
  }
  handle(input,data){
    if(!data)return; const a=[...data],status=a[0]||0,kind=status&0xF0,channel=(status&0x0F)+1,d1=a[1]||0,d2=a[2]||0;
    let type="MIDI"; if(kind===0x90&&d2>0)type="NOTE ON"; else if(kind===0x80||(kind===0x90&&d2===0))type="NOTE OFF"; else if(kind===0xB0)type="CC"; else if(kind===0xC0)type="PROGRAM CHANGE"; else if(kind===0xE0)type="PITCH BEND"; else if(status===0xF8)type="CLOCK"; else if(status===0xFA)type="START"; else if(status===0xFC)type="STOP"; else if(status===0xFB)type="CONTINUE";
    const value=kind===0xE0?((d2<<7)|d1)-8192:d2;
    this.onEvent({type:"midi-in",message:{type,channel,number:d1,value,raw:a,inputId:input.id,inputName:input.name||input.manufacturer||"MIDI"}});
  }
  send(outputId,data){ if(!this.access)throw new Error("MIDI non connecté"); const output=this.access.outputs.get(outputId)||this.outputs[0]; if(!output)throw new Error("Aucune sortie MIDI"); output.send(data); this.onEvent({type:"midi-out",outputId:output.id,data:[...data]}); }
  disconnect(){ for(const i of this.inputs)i.onmidimessage=null; if(this.access)this.access.onstatechange=null; this.access=null; this.inputs=[]; this.outputs=[]; this.onEvent({type:"midi-state",inputs:[],outputs:[]}); }
}
