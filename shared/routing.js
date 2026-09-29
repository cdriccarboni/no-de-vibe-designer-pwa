
export const ROUTE_MODES = {
  main: "Principal",
  only: "Uniquement vers…",
  copy: "Copie vers…"
};

export const DESTINATIONS = [
  {id:"main-output", label:"OUTPUT principal", kind:"local", capability:"video", status:"ready"},
  {id:"local-window", label:"OUTPUT secondaire", kind:"local", capability:"video", status:"ready"},
  {id:"millumin", label:"Millumin", kind:"bridge", capability:"video-control", status:"planned"},
  {id:"touchdesigner", label:"TouchDesigner", kind:"bridge", capability:"video-control", status:"planned"},
  {id:"obs", label:"OBS", kind:"bridge", capability:"video-control", status:"planned"},
  {id:"chataigne", label:"Chataigne", kind:"bridge", capability:"control", status:"planned"},
  {id:"ndi", label:"NDI", kind:"native-adapter", capability:"video-network", status:"adapter"},
  {id:"syphon", label:"Syphon (macOS)", kind:"native-adapter", capability:"video-texture", status:"adapter"},
  {id:"spout", label:"Spout (Windows)", kind:"native-adapter", capability:"video-texture", status:"adapter"},
  {id:"osc-trigger", label:"OSC / Trigger", kind:"control", capability:"control", status:"ready"}
];

export function ensureRouting(project, trackCount=6){
  project.routing ||= {tracks:{}};
  project.routing.tracks ||= {};
  for(let i=0;i<trackCount;i++){
    project.routing.tracks[i] ||= {
      mode:"main",
      destinations:["main-output"],
      enabled:true
    };
  }
  return project.routing;
}

export function setRoute(project, track, mode, destinations){
  ensureRouting(project);
  project.routing.tracks[track] = {
    enabled:true,
    mode,
    destinations:[...new Set(destinations.length?destinations:["main-output"])]
  };
}

export function effectiveRoute(project, track){
  ensureRouting(project);
  return project.routing.tracks[track];
}
