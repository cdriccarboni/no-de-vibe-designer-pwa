// Modal interactif d'aide-mémoire et de configuration des Raccourcis Clavier Régie Live
// No[co]de Vibe Designer — Cue Cart 4x4
import React, { useState, useEffect } from 'react';
import {
  Keyboard,
  X,
  Play,
  Square,
  ShieldAlert,
  Volume2,
  VolumeX,
  Shuffle,
  Sliders,
  Check,
  Zap,
  HelpCircle,
  FolderOpen
} from 'lucide-react';

export type ColumnTriggerMode = 'step' | 'all' | 'direct';
export type KeyboardLayoutType = 'azerty' | 'qwerty';

interface CartKeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  columnTriggerMode: ColumnTriggerMode;
  onChangeColumnTriggerMode: (mode: ColumnTriggerMode) => void;
  onApplyLayoutPreset: (layout: KeyboardLayoutType) => void;
  onTriggerColumn: (colIndex: number) => void;
  onStopAll: () => void;
  onPanic: () => void;
  onToast?: (msg: string) => void;
}

export const CartKeyboardShortcutsModal: React.FC<CartKeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  columnTriggerMode,
  onChangeColumnTriggerMode,
  onApplyLayoutPreset,
  onTriggerColumn,
  onStopAll,
  onPanic,
  onToast
}) => {
  const [lastKeyPressed, setLastKeyPressed] = useState<{ key: string; code: string; desc: string } | null>(null);
  const [selectedTab, setSelectedTab] = useState<'shortcuts' | 'config'>('shortcuts');

  // Écouteur pour la zone de test de touches
  useEffect(() => {
    if (!isOpen) return;

    const handleTestKey = (e: KeyboardEvent) => {
      // Ignorer si dans un input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      let desc = 'Touche libre';
      if (e.code === 'Space' || e.key === ' ') desc = '⏹️ STOP ALL (Arrêt doux de tous les pads)';
      else if (e.key === 'Escape') desc = '🚨 PANIC GÉNÉRAL (Coupure d’urgence nette)';
      else if (e.code === 'Digit1' || e.key === '1') desc = '⌨️ Déclenchement Colonne 1 (Pads 1, 5, 9, 13)';
      else if (e.code === 'Digit2' || e.key === '2') desc = '⌨️ Déclenchement Colonne 2 (Pads 2, 6, 10, 14)';
      else if (e.code === 'Digit3' || e.key === '3') desc = '⌨️ Déclenchement Colonne 3 (Pads 3, 7, 11, 15)';
      else if (e.code === 'Digit4' || e.key === '4') desc = '⌨️ Déclenchement Colonne 4 (Pads 4, 8, 12, 16)';
      else if (e.key.toLowerCase() === 'm') desc = '🔇 Mute / Rétablissement Master Fader';
      else if (e.key.toLowerCase() === 'x') desc = '🔀 Bascule Crossfade Auto';
      else if (e.key === 'ArrowUp') desc = '🔊 Augmenter Master Volume (+5%)';
      else if (e.key === 'ArrowDown') desc = '🔉 Baisser Master Volume (-5%)';
      else if (['a', 'b', 'c', 'd'].includes(e.key.toLowerCase()) && e.shiftKey) desc = `📂 Changement rapide vers Banque ${e.key.toUpperCase()}`;

      setLastKeyPressed({
        key: e.key === ' ' ? 'Espace' : e.key,
        code: e.code,
        desc
      });
    };

    window.addEventListener('keydown', handleTestKey);
    return () => window.removeEventListener('keydown', handleTestKey);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#11151c] border border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* En-tête du Modal */}
        <div className="px-4 py-3 bg-gradient-to-r from-[#171d28] via-[#1b2230] to-[#171d28] border-b border-[#2d3748] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>Raccourcis Clavier Régie Live</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  ACTIFS
                </span>
              </h2>
              <p className="text-[10px] text-zinc-400">
                Déclenchement instantané à haute réactivité pour pupitre et régie de spectacle
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Onglets */}
            <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-zinc-800 text-[10px]">
              <button
                type="button"
                onClick={() => setSelectedTab('shortcuts')}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  selectedTab === 'shortcuts'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Aide-Mémoire
              </button>
              <button
                type="button"
                onClick={() => setSelectedTab('config')}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  selectedTab === 'config'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Configuration Mode 1-4
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              title="Fermer (Touche Échap)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Corps du Modal avec Défilement */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {selectedTab === 'shortcuts' ? (
            <>
              {/* SECTION PRINCIPALE : LES COMMANDES DE RÉGIE PHARES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. TOUCHES 1 À 4 : COLONNES */}
                <div className="bg-[#161c26] border border-amber-500/40 rounded-xl p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded font-mono font-black text-xs bg-amber-400 text-zinc-950 shadow-sm border border-amber-300">
                          1
                        </span>
                        <span className="px-2 py-0.5 rounded font-mono font-black text-xs bg-amber-400 text-zinc-950 shadow-sm border border-amber-300">
                          2
                        </span>
                        <span className="px-2 py-0.5 rounded font-mono font-black text-xs bg-amber-400 text-zinc-950 shadow-sm border border-amber-300">
                          3
                        </span>
                        <span className="px-2 py-0.5 rounded font-mono font-black text-xs bg-amber-400 text-zinc-950 shadow-sm border border-amber-300">
                          4
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-amber-300 font-bold bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-700/60">
                        {columnTriggerMode === 'step' ? 'SÉQUENTIEL / STEP' : columnTriggerMode === 'all' ? 'PLEIN FEU' : 'LIGNE 1'}
                      </span>
                    </div>
                    <div className="font-bold text-white text-xs mb-1">
                      Déclencher les Colonnes 1 à 4
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      Lance le pad de la colonne correspondante. En mode séquentiel, chaque appui avance au pad suivant dans la colonne (parfait pour contrôler 4 pistes ou scènes en direct).
                    </p>
                  </div>
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-zinc-800">
                    {[0, 1, 2, 3].map((colIdx) => (
                      <button
                        key={colIdx}
                        type="button"
                        onClick={() => onTriggerColumn(colIdx)}
                        className="flex-1 py-1 rounded bg-black/40 hover:bg-amber-500/20 border border-zinc-700 hover:border-amber-400 text-[10px] font-mono text-zinc-300 font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Play className="w-2.5 h-2.5 text-amber-400 fill-current" />
                        <span>Col {colIdx + 1}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. TOUCHE ESPACE : STOP ALL */}
                <div className="bg-[#161c26] border border-amber-500/40 rounded-xl p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="px-3 py-0.5 rounded font-mono font-black text-xs bg-amber-400 text-zinc-950 shadow-sm border border-amber-300">
                        ESPACE (SPACEBAR)
                      </span>
                      <span className="text-[9px] font-mono text-amber-300 font-bold bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-700/60">
                        STOP DOUX
                      </span>
                    </div>
                    <div className="font-bold text-white text-xs mb-1">
                      STOP ALL : Arrêt doux des flux
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      Coupe en douceur tous les pads actuellement en cours de lecture avec leurs rampes de fondu. Raccourci standard des pupitres de régie.
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={onStopAll}
                      className="w-full py-1 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>Tester Stop All (Espace)</span>
                    </button>
                  </div>
                </div>

                {/* 3. TOUCHE ÉCHAP : PANIC HARD STOP */}
                <div className="bg-[#1f1315] border border-red-500/40 rounded-xl p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="px-2.5 py-0.5 rounded font-mono font-black text-xs bg-red-600 text-white shadow-sm border border-red-400">
                        ÉCHAP (ESCAPE)
                      </span>
                      <span className="text-[9px] font-mono text-red-300 font-bold bg-red-950 px-1.5 py-0.5 rounded border border-red-800">
                        URGENCE HARD
                      </span>
                    </div>
                    <div className="font-bold text-white text-xs mb-1">
                      PANIC : Arrêt d’Urgence Brutal
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      Coupe instantanément le bus audio Web Audio (volume 0), envoie un Panic réseau QLab / OSC et réinitialise tous les états en régie.
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-red-950">
                    <button
                      type="button"
                      onClick={onPanic}
                      className="w-full py-1 rounded bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white border border-red-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Exécuter Panic d'Urgence</span>
                    </button>
                  </div>
                </div>

                {/* 4. MASTER VOLUME & MUTE (M & FLÈCHES) */}
                <div className="bg-[#131824] border border-cyan-500/40 rounded-xl p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-cyan-950 text-cyan-200 border border-cyan-600">
                          M
                        </span>
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-cyan-950 text-cyan-200 border border-cyan-600">
                          ↑
                        </span>
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-cyan-950 text-cyan-200 border border-cyan-600">
                          ↓
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-cyan-300 font-bold bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                        MASTER AUDIO
                      </span>
                    </div>
                    <div className="font-bold text-white text-xs mb-1">
                      Contrôle Master Fader & Silence
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      <strong>M</strong> : Bascule Mute / Rétablissement audio Master.<br />
                      <strong>↑ / ↓</strong> : Ajuste le Master Fader par pas de 5%.
                    </p>
                  </div>
                  <div className="text-[10px] text-cyan-400 font-mono mt-2 pt-2 border-t border-cyan-950">
                    Modulation en temps réel du bus cartBusGain
                  </div>
                </div>
              </div>

              {/* TABLEAU DES AUTRES RACCOURCIS CLAVIER LIVE */}
              <div className="bg-[#0b0e13] border border-[#262f3f] rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-[#121620] border-b border-[#262f3f] flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide">
                    Tous les raccourcis disponibles en direct
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono">
                    Sensible au focus hors des champs texte
                  </span>
                </div>

                <div className="divide-y divide-[#1e2533] text-[11px]">
                  <div className="px-3 py-1.5 flex items-center justify-between hover:bg-white/5">
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-600 font-mono text-amber-300 text-[10px]">
                        Alt + 1..4
                      </kbd>
                      <span className="text-zinc-300">Plein Feu Colonne (Déclenchement simultané de la colonne)</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">Colonnes 1 à 4</span>
                  </div>

                  <div className="px-3 py-1.5 flex items-center justify-between hover:bg-white/5">
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-600 font-mono text-indigo-300 text-[10px]">
                        X
                      </kbd>
                      <span className="text-zinc-300">Bascule On / Off du Crossfade Automatique multi-layers</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">Transitions</span>
                  </div>

                  <div className="px-3 py-1.5 flex items-center justify-between hover:bg-white/5">
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-600 font-mono text-amber-300 text-[10px]">
                        Shift + A / B / C / D
                      </kbd>
                      <span className="text-zinc-300">Changement immédiat vers Banque A, B, C ou D</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">Banques</span>
                  </div>

                  <div className="px-3 py-1.5 flex items-center justify-between hover:bg-white/5">
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-600 font-mono text-cyan-300 text-[10px]">
                        V ou G
                      </kbd>
                      <span className="text-zinc-300">Bascule d'affichage : Vue Grille 4x4 ↔ Vue Dossiers / Scènes</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">Affichage</span>
                  </div>

                  <div className="px-3 py-1.5 flex items-center justify-between hover:bg-white/5">
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-600 font-mono text-zinc-300 text-[10px]">
                        ? ou Ctrl+K
                      </kbd>
                      <span className="text-zinc-300">Ouvrir / Fermer cette fenêtre d'aide des raccourcis</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">Aide</span>
                  </div>
                </div>
              </div>

              {/* ZONE DE TEST DIRECT DU CLAVIER PHYSIQUE */}
              <div className="p-3 bg-[#0d121c] border border-amber-500/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-zinc-300 font-bold text-xs">
                    Détection clavier en direct :
                  </span>
                  {lastKeyPressed ? (
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-0.5 rounded bg-amber-400 text-black font-mono font-bold text-xs shadow">
                        {lastKeyPressed.key}
                      </kbd>
                      <span className="text-amber-200 text-xs font-semibold">
                        ➜ {lastKeyPressed.desc}
                      </span>
                    </div>
                  ) : (
                    <span className="text-zinc-500 text-xs italic">
                      Appuyez sur une touche pour tester la réponse...
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* ONGLET CONFIGURATION DU COMPORTEMENT DES TOUCHES 1-4 ET DU CLAVIER */
            <div className="space-y-4">
              {/* SÉLECTEUR DE MODE POUR LES TOUCHES 1 À 4 */}
              <div className="bg-[#151922] border border-amber-500/40 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span>Mode de Déclenchement des Touches 1, 2, 3, 4</span>
                  </label>
                  <span className="text-[9px] font-mono text-zinc-400">Sélection active</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {[
                    {
                      id: 'step' as ColumnTriggerMode,
                      title: 'Séquentiel / Step',
                      desc: 'Chaque appui avance au pad suivant dans la colonne (1 -> 5 -> 9 -> 13) avec fondu.',
                      badge: 'Recommandé Spectacle'
                    },
                    {
                      id: 'all' as ColumnTriggerMode,
                      title: 'Plein Feu / All',
                      desc: 'Déclenche simultanément tous les pads de la colonne pour des superpositions massives.',
                      badge: 'Layering'
                    },
                    {
                      id: 'direct' as ColumnTriggerMode,
                      title: 'Pad Direct Ligne 1',
                      desc: 'Touche 1 = Pad 1, Touche 2 = Pad 2, Touche 3 = Pad 3, Touche 4 = Pad 4.',
                      badge: 'Standard'
                    }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        onChangeColumnTriggerMode(mode.id);
                        if (onToast) onToast(`Mode Touches 1-4 : ${mode.title}`);
                      }}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        columnTriggerMode === mode.id
                          ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                          : 'bg-black/30 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-white">{mode.title}</span>
                          {columnTriggerMode === mode.id && <Check className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-snug">{mode.desc}</p>
                      </div>
                      <span className="text-[8px] font-mono text-amber-300 mt-2 self-start bg-black/40 px-1 py-0.2 rounded border border-amber-500/30">
                        {mode.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* PRÉSETS DE DISPOSITION CLAVIER POUR LES 16 PADS (AZERTY / QWERTY) */}
              <div className="bg-[#151922] border border-cyan-500/40 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Keyboard className="w-4 h-4 text-cyan-400" />
                    <span>Disposition Clavier des 16 Pads (AZERTY / QWERTY)</span>
                  </label>
                  <span className="text-[9px] font-mono text-cyan-300">Adaptation Régie</span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Applique automatiquement les raccourcis claviers correspondant à votre type de clavier pour déclencher directement chacun des 16 pads :
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-black/40 border border-zinc-800 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-white text-xs mb-1">Disposition AZERTY (France)</div>
                      <div className="font-mono text-[10px] text-zinc-400 space-y-0.5 mb-2">
                        <div>Rangée 1 : 1, 2, 3, 4</div>
                        <div>Rangée 2 : A, Z, E, R</div>
                        <div>Rangée 3 : Q, S, D, F</div>
                        <div>Rangée 4 : W, X, C, V</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onApplyLayoutPreset('azerty')}
                      className="px-3 py-1.5 rounded bg-cyan-600/30 hover:bg-cyan-500 text-cyan-200 hover:text-black font-bold text-xs border border-cyan-500/40 transition-colors"
                    >
                      Appliquer Mapping AZERTY
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-zinc-800 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-white text-xs mb-1">Disposition QWERTY (International)</div>
                      <div className="font-mono text-[10px] text-zinc-400 space-y-0.5 mb-2">
                        <div>Rangée 1 : 1, 2, 3, 4</div>
                        <div>Rangée 2 : Q, W, E, R</div>
                        <div>Rangée 3 : A, S, D, F</div>
                        <div>Rangée 4 : Z, X, C, V</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onApplyLayoutPreset('qwerty')}
                      className="px-3 py-1.5 rounded bg-cyan-600/30 hover:bg-cyan-500 text-cyan-200 hover:text-black font-bold text-xs border border-cyan-500/40 transition-colors"
                    >
                      Appliquer Mapping QWERTY
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied du Modal */}
        <div className="px-4 py-2.5 bg-[#0e1218] border-t border-[#232a36] flex items-center justify-between text-xs">
          <span className="text-[10px] text-zinc-500 font-mono">
            Raccourcis actifs en arrière-plan pendant toute la session de spectacle
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition-colors"
          >
            Fermer l'Aide
          </button>
        </div>
      </div>
    </div>
  );
};
