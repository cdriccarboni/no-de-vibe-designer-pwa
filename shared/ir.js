
export function newProject(){
  return {
    schema:"cvd.graph",
    version:1,
    name:"Nouveau projet",
    nodes:[],
    edges:[],
    timeline:[],
    controls:[],
    resources:[],
    output:{width:1280,height:720,fps:60,background:"#090b0d",name:"OUTPUT principal"},
    routing:{tracks:{}},
    devices:[],
    meta:{created:new Date().toISOString(),updated:new Date().toISOString()}
  };
}
export function validateProject(p){
  if(!p || p.schema!=="cvd.graph") throw new Error("Projet Code Vibe Designer invalide");
  p.nodes ||= []; p.edges ||= []; p.timeline ||= []; p.controls ||= [];
  p.resources ||= []; p.devices ||= [];
  p.output ||= {width:1280,height:720,fps:60,background:"#090b0d"};
  p.meta ||= {};
  return p;
}
export function exportProject(p){
  p.meta ||= {};
  p.meta.updated=new Date().toISOString();
  return JSON.stringify(p,null,2);
}
export function nodeById(project,id){ return project.nodes.find(n=>n.id===id); }
export function addNode(project,type,title,x=0,y=0,params={}){
  const seq=(project.nodes.reduce((m,n)=>Math.max(m,parseInt(String(n.id).replace(/\D/g,""))||0),0)+1);
  const node={id:`n${seq}`,type,title,x,y,params:{enabled:true,duration:5,opacity:1,...params}};
  project.nodes.push(node);
  return node;
}
export function addTimelineClip(project,clip){
  const seq=(project.timeline.reduce((m,c)=>Math.max(m,parseInt(String(c.id).replace(/\D/g,""))||0),0)+1);
  const value={id:`c${seq}`,track:0,start:0,duration:1,label:"Clip",kind:"effect",...clip};
  project.timeline.push(value);
  return value;
}
