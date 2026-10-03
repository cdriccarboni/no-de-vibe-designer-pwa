/**
 * Service worker de la PWA.
 * Le build injecte le nom de cache et la liste des fichiers.
 * Une mise à jour reste en attente tant que la page n'envoie pas SKIP_WAITING.
 */
const CACHE = "nvd-3.2.0-multi-6f18c6bf58";
const ASSETS = [
  "./companion/companion.css",
  "./companion/companion.js",
  "./companion/index.html",
  "./desktop/app.js",
  "./desktop/float-panels.js",
  "./desktop/index.html",
  "./desktop/manifest.webmanifest",
  "./desktop/output.html",
  "./desktop/styles.css",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./index.html",
  "./manifest.webmanifest",
  "./manuel/captures/patch-camera-shader.svg",
  "./manuel/captures/ui-overview.svg",
  "./manuel/index.html",
  "./mobile/README_ANDROID.md",
  "./mobile/icons/icon-192.png",
  "./mobile/icons/icon-512.png",
  "./mobile/icons/icon-maskable-192.png",
  "./mobile/icons/icon-maskable-512.png",
  "./mobile/index.html",
  "./mobile/manifest.webmanifest",
  "./mobile/mobile.css",
  "./mobile/mobile.js",
  "./shared/action-intents.js",
  "./shared/adapters/midi-learn.js",
  "./shared/adapters/midi.js",
  "./shared/adapters/serial.js",
  "./shared/adapters/shader-surface.js",
  "./shared/adapters/websocket-bridge.js",
  "./shared/audio-engine.js",
  "./shared/backend-registry.js",
  "./shared/backend-status.js",
  "./shared/backend-status.json",
  "./shared/companion-studio/bindings.js",
  "./shared/companion-studio/console-profiles.js",
  "./shared/companion-studio/detect.js",
  "./shared/companion-studio/layout-generator.js",
  "./shared/companion-studio/photo-controller.js",
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
  "./shared/graphics/engine-v3.js",
  "./shared/graphics/frame-utils.js",
  "./shared/graphics/interactive-effects.js",
  "./shared/graphics/living-shadow.js",
  "./shared/graphics/mapping-v3.js",
  "./shared/graphics/pass-graph.js",
  "./shared/graphics/shadow.js",
  "./shared/graphics/sketch-engine.js",
  "./shared/graphics/stage-fx.js",
  "./shared/graphics/transform.js",
  "./shared/graphics/webgl2.js",
  "./shared/graphics/webgpu-v3.js",
  "./shared/graphics/whale.js",
  "./shared/history.js",
  "./shared/image-vibe.js",
  "./shared/ir.js",
  "./shared/local-agent-registry.js",
  "./shared/local-ai-core.js",
  "./shared/media-status.js",
  "./shared/ml-runtime.js",
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
  "./shared/quick-map.js",
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
  "./shared/rudiments.js",
  "./shared/runtime.js",
  "./shared/save-fallback.js",
  "./shared/self-test.js",
  "./shared/sensor-bus.js",
  "./shared/session-recovery.js",
  "./shared/session-store.js",
  "./shared/shader-agent.js",
  "./shared/show-importer.js",
  "./shared/show-session.js",
  "./shared/stage/cues.js",
  "./shared/subpatch.js",
  "./shared/supernodes-v3.js",
  "./shared/surface-switcher.js",
  "./shared/version.js",
  "./shared/vibe-out.js",
  "./shared/vibe-planner.js",
  "./shared/vibe-safety.js",
  "./shared/vibe.js",
  "./show/index.html",
  "./show/shader-preview.png",
  "./show/show.css",
  "./show/show.js",
  "./studio/index.html",
  "./studio/studio.css",
  "./studio/studio.js"
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
