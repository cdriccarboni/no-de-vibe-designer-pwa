import React, { useState, useEffect } from 'react';
import { themeEngine, NoCodeTheme, PRESET_THEMES, OFFICIAL_THEME } from '../services/themeEngine';
import { Palette, X, RotateCcw, Download, Upload, Check, Sparkles, Layers, Sliders } from 'lucide-react';

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({ isOpen, onClose }) => {
  const [currentTheme, setCurrentTheme] = useState<NoCodeTheme>(() => themeEngine.getTheme());
  const [allThemes, setAllThemes] = useState<NoCodeTheme[]>(() => themeEngine.getAllThemes());
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');

  useEffect(() => {
    if (!isOpen) return;
    const unsub = themeEngine.subscribe((t) => {
      setCurrentTheme(t);
      setAllThemes(themeEngine.getAllThemes());
    });
    return unsub;
  }, [isOpen]);

  const handleSelectPreset = (t: NoCodeTheme) => {
    themeEngine.setTheme(t);
  };

  const handleResetOfficial = () => {
    themeEngine.resetToOfficial();
  };

  const handleColorChange = (key: keyof NoCodeTheme['colors'], value: string) => {
    const updated: NoCodeTheme = {
      ...currentTheme,
      id: currentTheme.isOfficial ? `custom-${Date.now()}` : currentTheme.id,
      name: currentTheme.isOfficial ? `${currentTheme.name} (Modifié)` : currentTheme.name,
      isOfficial: false,
      colors: {
        ...currentTheme.colors,
        [key]: value,
      },
    };
    themeEngine.saveCustomTheme(updated);
  };

  const handleExportJson = () => {
    const json = themeEngine.exportCurrentThemeAsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nocode-theme-${currentTheme.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        themeEngine.importThemeFromJson(text);
      } catch (err) {
        alert('Format de thème invalide.');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 lg:p-6 select-none overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#0e1115] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#12161c] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-400 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  Personnalisation Graphique & Thèmes No[co]de
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  Zéro impact sur les projections
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Thème officiel par défaut • Personnalisation des blocs, connexions, panneaux et timeline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetOfficial}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs flex items-center gap-1.5 transition-colors"
              title="Rétablir le thème officiel No[co]de"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Thème Officiel</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 bg-[#101318] border-b border-zinc-850 text-xs shrink-0">
          <button
            onClick={() => setActiveTab('presets')}
            className={`py-2 px-4 rounded-t-lg font-medium border-t border-x transition-colors ${
              activeTab === 'presets'
                ? 'bg-[#0e1115] text-cyan-400 border-zinc-800'
                : 'text-zinc-400 border-transparent hover:text-white'
            }`}
          >
            Palettes Prédéfinies
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`py-2 px-4 rounded-t-lg font-medium border-t border-x transition-colors ${
              activeTab === 'custom'
                ? 'bg-[#0e1115] text-purple-400 border-zinc-800'
                : 'text-zinc-400 border-transparent hover:text-white'
            }`}
          >
            Éditeur de Couleurs Détaillé
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'presets' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allThemes.map((theme) => {
                const isSelected = currentTheme.id === theme.id;
                return (
                  <div
                    key={theme.id}
                    onClick={() => handleSelectPreset(theme)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#141820] border-cyan-500 shadow-lg shadow-cyan-950/30'
                        : 'bg-[#12151b] border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white">{theme.name}</h4>
                          {theme.isOfficial && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                              OFFICIEL
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1">{theme.description}</p>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-cyan-500 text-black flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Color swatches preview */}
                    <div className="mt-4 flex items-center gap-1.5 pt-3 border-t border-zinc-800/80">
                      <div
                        className="w-5 h-5 rounded-md border border-white/20"
                        style={{ backgroundColor: theme.colors.bgRoot }}
                        title="Fond"
                      />
                      <div
                        className="w-5 h-5 rounded-md border border-white/20"
                        style={{ backgroundColor: theme.colors.accentPrimary }}
                        title="Accent Principal"
                      />
                      <div
                        className="w-5 h-5 rounded-md border border-white/20"
                        style={{ backgroundColor: theme.colors.accentSecondary }}
                        title="Accent Secondaire"
                      />
                      <div
                        className="w-5 h-5 rounded-md border border-white/20"
                        style={{ backgroundColor: theme.colors.blockGenerative }}
                        title="Blocs Génératifs"
                      />
                      <div
                        className="w-5 h-5 rounded-md border border-white/20"
                        style={{ backgroundColor: theme.colors.wireData }}
                        title="Câbles Connexion"
                      />
                      <div
                        className="w-5 h-5 rounded-md border border-white/20"
                        style={{ backgroundColor: theme.colors.timelineTrackBg }}
                        title="Timeline"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Category 1 : Structure & Accents */}
              <div className="bg-[#12151b] p-4 rounded-xl border border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Structure & Accents
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Fond Global</label>
                    <input
                      type="color"
                      value={currentTheme.colors.bgRoot}
                      onChange={(e) => handleColorChange('bgRoot', e.target.value)}
                      className="w-full h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Panneaux Régie</label>
                    <input
                      type="color"
                      value={currentTheme.colors.bgPanel}
                      onChange={(e) => handleColorChange('bgPanel', e.target.value)}
                      className="w-full h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Accent Principal</label>
                    <input
                      type="color"
                      value={currentTheme.colors.accentPrimary}
                      onChange={(e) => handleColorChange('accentPrimary', e.target.value)}
                      className="w-full h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Accent Or / Scénique</label>
                    <input
                      type="color"
                      value={currentTheme.colors.accentSecondary}
                      onChange={(e) => handleColorChange('accentSecondary', e.target.value)}
                      className="w-full h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Category 2 : Blocs du Patch & Catégories */}
              <div className="bg-[#12151b] p-4 rounded-xl border border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Blocs de Patch & Modules
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Génératif</label>
                    <input
                      type="color"
                      value={currentTheme.colors.blockGenerative}
                      onChange={(e) => handleColorChange('blockGenerative', e.target.value)}
                      className="w-full h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Audio</label>
                    <input
                      type="color"
                      value={currentTheme.colors.blockAudio}
                      onChange={(e) => handleColorChange('blockAudio', e.target.value)}
                      className="w-full h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Effets Vidéo</label>
                    <input
                      type="color"
                      value={currentTheme.colors.blockVisualFx}
                      onChange={(e) => handleColorChange('blockVisualFx', e.target.value)}
                      className="w-full h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Contrôle / OSC</label>
                    <input
                      type="color"
                      value={currentTheme.colors.blockControl}
                      onChange={(e) => handleColorChange('blockControl', e.target.value)}
                      className="w-full h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Sorties VP</label>
                    <input
                      type="color"
                      value={currentTheme.colors.blockOutput}
                      onChange={(e) => handleColorChange('blockOutput', e.target.value)}
                      className="w-full h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Category 3 : Câbles & Connexions */}
              <div className="bg-[#12151b] p-4 rounded-xl border border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Câbles & Liens de Patch
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Données / TOP</label>
                    <input
                      type="color"
                      value={currentTheme.colors.wireData}
                      onChange={(e) => handleColorChange('wireData', e.target.value)}
                      className="w-full h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Flux Audio</label>
                    <input
                      type="color"
                      value={currentTheme.colors.wireAudio}
                      onChange={(e) => handleColorChange('wireAudio', e.target.value)}
                      className="w-full h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Flux Vidéo</label>
                    <input
                      type="color"
                      value={currentTheme.colors.wireVideo}
                      onChange={(e) => handleColorChange('wireVideo', e.target.value)}
                      className="w-full h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Impulsion / Trigger</label>
                    <input
                      type="color"
                      value={currentTheme.colors.wirePulse}
                      onChange={(e) => handleColorChange('wirePulse', e.target.value)}
                      className="w-full h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-[#12161c] flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter Thème JSON</span>
            </button>

            <label className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 flex items-center gap-1.5 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Importer Thème</span>
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors"
          >
            Appliquer et Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
