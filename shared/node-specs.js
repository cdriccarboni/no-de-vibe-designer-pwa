
export const NODE_GROUPS = [
 ["Vidéo / caméra",[["Caméra live","camera"],["Retour vidéo régie","videoreturn"],["Mapping vidéo","mapping"],["Tracking / points","tracking"],["Ombre miroir","shadow"],["Anaglyphe","anaglyph"]]],
 ["Shaders / visuels",[["Shader Lab","shader"],["Creative FX","creativefx"],["Storm Forge","storm"],["Bending Lab","bending"],["Transmute","transmute"]]],
 ["Code / génératif",[["Processing / p5.js","p5"],["TouchDesigner tools","td"],["Mini Isadora","isadora"],["Sketch Lab","sketch"]]],
 ["Audio",[["Audio Lab","audio"],["Organic Audio","organicaudio"],["Mémo sonore","soundmemo"]]],
 ["Logique",[["Nombre","number"],["Multiplication","multiply"]]],
 ["Contrôle scène",[["MIDI Hub","midi"],["OSC","osc"],["Art-Net / DMX","dmx"],["Control surfaces","surface"],["Input Mapper","inputmapper"],["Stage I/O","stageio"]]],
 ["Arduino / devices",[["AutoCode / Arduino IDE","arduino"],["ESP32 / Wemos","esp"],["Servos","servo"],["RFID / QR","rfid"],["Capteurs","sensors"]]],
 ["Passerelles",[["TWOZERO / TD Vibe","twozero"],["Chataigne Bridge","chataigne"],["Millumin Bridge","millumin"],["TouchDesigner Bridge","touchdesigner"],["Isadora Bridge","isadorabridge"],["Max/MSP Bridge","max"],["Pure Data Bridge","pd"],["SuperCollider Bridge","supercollider"]]],
 ["Projet / automation",[["Sous-patch","subpatch"],["Show Importer","showimport"],["Automation","automation"],["Dream Engine","dream"],["Data Lab","datalab"],["Universal Wire","universal"],["Connectors","connectors"]]],
 ["Mobile / device",[["Caméra avant","phone-camera-front"],["Caméra arrière","phone-camera-back"],["Micro","phone-mic"],["Écran tactile","touch"],["Multitouch","multitouch"],["Gyroscope","gyro"],["Accéléromètre","accelerometer"],["Orientation","orientation"],["GPS","gps"],["Haptique","haptics"],["Wi-Fi","wifi"],["Bluetooth","bluetooth"]]]
];

export function spec(type){
  const m={
    camera:["Caméra live",["video","tracking","out"]],
    videoreturn:["Retour vidéo régie",["source","preview","out"]],
    mapping:["Mapping vidéo",["surface","warp","out"]],
    tracking:["Tracking / points",["points","curve","out"]],
    shadow:["Ombre miroir",["silhouette","mirror","separate"]],
    shader:["Shader Lab",["texture","glsl","out"]],
    p5:["Processing / p5.js",["sketch","params","out"]],
    midi:["MIDI Hub",["device","CC","gate"]],
    osc:["OSC",["host","address","value"]],
    dmx:["Art-Net / DMX",["universe","address","value"]],
    stageio:["Stage I/O",["in","route","out"]],
    subpatch:["Sous-patch",["in","params","out"]],
    audio:["Audio Lab",["in","process","out"]],
    number:["Nombre",["value"]],
    multiply:["Multiplication",["a","b","value"]],
    organicaudio:["Organic Audio",["in","reactive","out"]],
    soundmemo:["Mémo sonore",["record","tag","out"]],
    arduino:["AutoCode / Arduino IDE",["board","code","upload"]],
    esp:["ESP32 / Wemos",["device","wifi","io"]],
    servo:["Servo",["channel","angle","speed"]],
    sensors:["Capteurs",["sensor","filter","out"]],
    twozero:["TWOZERO / TD Vibe",["prompt","MCP","TD patch"]],
    chataigne:["Chataigne Bridge",["module","route","target"]],
    millumin:["Millumin Bridge",["OSC","layer","cue"]],
    touchdesigner:["TouchDesigner Bridge",["Python","COMP","tox"]],
    max:["Max/MSP Bridge",["maxpat","OSC","MIDI"]],
    pd:["Pure Data Bridge",["pd patch","OSC","MIDI"]],
    "phone-camera-front":["Caméra avant",["video","device","out"]],
    "phone-camera-back":["Caméra arrière",["video","device","out"]],
    "phone-mic":["Micro téléphone",["audio","level","out"]],
    touch:["Écran tactile",["x","y","pressure"]],
    multitouch:["Multitouch",["touches","gesture","out"]],
    gyro:["Gyroscope",["alpha","beta","gamma"]],
    accelerometer:["Accéléromètre",["x","y","z"]],
    orientation:["Orientation",["portrait","landscape","angle"]],
    gps:["GPS",["lat","lon","accuracy"]],
    haptics:["Haptique",["pattern","duration","trigger"]],
    wifi:["Wi-Fi",["network","latency","out"]],
    bluetooth:["Bluetooth",["device","service","characteristic"]]
  };
  return m[type] || [type,["input","process","output"]];
}
