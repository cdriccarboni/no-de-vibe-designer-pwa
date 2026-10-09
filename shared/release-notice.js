const DEFAULT_NOTES = [
  "Identité visuelle No[co]de unifiée avec le logo rings sur le web, Desktop et Android.",
  "Installateur public et paquets natifs alignés sur la version 3.3.8.",
  "Connexion à l’IA locale Ollama fiabilisée depuis la PWA HTTPS."
];

export function releaseNoticeStorageKey(appName = "No[co]de Vibe Designer") {
  const slug = String(appName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug}.release-notice.last-seen.v1`;
}

export function shouldShowReleaseNotice({ seenVersion = "", currentVersion = "" } = {}) {
  return Boolean(currentVersion) && seenVersion !== currentVersion;
}

export function showReleaseNotice({ version = "", appName = "No[co]de Vibe Designer", notes = DEFAULT_NOTES } = {}) {
  if (!version || typeof document === "undefined") return null;
  const key = releaseNoticeStorageKey(appName);
  let seenVersion = "";
  try { seenVersion = localStorage.getItem(key) || ""; } catch { /* stockage indisponible */ }
  if (!shouldShowReleaseNotice({ seenVersion, currentVersion: version })) return null;

  const existing = document.getElementById("nvd-release-notice");
  if (existing) return existing;

  if (!document.getElementById("nvd-release-notice-style")) {
    const style = document.createElement("style");
    style.id = "nvd-release-notice-style";
    style.textContent = `
      #nvd-release-notice{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:10000;width:min(390px,calc(100vw - 32px));box-sizing:border-box;padding:14px;border:1px solid var(--line,#30363d);border-radius:14px;background:var(--panel,#11161a);color:var(--text,#eef1f2);box-shadow:0 18px 60px #000b;font:12px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      #nvd-release-notice .nvd-release-head{display:flex;gap:12px;align-items:flex-start}
      #nvd-release-notice .nvd-release-copy{flex:1;min-width:0}
      #nvd-release-notice strong{display:block;font-size:13px}
      #nvd-release-notice .nvd-release-sub{display:block;margin-top:4px;color:var(--muted,#8f989f)}
      #nvd-release-notice .nvd-release-details{margin-top:10px;padding-top:9px;border-top:1px solid var(--line,#30363d)}
      #nvd-release-notice .nvd-release-details[hidden]{display:none}
      #nvd-release-notice ul{margin:6px 0 0 18px;padding:0}
      #nvd-release-notice li{margin:5px 0}
      #nvd-release-notice .nvd-release-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:11px}
      #nvd-release-notice button{border:1px solid var(--line,#30363d);border-radius:8px;background:var(--panel2,#171d22);color:inherit;padding:7px 10px;cursor:pointer;font:inherit}
      #nvd-release-notice .nvd-release-install{display:inline-flex;align-items:center;text-decoration:none;border:1px solid var(--line,#30363d);border-radius:8px;background:var(--panel2,#171d22);color:inherit;padding:7px 10px;font:inherit}
      #nvd-release-notice button.primary{background:var(--accent,#d7b86a);border-color:var(--accent,#d7b86a);color:#14160f;font-weight:700}
      #nvd-release-notice .nvd-release-x{border:0;background:transparent;padding:0 3px;font-size:20px;line-height:1}
      body:has(.mobile-app) #nvd-release-notice{bottom:max(76px,calc(env(safe-area-inset-bottom) + 66px));width:min(390px,calc(100vw - 20px));right:10px}
      @media(max-width:600px){#nvd-release-notice{bottom:max(76px,calc(env(safe-area-inset-bottom) + 66px));width:min(390px,calc(100vw - 20px));right:10px}}
    `;
    document.head.appendChild(style);
  }

  const notice = document.createElement("aside");
  notice.id = "nvd-release-notice";
  notice.setAttribute("role", "status");
  notice.setAttribute("aria-live", "polite");
  notice.setAttribute("aria-label", "Mise à jour No-de");

  const head = document.createElement("div");
  head.className = "nvd-release-head";
  const copy = document.createElement("div");
  copy.className = "nvd-release-copy";
  const title = document.createElement("strong");
  title.textContent = `${appName} a été mis à jour — v${version}`;
  const sub = document.createElement("span");
  sub.className = "nvd-release-sub";
  sub.textContent = "Correctifs et améliorations sont disponibles.";
  copy.append(title, sub);

  const closeX = document.createElement("button");
  closeX.type = "button";
  closeX.className = "nvd-release-x";
  closeX.setAttribute("aria-label", "Fermer la notification de mise à jour");
  closeX.textContent = "×";
  head.append(copy, closeX);

  const details = document.createElement("div");
  details.className = "nvd-release-details";
  details.hidden = true;
  const detailsTitle = document.createElement("strong");
  detailsTitle.textContent = `Nouveautés ${version}`;
  const list = document.createElement("ul");
  for (const item of notes) {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  }
  details.append(detailsTitle, list);

  const actions = document.createElement("div");
  actions.className = "nvd-release-actions";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.textContent = "Voir les nouveautés";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "primary";
  close.textContent = "Fermer";
  const installerLink = document.createElement("a");
  installerLink.className = "nvd-release-install";
  installerLink.href = new URL("../install/", import.meta.url).href;
  installerLink.target = "_blank";
  installerLink.rel = "noopener noreferrer";
  installerLink.textContent = "Installer";
  actions.append(toggle, installerLink, close);

  const dismiss = () => {
    try { localStorage.setItem(key, version); } catch { /* stockage indisponible */ }
    notice.remove();
  };
  closeX.addEventListener("click", dismiss);
  close.addEventListener("click", dismiss);
  toggle.addEventListener("click", () => {
    details.hidden = !details.hidden;
    toggle.textContent = details.hidden ? "Voir les nouveautés" : "Masquer";
  });

  notice.append(head, details, actions);
  document.body.appendChild(notice);
  return notice;
}
