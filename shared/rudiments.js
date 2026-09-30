/**
 * No-de Rudiments — reusable, open subpatches built from No-de's own engines.
 * They are templates, never opaque binaries.
 */

export const RUDIMENTS = Object.freeze([
  { id:"thread-curtain", label:"Rideau interactif", ports:["in","params","out"], note:"Pointer → rideau de fils → sortie" },
  { id:"ghost-silhouette", label:"Silhouette fantôme", ports:["video","params","out"], note:"Vidéo → seuil → ghost → sortie" },
  { id:"audio-blackhole", label:"Black Hole pilotable", ports:["level","params","out"], note:"Niveau/CHOP-like → black hole" },
  { id:"stage-video", label:"Chaîne vidéo scène", ports:["video","params","out"], note:"Vidéo → miroir → transform → sortie" }
]);

function baseNode(id, type, title, x, y, params = {}) {
  return { id, type, title, x, y, params:{ enabled:true, duration:5, opacity:1, ...params } };
}

function boxIn(id, title, index, x=20, y=100, data="any") {
  return baseNode(id, "box-in", title, x, y, { portIndex:index, data });
}
function boxOut(id, title, index, x=620, y=100, data="any") {
  return baseNode(id, "box-out", title, x, y, { portIndex:index, data });
}

function template(id) {
  if (id === "thread-curtain") {
    return {
      nodes:[
        baseNode("ptr","pointer","Pointer",40,70),
        baseNode("curtain","threadcurtain","Rideau de fils",260,80,{ strands:118, force:.9, wave:.34 }),
        boxOut("out","Out",2,560,110,"video")
      ],
      edges:[
        { id:"e1", from:{node:"ptr",port:0}, to:{node:"curtain",port:0} },
        { id:"e2", from:{node:"ptr",port:1}, to:{node:"curtain",port:1} },
        { id:"e3", from:{node:"ptr",port:2}, to:{node:"curtain",port:2} },
        { id:"e4", from:{node:"curtain",port:3}, to:{node:"out",port:0} }
      ]
    };
  }
  if (id === "ghost-silhouette") {
    return {
      nodes:[
        boxIn("in","Vidéo",0,20,100,"video"),
        baseNode("threshold","threshold","Silhouette",190,90,{ threshold:.45, invert:false }),
        baseNode("ghost","ghost","Ghost",390,90,{ decay:.82, dx:8, dy:0 }),
        boxOut("out","Out",2,610,100,"video")
      ],
      edges:[
        { id:"e1", from:{node:"in",port:0}, to:{node:"threshold",port:0} },
        { id:"e2", from:{node:"threshold",port:2}, to:{node:"ghost",port:0} },
        { id:"e3", from:{node:"ghost",port:2}, to:{node:"out",port:0} }
      ]
    };
  }
  if (id === "audio-blackhole") {
    return {
      nodes:[
        boxIn("in","Niveau",0,20,100,"number"),
        baseNode("scale","inputmapper","Mapper niveau",180,90,{ inMin:0, inMax:1, outMin:.2, outMax:1.5 }),
        baseNode("hole","blackhole","Black Hole",390,90,{ speed:.65, size:.58 }),
        boxOut("out","Out",2,610,100,"video")
      ],
      edges:[
        { id:"e1", from:{node:"in",port:0}, to:{node:"scale",port:0} },
        { id:"e2", from:{node:"scale",port:3}, to:{node:"hole",port:0} },
        { id:"e3", from:{node:"hole",port:2}, to:{node:"out",port:0} }
      ]
    };
  }
  if (id === "stage-video") {
    return {
      nodes:[
        boxIn("in","Vidéo",0,20,100,"video"),
        baseNode("mirror","mirror","Mirror",180,90,{ axis:"x" }),
        baseNode("transform","transform","Transform",380,90,{ scale:1, rotation:0, dx:0, dy:0 }),
        boxOut("out","Out",2,610,100,"video")
      ],
      edges:[
        { id:"e1", from:{node:"in",port:0}, to:{node:"mirror",port:0} },
        { id:"e2", from:{node:"mirror",port:1}, to:{node:"transform",port:0} },
        { id:"e3", from:{node:"transform",port:3}, to:{node:"out",port:0} }
      ]
    };
  }
  throw new Error("Rudiment inconnu : " + id);
}

export function rudimentMeta(id) {
  return RUDIMENTS.find(r => r.id === id) || null;
}

export function createRudimentNode(id, { nodeId="rudiment", x=80, y=80 } = {}) {
  const meta = rudimentMeta(id);
  if (!meta) throw new Error("Rudiment inconnu : " + id);
  return {
    id:nodeId,
    type:"subpatch",
    title:meta.label,
    x,y,
    params:{
      enabled:true,
      duration:5,
      opacity:1,
      rudimentId:id,
      openTemplate:true,
      ports:[
        { name:meta.ports[0] || "in", dir:"in", data:"any" },
        { name:meta.ports[1] || "params", dir:"in", data:"number" },
        { name:meta.ports[2] || "out", dir:"out", data:"any" }
      ],
      graph:template(id)
    }
  };
}
