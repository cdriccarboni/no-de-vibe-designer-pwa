import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Square,
  SkipForward,
  SkipBack,
  Eye,
  EyeOff,
  Type,
  Mic,
  Monitor,
  Download,
  Upload,
  Settings,
  Plus,
  Trash2,
  Maximize2,
  Sparkles,
  FileText,
  RotateCcw,
  Check,
  ChevronRight,
  Globe
} from 'lucide-react';
import {
  surtitrageEngine,
  SurtitreItem,
  SurtitrageScreen
} from '../services/surtitrageEngine';

interface SurtitrageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SurtitrageStudioModal: React.FC<SurtitrageStudioModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [cues, setCues] = useState<SurtitreItem[]>(surtitrageEngine.getCues());
  const [screens, setScreens] = useState<SurtitrageScreen[]>(surtitrageEngine.getScreens());
  const [activeCueIndex, setActiveCueIndex] = useState(surtitrageEngine.getActiveCueIndex());
  const [isBlackout, setIsBlackout] = useState(surtitrageEngine.isBlackoutActive());
  const [isKaraokePlaying, setIsKaraokePlaying] = useState(surtitrageEngine.isKaraokeActive());
  const [playheadSec, setPlayheadSec] = useState(surtitrageEngine.getKaraokePlayhead());

  // Mode : 'conduite' ou 'edition'
  const [mode, setMode] = useState<'conduite' | 'edition'>('conduite');
  const [currentLang, setCurrentLang] = useState<'fr' | 'en' | 'it'>('fr');
  const [searchQuery, setSearchQuery] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [isProjectorWindowOpen, setIsProjectorWindowOpen] = useState(false);

  // Sync engine
  useEffect(() => {
    const unsub = surtitrageEngine.subscribe(() => {
      setCues([...surtitrageEngine.getCues()]);
      setScreens([...surtitrageEngine.getScreens()]);
      setActiveCueIndex(surtitrageEngine.getActiveCueIndex());
      setIsBlackout(surtitrageEngine.isBlackoutActive());
      setIsKaraokePlaying(surtitrageEngine.isKaraokeActive());
      setPlayheadSec(surtitrageEngine.getKaraokePlayhead());
    });
    return unsub;
  }, []);

  // Keyboard shortcut listener for live theater performance (Space = GO, Left/Right = Prev/Next, B = Blackout)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        surtitrageEngine.goNext();
      } else if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
        e.preventDefault();
        surtitrageEngine.goNext();
      } else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
        e.preventDefault();
        surtitrageEngine.goPrevious();
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        surtitrageEngine.toggleBlackout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const activeCue = cues[activeCueIndex];
  const nextCue = cues[activeCueIndex + 1];

  const handleImportSubmit = () => {
    if (!importText.trim()) return;
    if (importText.includes('-->')) {
      surtitrageEngine.importSRT(importText, currentLang);
    } else {
      surtitrageEngine.importPlainLines(importText, currentLang);
    }
    setIsImportModalOpen(false);
    setImportText('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 select-none">
      <div className="bg-[#171a1e] border border-[#2d333b] w-full max-w-6xl h-[92vh] rounded-xl flex flex-col overflow-hidden shadow-2xl">
        {/* ========================================================= */}
        {/* HEADER GLYPHEO-INSPIRED DU MODULE DE SURTITRAGE           */}
        {/* ========================================================= */}
        <div className="h-12 px-4 border-b border-[#2d333b] bg-[#171a1e] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded bg-[#090b0d] border border-[#454d57] flex items-center justify-center font-bold text-[#d7b86a] text-xs">
                S[t]
              </span>
              <div>
                <span className="font-bold text-sm text-zinc-100">
                  No[co]de Surtitrage & Karaoké Pro
                </span>
                <span className="ml-2 text-[10px] text-[#9ba4ae] font-mono">
                  Inspiré de Glypheo · 100% Natif & Offline
                </span>
              </div>
            </div>

            {/* Mode Conduite vs Édition */}
            <div className="flex border border-[#2d333b] rounded-lg overflow-hidden bg-[#1d2126] ml-4">
              <button
                type="button"
                onClick={() => setMode('conduite')}
                className={`px-3 py-1 text-xs font-bold transition-all ${
                  mode === 'conduite'
                    ? 'bg-[#8fa79d] text-black shadow'
                    : 'text-[#9ba4ae] hover:text-white'
                }`}
              >
                CONDUITE SPECTACLE
              </button>
              <button
                type="button"
                onClick={() => setMode('edition')}
                className={`px-3 py-1 text-xs font-bold transition-all ${
                  mode === 'edition'
                    ? 'bg-[#d7b86a] text-black shadow'
                    : 'text-[#9ba4ae] hover:text-white'
                }`}
              >
                ÉDITION & TEXTES
              </button>
            </div>

            {/* Sélecteur de langue */}
            <div className="flex items-center gap-1 bg-[#1d2126] border border-[#2d333b] rounded px-2 py-0.5 text-xs text-zinc-300">
              <Globe className="w-3 h-3 text-[#d7b86a]" />
              <select
                value={currentLang}
                onChange={(e) => setCurrentLang(e.target.value as any)}
                className="bg-transparent border-0 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="fr" className="bg-[#171a1e]">FR · Français</option>
                <option value="en" className="bg-[#171a1e]">EN · English</option>
                <option value="it" className="bg-[#171a1e]">IT · Italiano</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bouton Blackout (NOIR) */}
            <button
              type="button"
              onClick={() => surtitrageEngine.toggleBlackout()}
              className={`px-3 py-1 rounded text-xs font-black transition-all flex items-center gap-1.5 ${
                isBlackout
                  ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/40'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
              title="Blackout immédiat (Touche B)"
            >
              {isBlackout ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isBlackout ? 'NOIR ACTIF' : 'BLACKOUT'}</span>
            </button>

            {/* Bouton Sortie Projecteur Dédiée */}
            <button
              type="button"
              onClick={() => setIsProjectorWindowOpen(!isProjectorWindowOpen)}
              className="px-2.5 py-1 rounded bg-[#1d2126] border border-[#2d333b] hover:border-[#8fa79d] text-zinc-200 text-xs font-semibold flex items-center gap-1.5"
              title="Afficher la sortie plein écran pour le vidéoprojecteur"
            >
              <Monitor className="w-3.5 h-3.5 text-[#8fa79d]" />
              <span>Sortie Projecteur</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CORPS : MODE CONDUITE OU MODE ÉDITION                     */}
        {/* ========================================================= */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {mode === 'conduite' ? (
            /* ================= MODE CONDUITE EN SPECTACLE ================= */
            <div className="flex-1 grid grid-cols-[1fr_360px] min-h-0 overflow-hidden">
              {/* Colonne gauche : Le surtitre en cours & boutons GO géants */}
              <div className="p-6 flex flex-col justify-between bg-[#0f1115] border-r border-[#2d333b] overflow-hidden">
                {/* Numéro de CUE & Personnage */}
                <div className="flex items-center justify-between text-xs text-[#9ba4ae]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm px-2 py-0.5 rounded bg-[#1d2126] border border-[#2d333b] text-[#d7b86a] font-bold">
                      CUE {activeCue?.number || 1} / {cues.length}
                    </span>
                    {activeCue?.character && (
                      <span className="font-bold text-zinc-200 uppercase tracking-wider text-xs">
                        {activeCue.character}
                      </span>
                    )}
                  </div>
                  {activeCue?.notes && (
                    <span className="italic text-[#8fa79d]">
                      {activeCue.notes}
                    </span>
                  )}
                </div>

                {/* GRAND AFFICHAGE DU SURTITRE ACTUEL */}
                <div className="my-auto py-8 px-6 bg-[#171a1e] border border-[#2d333b] rounded-2xl shadow-inner relative flex flex-col items-center justify-center text-center min-h-[220px]">
                  {isBlackout ? (
                    <div className="text-zinc-600 font-bold uppercase tracking-widest text-lg">
                      [ ÉCRAN NOIR / BLACKOUT ACTIF ]
                    </div>
                  ) : activeCue ? (
                    <div className="max-w-3xl leading-snug">
                      {/* Affichage standard ou Karaoké interactif mot à mot */}
                      {activeCue.karaokeWords && activeCue.karaokeWords.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 text-3xl font-bold tracking-tight">
                          {activeCue.karaokeWords.map((kw) => {
                            const isSung = isKaraokePlaying && playheadSec >= kw.startOffset;
                            return (
                              <span
                                key={kw.id}
                                className={`transition-colors duration-100 ${
                                  isSung ? 'text-[#d7b86a] underline underline-offset-8' : 'text-zinc-200'
                                }`}
                              >
                                {kw.word}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-3xl font-bold text-white tracking-tight">
                          {activeCue.texts[currentLang] || activeCue.texts.fr}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-zinc-500">Aucun surtitre actif</div>
                  )}

                  {/* Contrôle Karaoké local si mots découpés */}
                  {activeCue?.karaokeWords && (
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-[#9ba4ae] border-t border-[#2d333b]/60 pt-2">
                      <div className="flex items-center gap-2">
                        <Mic className="w-3.5 h-3.5 text-[#d7b86a]" />
                        <span>Mode Karaoké Synchrone</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (isKaraokePlaying) {
                              surtitrageEngine.stopKaraokePlayback();
                            } else {
                              surtitrageEngine.startKaraokePlayback();
                            }
                          }}
                          className="px-2 py-0.5 rounded bg-[#1d2126] border border-[#d7b86a] text-[#d7b86a] font-bold text-[10px] hover:bg-[#d7b86a] hover:text-black"
                        >
                          {isKaraokePlaying ? '■ Pause Karaoké' : '▶ Play Karaoké'}
                        </button>
                      </div>
                      <span className="font-mono text-zinc-400">
                        {playheadSec.toFixed(1)}s
                      </span>
                    </div>
                  )}
                </div>

                {/* CARTE DU SURTITRE SUIVANT (POUR ANTICIPATION RÉGIE) */}
                <div className="p-3 bg-[#1d2126] border border-[#2d333b] rounded-lg text-xs flex items-center justify-between text-[#9ba4ae]">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider shrink-0">
                      Suivant :
                    </span>
                    <span className="text-zinc-300 truncate">
                      {nextCue ? `${nextCue.number}. ${nextCue.texts[currentLang] || nextCue.texts.fr}` : 'Fin du spectacle'}
                    </span>
                  </div>
                  {nextCue?.character && (
                    <span className="text-[10px] text-[#8fa79d] shrink-0 font-medium ml-2">
                      ({nextCue.character})
                    </span>
                  )}
                </div>

                {/* BOUTON GO GÉANT & NAVIGATION DE CONDUITE */}
                <div className="grid grid-cols-4 gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => surtitrageEngine.goPrevious()}
                    className="py-4 bg-[#1d2126] border border-[#2d333b] hover:border-zinc-500 rounded-xl text-zinc-200 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                    title="Surtitre précédent (Flèche Gauche)"
                  >
                    <SkipBack className="w-4 h-4" />
                    <span>PRÉCÉDENT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => surtitrageEngine.goNext()}
                    className="col-span-2 py-4 bg-[#8fa79d] hover:bg-[#a0b8af] text-black font-black text-xl rounded-xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all"
                    title="Déclencher le surtitre suivant (Barre d'espace)"
                  >
                    <span>GO !</span>
                    <span className="text-xs font-bold font-mono opacity-80">(Espace)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => surtitrageEngine.goNext()}
                    className="py-4 bg-[#1d2126] border border-[#2d333b] hover:border-zinc-500 rounded-xl text-zinc-200 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                    title="Surtitre suivant (Flèche Droite)"
                  >
                    <span>SUIVANT</span>
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Colonne droite : Liste complète des Cues avec sélection rapide */}
              <div className="bg-[#171a1e] flex flex-col min-h-0 overflow-hidden">
                <div className="p-3 border-b border-[#2d333b] flex items-center justify-between">
                  <span className="font-bold text-xs text-zinc-200">
                    Conduite ({cues.length} Cues)
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrer..."
                    className="w-32 bg-[#090b0d] border border-[#2d333b] rounded px-2 py-0.5 text-xs text-zinc-200 focus:outline-none focus:border-[#d7b86a]"
                  />
                </div>

                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                  {cues.map((c, idx) => {
                    const isActive = idx === activeCueIndex;
                    if (searchQuery && !c.texts[currentLang]?.toLowerCase().includes(searchQuery.toLowerCase())) {
                      return null;
                    }

                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => surtitrageEngine.goToCue(idx)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                          isActive
                            ? 'bg-[#1d2126] border-[#8fa79d] ring-1 ring-[#8fa79d]/50 text-white'
                            : 'border-transparent hover:bg-[#1d2126] text-zinc-300'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                          isActive ? 'bg-[#8fa79d] text-black' : 'bg-zinc-800 text-[#9ba4ae]'
                        }`}>
                          {c.number}
                        </span>
                        <div className="leading-snug min-w-0">
                          {c.character && (
                            <span className="text-[10px] text-[#d7b86a] font-bold uppercase block">
                              {c.character}
                            </span>
                          )}
                          <div className="text-xs truncate">
                            {c.texts[currentLang] || c.texts.fr}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ================= MODE ÉDITION DES TEXTES ================= */
            <div className="flex-1 flex flex-col min-h-0 p-4 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => surtitrageEngine.addCue(activeCueIndex)}
                    className="px-3 py-1.5 rounded-md bg-[#d7b86a] text-black font-bold text-xs flex items-center gap-1.5 hover:bg-[#e4ca86]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter un surtitre</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-3 py-1.5 rounded-md bg-[#1d2126] border border-[#2d333b] hover:border-zinc-400 text-zinc-200 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Importer (SRT, VTT, Word, TXT)</span>
                  </button>
                </div>

                <div className="text-xs text-[#9ba4ae]">
                  Modification en temps réel · Sauvegarde automatique dans le navigateur
                </div>
              </div>

              {/* Table d'édition */}
              <div className="flex-1 overflow-auto bg-[#0f1115] border border-[#2d333b] rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#171a1e] sticky top-0 border-b border-[#2d333b] text-[#9ba4ae] text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="p-2 w-12 text-center">N°</th>
                      <th className="p-2 w-32">Personnage</th>
                      <th className="p-2">Texte Français</th>
                      <th className="p-2">Texte Anglais</th>
                      <th className="p-2 w-48">Didascalie / TOP</th>
                      <th className="p-2 w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cues.map((cue, idx) => (
                      <tr key={cue.id} className="border-b border-[#2d333b]/40 hover:bg-[#1d2126]/60">
                        <td className="p-2 font-mono text-center text-zinc-400">
                          {cue.number}
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={cue.character || ''}
                            onChange={(e) => surtitrageEngine.updateCueCharacter(idx, e.target.value)}
                            placeholder="Personnage..."
                            className="w-full bg-[#090b0d] border border-[#2d333b] rounded px-2 py-1 text-xs text-[#d7b86a] font-semibold focus:outline-none focus:border-[#d7b86a]"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={cue.texts.fr || ''}
                            onChange={(e) => surtitrageEngine.updateCueText(idx, 'fr', e.target.value)}
                            className="w-full bg-[#090b0d] border border-[#2d333b] rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-[#d7b86a]"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={cue.texts.en || ''}
                            onChange={(e) => surtitrageEngine.updateCueText(idx, 'en', e.target.value)}
                            className="w-full bg-[#090b0d] border border-[#2d333b] rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-[#d7b86a]"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={cue.notes || ''}
                            onChange={(e) => surtitrageEngine.updateCueNotes(idx, e.target.value)}
                            placeholder="TOP régie..."
                            className="w-full bg-[#090b0d] border border-[#2d333b] rounded px-2 py-1 text-xs text-[#8fa79d] italic focus:outline-none focus:border-[#d7b86a]"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => surtitrageEngine.removeCue(idx)}
                            className="p-1 rounded text-zinc-400 hover:text-red-400"
                            title="Supprimer ce surtitre"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pop-up d'importation de texte ou SRT */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#171a1e] border border-[#2d333b] w-full max-w-lg rounded-xl p-4 flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2d333b] pb-2">
              <span className="font-bold text-sm text-zinc-100">
                Importer des Surtitres (SRT, VTT ou Texte brut)
              </span>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#9ba4ae]">
              Colle ici le contenu d’un fichier de sous-titres .srt, .vtt, ou une liste de lignes issues de Word ou Excel :
            </p>

            <textarea
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="1&#10;00:00:01,000 --> 00:00:04,000&#10;Texte du premier surtitre...&#10;&#10;ou simplement une ligne par surtitre."
              className="w-full bg-[#090b0d] border border-[#2d333b] rounded p-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-[#d7b86a]"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-[#2d333b]">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-3 py-1.5 rounded text-xs text-zinc-300 hover:bg-zinc-800"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleImportSubmit}
                className="px-4 py-1.5 rounded bg-[#d7b86a] text-black font-bold text-xs hover:bg-[#e4ca86]"
              >
                Importer et Remplacer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fenêtre de sortie projecteur autonome (Overlay plein écran) */}
      {isProjectorWindowOpen && (
        <div className="fixed inset-0 z-70 bg-black flex flex-col items-center justify-center p-8 select-none">
          <button
            type="button"
            onClick={() => setIsProjectorWindowOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white"
            title="Fermer la projection"
          >
            <X className="w-5 h-5" />
          </button>

          {!isBlackout && activeCue && (
            <div className="max-w-5xl text-center">
              {activeCue.character && (
                <div className="text-xl font-bold uppercase tracking-widest text-[#d7b86a] mb-2 font-mono">
                  {activeCue.character}
                </div>
              )}
              <div className="text-5xl md:text-6xl font-bold text-white tracking-tight leading-snug drop-shadow-2xl">
                {activeCue.texts[currentLang] || activeCue.texts.fr}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
