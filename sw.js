/**
 * Service worker de la PWA.
 * Le build injecte le nom de cache et la liste des fichiers.
 * Une mise à jour reste en attente tant que la page n'envoie pas SKIP_WAITING.
 */
const CACHE = "nvd-3.3.8-multi-f38eed1a54";
const ASSETS = [
  "./companion/companion.css",
  "./companion/companion.js",
  "./companion/index.html",
  "./desktop/app.js",
  "./desktop/float-panels.js",
  "./desktop/index.html",
  "./desktop/index.html.bak-about",
  "./desktop/manifest.webmanifest",
  "./desktop/mark.svg",
  "./desktop/output.html",
  "./desktop/shortcuts.html",
  "./desktop/splash.html",
  "./desktop/styles.css",
  "./desktop/vibe-designer-mark.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/nocode-rings.svg",
  "./index.html",
  "./install/index.html",
  "./manifest.webmanifest",
  "./manuel/captures/patch-camera-shader.svg",
  "./manuel/captures/ui-overview.svg",
  "./manuel/index.html",
  "./mobile/README_ANDROID.md",
  "./mobile/icons/icon-192.png",
  "./mobile/icons/icon-512.png",
  "./mobile/icons/icon-maskable-192.png",
  "./mobile/icons/icon-maskable-512.png",
  "./mobile/icons/nocode-rings.svg",
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
  "./shared/agent-registry.js",
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
  "./shared/companion-studio/show-layout.js",
  "./shared/companion-studio/store.js",
  "./shared/companion-studio/transport-ws.js",
  "./shared/companion-studio/transport.js",
  "./shared/companion-studio/widgets.js",
  "./shared/composition.js",
  "./shared/connection-states.js",
  "./shared/creator-session.js",
  "./shared/cx-source.js",
  "./shared/demos.js",
  "./shared/device-manager.js",
  "./shared/diagnostic.js",
  "./shared/discovery/host-card.js",
  "./shared/discovery/lan-beacon.js",
  "./shared/discovery/registry.js",
  "./shared/engine-downloads.js",
  "./shared/exporters.js",
  "./shared/foundation-status.js",
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
  "./shared/isf-agent.js",
  "./shared/libpd-runtime.js",
  "./shared/live-title-broadcast.js",
  "./shared/local-agent-registry.js",
  "./shared/local-ai-core.js",
  "./shared/local-ai-diagnostic.js",
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
  "./shared/release-notice.js",
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
  "./shared/show-elements.js",
  "./shared/show-importer.js",
  "./shared/show-session.js",
  "./shared/stage/cues.js",
  "./shared/subpatch.js",
  "./shared/supernodes-v3.js",
  "./shared/surface-switcher.js",
  "./shared/vendor/libpd/LICENSE.txt",
  "./shared/vendor/libpd/libpd.js",
  "./shared/vendor/libpd/libpd.wasm",
  "./shared/version.js",
  "./shared/vibe-out.js",
  "./shared/vibe-planner.js",
  "./shared/vibe-safety.js",
  "./shared/vibe.js",
  "./show/index.html",
  "./show/shader-preview.png",
  "./show/show.css",
  "./show/show.js",
  "./src/audio/SoundBoard.js",
  "./src/core/AppleFoundationModels.js",
  "./src/core/AppleVisionBridge.js",
  "./src/core/AssetBundler.js",
  "./src/core/AssetBundler.ts",
  "./src/core/ChromaKeyProcessor.js",
  "./src/core/CueManager.ts",
  "./src/core/DAGEngine.ts",
  "./src/core/DepthUniversal.js",
  "./src/core/FeedbackEngine.js",
  "./src/core/IOMatrix.ts",
  "./src/core/PerformanceMonitor.js",
  "./src/core/RenderRecorder.js",
  "./src/core/StageSafety.js",
  "./src/core/TechSheetGenerator.js",
  "./src/core/TechSheetGenerator.ts",
  "./src/core/agents/CppCsAgent.js",
  "./src/ux/CanvasPan.js",
  "./src/ux/DancingDraw.js",
  "./src/ux/LivingData.js",
  "./src/ux/ReactiveGlitter.js",
  "./studio/index.html",
  "./studio/studio.css",
  "./studio/studio.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    await self.skipWaiting();
  })());
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
        // A navigation can carry a surface/query parameter while the precache
        // deliberately stores the canonical HTML URL. Match that page first;
        // otherwise the root router is served at a nested URL and repeats its
        // relative redirect (for example /desktop/desktop/index.html).
        const direct = await cache.match(req, { ignoreSearch:true });
        if (direct) return direct;
        const fallbackUrl = new URL(req.url);
        if (fallbackUrl.pathname.endsWith("/")) fallbackUrl.pathname += "index.html";
        return (await cache.match(fallbackUrl.href, { ignoreSearch:true }))
          || (await cache.match("./index.html", { ignoreSearch:true }))
          || new Response("Hors ligne", { status: 503 });
      }
    })());
    return;
  }

  const critical = req.destination === "script"
    || req.destination === "style"
    || url.pathname.endsWith(".json")
    || url.pathname.endsWith(".webmanifest");

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (critical) {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await cache.match(req);
        if (cached) return cached;
        return new Response("Hors ligne", { status: 503 });
      }
    }

    const cached = await cache.match(req);
    if (cached) return cached;
    const fresh = await fetch(req);
    cache.put(req, fresh.clone());
    return fresh;
  })());
});
