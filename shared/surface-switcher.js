import { installUpdateNotice } from "./update-notice.js";
/**
 * No-de Surface Switcher
 * Une même machine peut devenir Designer, interface mobile, régie tablette,
 * plateau ou caméra distante. Le type d'appareil n'est qu'un défaut, jamais une limite.
 */

export const SURFACE_PREF_KEY = "nvd.surface.preference";

export const SURFACES = Object.freeze([
  { id:"designer", label:"Designer", detail:"Canvas · Library · Timeline · Vibe", path:"desktop/index.html" },
  { id:"mobile", label:"Mobile", detail:"Interface compacte · capteurs · conduite", path:"mobile/index.html" },
  { id:"regie", label:"Régie", detail:"Companion Studio · pages personnalisables", path:"studio/index.html?surface=regie" },
  { id:"plateau", label:"Plateau", detail:"Companion Studio directement en mode Plateau", path:"studio/index.html?surface=plateau" },
  { id:"camera", label:"Caméra", detail:"Remote Camera · WebRTC", path:"companion/index.html" }
]);

export function pwaRootUrl(){
  return new URL("../", import.meta.url);
}

export function getPreferredSurface(storage=globalThis.localStorage){
  try{
    const value=storage?.getItem?.(SURFACE_PREF_KEY)||"";
    return SURFACES.some(s=>s.id===value)?value:"";
  }catch{return "";}
}

export function setPreferredSurface(id,storage=globalThis.localStorage){
  try{
    if(!id||id==="auto") storage?.removeItem?.(SURFACE_PREF_KEY);
    else if(SURFACES.some(s=>s.id===id)) storage?.setItem?.(SURFACE_PREF_KEY,id);
  }catch{}
}

export function surfaceUrl(id,{root=pwaRootUrl()}={}){
  if(id==="auto") return new URL("index.html?auto=1",root).href;
  const s=SURFACES.find(x=>x.id===id)||SURFACES[0];
  return new URL(s.path,root).href;
}

export function navigateSurface(id,{locationObj=globalThis.location,root=pwaRootUrl()}={}){
  const target=new URL(surfaceUrl(id,{root}),locationObj?.href||root);
  const currentProtocol=String(locationObj?.protocol||"");
  // Electron charge les interfaces depuis file:// : conserver l'URL complète.
  // En HTTP(S), rester en chemin local évite de changer d'origine.
  const destination=currentProtocol==="file:"||target.protocol==="file:"
    ? target.href
    : target.pathname+target.search+target.hash;
  if(typeof locationObj?.assign==="function") locationObj.assign(destination);
  else if(locationObj) locationObj.href=destination;
  return destination;
}

function injectStyle(){
  if(document.getElementById("nvdSurfaceSwitcherStyle")) return;
  const style=document.createElement("style");
  style.id="nvdSurfaceSwitcherStyle";
  style.textContent=`
  .nvd-surface-switcher{position:fixed;right:max(10px,env(safe-area-inset-right));bottom:max(10px,env(safe-area-inset-bottom));z-index:2147483000;font:12px/1.25 Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;color:#edf0f2}
  .nvd-surface-switcher button{font:inherit}
  .nvd-surface-toggle{border:1px solid #3a4249!important;background:rgba(15,18,21,.94)!important;color:#edf0f2!important;border-radius:999px!important;padding:8px 11px!important;min-height:0!important;box-shadow:0 8px 28px #0007!important;backdrop-filter:blur(10px);opacity:.78}
  .nvd-surface-toggle:hover,.nvd-surface-toggle:focus-visible{opacity:1;border-color:#d7b86a!important;outline:none}
  .nvd-surface-menu{position:absolute;right:0;bottom:calc(100% + 7px);width:min(280px,calc(100vw - 20px));padding:7px;border:1px solid #333b42;border-radius:13px;background:rgba(15,18,21,.98);box-shadow:0 18px 48px #0009;display:grid;gap:4px}
  .nvd-surface-menu[hidden]{display:none}
  .nvd-surface-menu button{display:grid;grid-template-columns:1fr;gap:2px;text-align:left;border:1px solid transparent;background:#171b1f;color:#edf0f2;border-radius:9px;padding:8px 9px;min-height:0}
  .nvd-surface-menu button:hover,.nvd-surface-menu button:focus-visible{border-color:#d7b86a;outline:none}
  .nvd-surface-menu button.active{border-color:#64706f;background:#20262a}
  .nvd-surface-menu b{font-size:12px}.nvd-surface-menu small{font-size:10px;color:#9ba4aa;font-weight:400}
  .nvd-surface-sep{height:1px;background:#2a3036;margin:3px 2px}
  @media(max-width:600px){.nvd-surface-toggle{padding:7px 9px!important}.nvd-surface-menu{width:min(260px,calc(100vw - 16px))}}
  `;
  document.head.appendChild(style);
}

export function installSurfaceSwitcher({current="designer",label="Interface"}={}){
  if(typeof document==="undefined"||document.getElementById("nvdSurfaceSwitcher")) return;
  injectStyle();
  const wrap=document.createElement("div");
  wrap.id="nvdSurfaceSwitcher";
  wrap.className="nvd-surface-switcher";
  const currentMeta=SURFACES.find(s=>s.id===current)||SURFACES[0];
  wrap.innerHTML=`
    <div class="nvd-surface-menu" hidden role="menu" aria-label="Choisir l’interface No-de"></div>
    <button type="button" class="nvd-surface-toggle" aria-expanded="false">${label} · ${currentMeta.label} ▾</button>
  `;
  const menu=wrap.querySelector(".nvd-surface-menu");
  for(const s of SURFACES){
    const b=document.createElement("button");
    b.type="button";b.dataset.surface=s.id;
    if(s.id===current)b.classList.add("active");
    b.innerHTML=`<b>${s.label}</b><small>${s.detail}</small>`;
    b.onclick=()=>{
      setPreferredSurface(s.id);
      navigateSurface(s.id);
    };
    menu.appendChild(b);
  }
  const sep=document.createElement("div");sep.className="nvd-surface-sep";menu.appendChild(sep);
  const auto=document.createElement("button");
  auto.type="button";auto.innerHTML="<b>Auto</b><small>Ordinateur → Designer · mobile/tablette → Mobile</small>";
  auto.onclick=()=>{setPreferredSurface("auto");navigateSurface("auto");};
  menu.appendChild(auto);

  const toggle=wrap.querySelector(".nvd-surface-toggle");
  const close=()=>{menu.hidden=true;toggle.setAttribute("aria-expanded","false");};
  toggle.onclick=(e)=>{
    e.stopPropagation();
    menu.hidden=!menu.hidden;
    toggle.setAttribute("aria-expanded",String(!menu.hidden));
  };
  document.addEventListener("click",(e)=>{if(!wrap.contains(e.target))close();});
  document.addEventListener("keydown",(e)=>{if(e.key==="Escape")close();});
  document.body.appendChild(wrap);
  queueMicrotask(()=>installUpdateNotice());
}


/** Compatibilité avec la variante 3.3 transitoire. */
export function getSurfaceList() {
  return [
    ...SURFACES.map(s => ({ id:s.id, label:s.label, url:"/" + s.path })),
    { id:"auto", label:"Auto", url:"/index.html?auto=1" }
  ];
}

export function getCurrentSurface(locationObj=globalThis.location) {
  const href=String(locationObj?.href||"");
  let explicit="";
  try { explicit=new URL(href || "https://local.invalid/").searchParams.get("surface") || ""; } catch {}
  if(explicit) return explicit;
  const path=String(locationObj?.pathname||href);
  if(path.includes("/show/")) return "show";
  if(path.includes("/mobile/")) return "mobile";
  if(path.includes("/companion/")) return "camera";
  if(path.includes("/studio/")) return "regie";
  if(path.includes("/desktop/")) return "designer";
  return "auto";
}
