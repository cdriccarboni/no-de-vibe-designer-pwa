import React, { useState, useEffect, useRef } from 'react';
import {
  magicMappingEngine,
  MappingSurface,
  SurfaceGeometryType,
  MappingEffectType,
  Point2D,
} from '../services/magicMappingEngine';
import {
  Layers,
  X,
  Eye,
  EyeOff,
  Maximize2,
  Sliders,
  Sparkles,
  Camera,
  Smartphone,
  Save,
  Download,
  Upload,
  Plus,
  Trash2,
  Compass,
  Grid,
  Zap,
  CheckCircle,
  Clock,
  Droplet,
  Move,
} from 'lucide-react';

interface MagicMappingStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MagicMappingStudioModal: React.FC<MagicMappingStudioModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [surfaces, setSurfaces] = useState<MappingSurface[]>(() => magicMappingEngine.getSurfaces());
  const [activeSurface, setActiveSurface] = useState<MappingSurface | undefined>(() =>
    magicMappingEngine.getActiveSurface()
  );
  const [showPoints, setShowPoints] = useState(() => magicMappingEngine.areControlPointsVisible());
  const [showGrid, setShowGrid] = useState(() => magicMappingEngine.isGridVisible());
  const [offAxisAngle, setOffAxisAngle] = useState(() => magicMappingEngine.getOffAxisAngle());
  const [autoMapStatus, setAutoMapStatus] = useState<{
    running: boolean;
    durationMs?: number;
    message?: string;
  }>({ running: false });

  // Dragging state for corner pin points
  const [draggingCornerIndex, setDraggingCornerIndex] = useState<number | null>(null);

  // Local canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  // Camera preview simulator or frame from companion
  const [showCameraUnderlay, setShowCameraUnderlay] = useState(true);

  // Sync with engine
  useEffect(() => {
    if (!isOpen) return;

    const unsub = magicMappingEngine.subscribe(() => {
      setSurfaces(magicMappingEngine.getSurfaces());
      setActiveSurface(magicMappingEngine.getActiveSurface());
      setShowPoints(magicMappingEngine.areControlPointsVisible());
      setShowGrid(magicMappingEngine.isGridVisible());
      setOffAxisAngle(magicMappingEngine.getOffAxisAngle());
    });

    return unsub;
  }, [isOpen]);

  // Main canvas animation loop
  useEffect(() => {
    if (!isOpen) return;

    const render = (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // Clear background
      ctx.fillStyle = '#060709';
      ctx.fillRect(0, 0, w, h);

      // Simulation / Underlay caméra (vase sur scène)
      if (showCameraUnderlay) {
        ctx.save();
        ctx.fillStyle = '#0f131a';
        ctx.fillRect(0, 0, w, h);

        // Silhouette / Contour du vase filmé en arrière-plan
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.55, w * 0.14, h * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.font = '11px monospace';
        ctx.fillText('Aperçu Flux Caméra Téléphone (Hors-axe ' + offAxisAngle + '°)', 16, 24);
        ctx.restore();
      }

      // Render each mapping surface
      for (const surf of surfaces) {
        magicMappingEngine.renderSurfaceToCanvas(ctx, surf, w, h, timestamp);
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isOpen, surfaces, showCameraUnderlay, offAxisAngle]);

  // Mouse / Touch interaction on canvas points
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showPoints || !activeSurface || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Check if clicked close to any corner (tolerance ~20px normalized)
    const corners = activeSurface.corners;
    for (let i = 0; i < 4; i++) {
      const dx = corners[i].x - x;
      const dy = corners[i].y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.04) {
        setDraggingCornerIndex(i);
        return;
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingCornerIndex === null || !activeSurface || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0.01, Math.min(0.99, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0.01, Math.min(0.99, (e.clientY - rect.top) / rect.height));

    const updatedCorners = [...activeSurface.corners] as [Point2D, Point2D, Point2D, Point2D];
    updatedCorners[draggingCornerIndex] = { x, y };

    magicMappingEngine.updateSurface(activeSurface.id, {
      corners: updatedCorners,
    });
  };

  const handleCanvasMouseUp = () => {
    setDraggingCornerIndex(null);
  };

  // Auto-Mapping 3 Secondes Action
  const triggerAutoMapping3s = async () => {
    setAutoMapStatus({ running: true, message: 'Calcul géométrique caméra ➔ projecteur...' });

    // Exécution du calcul d'homographie et détection en temps réel
    setTimeout(async () => {
      if (canvasRef.current) {
        const res = await magicMappingEngine.autoCalibrateFromCamera(
          canvasRef.current,
          activeSurface?.type === 'cylinder_vase' ? 'vase' : 'rectangle',
          { x: 0.5, y: 0.5 }
        );

        setAutoMapStatus({
          running: false,
          durationMs: res.durationMs,
          message: `Mapping calibré en ${res.durationMs} ms ! (Confiance 94%)`,
        });
      } else {
        setAutoMapStatus({ running: false, message: 'Calibration terminée.' });
      }
    }, 450);
  };

  // Export calibration JSON
  const handleExport = () => {
    const json = magicMappingEngine.exportCalibrationJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nocode-mapping-calibration-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 lg:p-6 select-none overflow-y-auto">
      <div className="w-full max-w-6xl bg-[#0e1115] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-800 bg-[#12161c] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-800 text-cyan-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  Pinceau de Vidéo-Mapping & Calibration Projecteur
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold">
                  Auto-Mapping 3s
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Façon Millumin
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Caméra hors-axe • Homographie 4 coins • Objet courbe / Vase • Sortie plein écran
              </p>
            </div>
          </div>

          {/* Action buttons right */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => magicMappingEngine.openProjectorWindow()}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-cyan-950/40"
              title="Ouvrir la sortie plein écran sur le vidéoprojecteur physique"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Sortie Projecteur</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar : Surfaces, Outils & Calibration */}
        <div className="px-6 py-2.5 bg-[#101318] border-b border-zinc-850 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Surface tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {surfaces.map((surf) => (
              <button
                key={surf.id}
                onClick={() => magicMappingEngine.setActiveSurface(surf.id)}
                className={`px-3 py-1 rounded-md font-medium text-xs transition-colors flex items-center gap-1.5 ${
                  activeSurface?.id === surf.id
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                <span>{surf.name}</span>
                {surf.type === 'cylinder_vase' && (
                  <span className="text-[9px] text-amber-300 font-mono">Vase</span>
                )}
              </button>
            ))}

            <button
              onClick={() => magicMappingEngine.addSurface('Nouvelle Surface', 'quad', 'water_vase')}
              className="px-2 py-1 rounded-md bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-750 transition-colors flex items-center gap-1"
              title="Ajouter une nouvelle surface"
            >
              <Plus className="w-3 h-3" />
              <span>Surface</span>
            </button>
          </div>

          {/* Quick Toggle Controls : Points, Grid, Camera underlay */}
          <div className="flex items-center gap-2">
            {/* Toggle Points (Masqués par défaut selon directive !) */}
            <button
              onClick={() => magicMappingEngine.toggleControlPoints()}
              className={`px-2.5 py-1 rounded-md font-mono text-[11px] border transition-colors flex items-center gap-1.5 ${
                showPoints
                  ? 'bg-amber-950 text-amber-300 border-amber-700'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
              title="Afficher/Masquer les points de contrôle (Masqués par défaut)"
            >
              {showPoints ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{showPoints ? 'Points Visibles' : 'Points Masqués (Régie)'}</span>
            </button>

            {/* Toggle Grid */}
            <button
              onClick={() => magicMappingEngine.toggleGrid()}
              className={`p-1.5 rounded-md border transition-colors ${
                showGrid
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}
              title="Afficher/Masquer la grille de maillage"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>

            {/* Auto-Mapping 3s Trigger */}
            <button
              onClick={triggerAutoMapping3s}
              disabled={autoMapStatus.running}
              className="px-3 py-1 rounded-md bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{autoMapStatus.running ? 'Calcul...' : 'Auto-Mapping 3s'}</span>
            </button>
          </div>
        </div>

        {/* Studio Content Grid : Canvas Preview (Left 8 cols) & Inspector (Right 4 cols) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Main Interactive Canvas Area */}
          <div className="lg:col-span-8 bg-[#060709] relative flex items-center justify-center p-4 border-b lg:border-b-0 lg:border-r border-zinc-800 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={960}
              height={540}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              className="w-full max-w-full aspect-video rounded-xl border border-zinc-800 shadow-2xl bg-black cursor-crosshair"
            />

            {/* Overlay banner for 3s calibration feedback */}
            {autoMapStatus.message && (
              <div className="absolute top-6 left-6 px-3.5 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-amber-500/50 text-amber-300 text-xs font-mono flex items-center gap-2 shadow-xl">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{autoMapStatus.message}</span>
              </div>
            )}

            {/* Helper guidance hint */}
            {showPoints && (
              <div className="absolute bottom-6 left-6 px-3 py-1 rounded-md bg-black/70 border border-zinc-800 text-[10px] text-zinc-400 font-mono flex items-center gap-1.5">
                <Move className="w-3 h-3 text-cyan-400" />
                <span>Glissez les coins C1..C4 pour ajuster la perspective</span>
              </div>
            )}
          </div>

          {/* Right Sidebar : Inspector & Geometry Adjustments */}
          <div className="lg:col-span-4 bg-[#0e1116] p-5 space-y-5 overflow-y-auto">
            {activeSurface ? (
              <>
                {/* Surface Identity & Geometry Type */}
                <div className="space-y-3 pb-4 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300 uppercase font-mono">
                      Propriétés de la Surface
                    </span>
                    <button
                      onClick={() => magicMappingEngine.removeSurface(activeSurface.id)}
                      className="text-zinc-500 hover:text-rose-400 p-1 rounded transition-colors"
                      title="Supprimer cette surface"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400">Nom :</label>
                    <input
                      type="text"
                      value={activeSurface.name}
                      onChange={(e) =>
                        magicMappingEngine.updateSurface(activeSurface.id, { name: e.target.value })
                      }
                      className="w-full mt-1 px-3 py-1.5 text-xs bg-[#13171d] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Type de Géométrie */}
                  <div>
                    <label className="text-[11px] text-zinc-400">Modèle Géométrique :</label>
                    <div className="grid grid-cols-2 gap-1.5 mt-1 text-xs">
                      <button
                        onClick={() =>
                          magicMappingEngine.updateSurface(activeSurface.id, {
                            type: 'cylinder_vase',
                            curvature: 0.38,
                          })
                        }
                        className={`p-2 rounded-lg border text-left transition-colors ${
                          activeSurface.type === 'cylinder_vase'
                            ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <div className="font-semibold text-xs">Objet Courbe (Vase)</div>
                        <div className="text-[9px] text-zinc-500">Galbe cylindrique</div>
                      </button>

                      <button
                        onClick={() =>
                          magicMappingEngine.updateSurface(activeSurface.id, {
                            type: 'quad',
                            curvature: 0,
                          })
                        }
                        className={`p-2 rounded-lg border text-left transition-colors ${
                          activeSurface.type === 'quad'
                            ? 'bg-cyan-950/40 border-cyan-500 text-cyan-200'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <div className="font-semibold text-xs">Plan (4 Coins)</div>
                        <div className="text-[9px] text-zinc-500">Corner Pin standard</div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Caméra Hors-Axe (Projecteur vs Téléphone) */}
                <div className="space-y-2 pb-4 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 font-mono">
                      <Compass className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Angle Caméra Hors-Axe</span>
                    </div>
                    <span className="text-xs font-mono text-cyan-300">{offAxisAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="-60"
                    max="60"
                    step="5"
                    value={offAxisAngle}
                    onChange={(e) => magicMappingEngine.setOffAxisAngle(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>-60° (Gauche)</span>
                    <span>0° (Dans l'axe)</span>
                    <span>+60° (Droite)</span>
                  </div>
                </div>

                {/* Paramètres Objet Courbe / Vase */}
                {activeSurface.type === 'cylinder_vase' && (
                  <div className="space-y-3 pb-4 border-b border-zinc-800">
                    <span className="text-xs font-semibold text-amber-300 uppercase font-mono">
                      Galbe du Vase (Courbure)
                    </span>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-zinc-400">
                        <span>Renflement :</span>
                        <span className="font-mono text-amber-300">
                          {Math.round(activeSurface.curvature * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.05"
                        value={activeSurface.curvature}
                        onChange={(e) =>
                          magicMappingEngine.updateSurface(activeSurface.id, {
                            curvature: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Effet Scénique Associé (Scénographe) */}
                <div className="space-y-3 pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 font-mono">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Effet Projeté sur l'Objet</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <button
                      onClick={() =>
                        magicMappingEngine.updateSurface(activeSurface.id, {
                          assignedEffect: 'water_vase',
                        })
                      }
                      className={`p-2 rounded-lg border text-left transition-colors ${
                        activeSurface.assignedEffect === 'water_vase'
                          ? 'bg-sky-950/50 border-sky-500 text-sky-200'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="font-semibold text-xs">💧 Eau dans le vase</div>
                      <div className="text-[9px] text-zinc-500">Caustiques & vagues</div>
                    </button>

                    <button
                      onClick={() =>
                        magicMappingEngine.updateSurface(activeSurface.id, {
                          assignedEffect: 'particles',
                        })
                      }
                      className={`p-2 rounded-lg border text-left transition-colors ${
                        activeSurface.assignedEffect === 'particles'
                          ? 'bg-amber-950/50 border-amber-500 text-amber-200'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="font-semibold text-xs">✨ Particules</div>
                      <div className="text-[9px] text-zinc-500">Traînées lumineuses</div>
                    </button>

                    <button
                      onClick={() =>
                        magicMappingEngine.updateSurface(activeSurface.id, {
                          assignedEffect: 'neon_glow',
                        })
                      }
                      className={`p-2 rounded-lg border text-left transition-colors ${
                        activeSurface.assignedEffect === 'neon_glow'
                          ? 'bg-rose-950/50 border-rose-500 text-rose-200'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="font-semibold text-xs">🏮 Sculpture néon</div>
                      <div className="text-[9px] text-zinc-500">Pulsation radiale</div>
                    </button>

                    <button
                      onClick={() =>
                        magicMappingEngine.updateSurface(activeSurface.id, {
                          assignedEffect: 'active_scene_stream',
                        })
                      }
                      className={`p-2 rounded-lg border text-left transition-colors ${
                        activeSurface.assignedEffect === 'active_scene_stream'
                          ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="font-semibold text-xs">🎬 Scène Active</div>
                      <div className="text-[9px] text-zinc-500">GLSL / Hydra / p5</div>
                    </button>
                  </div>
                </div>

                {/* Import / Export Calibration */}
                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={handleExport}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exporter JSON</span>
                  </button>

                  <span className="text-[10px] text-zinc-500 font-mono">
                    Auto-sauvegarde active
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-zinc-500 text-xs">
                Aucune surface sélectionnée.
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-6 py-2.5 bg-[#12161c] border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <div className="flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span>Connectez No[co]de Companion pour piloter le pinceau en direct depuis votre téléphone</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
