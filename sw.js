/**
 * Service worker de la PWA.
 * Le build injecte le nom de cache et la liste des fichiers.
 * Une mise à jour reste en attente tant que la page n'envoie pas SKIP_WAITING.
 */
const CACHE = "nvd-1.3.0";
const ASSETS = [
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./index.html",
  "./manifest.webmanifest",
  "./manuel/captures/patch-camera-shader.svg",
  "./manuel/captures/ui-overview.svg",
  "./manuel/index.html",
  "./mobile.css",
  "./mobile.js",
  "./shared/adapters/midi-learn.js",
  "./shared/adapters/midi.js",
  "./shared/adapters/serial.js",
  "./shared/adapters/shader-surface.js",
  "./shared/adapters/websocket-bridge.js",
  "./shared/audio-engine.js",
  "./shared/companion-studio/bindings.js",
  "./shared/companion-studio/console-profiles.js",
  "./shared/companion-studio/detect.js",
  "./shared/companion-studio/layout-generator.js",
  "./shared/companion-studio/protocol.js",
  "./shared/companion-studio/regie-presets.js",
  "./shared/companion-studio/schema.js",
  "./shared/companion-studio/store.js",
  "./shared/companion-studio/transport-ws.js",
  "./shared/companion-studio/transport.js",
  "./shared/companion-studio/widgets.js",
  "./shared/connection-states.js",
  "./shared/demos.js",
  "./shared/device-manager.js",
  "./shared/diagnostic.js",
  "./shared/discovery/host-card.js",
  "./shared/discovery/lan-beacon.js",
  "./shared/discovery/registry.js",
  "./shared/exporters.js",
  "./shared/graph-engine.js",
  "./shared/graphics/blackhole.js",
  "./shared/graphics/blob.js",
  "./shared/graphics/composite.js",
  "./shared/graphics/frame-utils.js",
  "./shared/graphics/interactive-effects.js",
  "./shared/graphics/living-shadow.js",
  "./shared/graphics/pass-graph.js",
  "./shared/graphics/shadow.js",
  "./shared/graphics/sketch-engine.js",
  "./shared/graphics/stage-fx.js",
  "./shared/graphics/transform.js",
  "./shared/graphics/webgl2.js",
  "./shared/graphics/whale.js",
  "./shared/history.js",
  "./shared/ir.js",
  "./shared/local-ai-core.js",
  "./shared/media-status.js",
  "./shared/mobile-sensors.js",
  "./shared/node-processors.js",
  "./shared/node-specs.js",
  "./shared/ports.js",
  "./shared/project-migrate.js",
  "./shared/project-store.js",
  "./shared/protocols/artnet.js",
  "./shared/protocols/osc.js",
  "./shared/protocols/sacn.js",
  "./shared/pwa-update.js",
  "./shared/remote-camera/camera.js",
  "./shared/remote-camera/capability.js",
  "./shared/remote-camera/local-returns.js",
  "./shared/remote-camera/metrics.js",
  "./shared/remote-camera/ndi.js",
  "./shared/remote-camera/session.js",
  "./shared/remote-camera/states.js",
  "./shared/remote-camera/url.js",
  "./shared/remote-client.js",
  "./shared/remote-protocol.js",
  "./shared/routing.js",
  "./shared/runtime.js",
  "./shared/save-fallback.js",
  "./shared/self-test.js",
  "./shared/sensor-bus.js",
  "./shared/session-recovery.js",
  "./shared/session-store.js",
  "./shared/show-importer.js",
  "./shared/stage/cues.js",
  "./shared/subpatch.js",
  "./shared/version.js",
  "./shared/vibe-planner.js",
  "./shared/vibe-safety.js",
  "./shared/vibe.js"
];

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
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch {
        return (await caches.match("./index.html")) || (await caches.match(req)) || new Response("Hors ligne", { status: 503 });
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
