// No[co]de · Panneau « Conduite » : édition de la PRÉSENTATION des cues (cartouches).
// Séparation stricte présentation / exécution : ce module ne modifie jamais les cues, leurs IDs ni leurs actions.
// Il n'écrit que dans project.meta.cartouches (texte JSON versionné produit par cartouches.js).
// GO appelle simplement le callback `fire(cue)` fourni par l'hôte (mêmes chemins d'exécution que la barre de transport).
import { createCartoucheStore } from "./cartouches.js";
import { listCues } from "./cues.js";

const PROFILE = "conduite";
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
const PALETTE = ["#d96c6c", "#d99a4e", "#d6c95a", "#6fbf73", "#4fb3bf", "#5b8def", "#9a7be0", "#d472b8"];

// Stockage adossé au projet. Les présentations d'anciennes cues absentes (« orphelines ») sont conservées
// à l'écriture et ignorées à la lecture : supprimer puis recréer une cue ne détruit jamais son habillage.
export function createProjectCartoucheStorage(getProject, getIds, onSave) {
  return {
    getItem() {
      const raw = getProject().meta?.cartouches;
      if (!raw) return null;
      try {
        const value = JSON.parse(raw);
        const ids = getIds();
        const keep = {};
        for (const [id, patch] of Object.entries(value?.overrides || {})) if (ids.has(id)) keep[id] = patch;
        return JSON.stringify({ ...value, overrides: keep });
      } catch { return raw; } // laissé tel quel : la création du store signalera l'erreur sans rien effacer
    },
    setItem(_key, text) {
      const project = getProject();
      project.meta ||= {};
      const ids = getIds();
      const orphans = {};
      try {
        const old = JSON.parse(project.meta.cartouches || "null");
        for (const [id, patch] of Object.entries(old?.overrides || {})) if (!ids.has(id)) orphans[id] = patch;
      } catch { /* ancienne valeur illisible : remplacée par une valeur valide */ }
      const next = JSON.parse(text);
      next.overrides = { ...orphans, ...next.overrides };
      project.meta.cartouches = JSON.stringify(next);
      onSave?.();
    }
  };
}

function describeAction(action) {
  const bits = [action.type];
  if (action.nodeId) bits.push(action.nodeId + (action.key ? "." + action.key : ""));
  if (action.address) bits.push(action.address);
  if (action.value !== undefined && action.value !== null) bits.push("= " + String(action.value).slice(0, 40));
  return bits.join(" ");
}

export function mountConduitePanel(host, { getProject, fire, onSave, log = () => {}, download = defaultDownload } = {}) {
  let store = null;
  let signature = "";
  let notice = "";
  let filter = "all";
  let selection = new Set();
  let anchor = null;
  let dragId = null;

  const cuesNow = () => listCues(getProject());
  const idsNow = () => new Set(cuesNow().map(c => c.id));

  function ensureStore() {
    const cues = cuesNow();
    const idsSig = cues.map(c => c.id).join("|");
    if (store && signature === idsSig) return;
    signature = idsSig;
    const entries = cues.map(c => ({ id: c.id, label: c.label || c.id }));
    try {
      store = createCartoucheStore({ profile: PROFILE, entries, storage: createProjectCartoucheStorage(getProject, idsNow, onSave) });
      notice = "";
    } catch (error) {
      // Sauvegarde illisible : on affiche la présentation par défaut en mémoire, sans toucher à la sauvegarde existante.
      const memory = new Map();
      store = createCartoucheStore({ profile: PROFILE, entries, storage: { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) } });
      notice = `Présentation enregistrée illisible (${error.message}). Affichage par défaut ; la sauvegarde d'origine n'est pas modifiée. Toute modification faite ici reste temporaire.`;
    }
    selection = new Set([...selection].filter(id => entries.some(e => e.id === id)));
  }

  const cueById = id => cuesNow().find(c => c.id === id);

  function visibleList() {
    return store.list().filter(item => {
      if (filter === "fav") return item.favorite;
      if (filter.startsWith("group:")) return item.group === filter.slice(6);
      return true;
    });
  }

  function commit(fn, message, { keepAside = false } = {}) {
    try { fn(); } catch (error) { notice = error.message; render(); return; }
    notice = "";
    if (message) log(message);
    render({ keepAside });
  }

  function select(id, { toggle = false, range = false } = {}) {
    const order = visibleList().map(i => i.id);
    if (range && anchor && order.includes(anchor)) {
      const [a, b] = [order.indexOf(anchor), order.indexOf(id)].sort((x, y) => x - y);
      selection = new Set(order.slice(a, b + 1));
    } else if (toggle) {
      selection.has(id) ? selection.delete(id) : selection.add(id);
      anchor = id;
    } else { selection = new Set([id]); anchor = id; }
    render();
  }

  function move(ids, targetId, after = false) {
    const all = store.list().map(i => i.id);
    const moving = all.filter(id => ids.includes(id));
    const rest = all.filter(id => !ids.includes(id));
    let at = targetId == null ? rest.length : rest.indexOf(targetId);
    if (at < 0) at = rest.length;
    if (after) at += 1;
    rest.splice(at, 0, ...moving);
    commit(() => store.reorder(rest));
  }

  function step(id, delta) {
    const all = store.list().map(i => i.id);
    const i = all.indexOf(id), j = i + delta;
    if (i < 0 || j < 0 || j >= all.length) return;
    const next = all.slice(); next.splice(i, 1); next.splice(j, 0, id);
    commit(() => store.reorder(next));
  }

  function groups() { return [...new Set(store.list().map(i => i.group).filter(Boolean))].sort(); }

  function render({ keepAside = false } = {}) {
    ensureStore();
    const list = visibleList();
    const total = store.list().length;
    const sel = [...selection];
    const one = sel.length === 1 ? store.get(sel[0]) : null;
    const oneCue = one ? cueById(one.id) : null;
    const cueOf = id => cueById(id);
    const html = `
      <div class="cd-bar" role="toolbar" aria-label="Outils de conduite">
        <button type="button" data-act="undo" ${store.canUndo() ? "" : "disabled"} title="Annuler (Ctrl/Cmd+Z)">↶ Annuler</button>
        <button type="button" data-act="redo" ${store.canRedo() ? "" : "disabled"} title="Rétablir (Ctrl/Cmd+Maj+Z)">↷ Rétablir</button>
        <select data-act="filter" aria-label="Filtre">
          <option value="all"${filter === "all" ? " selected" : ""}>Toutes (${total})</option>
          <option value="fav"${filter === "fav" ? " selected" : ""}>★ Favoris</option>
          ${groups().map(g => `<option value="group:${esc(g)}"${filter === "group:" + g ? " selected" : ""}>Groupe · ${esc(g)}</option>`).join("")}
        </select>
        <span class="cd-sp"></span>
        <button type="button" data-act="export">Exporter</button>
        <label class="cd-file">Importer<input type="file" accept="application/json,.json" data-act="import" hidden></label>
      </div>
      ${notice ? `<p class="cd-notice" role="alert">${esc(notice)}</p>` : ""}
      <div class="cd-body">
        <ol class="cd-list" role="listbox" aria-multiselectable="true" aria-label="Cartouches de la conduite">
          ${list.length ? list.map(item => {
            const cue = cueOf(item.id);
            const selected = selection.has(item.id);
            return `<li class="cd-row${selected ? " selected" : ""}" draggable="true" role="option" aria-selected="${selected}" tabindex="0" data-id="${esc(item.id)}" style="--cd:${esc(item.color || "transparent")}">
              <span class="cd-grip" aria-hidden="true">⠿</span>
              <span class="cd-num">${esc(cue?.number ?? "")}</span>
              <span class="cd-label">${esc(item.label)}</span>
              ${item.page ? `<span class="cd-page" title="Page">p.${esc(item.page)}</span>` : ""}
              ${item.group ? `<span class="cd-group">${esc(item.group)}</span>` : ""}
              ${item.notes ? `<span class="cd-note" title="${esc(item.notes)}">✎</span>` : ""}
              <button type="button" class="cd-fav${item.favorite ? " on" : ""}" data-act="fav" aria-pressed="${item.favorite}" title="Favori">${item.favorite ? "★" : "☆"}</button>
              <button type="button" data-act="up" title="Monter (Alt+↑)" aria-label="Monter">▲</button>
              <button type="button" data-act="down" title="Descendre (Alt+↓)" aria-label="Descendre">▼</button>
              <button type="button" class="cd-go" data-act="go" title="Déclencher cette cue">GO</button>
            </li>`;
          }).join("") : `<li class="cd-empty">${total ? "Aucune cartouche dans ce filtre." : "Aucune cue dans le projet. Ajoute un layer Cue dans la timeline."}</li>`}
        </ol>
        <aside class="cd-edit" aria-label="Propriétés">
          ${one ? `
            <h4>${esc(one.label)}</h4>
            <label>Libellé<input data-field="label" maxlength="2000" value="${esc(one.label)}"></label>
            <label>Page<input data-field="page" maxlength="2000" value="${esc(one.page)}"></label>
            <label>Groupe<input data-field="group" maxlength="2000" list="cdGroups" value="${esc(one.group)}"><datalist id="cdGroups">${groups().map(g => `<option value="${esc(g)}">`).join("")}</datalist></label>
            <label>Notes<textarea data-field="notes" maxlength="2000" rows="3">${esc(one.notes)}</textarea></label>
            <div class="cd-colors" role="group" aria-label="Couleur">
              ${PALETTE.map(c => `<button type="button" class="cd-sw${one.color === c ? " on" : ""}" data-color="${c}" style="background:${c}" aria-label="Couleur ${c}"></button>`).join("")}
              <button type="button" class="cd-sw none${one.color === "" ? " on" : ""}" data-color="" aria-label="Sans couleur">∅</button>
            </div>
            <fieldset class="cd-preview"><legend>Aperçu (lecture seule)</legend>
              <p>Cue ${esc(oneCue?.number ?? "")} · t = ${esc(oneCue?.time ?? 0)} s · ${esc(oneCue?.continueMode ?? "manual")}</p>
              ${(oneCue?.actions || []).length ? `<ul>${oneCue.actions.map(a => `<li>${esc(describeAction(a))}</li>`).join("")}</ul>` : "<p class=\"cd-dim\">Aucune action : saut à l'instant de la cue.</p>"}
              <p class="cd-dim">ID : <code>${esc(one.id)}</code> (jamais modifié par la présentation)</p>
            </fieldset>
            <button type="button" data-act="reset-one">Rétablir la présentation d'origine</button>
          ` : sel.length > 1 ? `
            <h4>${sel.length} cartouches</h4>
            <label>Groupe<input data-multi="group" list="cdGroups" placeholder="Nom du groupe"></label>
            <div class="cd-colors" role="group" aria-label="Couleur de la sélection">
              ${PALETTE.map(c => `<button type="button" class="cd-sw" data-multicolor="${c}" style="background:${c}" aria-label="Couleur ${c}"></button>`).join("")}
              <button type="button" class="cd-sw none" data-multicolor="" aria-label="Sans couleur">∅</button>
            </div>
            <button type="button" data-act="multi-fav">★ Mettre en favori</button>
            <button type="button" data-act="multi-unfav">☆ Retirer des favoris</button>
          ` : `<p class="cd-dim">Sélectionne une cartouche (Maj/Ctrl pour plusieurs). Glisse-dépose ou Alt+↑/↓ pour réordonner.</p>`}
        </aside>
      </div>`;
    if (!keepAside || !host.querySelector(".cd-edit")) { host.innerHTML = html; return; }
    // Édition en cours : on ne remplace pas le panneau de propriétés (garde le focus et la saisie, Tab fonctionne).
    const tpl = document.createElement("template"); tpl.innerHTML = html;
    for (const sel of [".cd-bar", ".cd-list"]) host.querySelector(sel).replaceWith(tpl.content.querySelector(sel));
    const oldNotice = host.querySelector(".cd-notice"), newNotice = tpl.content.querySelector(".cd-notice");
    if (oldNotice && newNotice) oldNotice.replaceWith(newNotice); else if (oldNotice) oldNotice.remove(); else if (newNotice) host.querySelector(".cd-bar").after(newNotice);
    const h = host.querySelector(".cd-edit h4"); if (h && sel.length === 1) h.textContent = store.get(sel[0]).label;
  }

  host.addEventListener("click", event => {
    const el = event.target.closest("[data-act],[data-color],[data-multicolor],.cd-row");
    if (!el || !host.contains(el)) return;
    const row = event.target.closest(".cd-row");
    const id = row?.dataset.id;
    const act = el.dataset.act;
    if (el.dataset.color !== undefined && !act) return commit(() => store.update([...selection][0], { color: el.dataset.color }));
    if (el.dataset.multicolor !== undefined) return commit(() => store.updateMany([...selection], { color: el.dataset.multicolor }));
    switch (act) {
      case "undo": return commit(() => store.undo());
      case "redo": return commit(() => store.redo());
      case "export": {
        download("conduite-presentation.json", store.export());
        return;
      }
      case "fav": return commit(() => store.update(id, { favorite: !store.get(id).favorite }));
      case "up": return step(id, -1);
      case "down": return step(id, 1);
      case "go": { const cue = cueById(id); if (cue) fire(cue); return; }
      case "multi-fav": return commit(() => store.updateMany([...selection], { favorite: true }));
      case "multi-unfav": return commit(() => store.updateMany([...selection], { favorite: false }));
      case "reset-one": return commit(() => store.reset([...selection][0]));
      default:
        if (row) select(id, { toggle: event.ctrlKey || event.metaKey, range: event.shiftKey });
    }
  });

  host.addEventListener("change", event => {
    const t = event.target;
    if (t.dataset.act === "filter") { filter = t.value; return render(); }
    if (t.dataset.act === "import") {
      const file = t.files?.[0]; if (!file) return;
      file.text().then(text => commit(() => store.import(text), "Conduite · présentation importée")).catch(error => { notice = error.message; render(); });
      t.value = ""; return;
    }
    if (t.dataset.field && selection.size === 1) return commit(() => store.update([...selection][0], { [t.dataset.field]: t.value }), null, { keepAside: true });
    if (t.dataset.multi === "group") return commit(() => store.updateMany([...selection], { group: t.value }));
  });

  host.addEventListener("keydown", event => {
    const row = event.target.closest?.(".cd-row");
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !/INPUT|TEXTAREA/.test(event.target.tagName)) {
      event.preventDefault(); return commit(() => (event.shiftKey ? store.redo() : store.undo()));
    }
    if (!row) return;
    if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault(); step(row.dataset.id, event.key === "ArrowUp" ? -1 : 1);
      host.querySelector(`.cd-row[data-id="${CSS.escape(row.dataset.id)}"]`)?.focus();
    } else if (event.key === " " || event.key === "Enter") {
      if (event.target === row) { event.preventDefault(); select(row.dataset.id, { toggle: event.ctrlKey || event.metaKey }); }
    }
  });

  host.addEventListener("dragstart", event => {
    const row = event.target.closest?.(".cd-row"); if (!row) return;
    dragId = row.dataset.id;
    if (!selection.has(dragId)) { selection = new Set([dragId]); }
    event.dataTransfer?.setData("text/plain", dragId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  });
  host.addEventListener("dragover", event => { if (dragId && event.target.closest?.(".cd-row")) event.preventDefault(); });
  host.addEventListener("drop", event => {
    const row = event.target.closest?.(".cd-row"); if (!row || !dragId) return;
    event.preventDefault();
    const rect = row.getBoundingClientRect();
    const after = event.clientY > rect.top + rect.height / 2;
    const ids = selection.has(dragId) ? [...selection] : [dragId];
    dragId = null;
    if (ids.includes(row.dataset.id)) return render();
    move(ids, row.dataset.id, after);
  });
  host.addEventListener("dragend", () => { dragId = null; });

  render();
  return { render, getStore: () => store, select: id => select(id) };
}

function defaultDownload(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
