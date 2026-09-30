/**
 * Détection prudente de caméra — portée depuis ART.
 * true = caméra visible, false = absence certaine, null = état inconnu.
 */
export async function detectCameraAvailability(){
  if(typeof navigator==='undefined') return null;
  const media=navigator.mediaDevices;
  if(!media?.enumerateDevices) return null;
  try{
    const devices=await media.enumerateDevices();
    if(devices.some(device=>device.kind==='videoinput')) return true;
    return media.getUserMedia ? null : false;
  }catch{
    return null;
  }
}

export function watchCameraAvailability(onChange){
  let cancelled=false;
  const refresh=async()=>{
    const value=await detectCameraAvailability();
    if(!cancelled) onChange?.(value);
  };
  void refresh();
  const media=typeof navigator!=='undefined' ? navigator.mediaDevices : undefined;
  media?.addEventListener?.('devicechange',refresh);
  return ()=>{
    cancelled=true;
    media?.removeEventListener?.('devicechange',refresh);
  };
}
