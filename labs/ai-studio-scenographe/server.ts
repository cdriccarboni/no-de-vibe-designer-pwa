import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import http from 'http';
import path from 'path';
import fs from 'fs';

interface RadioChannel {
  id: string;
  name: string;
  slug: string;
  isLive: boolean;
  isTesting: boolean;
  startedAt: number | null;
  mimeType: string;
  headerChunk: Buffer | null;
  recentChunks: Buffer[];
  listeners: Set<Response>;
  totalBytesBroadcast: number;
}

const channels = new Map<string, RadioChannel>();

function getOrCreateChannel(slug: string, name?: string): RadioChannel {
  const normalizedSlug = slug.toLowerCase().replace(/^\/+/, '');
  let ch = channels.get(normalizedSlug);
  if (!ch) {
    let defaultName = 'Radio Direct';
    if (normalizedSlug.includes('paillette')) {
      defaultName = 'Radio Paillettes en grève';
    } else if (normalizedSlug.includes('pirate')) {
      defaultName = 'Radio Pirate des Caraïbes';
    } else if (name) {
      defaultName = name;
    }

    ch = {
      id: normalizedSlug,
      name: defaultName,
      slug: normalizedSlug,
      isLive: false,
      isTesting: false,
      startedAt: null,
      mimeType: 'audio/webm;codecs=opus',
      headerChunk: null,
      recentChunks: [],
      listeners: new Set<Response>(),
      totalBytesBroadcast: 0,
    };
    channels.set(normalizedSlug, ch);
  } else if (name && ch.name !== name) {
    ch.name = name;
  }
  return ch;
}

// Pre-initialize default show channels
getOrCreateChannel('radio-paillettes', 'Radio Paillettes en grève');
getOrCreateChannel('radio-pirate', 'Radio Pirate des Caraïbes');
getOrCreateChannel('radio', 'Radio Live No[co]de');

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Parse raw body for binary audio broadcast chunks up to 50MB
  app.use(
    '/api/radio/broadcast',
    express.raw({
      type: '*/*',
      limit: '50mb',
    })
  );

  app.use(express.json());

  // -------------------------------------------------------------
  // RADIO API ROUTES
  // -------------------------------------------------------------

  // Health check
  app.get('/api/radio/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'No[co]de Radio Broadcast Server',
      timestamp: Date.now(),
      activeChannels: channels.size,
    });
  });

  // Get all configured channels
  app.get('/api/radio/channels', (_req: Request, res: Response) => {
    const list = Array.from(channels.values()).map((ch) => ({
      id: ch.id,
      slug: ch.slug,
      name: ch.name,
      isLive: ch.isLive,
      isTesting: ch.isTesting,
      listenersCount: ch.listeners.size,
      startedAt: ch.startedAt,
      totalBytes: ch.totalBytesBroadcast,
    }));
    res.json({ channels: list });
  });

  // Get status of a specific channel (auto-creates if requested)
  app.get('/api/radio/status/:slug', (req: Request, res: Response) => {
    const slug = req.params.slug.toLowerCase().replace(/^\/+/, '');
    const ch = getOrCreateChannel(slug);

    res.json({
      exists: true,
      slug: ch.slug,
      name: ch.name,
      isLive: ch.isLive,
      isTesting: ch.isTesting,
      listenersCount: ch.listeners.size,
      startedAt: ch.startedAt,
      mimeType: ch.mimeType,
      totalBytes: ch.totalBytesBroadcast,
    });
  });

  // CMS Pages Spectacle ART List
  let cmsPagesBackup: Array<Record<string, unknown>> = [
    {
      id: 'page-radio-pirate',
      slug: 'radio-pirate',
      stationName: 'Radio Pirate des Caraïbes — 104.7 FM',
      frequencyDial: '104.7 MHz FM / Onde Courte',
      tagline: 'La fréquence clandestine des mutins de la scène',
      showTitle: 'Spectacle : Pirates Paillettes',
      hostName: 'Capitaine Barbe-Rose & L’Équipage',
      badgeIcon: 'skull',
      themeAccent: '#d7b86a',
      synopsis: 'Diffusion clandestine pirate en direct du plateau.',
      scheduleText: 'Émission clandestine en direct uniquement les soirs de représentation.',
      isLive: false,
      onlyShowDays: true,
    },
    {
      id: 'page-radio-paillettes',
      slug: 'radio-paillettes',
      stationName: 'Radio Paillettes en grève — 98.4 FM',
      frequencyDial: '98.4 MHz FM / Fréquence Scénique',
      tagline: 'La voix libre des artistes et artisans du spectacle',
      showTitle: 'Spectacle : Pirates Paillettes (Acte II)',
      hostName: 'Maxime & La Troupe Insoumise',
      badgeIcon: 'waves',
      themeAccent: '#ef4444',
      synopsis: 'Les artistes en lutte prennent le micro en direct entre deux scènes.',
      scheduleText: 'ON AIR pendant les scènes de tempête.',
      isLive: false,
      onlyShowDays: true,
    },
  ];

  app.get('/api/radio/cms/pages', (_req: Request, res: Response) => {
    res.json({ pages: cmsPagesBackup });
  });

  app.post('/api/radio/cms/pages', (req: Request, res: Response) => {
    const { pages } = req.body || {};
    if (Array.isArray(pages)) {
      cmsPagesBackup = pages;
      // Pre-warm channels on relay
      pages.forEach((p: any) => {
        if (p.slug) getOrCreateChannel(p.slug, p.stationName);
      });
    }
    res.json({ ok: true, pages: cmsPagesBackup });
  });

  // Start broadcast session
  app.post('/api/radio/broadcast/:slug/start', (req: Request, res: Response) => {
    const slug = req.params.slug.toLowerCase().replace(/^\/+/, '');
    const { name, isTesting = false, mimeType = 'audio/webm;codecs=opus' } = req.body || {};
    const ch = getOrCreateChannel(slug, name);

    ch.isLive = !isTesting;
    ch.isTesting = !!isTesting;
    ch.startedAt = Date.now();
    ch.mimeType = mimeType;
    ch.headerChunk = null;
    ch.recentChunks = [];
    ch.totalBytesBroadcast = 0;

    res.json({
      ok: true,
      slug: ch.slug,
      name: ch.name,
      isLive: ch.isLive,
      isTesting: ch.isTesting,
      message: ch.isLive ? 'Diffusion ON AIR activée' : 'Mode TEST actif (privé)',
    });
  });

  // Stop broadcast session
  app.post('/api/radio/broadcast/:slug/stop', (req: Request, res: Response) => {
    const slug = req.params.slug.toLowerCase().replace(/^\/+/, '');
    const ch = channels.get(slug);

    if (ch) {
      ch.isLive = false;
      ch.isTesting = false;
      ch.startedAt = null;

      // Close all connected listeners gently
      for (const listener of ch.listeners) {
        try {
          listener.end();
        } catch {
          // ignore
        }
      }
      ch.listeners.clear();
      ch.recentChunks = [];
      ch.headerChunk = null;
    }

    res.json({
      ok: true,
      slug,
      message: 'Diffusion arrêtée',
    });
  });

  // Ingest audio chunk from broadcaster
  app.post('/api/radio/broadcast/:slug', (req: Request, res: Response) => {
    const slug = req.params.slug.toLowerCase().replace(/^\/+/, '');
    const ch = getOrCreateChannel(slug);

    const chunk = req.body as Buffer;
    if (!chunk || !(chunk instanceof Buffer) || chunk.length === 0) {
      res.status(400).json({ error: 'Chunk audio vide ou invalide' });
      return;
    }

    ch.totalBytesBroadcast += chunk.length;

    // First chunk usually contains the audio container header (WebM / Ogg Opus metadata)
    if (!ch.headerChunk) {
      ch.headerChunk = chunk;
    }

    // Keep ring buffer of last 10 chunks (~5-10s) for instant sync on newly connected listeners
    ch.recentChunks.push(chunk);
    if (ch.recentChunks.length > 10) {
      ch.recentChunks.shift();
    }

    // Fan-out to all active HTTP stream listeners
    let activeCount = 0;
    for (const listener of Array.from(ch.listeners)) {
      try {
        if (!listener.writableEnded && !listener.destroyed) {
          listener.write(chunk);
          activeCount++;
        } else {
          ch.listeners.delete(listener);
        }
      } catch {
        ch.listeners.delete(listener);
      }
    }

    res.json({
      ok: true,
      listeners: activeCount,
      totalBytes: ch.totalBytesBroadcast,
    });
  });

  // Listener HTTP Stream endpoint (audio/webm;codecs=opus)
  app.get('/api/radio/stream/:slug', (req: Request, res: Response) => {
    const slug = req.params.slug.toLowerCase().replace(/^\/+/, '');
    const ch = channels.get(slug);

    if (!ch || (!ch.isLive && !ch.isTesting)) {
      res.status(503).json({
        error: `La radio "/${slug}" n'est pas en diffusion actuellement.`,
        isLive: false,
      });
      return;
    }

    // Set streaming headers
    res.writeHead(200, {
      'Content-Type': ch.mimeType || 'audio/webm;codecs=opus',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send header chunk first so audio decoder can immediately initialize
    if (ch.headerChunk) {
      res.write(ch.headerChunk);
    }

    // Send recent chunks for warm buffer
    for (const rc of ch.recentChunks) {
      if (rc !== ch.headerChunk) {
        res.write(rc);
      }
    }

    // Register listener
    ch.listeners.add(res);

    req.on('close', () => {
      ch.listeners.delete(res);
    });

    req.on('error', () => {
      ch.listeners.delete(res);
    });
  });

  // -------------------------------------------------------------
  // NO[co]DE COMPANION & PINCEAU DE MAPPING RELAY
  // -------------------------------------------------------------
  interface CompanionSession {
    pin: string;
    macConnected: boolean;
    phoneConnected: boolean;
    phoneModel?: string;
    lastPing: number;
    lastTelemetry?: Record<string, unknown>;
  }

  const companionSession: CompanionSession = {
    pin: '7392',
    macConnected: true,
    phoneConnected: false,
    phoneModel: undefined,
    lastPing: Date.now(),
  };

  const companionClients = new Set<Response>();
  let latestCameraFrame: string | null = null;
  let activeMappingSurface: Record<string, unknown> | null = null;

  // Pairing status
  app.get('/api/companion/status', (_req: Request, res: Response) => {
    res.json({
      session: companionSession,
      hasCameraFrame: !!latestCameraFrame,
      activeMapping: !!activeMappingSurface,
    });
  });

  // Pair or reset PIN
  app.post('/api/companion/pair', (req: Request, res: Response) => {
    const { phoneModel } = req.body || {};
    companionSession.phoneConnected = true;
    companionSession.phoneModel = phoneModel || 'Mobile Companion';
    companionSession.lastPing = Date.now();

    // Broadcast to SSE clients
    const payload = JSON.stringify({ type: 'CONNECTED', phoneModel: companionSession.phoneModel });
    for (const c of companionClients) {
      c.write(`data: ${payload}\n\n`);
    }

    res.json({ ok: true, pin: companionSession.pin, session: companionSession });
  });

  // Send telemetry from phone to Mac (sensors, touch, faders, cues)
  app.post('/api/companion/send', (req: Request, res: Response) => {
    const data = req.body;
    companionSession.lastTelemetry = data;
    companionSession.lastPing = Date.now();

    // Fan-out to Mac clients
    const payload = JSON.stringify({ type: 'TELEMETRY', data });
    for (const c of companionClients) {
      c.write(`data: ${payload}\n\n`);
    }

    res.json({ ok: true });
  });

  // Dispatch from Mac to phone (scene state, haptic pulse, timecode)
  app.post('/api/companion/dispatch', (req: Request, res: Response) => {
    const message = req.body;
    const payload = JSON.stringify({ type: 'MAC_DISPATCH', message });
    for (const c of companionClients) {
      c.write(`data: ${payload}\n\n`);
    }
    res.json({ ok: true });
  });

  // SSE stream for bidirectional Mac <-> Phone sync
  app.get('/api/companion/events', (req: Request, res: Response) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    companionClients.add(res);

    // Initial greeting
    res.write(`data: ${JSON.stringify({ type: 'INIT', session: companionSession })}\n\n`);

    req.on('close', () => {
      companionClients.delete(res);
    });
  });

  // Camera frame relay from Phone to Mac (Pinceau de mapping)
  app.post('/api/mapping/camera-frame', (req: Request, res: Response) => {
    const { frameBase64 } = req.body || {};
    if (frameBase64) {
      latestCameraFrame = frameBase64;
      // Broadcast frame notification
      const payload = JSON.stringify({ type: 'CAMERA_FRAME_READY' });
      for (const c of companionClients) {
        c.write(`data: ${payload}\n\n`);
      }
    }
    res.json({ ok: true });
  });

  app.get('/api/mapping/camera-frame', (_req: Request, res: Response) => {
    res.json({ frameBase64: latestCameraFrame });
  });

  // Calibrated surface mapping storage
  app.post('/api/mapping/surface', (req: Request, res: Response) => {
    activeMappingSurface = req.body;
    const payload = JSON.stringify({ type: 'MAPPING_UPDATED', surface: activeMappingSurface });
    for (const c of companionClients) {
      c.write(`data: ${payload}\n\n`);
    }
    res.json({ ok: true });
  });

  app.get('/api/mapping/surface', (_req: Request, res: Response) => {
    res.json({ surface: activeMappingSurface });
  });

  // -------------------------------------------------------------
  // IA LIBRE, LOCALE ET UNIVERSELLE (Ollama, WebLLM, Agents Locaux)
  // -------------------------------------------------------------
  const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

  app.get('/api/ai/status', async (_req: Request, res: Response) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const resp = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: controller.signal }).catch(() => null);
      clearTimeout(timeoutId);

      if (resp && resp.ok) {
        const data = await resp.json();
        return res.json({
          provider: 'ollama',
          connected: true,
          models: data.models || [],
          mode: 'local',
          webGpuSupported: true,
        });
      }
    } catch {
      // Ignore network errors
    }

    return res.json({
      provider: 'builtin-procedural',
      connected: false,
      models: [
        { name: 'nocode-creative-procedural', size: 'embedded', details: { family: 'procedural' } },
        { name: 'webllm-in-browser', size: 'on-demand', details: { family: 'webgpu' } },
      ],
      mode: 'sans-ia-ou-local',
      webGpuSupported: true,
    });
  });

  // Proxy to Ollama for offline zero-API-key local synthesis
  app.post('/api/ai/ollama/generate', async (req: Request, res: Response) => {
    try {
      const resp = await fetch(`${OLLAMA_HOST}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      const data = await resp.json();
      res.json(data);
    } catch (e: any) {
      res.status(503).json({ error: 'Ollama local non accessible', message: e.message });
    }
  });

  app.get('/api/ai/agents', (_req: Request, res: Response) => {
    res.json({
      agents: [
        {
          id: 'agent-shader-glsl',
          name: 'Agent Shader & WebGL',
          category: 'visual',
          specialty: 'Génération procédurale de GLSL raymarching, fluides, vagues bioluminescentes et particules.',
          localExecutable: true,
          requiresInternet: false,
          license: 'MIT',
        },
        {
          id: 'agent-audio-scenic',
          name: 'Agent Bruitage & Audio Vivant',
          category: 'audio',
          specialty: 'Conception de sous-patchs interactifs, détection de TOPs micros et synchronisation Ableton.',
          localExecutable: true,
          requiresInternet: false,
          license: 'MIT',
        },
        {
          id: 'agent-scenographe-cues',
          name: 'Agent Régie & Scénographe',
          category: 'stage',
          specialty: 'Agencement de pistes Millumin, conduite de spectacle et sécurisation des conduites scéniques.',
          localExecutable: true,
          requiresInternet: false,
          license: 'MIT',
        },
        {
          id: 'agent-video-mapping',
          name: 'Agent Auto-Mapping 3s',
          category: 'mapping',
          specialty: 'Calculs d’homographie perspective, compensation de projection hors axe et maillage courbe.',
          localExecutable: true,
          requiresInternet: false,
          license: 'MIT',
        },
      ],
    });
  });

  // -------------------------------------------------------------
  // VITE INTEGRATION
  // -------------------------------------------------------------
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  const server = http.createServer(app);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[No[co]de Server] En écoute sur le port ${PORT}`);
    console.log(`[No[co]de Server] Relais Radio actif : /api/radio/*`);
  });
}

startServer().catch((err) => {
  console.error('[No[co]de Server] Erreur fatale au démarrage:', err);
  process.exit(1);
});
