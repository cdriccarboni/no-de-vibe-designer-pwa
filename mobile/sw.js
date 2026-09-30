/**
 * Service worker de la PWA.
 * Le build injecte le nom de cache et la liste des fichiers.
 * Une mise à jour reste en attente tant que la page n'envoie pas SKIP_WAITING.
 */
const CACHE = "__CACHE__";
const ASSETS = __ASSETS__;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await fetch(req);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const direct = await cache.match(req);
        if (direct) return direct;
        const fallbackUrl = new URL(req.url);
        if (fallbackUrl.pathname.endsWith("/")) fallbackUrl.pathname += "index.html";
        return (await cache.match(fallbackUrl.href))
          || (await cache.match("./index.html"))
          || new Response("Hors ligne", { status: 503 });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE);
    cache.put(req, fresh.clone());
    return fresh;
  })());
});
