/**
 * Join URL + QR payload for Remote Camera Companion.
 * Companion is served locally; public ONLINE URL is configured later — never invent.
 */

export function companionJoinUrl({ companionBase, room, token = "" } = {}) {
  if (!companionBase) throw new Error("companionBase requis");
  const base = companionBase.endsWith("/") ? companionBase : `${companionBase}/`;
  const url = new URL(base);
  url.searchParams.set("room", String(room || "").toUpperCase());
  if (token) url.searchParams.set("token", token);
  url.searchParams.set("mode", "remote-camera");
  return url.toString();
}

export function parseCompanionSearch(search = "") {
  const q = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  return {
    room: (q.get("room") || "").toUpperCase(),
    token: q.get("token") || "",
    mode: q.get("mode") || "remote-camera"
  };
}
