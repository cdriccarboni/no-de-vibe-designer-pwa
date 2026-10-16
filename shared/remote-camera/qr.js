/**
 * QR code réel (SVG) pour rejoindre un salon Remote Camera depuis un téléphone.
 * Encodeur : qrcode-generator (MIT), vendu localement → fonctionne hors ligne.
 */
import qrcode from "../vendor/qrcode/qrcode-generator.js";

/** Retourne un SVG (chaîne) du QR code de `text`. */
export function qrSvg(text, { cellSize = 5, margin = 4, label = "QR code" } = {}) {
  const qr = qrcode(0, "M");
  qr.addData(String(text));
  qr.make();
  const n = qr.getModuleCount(), size = (n + margin * 2) * cellSize;
  let path = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (qr.isDark(r, c)) path += `M${(c + margin) * cellSize} ${(r + margin) * cellSize}h${cellSize}v${cellSize}h-${cellSize}z`;
  }
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${esc(label)}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}

/**
 * Adresse du Companion à donner au téléphone : celle mémorisée, sinon la page /companion/
 * du déploiement courant si elle est joignable depuis un autre appareil (HTTPS, pas localhost).
 * Retourne { base, reachable, reason }.
 */
export function defaultCompanionBase(stored, here = (typeof location !== "undefined" ? location.href : "")) {
  if (stored) return { base: stored, reachable: !/\/\/(127\.0\.0\.1|localhost)[:/]/.test(stored), reason: "adresse mémorisée" };
  try {
    const u = new URL("../companion/", here);
    const local = /^(127\.0\.0\.1|localhost|\[::1\])$/.test(u.hostname);
    if (/^https:$/.test(u.protocol) && !local) return { base: u.href, reachable: true, reason: "page Companion de ce déploiement (HTTPS)" };
    if (/^https?:$/.test(u.protocol) && !local) return { base: u.href, reachable: true, reason: "page Companion de ce déploiement (HTTP : caméra du téléphone peut être refusée)" };
  } catch { /* contexte sans URL exploitable */ }
  return { base: "http://127.0.0.1:4177/", reachable: false, reason: "aucune adresse joignable par le téléphone : renseigner l’adresse LAN du Companion" };
}
