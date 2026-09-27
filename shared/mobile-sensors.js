
export class MobileSensors {
  constructor(onData=()=>{}){ this.onData=onData; this.state={}; this.geoWatch=null; }
  async requestMotion(){
    if(typeof DeviceMotionEvent!=="undefined" && typeof DeviceMotionEvent.requestPermission==="function"){
      const r=await DeviceMotionEvent.requestPermission(); if(r!=="granted") throw new Error("Permission mouvement refusée");
    }
    window.addEventListener("devicemotion",e=>{
      this.state.accelerometer={x:e.accelerationIncludingGravity?.x||0,y:e.accelerationIncludingGravity?.y||0,z:e.accelerationIncludingGravity?.z||0};
      this.state.gyro={alpha:e.rotationRate?.alpha||0,beta:e.rotationRate?.beta||0,gamma:e.rotationRate?.gamma||0};
      this.onData(this.state);
    });
  }
  async requestOrientation(){
    if(typeof DeviceOrientationEvent!=="undefined" && typeof DeviceOrientationEvent.requestPermission==="function"){
      const r=await DeviceOrientationEvent.requestPermission(); if(r!=="granted") throw new Error("Permission orientation refusée");
    }
    window.addEventListener("deviceorientation",e=>{
      this.state.orientation={alpha:e.alpha||0,beta:e.beta||0,gamma:e.gamma||0,absolute:!!e.absolute};
      this.onData(this.state);
    });
  }
  requestGPS(){
    if(!navigator.geolocation) throw new Error("GPS indisponible");
    this.geoWatch=navigator.geolocation.watchPosition(p=>{
      this.state.gps={lat:p.coords.latitude,lon:p.coords.longitude,accuracy:p.coords.accuracy};
      this.onData(this.state);
    },()=>{}, {enableHighAccuracy:true,maximumAge:1000});
  }
  vibrate(pattern=40){ if(navigator.vibrate) navigator.vibrate(pattern); }
  stop(){ if(this.geoWatch!==null) navigator.geolocation.clearWatch(this.geoWatch); }
}
