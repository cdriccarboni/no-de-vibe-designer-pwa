import { APP_NAME, APP_VERSION, RELEASE_NOTES } from "./version.js";

const SEEN_KEY = "nvd.update.lastSeen";
const LATER_KEY = "nvd.update.later";

function injectUpdateStyle(){
  if(document.getElementById("nvdUpdateStyle")) return;
  const style=document.createElement("style");
  style.id="nvdUpdateStyle";
  style.textContent=`
  .nvd-update-backdrop{position:fixed;inset:0;z-index:2147483500;display:grid;place-items:center;padding:18px;background:rgba(3,5,7,.72);backdrop-filter:blur(8px)}
  .nvd-update-card{position:relative;width:min(520px,100%);overflow:hidden;border:1px solid #5f5437;border-radius:16px;background:linear-gradient(145deg,#171b1f,#101316 72%);color:#f1f3f5;box-shadow:0 28px 90px #000c;font:13px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  .nvd-update-card::after{content:"";position:absolute;right:-80px;top:-100px;width:250px;height:250px;border-radius:50%;border:1px solid #d7b86a22;box-shadow:0 0 0 38px #8fa79d0b,0 0 0 76px #d7b86a08;pointer-events:none}
  .nvd-update-head{position:relative;z-index:1;padding:18px 19px 10px}.nvd-update-kicker{display:flex;align-items:center;gap:7px;color:#d7b86a;font-size:9px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}
  .nvd-update-kicker i{width:7px;height:7px;border-radius:50%;background:#d7b86a;box-shadow:0 0 14px #d7b86a99}.nvd-update-card h2{margin:8px 0 5px;font-size:25px;letter-spacing:-.03em}.nvd-update-version{color:#8fa79d;font-weight:800}
  .nvd-update-card p{margin:0;color:#9ba4ae;font-size:12px}.nvd-update-notes{position:relative;z-index:1;margin:12px 19px 5px;padding:12px 14px;border:1px solid #2d333b;border-radius:11px;background:#0d1013}
  .nvd-update-notes ul{margin:0;padding-left:18px}.nvd-update-notes li{margin:6px 0;color:#c7cdd2;font-size:11px}.nvd-update-actions{position:relative;z-index:1;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;padding:14px 19px 18px}
  .nvd-update-actions button,.nvd-update-actions a{border:1px solid #3c444c;border-radius:8px;min-height:36px;padding:0 11px;background:#20262b;color:#eef1f3;font:700 11px/1 Inter,ui-sans-serif,system-ui;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
  .nvd-update-actions .primary{border-color:#7b6a3e;background:#292316;color:#f0d88d}.nvd-update-actions .later{background:transparent;color:#9ba4ae}.nvd-update-close{position:absolute;z-index:3;right:10px;top:10px;width:30px;height:30px;border:0!important;background:transparent!important;color:#7f8991!important;font-size:20px!important;cursor:pointer}
  @media(max-width:560px){.nvd-update-backdrop{align-items:end;padding:10px}.nvd-update-card{border-radius:16px 16px 10px 10px}.nvd-update-card h2{font-size:21px}.nvd-update-actions{display:grid;grid-template-columns:1fr 1fr}.nvd-update-actions .primary{grid-column:1/-1;order:-1}}
  `;
  document.head.appendChild(style);
}

function safeGet(storage,key){try{return storage?.getItem?.(key)||""}catch{return ""}}
function safeSet(storage,key,value){try{storage?.setItem?.(key,value)}catch{}}

export function installUpdateNotice({force=false}={}){
  if(typeof document==="undefined"||document.getElementById("nvdUpdateNotice")) return;
  const seen=safeGet(globalThis.localStorage,SEEN_KEY);
  const later=safeGet(globalThis.sessionStorage,LATER_KEY);
  if(!force&&(seen===APP_VERSION||later===APP_VERSION)) return;
  injectUpdateStyle();
  const installer=new URL("../install/",import.meta.url);
  const platform=String(globalThis.navigator?.platform||globalThis.navigator?.userAgent||"").toLowerCase();
  if(/mac/.test(platform)) installer.hash="macos";
  const wrap=document.createElement("div");
  wrap.id="nvdUpdateNotice";
  wrap.className="nvd-update-backdrop";
  wrap.setAttribute("role","dialog");
  wrap.setAttribute("aria-modal","true");
  wrap.setAttribute("aria-label",`Mise à jour ${APP_NAME} ${APP_VERSION}`);
  const notes=(RELEASE_NOTES||[]).map(note=>`<li>${String(note).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}</li>`).join("");
  wrap.innerHTML=`
    <div class="nvd-update-card">
      <button class="nvd-update-close" type="button" aria-label="Fermer">×</button>
      <div class="nvd-update-head">
        <div class="nvd-update-kicker"><i></i> MISE À JOUR NO[CO]DE</div>
        <h2>Nouvelle version <span class="nvd-update-version">v${APP_VERSION}</span></h2>
        <p>Le cœur No[co]de vient d’être mis à jour. Cette version est commune aux différentes plateformes.</p>
      </div>
      <div class="nvd-update-notes"><ul>${notes}</ul></div>
      <div class="nvd-update-actions">
        <button class="later" type="button" data-update-later>Plus tard</button>
        <button type="button" data-update-seen>C’est noté</button>
        <a class="primary" data-update-install href="${installer.href}">Voir / installer la mise à jour →</a>
      </div>
    </div>`;
  const closeSeen=()=>{safeSet(globalThis.localStorage,SEEN_KEY,APP_VERSION);wrap.remove();};
  wrap.querySelector(".nvd-update-close").onclick=closeSeen;
  wrap.querySelector("[data-update-seen]").onclick=closeSeen;
  wrap.querySelector("[data-update-later]").onclick=()=>{safeSet(globalThis.sessionStorage,LATER_KEY,APP_VERSION);wrap.remove();};
  wrap.querySelector("[data-update-install]").onclick=()=>safeSet(globalThis.localStorage,SEEN_KEY,APP_VERSION);
  document.body.appendChild(wrap);
}
