/**
 * Régie universelle — profils théâtre au-dessus des transports.
 * Les profils ne prétendent pas émuler les consoles : ils décrivent les
 * protocoles disponibles et proposent des commandes vérifiées ou configurables.
 */

export const PROTOCOL_FAMILIES = Object.freeze({
  osc: { id:"osc", label:"OSC", domain:"network", status:"native", transport:"udp", editable:true },
  midi: { id:"midi", label:"MIDI", domain:"control", status:"native", editable:true },
  msc: { id:"msc", label:"MIDI Show Control", domain:"show", status:"midi", editable:true },
  artnet: { id:"artnet", label:"Art-Net 4", domain:"lighting", status:"native", port:6454, editable:true },
  sacn: { id:"sacn", label:"sACN / E1.31", domain:"lighting", status:"native", port:5568, editable:true },
  dmx: { id:"dmx", label:"DMX512", domain:"lighting", status:"via-artnet-sacn-or-interface", editable:true },
  websocket: { id:"websocket", label:"WebSocket", domain:"network", status:"native-bridge", editable:true },
  serial: { id:"serial", label:"Serial", domain:"control", status:"native", editable:true },
  webrtc: { id:"webrtc", label:"WebRTC", domain:"video", status:"native", editable:false },
  ndi: { id:"ndi", label:"NDI", domain:"video", status:"native-relay-required", editable:false },
  syphon: { id:"syphon", label:"Syphon", domain:"video", status:"platform-limited", editable:false },
  spout: { id:"spout", label:"Spout", domain:"video", status:"platform-limited", editable:false },
  timecode: { id:"timecode", label:"LTC / MTC / NTC", domain:"show", status:"bridge-profile", editable:true }
});

const action = (label,binding,extra={}) => ({label,binding,...extra});

export const CONSOLE_PROFILES = Object.freeze([
  {
    id:"etc-eos", name:"ETC Eos", maker:"ETC", category:"lighting",
    protocols:["osc","midi","msc","sacn","artnet"],
    note:"OSC est le chemin de contrôle Companion recommandé. Art-Net/sACN servent aux données lumière réseau.",
    actions:[
      action("Cue 1", {kind:"osc",action:"send",oscAddress:"/eos/cue/1/fire",oscPort:8000}, {secondary:"OSC · cue fire"}),
      action("Cue 2", {kind:"osc",action:"send",oscAddress:"/eos/cue/2/fire",oscPort:8000}, {secondary:"OSC · cue fire"}),
      action("Blackout ch. 1", {kind:"osc",action:"send",oscAddress:"/eos/chan/1/out",oscPort:8000}, {secondary:"OSC · exemple ETC"})
    ]
  },
  {
    id:"chamsys-magicq", name:"ChamSys MagicQ", maker:"ChamSys", category:"lighting",
    protocols:["osc","artnet","sacn","midi"],
    note:"MagicQ expose OSC, protocoles réseau lumière et contrôle distant. Les adresses OSC restent configurables selon le show.",
    actions:[
      action("OSC 1", {kind:"osc",action:"send",oscAddress:"/nvd/magicq/1",oscPort:9000}, {secondary:"Adresse à adapter"}),
      action("OSC 2", {kind:"osc",action:"send",oscAddress:"/nvd/magicq/2",oscPort:9000}, {secondary:"Adresse à adapter"}),
      action("Master DMX", {kind:"sacn",action:"send",universe:1,channel:1}, {type:"fader",secondary:"sACN · U1 / CH1"})
    ]
  },
  {
    id:"grandma3", name:"grandMA3", maker:"MA Lighting", category:"lighting",
    protocols:["osc","midi","artnet","sacn"],
    note:"Profil générique : commandes OSC/MIDI à adapter à la configuration console.",
    actions:[
      action("OSC GO", {kind:"osc",action:"send",oscAddress:"/nvd/grandma/go",oscPort:8000}, {secondary:"Configurer l'adresse"}),
      action("DMX Master", {kind:"artnet",action:"send",universe:0,channel:1}, {type:"fader",secondary:"Art-Net · U0 / CH1"})
    ]
  },
  {
    id:"qlab5", name:"QLab 5", maker:"Figure 53", category:"video",
    protocols:["osc","midi","msc","timecode"],
    defaults:{oscPort:53000},
    note:"OSC natif QLab. Le port de réception global par défaut est 53000, modifiable par workspace.",
    actions:[
      action("GO", {kind:"osc",action:"send",oscAddress:"/go",oscPort:53000}, {secondary:"QLab OSC"}),
      action("Start selected", {kind:"osc",action:"send",oscAddress:"/cue/selected/start",oscPort:53000}, {secondary:"QLab OSC"}),
      action("Stop selected", {kind:"osc",action:"send",oscAddress:"/cue/selected/stop",oscPort:53000}, {secondary:"QLab OSC"})
    ]
  },
  {
    id:"millumin5", name:"Millumin 5", maker:"Anomes", category:"video",
    protocols:["osc","midi","msc","dmx","artnet","sacn","timecode"],
    note:"Millumin dispose d'une API OSC et accepte MIDI/MSC/DMX/Art-Net/sACN. Les commandes de show restent personnalisables.",
    actions:[
      action("OSC GO", {kind:"osc",action:"send",oscAddress:"/nvd/millumin/go",oscPort:9000}, {secondary:"Adresse à adapter"}),
      action("OSC Stop", {kind:"osc",action:"send",oscAddress:"/nvd/millumin/stop",oscPort:9000}, {secondary:"Adresse à adapter"}),
      action("DMX control", {kind:"artnet",action:"send",universe:0,channel:1}, {type:"fader",secondary:"Art-Net"})
    ]
  },
  {
    id:"resolume", name:"Resolume", maker:"Resolume", category:"video",
    protocols:["osc","midi","ndi","syphon","spout"],
    note:"Profil vidéo générique OSC/MIDI + transports vidéo selon plateforme.",
    actions:[
      action("OSC 1", {kind:"osc",action:"send",oscAddress:"/nvd/resolume/1",oscPort:7000}, {secondary:"Adresse à adapter"}),
      action("OSC 2", {kind:"osc",action:"send",oscAddress:"/nvd/resolume/2",oscPort:7000}, {secondary:"Adresse à adapter"})
    ]
  },
  {
    id:"behringer-x32", name:"Behringer X32 / Midas M32", maker:"Music Tribe", category:"sound",
    protocols:["osc","midi"],
    note:"Profil OSC de console son. Hôte/port et adresses restent modifiables depuis l'éditeur.",
    actions:[
      action("Fader CH1", {kind:"osc",action:"send",oscAddress:"/ch/01/mix/fader",oscPort:10023}, {type:"fader",secondary:"OSC · CH1"}),
      action("Mute CH1", {kind:"osc",action:"send",oscAddress:"/ch/01/mix/on",oscPort:10023}, {type:"toggle",secondary:"OSC · CH1"})
    ]
  },
  {
    id:"behringer-xair", name:"Behringer X Air / XR18", maker:"Music Tribe", category:"sound",
    protocols:["osc","midi"],
    note:"Profil X Air/XR : adresses OSC configurables et enregistrées dans le layout.",
    actions:[
      action("Fader CH1", {kind:"osc",action:"send",oscAddress:"/ch/01/mix/fader",oscPort:10024}, {type:"fader",secondary:"OSC · CH1"}),
      action("Mute CH1", {kind:"osc",action:"send",oscAddress:"/ch/01/mix/on",oscPort:10024}, {type:"toggle",secondary:"OSC · CH1"})
    ]
  },
  {
    id:"yamaha-console", name:"Yamaha CL / QL / DM", maker:"Yamaha", category:"sound",
    protocols:["midi","osc"],
    note:"Profil générique MIDI/OSC : choisir les messages selon le modèle et la configuration.",
    actions:[
      action("MIDI 1", {kind:"midi",action:"send",midiData:[176,0,-1]}, {type:"fader",secondary:"CC0"}),
      action("OSC 1", {kind:"osc",action:"send",oscAddress:"/nvd/yamaha/1",oscPort:9000}, {secondary:"Adresse à adapter"})
    ]
  },
  {
    id:"allen-heath", name:"Allen & Heath SQ / Avantis / dLive", maker:"Allen & Heath", category:"sound",
    protocols:["midi","osc"],
    note:"Profil générique : MIDI/OSC selon console, firmware et passerelle utilisés.",
    actions:[
      action("MIDI 1", {kind:"midi",action:"send",midiData:[176,0,-1]}, {type:"fader",secondary:"CC0"}),
      action("OSC 1", {kind:"osc",action:"send",oscAddress:"/nvd/ah/1",oscPort:9000}, {secondary:"Adresse à adapter"})
    ]
  },
  {
    id:"generic-osc", name:"OSC générique", maker:"Standard", category:"utility",
    protocols:["osc"],
    note:"Pour tout logiciel ou matériel contrôlable en OSC.",
    actions:[
      action("OSC A", {kind:"osc",action:"send",oscAddress:"/control/a",oscPort:9000}),
      action("OSC B", {kind:"osc",action:"send",oscAddress:"/control/b",oscPort:9000})
    ]
  },
  {
    id:"generic-dmx", name:"DMX réseau générique", maker:"Standard", category:"lighting",
    protocols:["artnet","sacn","dmx"],
    note:"Contrôle direct d'un canal via Art-Net ou sACN.",
    actions:[
      action("Art-Net CH1", {kind:"artnet",action:"send",universe:0,channel:1}, {type:"fader"}),
      action("sACN CH1", {kind:"sacn",action:"send",universe:1,channel:1}, {type:"fader"})
    ]
  }
]);

export function profileById(id){ return CONSOLE_PROFILES.find(p=>p.id===id)||null; }
export function profilesByCategory(category){ return CONSOLE_PROFILES.filter(p=>p.category===category); }
export function protocolsForProfile(id){ const p=profileById(id); return p ? p.protocols.map(k=>PROTOCOL_FAMILIES[k]).filter(Boolean) : []; }
