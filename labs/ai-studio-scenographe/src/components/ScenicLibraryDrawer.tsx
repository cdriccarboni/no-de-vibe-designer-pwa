// Bibliothèque d'Éléments Scénographiques Réutilisables & Blocs Composés
// No[co]de Vibe Designer — Gestion des prototypes de spectacle, ajout sur Timeline et regroupement

import React, { useState } from 'react';
import {
  ReusableScenicElement,
  ScenicCategory,
  TimelineTrack
} from '../types/timeline';
import {
  Layers,
  X,
  Plus,
  Bookmark,
  Sparkles,
  Download,
  Upload,
  User,
  Wand2,
  Volume2,
  FolderPlus,
  Check
} from 'lucide-react';

interface ScenicLibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  library: ReusableScenicElement[];
  tracks: TimelineTrack[];
  currentTimeSec: number;
  onInsertElementToTimeline: (element: ReusableScenicElement, trackId: string) => void;
  onCreateCompoundBlock: (name: string, selectedElementIds: string[]) => void;
}

export const ScenicLibraryDrawer: React.FC<ScenicLibraryDrawerProps> = ({
  isOpen,
  onClose,
  library,
  tracks,
  currentTimeSec,
  onInsertElementToTimeline,
  onCreateCompoundBlock
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [selectedElementIdsForGroup, setSelectedElementIdsForGroup] = useState<string[]>([]);
  const [isGroupingMode, setIsGroupingMode] = useState(false);
  const [groupName, setGroupName] = useState('');

  if (!isOpen) return null;

  const categories = [
    'Tous',
    'Personnages & Ombres',
    'Lumière & Créatures',
    'Effets Visuels & Shaders',
    'Matières & Environnements',
    'Blocs Composés'
  ];

  const filtered = selectedCategory === 'Tous'
    ? library
    : library.filter((e) => e.category === selectedCategory);

  const toggleSelectForGroup = (id: string) => {
    setSelectedElementIdsForGroup((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedElementIdsForGroup.length < 2) return;
    onCreateCompoundBlock(groupName.trim(), selectedElementIdsForGroup);
    setGroupName('');
    setSelectedElementIdsForGroup([]);
    setIsGroupingMode(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#14171a] border border-[#303740] rounded-xl shadow-2xl flex flex-col text-xs text-[#f2f3f4] max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#101214] border-b border-[#303740] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded bg-[#d7b86a]/20 text-[#d7b86a]">
              <Bookmark className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-semibold text-sm text-[#f2f3f4]">
                Bibliothèque d’Éléments de Spectacle
              </h3>
              <p className="text-[10px] text-[#a0a8b0]">
                Personnages, silhouettes isolées, créatures lumineuses, shaders et blocs composés
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsGroupingMode(!isGroupingMode)}
              className={`px-3 py-1.5 rounded font-medium flex items-center gap-1.5 border transition-colors ${
                isGroupingMode
                  ? 'bg-amber-950/40 border-amber-500 text-amber-300'
                  : 'bg-[#171a1e] border-[#303740] text-[#a0a8b0] hover:text-[#f2f3f4]'
              }`}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>{isGroupingMode ? 'Annuler Regroupement' : 'Regrouper en Bloc Composé'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded text-[#a0a8b0] hover:text-[#f2f3f4] hover:bg-[#20242a]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barre de Mode Regroupement si active */}
        {isGroupingMode && (
          <div className="p-3 bg-amber-950/20 border-b border-amber-900/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[11px] text-amber-300 font-semibold whitespace-nowrap">
                Nouveau Bloc Composé :
              </span>
              <input
                type="text"
                placeholder="Nom du bloc composé (ex : Duo Pirate + Écho Slit-Scan)..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="flex-1 px-3 py-1 bg-[#101214] border border-[#303740] rounded text-xs text-[#f2f3f4]"
              />
            </div>
            <button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedElementIdsForGroup.length < 2}
              className="px-3 py-1 bg-[#d7b86a] hover:bg-[#c4a457] text-[#101214] font-bold rounded flex items-center gap-1.5 disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Fusionner ({selectedElementIdsForGroup.length} éléments)</span>
            </button>
          </div>
        )}

        {/* Filtres par Catégorie */}
        <div className="px-5 py-2.5 bg-[#171a1e] border-b border-[#303740] flex items-center gap-1.5 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#d7b86a] text-[#101214] font-bold'
                  : 'text-[#a0a8b0] hover:text-[#f2f3f4] hover:bg-[#20242a]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grille des Éléments */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((elem) => {
            const isSelectedForGroup = selectedElementIdsForGroup.includes(elem.id);

            return (
              <div
                key={elem.id}
                className={`p-3.5 bg-[#171a1e] border rounded-lg flex flex-col justify-between transition-all ${
                  isSelectedForGroup
                    ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-950/15'
                    : 'border-[#303740] hover:border-zinc-500'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: elem.color }}
                      />
                      <h4 className="font-semibold text-xs text-[#f2f3f4]">{elem.name}</h4>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono px-1.5 py-0.5 rounded bg-[#101214]">
                      {elem.defaultDuration}s
                    </span>
                  </div>

                  <p className="text-[11px] text-[#a0a8b0] leading-relaxed mb-3">
                    {elem.description}
                  </p>

                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono mb-3">
                    <span className="px-1.5 py-0.5 rounded bg-[#101214] border border-[#303740]">
                      {elem.category}
                    </span>
                    {elem.visualFx !== 'none' && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-950/50 border border-purple-800/60 text-purple-300">
                        FX: {elem.visualFx}
                      </span>
                    )}
                    {elem.isCompound && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-950/50 border border-amber-800/60 text-amber-300">
                        Composé
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions sur l'élément */}
                <div className="pt-2 border-t border-[#303740]/60 flex items-center justify-between gap-2">
                  {isGroupingMode ? (
                    <button
                      onClick={() => toggleSelectForGroup(elem.id)}
                      className={`w-full py-1.5 rounded font-medium text-[11px] border flex items-center justify-center gap-1.5 ${
                        isSelectedForGroup
                          ? 'bg-amber-600 text-zinc-950 border-amber-500 font-bold'
                          : 'bg-[#101214] text-[#a0a8b0] border-[#303740] hover:text-[#f2f3f4]'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSelectedForGroup ? 'Sélectionné pour fusion' : 'Sélectionner'}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 w-full">
                      {/* Choix du layer de destination */}
                      <select
                        id={`dest-track-${elem.id}`}
                        defaultValue={elem.defaultTrackId}
                        className="bg-[#101214] border border-[#303740] rounded px-2 py-1 text-[11px] text-[#a0a8b0] focus:outline-none"
                      >
                        {tracks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => {
                          const selectEl = document.getElementById(
                            `dest-track-${elem.id}`
                          ) as HTMLSelectElement;
                          const trackId = selectEl ? selectEl.value : elem.defaultTrackId;
                          onInsertElementToTimeline(elem, trackId);
                          onClose();
                        }}
                        className="flex-1 py-1.5 px-3 bg-[#d7b86a] hover:bg-[#c4a457] text-[#101214] font-semibold rounded text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Insérer sur la Timeline (@{currentTimeSec.toFixed(1)}s)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
