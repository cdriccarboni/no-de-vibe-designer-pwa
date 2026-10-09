import React from 'react';
import { SavedExperiment } from '../types/engine';
import { X, Trash2, Download, Upload, Play, Calendar, FileCode, ExternalLink, Check } from 'lucide-react';

interface SavedScenesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedScenes: SavedExperiment[];
  onLoadScene: (scene: SavedExperiment) => void;
  onDeleteScene: (id: string) => void;
  onExportAll: () => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportVibeComponent?: (scene: SavedExperiment) => void;
  onExportStandaloneHtml?: (scene: SavedExperiment) => void;
}

export const SavedScenesModal: React.FC<SavedScenesModalProps> = ({
  isOpen,
  onClose,
  savedScenes,
  onLoadScene,
  onDeleteScene,
  onExportAll,
  onImportFile,
  onExportVibeComponent,
  onExportStandaloneHtml,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/80">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <span>Bibliothèque de Scènes & Modules Vibe Designer</span>
              <span className="text-xs text-zinc-500 font-mono">({savedScenes.length})</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Stockage local 100% hors-ligne. Exportation en composants réutilisables pour le spectacle vivant.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action bar: Export / Import */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-zinc-900/40 border-b border-zinc-850 text-xs">
          <span className="text-zinc-400">Sauvegarde locale sur disque / IndexedDB</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onExportAll}
              className="px-2.5 py-1 text-zinc-300 hover:text-zinc-100 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sauvegarde Globale (.json)</span>
            </button>
            <label className="px-2.5 py-1 text-zinc-300 hover:text-zinc-100 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded transition-colors flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Importer</span>
              <input type="file" accept=".json" onChange={onImportFile} className="hidden" />
            </label>
          </div>
        </div>

        {/* Scene List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {savedScenes.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 text-xs space-y-2">
              <p>Aucune scène personnalisée enregistrée.</p>
              <p className="text-zinc-600">
                Dans l'Atelier Artiste, cliquez sur « Sauvegarder » pour créer un composant autonome réutilisable.
              </p>
            </div>
          ) : (
            savedScenes.map((scene) => (
              <div
                key={scene.id}
                className="p-3.5 bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-100 truncate">{scene.title}</span>
                    <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-cyan-400 text-[10px] font-mono">
                      {scene.engineId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{scene.savedAt}</span>
                    </span>
                    <span>·</span>
                    <span>{Object.keys(scene.uniforms).length} paramètres artistiques</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {/* Load Scene */}
                  <button
                    onClick={() => {
                      onLoadScene(scene);
                      onClose();
                    }}
                    className="px-2.5 py-1 bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-semibold rounded text-xs transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Charger</span>
                  </button>

                  {/* Export Vibe Component */}
                  {onExportVibeComponent && (
                    <button
                      onClick={() => onExportVibeComponent(scene)}
                      title="Exporter en composant modulaire .vibe.json pour No[co]de Vibe Designer"
                      className="px-2 py-1 text-zinc-300 hover:text-zinc-100 bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 rounded text-xs transition-colors flex items-center gap-1"
                    >
                      <Download className="w-3 h-3 text-cyan-400" />
                      <span>.vibe.json</span>
                    </button>
                  )}

                  {/* Export Standalone HTML */}
                  {onExportStandaloneHtml && (
                    <button
                      onClick={() => onExportStandaloneHtml(scene)}
                      title="Exporter en fichier HTML autonome exécutable hors-ligne (double-clic)"
                      className="px-2 py-1 text-emerald-400 hover:text-emerald-300 bg-zinc-850 hover:bg-zinc-800 border border-emerald-900/60 rounded text-xs transition-colors flex items-center gap-1"
                    >
                      <FileCode className="w-3 h-3" />
                      <span>.html Autonome</span>
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => onDeleteScene(scene.id)}
                    className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-zinc-800 transition-colors"
                    title="Supprimer la scène"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
