import React, { useState, useEffect, useCallback } from 'react';
import { EngineId, ConsoleLog, SavedExperiment } from './types/engine';
import { ArtisticScene, ArtisticParameter } from './types/artist';
import { CURATED_ARTISTIC_SCENES } from './services/artisticIntents';
import { ENGINE_ADAPTERS } from './services/adapters';
import { useNetworkAudit } from './hooks/useNetworkAudit';
import { Header } from './components/Header';
import { ArtisticStudioView } from './components/ArtisticStudioView';
import { TechnicalLabView } from './components/TechnicalLabView';
import { PreviewPanel } from './components/PreviewPanel';
import { SavedScenesModal } from './components/SavedScenesModal';
import { ArchitectureDocModal } from './components/ArchitectureDocModal';
import { OfflineDeploymentAuditModal } from './components/OfflineDeploymentAuditModal';
import { LivePerformanceInteropModal } from './components/LivePerformanceInteropModal';
import { ScenographyLivingShadowModal } from './components/ScenographyLivingShadowModal';
import { LivingScenographyView } from './components/LivingScenographyView';
import { RadioBroadcastModal } from './components/RadioBroadcastModal';
import { StandaloneRadioPlayer } from './components/StandaloneRadioPlayer';
import { ArtSpectacleRadioPage } from './components/ArtSpectacleRadioPage';
import { artRadioCmsEngine } from './services/artRadioCmsEngine';
import { MagicMappingStudioModal } from './components/MagicMappingStudioModal';
import { CompanionPairingModal } from './components/CompanionPairingModal';
import { NoCodeCompanionView } from './components/NoCodeCompanionView';
import { ThemeCustomizerModal } from './components/ThemeCustomizerModal';
import { LiveFoleyInteractiveModal } from './components/LiveFoleyInteractiveModal';
import { AbletonLiveStudioModal } from './components/AbletonLiveStudioModal';
import { SurtitrageStudioModal } from './components/SurtitrageStudioModal';
import { MidiHubStudioModal } from './components/MidiHubStudioModal';
import { InstallHubView } from './components/InstallHubView';
import { OfficialTopbar } from './components/OfficialTopbar';
import { OfficialWorkspace } from './components/OfficialWorkspace';
import { radioAudioEngine } from './services/radioAudioEngine';
import { companionBridge } from './services/companionBridge';

export default function App() {
  // Direct route detection for Mobile Companion & Web Radio player
  const [routePath, setRoutePath] = useState(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setRoutePath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Mode switcher: Default is 'official' (Vraie interface No[co]de Vibe Designer avec Patch Canvas, Timeline, Library, Vibe, Inspecteur et CX Chat)
  const [viewMode, setViewMode] = useState<'official' | 'studio' | 'scenographie' | 'technical'>('official');
  const [workspaceStyle, setWorkspaceStyle] = useState<'bureau' | 'plateau'>('bureau');

  // Network audit & offline simulator
  const { isOnline, isSimulatedOffline, toggleSimulateOffline, isLocalNetwork } = useNetworkAudit();

  // Radio & Companion live state
  const [isRadioLive, setIsRadioLive] = useState(false);
  const [isCompanionConnected, setIsCompanionConnected] = useState(false);

  useEffect(() => {
    const unsubRadio = radioAudioEngine.onTelemetry((t) => {
      setIsRadioLive(t.state === 'on_air');
    });
    const unsubComp = companionBridge.subscribe((s) => {
      setIsCompanionConnected(s.isPaired);
    });
    return () => {
      unsubRadio();
      unsubComp();
    };
  }, []);

  // Active artistic scene
  const [currentScene, setCurrentScene] = useState<ArtisticScene>(CURATED_ARTISTIC_SCENES[0]);
  const [currentEngineId, setCurrentEngineId] = useState<EngineId>(currentScene.selectedEngineId);

  // Active code buffers
  const [code, setCode] = useState<string>(currentScene.code);
  const [secondaryCode, setSecondaryCode] = useState<string>(currentScene.secondaryCode || '');

  // Active uniforms
  const [uniforms, setUniforms] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const p of currentScene.parameters) {
      initial[p.mappedEngineParam] = p.value;
    }
    return initial;
  });

  // Console Logs
  const [logs, setLogs] = useState<ConsoleLog[]>([
    {
      id: 'init-sys-log',
      type: 'system',
      message: 'Laboratoire No[co]de V2 initialisé. Architecture Offline-First validée (PWA, Electron, Android, LAN).',
      timestamp: new Date().toLocaleTimeString(),
      source: 'System Runtime',
    },
  ]);

  // Real-time computed FPS from execution loop
  const [liveFps, setLiveFps] = useState<number>(0);

  // Saved experiments
  const [savedScenes, setSavedScenes] = useState<SavedExperiment[]>(() => {
    try {
      const stored = localStorage.getItem('nocode_saved_scenes');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Modals
  const [isDocOpen, setIsDocOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [isInteropOpen, setIsInteropOpen] = useState(false);
  const [isScenographyOpen, setIsScenographyOpen] = useState(false);
  const [isRadioModalOpen, setIsRadioModalOpen] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [isCompanionModalOpen, setIsCompanionModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isLiveFoleyOpen, setIsLiveFoleyOpen] = useState(false);
  const [isAbletonModalOpen, setIsAbletonModalOpen] = useState(false);
  const [isMidiHubOpen, setIsMidiHubOpen] = useState(false);
  const [isSurtitrageOpen, setIsSurtitrageOpen] = useState(false);

  // Sync scene change
  const handleSceneChange = useCallback((newScene: ArtisticScene) => {
    setCurrentScene(newScene);
    setCurrentEngineId(newScene.selectedEngineId);
    setCode(newScene.code);
    setSecondaryCode(newScene.secondaryCode || '');

    const newUniforms: Record<string, number> = {};
    for (const p of newScene.parameters) {
      newUniforms[p.mappedEngineParam] = p.value;
    }
    setUniforms(newUniforms);

    setLogs((prev) => [
      ...prev,
      {
        id: `scene-switch-${Date.now()}`,
        type: 'info',
        message: `Scène activée : "${newScene.title}" (Moteur : ${newScene.selectedEngineId}).`,
        timestamp: new Date().toLocaleTimeString(),
        source: 'Scénographie',
      },
    ]);
  }, []);

  // Sync engine change from technical mode
  const handleSelectEngine = useCallback((id: EngineId) => {
    setCurrentEngineId(id);
    const adapter = ENGINE_ADAPTERS.find((a) => a.id === id);
    if (adapter && adapter.presets.length > 0) {
      const preset = adapter.presets[0];
      setCode(preset.code);
      setSecondaryCode(preset.secondaryCode || '');
      if (preset.defaultUniforms) {
        setUniforms(preset.defaultUniforms);
      }
    }
    setLogs((prev) => [
      ...prev,
      {
        id: `engine-switch-${Date.now()}`,
        type: 'info',
        message: `Changement de moteur : ${id.toUpperCase()}.`,
        timestamp: new Date().toLocaleTimeString(),
        source: 'Engine Switcher',
      },
    ]);
  }, []);

  // Handle parameter changes from sliders
  const handleParameterChange = useCallback((paramId: string, value: number) => {
    setCurrentScene((prev) => {
      const updatedParams = prev.parameters.map((p) => (p.id === paramId ? { ...p, value } : p));
      const targetParam = prev.parameters.find((p) => p.id === paramId);
      if (targetParam) {
        setUniforms((u) => ({ ...u, [targetParam.mappedEngineParam]: value }));
      }
      return { ...prev, parameters: updatedParams };
    });
  }, []);

  const handleUniformChange = useCallback((name: string, val: number) => {
    setUniforms((prev) => ({ ...prev, [name]: val }));
  }, []);

  const handleResetUniforms = useCallback(() => {
    const adapter = ENGINE_ADAPTERS.find((a) => a.id === currentEngineId);
    if (adapter?.presets[0]?.defaultUniforms) {
      setUniforms(adapter.presets[0].defaultUniforms);
    }
  }, [currentEngineId]);

  // Logging callback
  const handleLog = useCallback((logItem: Omit<ConsoleLog, 'id' | 'timestamp'>) => {
    setLogs((prev) => [
      ...prev.slice(-150),
      {
        ...logItem,
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  }, []);

  // Save scene to localStorage
  const handleSaveScene = useCallback(() => {
    const newSaved: SavedExperiment = {
      id: `exp-${Date.now()}`,
      engineId: currentEngineId,
      title: currentScene.title,
      savedAt: new Date().toLocaleString(),
      code,
      secondaryCode,
      uniforms,
    };
    const updated = [newSaved, ...savedScenes];
    setSavedScenes(updated);
    try {
      localStorage.setItem('nocode_saved_scenes', JSON.stringify(updated));
    } catch {
      // Storage full
    }
    handleLog({
      type: 'info',
      message: `Scène "${currentScene.title}" enregistrée en stockage local autonome.`,
      source: 'Stockage Local',
    });
  }, [currentEngineId, currentScene.title, code, secondaryCode, uniforms, savedScenes, handleLog]);

  const handleDeleteSaved = useCallback((id: string) => {
    const updated = savedScenes.filter((s) => s.id !== id);
    setSavedScenes(updated);
    try {
      localStorage.setItem('nocode_saved_scenes', JSON.stringify(updated));
    } catch {
      // Storage error
    }
  }, [savedScenes]);

  const handleLoadSaved = useCallback((scene: SavedExperiment) => {
    setCurrentEngineId(scene.engineId);
    setCode(scene.code);
    setSecondaryCode(scene.secondaryCode || '');
    setUniforms(scene.uniforms);

    // Reconstruct full artistic scene so it plays offline without any AI service
    const matchingCurated = CURATED_ARTISTIC_SCENES.find((s) => s.selectedEngineId === scene.engineId);
    const reconstructedParams: ArtisticParameter[] = Object.entries(scene.uniforms).map(([key, val], idx) => ({
      id: `param-restored-${idx}-${key}`,
      label: key,
      description: `Paramètre sauvegardé (${key})`,
      value: val,
      min: 0,
      max: key === 'segments' ? 16 : 3,
      step: key === 'segments' ? 1 : 0.05,
      mappedEngineParam: key,
    }));

    setCurrentScene({
      id: scene.id,
      title: scene.title,
      intentionText: matchingCurated?.intentionText || scene.title,
      category: matchingCurated?.category || 'Installation Immersive',
      selectedEngineId: scene.engineId,
      engineReasoning: matchingCurated?.engineReasoning || `Moteur : ${scene.engineId}`,
      visualMood: matchingCurated?.visualMood || 'Scène sauvegardée restaurée localement',
      code: scene.code,
      secondaryCode: scene.secondaryCode,
      parameters: reconstructedParams.length > 0 ? reconstructedParams : (matchingCurated?.parameters || []),
    });

    setLogs((prev) => [
      ...prev,
      {
        id: `load-${Date.now()}`,
        type: 'info',
        message: `Scène restaurée : "${scene.title}" (${scene.engineId}). Rejouée immédiatement sans IA ni réseau.`,
        timestamp: new Date().toLocaleTimeString(),
        source: 'Storage',
      },
    ]);
  }, []);

  const handleExportAll = useCallback(() => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(savedScenes, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `nocode-lab-backup-${Date.now()}.json`;
    a.click();
  }, [savedScenes]);

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          setSavedScenes(imported);
          localStorage.setItem('nocode_saved_scenes', JSON.stringify(imported));
          handleLog({ type: 'info', message: `${imported.length} scènes importées avec succès.` });
        }
      } catch (err) {
        handleLog({ type: 'error', message: 'Erreur lors de la lecture du fichier JSON.' });
      }
    };
    reader.readAsText(file);
  }, [handleLog]);

  // Export as reusable Vibe Designer component file (.vibe.json)
  const handleExportVibeComponent = useCallback((scene: SavedExperiment) => {
    const vibeComponent = {
      schema: 'nocode.vibe.component/v1',
      title: scene.title,
      engineId: scene.engineId,
      runtime: 'offline-first',
      exportedAt: new Date().toISOString(),
      code: scene.code,
      secondaryCode: scene.secondaryCode,
      uniforms: scene.uniforms,
      targetCompatibility: [
        'macOS (Electron)',
        'Windows (Electron)',
        'Linux (Electron)',
        'Android Companion (Capacitor/PWA)',
        'Standalone PWA'
      ],
      metadata: {
        requiresInternet: false,
        requiresCloudAI: false,
        localNetworkReady: true
      }
    };

    const blob = new Blob([JSON.stringify(vibeComponent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scene.title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.vibe.json`;
    a.click();
    URL.revokeObjectURL(url);

    handleLog({
      type: 'info',
      message: `Composant No[co]de Vibe Designer exporté : ${scene.title}.vibe.json`,
      source: 'Exporteur Vibe',
    });
  }, [handleLog]);

  // Export as standalone offline HTML file (runnable with double-click without server)
  const handleExportStandaloneHtml = useCallback((scene: SavedExperiment) => {
    const htmlTemplate = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${scene.title} — No[co]de Standalone Export</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #09090b; color: #f4f4f5; font-family: sans-serif; overflow: hidden; width: 100vw; height: 100vh; display: flex; }
    #canvas-container { flex: 1; height: 100%; position: relative; }
    canvas { width: 100%; height: 100%; display: block; }
    #sidebar { width: 300px; height: 100%; background: #18181b; border-left: 1px solid #27272a; padding: 20px; overflow-y: auto; }
    h1 { font-size: 14px; font-weight: 600; margin-bottom: 4px; color: #38bdf8; }
    p.meta { font-size: 11px; color: #71717a; margin-bottom: 20px; }
    .control { margin-bottom: 16px; }
    .control label { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px; color: #d4d4d8; }
    .control input[type=range] { width: 100%; accent-color: #38bdf8; }
    .badge { display: inline-block; padding: 2px 6px; background: #064e3b; color: #34d399; font-size: 10px; border-radius: 4px; margin-top: 10px; }
  </style>
</head>
<body>
  <div id="canvas-container">
    <canvas id="view"></canvas>
  </div>
  <div id="sidebar">
    <h1>${scene.title}</h1>
    <p class="meta">Exporté depuis No[co]de Vibe Designer (Exécution 100% Hors-Ligne)</p>
    <div id="controls"></div>
    <div class="badge">✓ Autonome (0 requêtes Internet)</div>
  </div>
  <script>
    const canvas = document.getElementById('view');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const uniforms = ${JSON.stringify(scene.uniforms)};
    
    // Sliders UI
    const controlsDiv = document.getElementById('controls');
    for (const [key, val] of Object.entries(uniforms)) {
      const wrap = document.createElement('div');
      wrap.className = 'control';
      wrap.innerHTML = '<label><span>' + key + '</span><span id="val_' + key + '">' + val.toFixed(2) + '</span></label><input type="range" min="0" max="3" step="0.05" value="' + val + '">';
      wrap.querySelector('input').addEventListener('input', (e) => {
        uniforms[key] = parseFloat(e.target.value);
        document.getElementById('val_' + key).innerText = uniforms[key].toFixed(2);
      });
      controlsDiv.appendChild(wrap);
    }

    // Direct WebGL Quad Runner
    const vsSource = 'attribute vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }';
    const fsSource = ${JSON.stringify(scene.code)};
    
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);

    const prg = gl.createProgram();
    gl.attachShader(prg, vs);
    gl.attachShader(prg, fs);
    gl.linkProgram(prg);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prg, 'p');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prg, 'u_resolution');
    const uTime = gl.getUniformLocation(prg, 'u_time');
    const uMouse = gl.getUniformLocation(prg, 'u_mouse');
    const uCustom = gl.getUniformLocation(prg, 'u_custom');

    let startTime = performance.now();
    function loop(now) {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(prg);

      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, (now - startTime) / 1000);
      if (uCustom) {
        const vals = Object.values(uniforms);
        gl.uniform4f(uCustom, vals[0]||1, vals[1]||1, vals[2]||1, vals[3]||1);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  </script>
</body>
</html>`;

    const blob = new Blob([htmlTemplate], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scene.title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_standalone.html`;
    a.click();
    URL.revokeObjectURL(url);

    handleLog({
      type: 'info',
      message: `Fichier HTML autonome exporté : ${scene.title}_standalone.html (Exécutable hors-ligne par double-clic).`,
      source: 'Exporteur Standalone',
    });
  }, [handleLog]);

  // Current engine adapter
  const currentAdapter = ENGINE_ADAPTERS.find((a) => a.id === currentEngineId) || ENGINE_ADAPTERS[0];

  // Visual Render Surface (Reused in both Studio and Technical views)
  const renderSurfaceNode = (
    <PreviewPanel
      engineId={currentEngineId}
      code={code}
      secondaryCode={secondaryCode}
      uniforms={uniforms}
      onLog={handleLog}
      onClearLogs={() => setLogs([])}
      onFpsUpdate={(computedFps) => setLiveFps(computedFps)}
      isExecutable={currentAdapter.status === 'functional' || currentAdapter.status === 'hardware-dependent'}
    />
  );

  // Direct routes for ART Spectacle Radio Page & Companion
  const currentPathSlug = routePath.replace(/^\/+/, '');
  const isCmsRadioRoute = routePath.startsWith('/radio-') || routePath.startsWith('/radio') || artRadioCmsEngine.getPageBySlug(currentPathSlug) !== null;

  if (isCmsRadioRoute) {
    const slug = currentPathSlug || 'radio-pirate';
    return (
      <ArtSpectacleRadioPage
        channelSlug={slug}
        onBackToStudio={() => {
          window.history.pushState({}, '', '/');
          setRoutePath('/');
        }}
      />
    );
  }

  if (routePath.startsWith('/companion')) {
    return (
      <NoCodeCompanionView
        onBackToMacStudio={() => {
          window.history.pushState({}, '', '/');
          setRoutePath('/');
        }}
      />
    );
  }

  if (routePath.startsWith('/install') || routePath.startsWith('/installer')) {
    return (
      <InstallHubView
        onBackToApp={() => {
          window.history.pushState({}, '', '/');
          setRoutePath('/');
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#090b0d] text-zinc-100 font-sans selection:bg-[#d7b86a]/30 selection:text-white">
      {/* 1. TOPBAR OFFICIELLE AVEC BRANDING OFFICIEL, RADIO P00, AUTO-MAPPING, ABLETON, FOLEY, IA LOCALE */}
      <OfficialTopbar
        onOpenRadioStudio={() => setIsRadioModalOpen(true)}
        onOpenMappingStudio={() => setIsMappingModalOpen(true)}
        onOpenCompanionModal={() => setIsCompanionModalOpen(true)}
        onOpenLiveFoleyModal={() => setIsLiveFoleyOpen(true)}
        onOpenAbletonModal={() => setIsAbletonModalOpen(true)}
        onOpenMidiHub={() => setIsMidiHubOpen(true)}
        onOpenSurtitrage={() => setIsSurtitrageOpen(true)}
        onOpenInstallPage={() => {
          window.history.pushState({}, '', '/install');
          setRoutePath('/install');
        }}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        onOpenDocModal={() => setIsDocOpen(true)}
        onOpenAuditModal={() => setIsAuditOpen(true)}
        activeWorkspaceMode={workspaceStyle}
        onWorkspaceModeChange={(mode) => setWorkspaceStyle(mode)}
      />

      {/* 2. ESPACE DE TRAVAIL PRINCIPAL : VRAI NO[co]DE VIBE DESIGNER */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {viewMode === 'official' ? (
          <OfficialWorkspace
            onOpenRadioStudio={() => setIsRadioModalOpen(true)}
            onOpenMappingStudio={() => setIsMappingModalOpen(true)}
            onOpenCompanionModal={() => setIsCompanionModalOpen(true)}
            onOpenLiveFoleyModal={() => setIsLiveFoleyOpen(true)}
            onOpenAbletonModal={() => setIsAbletonModalOpen(true)}
            onOpenMidiHub={() => setIsMidiHubOpen(true)}
            onOpenSurtitrage={() => setIsSurtitrageOpen(true)}
          />
        ) : viewMode === 'studio' ? (
          <ArtisticStudioView
            currentScene={currentScene}
            onSceneChange={handleSceneChange}
            onToggleTechnicalMode={() => setViewMode('technical')}
            onParameterChange={handleParameterChange}
            onSaveScene={handleSaveScene}
            onOpenInterop={() => setIsInteropOpen(true)}
            onOpenScenography={() => setIsScenographyOpen(true)}
            onOpenLivingScenography={() => setViewMode('scenographie')}
            renderSurface={renderSurfaceNode}
            fps={liveFps}
            engineName={currentAdapter.name}
          />
        ) : viewMode === 'scenographie' ? (
          <LivingScenographyView
            onReturnToStudio={() => setViewMode('official')}
            onOpenTechnicalLab={() => setViewMode('technical')}
          />
        ) : (
          <TechnicalLabView
            currentEngineId={currentEngineId}
            onSelectEngine={handleSelectEngine}
            onReturnToStudio={() => setViewMode('official')}
            code={code}
            onCodeChange={setCode}
            secondaryCode={secondaryCode}
            onSecondaryCodeChange={setSecondaryCode}
            uniforms={uniforms}
            onUniformChange={handleUniformChange}
            onResetUniforms={handleResetUniforms}
            onRun={() => {
              handleLog({
                type: 'info',
                message: `Exécution relancée pour le moteur ${currentEngineId.toUpperCase()}.`,
                source: 'Runner',
              });
            }}
            onResetCode={() => {
              const p = currentAdapter.presets[0];
              if (p) {
                setCode(p.code);
                setSecondaryCode(p.secondaryCode || '');
              }
            }}
            logs={logs}
            onClearLogs={() => setLogs([])}
            renderSurface={renderSurfaceNode}
            fps={liveFps}
          />
        )}
      </main>

      {/* Modals */}
      <SavedScenesModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        savedScenes={savedScenes}
        onLoadScene={handleLoadSaved}
        onDeleteScene={handleDeleteSaved}
        onExportAll={handleExportAll}
        onImportFile={handleImportFile}
        onExportVibeComponent={handleExportVibeComponent}
        onExportStandaloneHtml={handleExportStandaloneHtml}
      />

      <ArchitectureDocModal
        isOpen={isDocOpen}
        onClose={() => setIsDocOpen(false)}
      />

      <OfflineDeploymentAuditModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        isSimulatedOffline={isSimulatedOffline}
        onToggleSimulatedOffline={toggleSimulateOffline}
      />

      <LivePerformanceInteropModal
        isOpen={isInteropOpen}
        onClose={() => setIsInteropOpen(false)}
      />

      <ScenographyLivingShadowModal
        isOpen={isScenographyOpen}
        onClose={() => setIsScenographyOpen(false)}
      />

      <RadioBroadcastModal
        isOpen={isRadioModalOpen}
        onClose={() => setIsRadioModalOpen(false)}
        onOpenStandalonePlayer={(slug) => {
          window.history.pushState({}, '', `/${slug}`);
          setRoutePath(`/${slug}`);
        }}
      />

      <MagicMappingStudioModal
        isOpen={isMappingModalOpen}
        onClose={() => setIsMappingModalOpen(false)}
      />

      <CompanionPairingModal
        isOpen={isCompanionModalOpen}
        onClose={() => setIsCompanionModalOpen(false)}
        onOpenCompanionView={() => {
          window.history.pushState({}, '', '/companion');
          setRoutePath('/companion');
        }}
      />

      <ThemeCustomizerModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />

      <LiveFoleyInteractiveModal
        isOpen={isLiveFoleyOpen}
        onClose={() => setIsLiveFoleyOpen(false)}
      />

      <AbletonLiveStudioModal
        isOpen={isAbletonModalOpen}
        onClose={() => setIsAbletonModalOpen(false)}
        onOpenLiveFoley={() => setIsLiveFoleyOpen(true)}
      />

      <MidiHubStudioModal
        isOpen={isMidiHubOpen}
        onClose={() => setIsMidiHubOpen(false)}
      />

      <SurtitrageStudioModal
        isOpen={isSurtitrageOpen}
        onClose={() => setIsSurtitrageOpen(false)}
      />
    </div>
  );
}
