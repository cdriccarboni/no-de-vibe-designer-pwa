/**
 * Liens vers des modules optionnels (labs, builds séparés) : masqués par défaut,
 * affichés seulement si la cible existe réellement sur ce déploiement.
 * Évite les liens morts (404) quand un lab n'est pas publié.
 *   <a href="…" data-optional-link hidden>…</a>
 */
export async function revealOptionalLinks(root = document) {
  const links = [...root.querySelectorAll("a[data-optional-link]")];
  await Promise.all(links.map(async (a) => {
    try {
      const res = await fetch(a.href, { method: "HEAD", cache: "no-store" });
      if (res.ok) a.hidden = false;
    } catch {
      /* hors ligne ou cible absente : le lien reste masqué */
    }
  }));
}

if (typeof document !== "undefined") {
  // Les classes de carte (display:flex…) l'emportent sur l'attribut hidden : on le force.
  const style = document.createElement("style");
  style.textContent = "a[data-optional-link][hidden]{display:none!important}";
  document.head.append(style);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => revealOptionalLinks());
  else revealOptionalLinks();
}
