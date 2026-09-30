/**
 * Retours vidéo locaux — porté depuis ART Patcher.
 * MediaStream direct, aucun réencodage, pas de plafond logiciel arbitraire.
 */
import { listVideoInputs, openCamera, stopStream } from './camera.js';

export function createLocalVideoReturnManager({ onChange=()=>{}, onLog=()=>{} }={}){
  const monitors=new Map();
  const streams=new Map();

  function snapshot(){
    return [...monitors.values()].map(m=>({ ...m, live:streams.has(m.id), stream:streams.get(m.id)||null }));
  }
  function emit(){ onChange(snapshot()); }

  function add({id='',label='',deviceId=''}={}){
    const monitor={
      id:id||('return-'+Date.now()+'-'+Math.random().toString(36).slice(2,5)),
      label:label||('RETOUR '+(monitors.size+1)),
      deviceId
    };
    monitors.set(monitor.id,monitor);
    emit();
    return monitor;
  }

  function patch(id,change={}){
    const current=monitors.get(id);
    if(!current) return null;
    const next={...current,...change};
    monitors.set(id,next);
    emit();
    return next;
  }

  function stop(id){
    const stream=streams.get(id);
    stopStream(stream);
    streams.delete(id);
    onLog('Retour vidéo · '+(monitors.get(id)?.label||id)+' coupé');
    emit();
  }

  async function start(id){
    const monitor=monitors.get(id);
    if(!monitor) throw new Error('Retour vidéo inconnu : '+id);
    stop(id);
    const stream=await openCamera({deviceId:monitor.deviceId||'',facingMode:'environment'});
    streams.set(id,stream);
    onLog('Retour vidéo · '+monitor.label+' LIVE · flux local direct');
    emit();
    return stream;
  }

  function remove(id){
    stop(id);
    monitors.delete(id);
    emit();
  }

  async function detect(){
    const devices=await listVideoInputs();
    onLog('Retours vidéo · '+devices.length+' caméra(s) détectée(s)');
    return devices;
  }

  function stopAll(){
    for(const id of [...streams.keys()]) stop(id);
  }

  return { add,patch,start,stop,remove,detect,stopAll,snapshot };
}
