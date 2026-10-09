import React, { useState, useEffect } from 'react';
import {
  Sliders,
  X,
  Plus,
  Trash2,
  Volume2,
  RefreshCw,
  Sparkles,
  Music,
  Zap,
  Check,
  AlertCircle,
  Laptop,
  Download,
  Upload,
  Radio,
  Play,
  Square
} from 'lucide-react';
import {
  midiDeviceEngine,
  MidiDevice,
  MidiMappingRule,
  MidiLearnState
} from '../services/midiDeviceEngine';
import { patchGraphEngine, PatchNode } from '../services/patchGraphEngine';

interface MidiHubStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MidiHubStudioModal: React.FC<MidiHubStudioModalProps> = ({ isOpen, onClose }) => {
  const [devices, setDevices] = useState<MidiDevice[]>(midiDeviceEngine.getDevices());
  const [mappings, setMappings] = useState<MidiMappingRule[]>(midiDeviceEngine.getMappings());
  const [learnState, setLearnState] = useState<MidiLearnState>(midiDeviceEngine.getLearnState());
  const [activity, setActivity] = useState<string>(midiDeviceEngine.getLastActivity());
  const [isSupported, setIsSupported] = useState<boolean>(midiDeviceEngine.isMidiSupported());
  const [nodes, setNodes] = useState<PatchNode[]>(patchGraphEngine.getNodes());

  // Virtual controller values
  const [virtualKnobs, setVirtualKnobs] = useState<number[]>([0.5, 0.25, 0.75, 0.6]);
  const [virtualFaders, setVirtualFaders] = useState<number[]>([0.8, 0.4, 0.9, 0.3]);
  const [activePad, setActivePad] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setDevices(midiDeviceEngine.getDevices());
    setMappings([...midiDeviceEngine.getMappings()]);
    setLearnState(midiDeviceEngine.getLearnState());
    setActivity(midiDeviceEngine.getLastActivity());
    setIsSupported(midiDeviceEngine.isMidiSupported());
    setNodes([...patchGraphEngine.getNodes()]);

    const unsubMidi = midiDeviceEngine.subscribe(() => {
      setDevices([...midiDeviceEngine.getDevices()]);
      setMappings([...midiDeviceEngine.getMappings()]);
      setLearnState(midiDeviceEngine.getLearnState());
      setActivity(midiDeviceEngine.getLastActivity());
      setIsSupported(midiDeviceEngine.isMidiSupported());
    });

    const unsubPatch = patchGraphEngine.subscribe(() => {
      setNodes([...patchGraphEngine.getNodes()]);
    });

    return () => {
      unsubMidi();
      unsubPatch();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartLearnForNode = (nodeId: string, paramKey: string) => {
    midiDeviceEngine.startMidiLearn(nodeId, paramKey);
  };

  const handleCancelLearn = () => {
    midiDeviceEngine.cancelMidiLearn();
  };

  const handleSimulateKnob = (index: number, ccNum: number, val: number) => {
    const next = [...virtualKnobs];
    next[index] = val;
    setVirtualKnobs(next);
    midiDeviceEngine.simulateMidiMessage('cc', ccNum, val, 1);
  };

  const handleSimulateFader = (index: number, ccNum: number, val: number) => {
    const next = [...virtualFaders];
    next[index] = val;
    setVirtualFaders(next);
    midiDeviceEngine.simulateMidiMessage('cc', ccNum, val, 1);
  };

  const handleTriggerPad = (padIdx: number, noteNum: number) => {
    setActivePad(padIdx);
    midiDeviceEngine.simulateMidiMessage('note', noteNum, 1.0, 1);
    setTimeout(() => setActivePad(null), 250);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 select-none">
      <div className="bg-[#171a1e] border border-[#2d333b] w-full max-w-4xl max-h-[92vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden font-sans text-zinc-100">
        {/* Top Header */}
        <div className="h-14 px-5 border-b border-[#2d333b] bg-[#101214] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1d2126] border border-[#2d333b] p-1.5 flex items-center justify-center text-[#d7b86a]">
              <Sliders className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
                <span>MIDI Hub Plug & Play & MIDI Learn</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500 text-emerald-300 font-bold">
                  DÉTECTION À CHAUD
                </span>
              </div>
              <div className="text-[10px] text-[#9ba4ae]">
                Association en 1 clic de tout contrôleur physique ou logiciel (Ableton Live, Korg, Arturia, Novation)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => midiDeviceEngine.initMidi()}
              className="p-1.5 rounded-lg bg-[#1d2126] border border-[#2d333b] hover:border-[#8fa79d] text-zinc-300 hover:text-white transition-all"
              title="Scanner à nouveau les périphériques MIDI"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#1d2126] border border-[#2d333b] hover:border-red-500 text-zinc-400 hover:text-red-300 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5 text-xs">
          {/* Status & Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Status Web MIDI */}
            <div className="p-3 bg-[#1d2126] border border-[#2d333b] rounded-xl flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full shrink-0 ${isSupported ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <div>
                <div className="font-bold text-white text-[11px]">
                  {isSupported ? 'Moteur Web MIDI Actif' : 'Mode Émulation & API MIDI'}
                </div>
                <div className="text-[10px] text-[#9ba4ae]">
                  {devices.length} périphérique(s) détecté(s)
                </div>
              </div>
            </div>

            {/* Activité Temps Réel */}
            <div className="p-3 bg-[#1d2126] border border-[#2d333b] rounded-xl flex items-center gap-3 md:col-span-2">
              <div className="w-2 h-2 rounded-full bg-[#d7b86a] shrink-0 animate-ping" />
              <div className="flex-1 truncate">
                <span className="text-[10px] uppercase font-bold text-[#9ba4ae] tracking-wider block">Dernière Activité MIDI</span>
                <span className="font-mono text-zinc-200 text-[11px] font-semibold">{activity}</span>
              </div>
              {learnState.isActive && (
                <button
                  type="button"
                  onClick={handleCancelLearn}
                  className="px-2.5 py-1 bg-red-950/70 border border-red-500 text-red-200 rounded text-[10px] font-bold hover:bg-red-900"
                >
                  Annuler Learn
                </button>
              )}
            </div>
          </div>

          {/* Learn Mode Active Warning Box */}
          {learnState.isActive && (
            <div className="p-4 bg-amber-950/40 border border-amber-500/80 rounded-xl flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold text-amber-200 text-sm">
                    Mode MIDI LEARN Enclenché !
                  </div>
                  <div className="text-zinc-300 text-xs mt-0.5">
                    Tourne un bouton ou appuie sur une touche de ton contrôleur (ou teste le contrôleur virtuel ci-dessous) pour associer à <strong className="text-white">{learnState.targetParamKey}</strong>.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelLearn}
                className="px-3 py-1.5 bg-[#171a1e] border border-amber-500 text-amber-300 hover:text-white rounded-lg font-bold text-xs"
              >
                Annuler
              </button>
            </div>
          )}

          {/* Contrôleur Virtuel de Test Rapide */}
          <div className="p-4 bg-[#101214] border border-[#2d333b] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-[#d7b86a]" />
                <span className="font-bold text-white text-xs">Contrôleur Virtuel Immédiat (Test & Validation Plug & Play)</span>
              </div>
              <span className="text-[10px] text-[#9ba4ae]">
                Manipulez les potentiomètres ou pads pour déclencher le MIDI Learn instantanément
              </span>
            </div>

            {/* 4 Knobs */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Knob 1 · CC 16', cc: 16 },
                { label: 'Knob 2 · CC 17', cc: 17 },
                { label: 'Knob 3 · CC 18', cc: 18 },
                { label: 'Knob 4 · CC 19', cc: 19 },
              ].map((k, idx) => (
                <div key={k.cc} className="bg-[#1d2126] p-2.5 rounded-lg border border-[#2d333b] flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-zinc-300 font-semibold">{k.label}</span>
                    <span className="font-mono text-[#d7b86a]">{Math.round(virtualKnobs[idx] * 127)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={virtualKnobs[idx]}
                    onChange={(e) => handleSimulateKnob(idx, k.cc, parseFloat(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded appearance-none accent-[#d7b86a] cursor-pointer"
                  />
                </div>
              ))}
            </div>

            {/* 4 Faders + 4 Drum Pads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* 4 Faders */}
              <div className="bg-[#1d2126] p-3 rounded-lg border border-[#2d333b] space-y-2">
                <span className="text-[10px] font-bold text-[#9ba4ae] uppercase tracking-wider block">Faders Linéaires</span>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'CC 20', cc: 20 },
                    { label: 'CC 21', cc: 21 },
                    { label: 'CC 22', cc: 22 },
                    { label: 'CC 23', cc: 23 },
                  ].map((f, idx) => (
                    <div key={f.cc} className="flex flex-col items-center gap-1">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={virtualFaders[idx]}
                        onChange={(e) => handleSimulateFader(idx, f.cc, parseFloat(e.target.value))}
                        className="h-20 w-1.5 appearance-none bg-zinc-800 rounded accent-[#8fa79d] cursor-pointer"
                        style={{ writingMode: 'vertical-lr' as any, direction: 'rtl' }}
                      />
                      <span className="text-[9px] font-mono text-zinc-400">{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4 Drum Pads */}
              <div className="bg-[#1d2126] p-3 rounded-lg border border-[#2d333b] space-y-2">
                <span className="text-[10px] font-bold text-[#9ba4ae] uppercase tracking-wider block">Pads de Vélocité / Notes</span>
                <div className="grid grid-cols-2 gap-2 h-[88px]">
                  {[
                    { label: 'Kick (Note 36)', note: 36 },
                    { label: 'Snare (Note 38)', note: 38 },
                    { label: 'Clap (Note 40)', note: 40 },
                    { label: 'Laser (Note 42)', note: 42 },
                  ].map((pad, idx) => (
                    <button
                      key={pad.note}
                      type="button"
                      onClick={() => handleTriggerPad(idx, pad.note)}
                      className={`rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        activePad === idx
                          ? 'bg-[#d7b86a] border-[#d7b86a] text-black scale-95 shadow-lg shadow-[#d7b86a]/30'
                          : 'bg-[#171a1e] border-[#2d333b] hover:border-[#8fa79d] text-zinc-300'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{pad.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tableau des Mappings Existants */}
          <div className="p-4 bg-[#1d2126] border border-[#2d333b] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-[#8fa79d]" />
                <span className="font-bold text-white text-xs">
                  Mappings Actifs ({mappings.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => midiDeviceEngine.clearAllMappings()}
                  className="px-2 py-1 rounded bg-[#171a1e] border border-[#2d333b] hover:border-red-500 text-zinc-400 hover:text-red-400 text-[10px] font-semibold"
                >
                  Tout Effacer
                </button>
              </div>
            </div>

            {mappings.length === 0 ? (
              <div className="p-6 text-center text-zinc-400 bg-[#101214] rounded-lg border border-[#2d333b]">
                Aucun mapping pour l'instant. Clique sur <strong>MIDI LEARN</strong> dans l'inspecteur d'un nœud ou ci-dessous pour associer un paramètre.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#2d333b] text-[#9ba4ae] text-[10px] uppercase">
                      <th className="pb-2">Message</th>
                      <th className="pb-2">Canal</th>
                      <th className="pb-2">Nœud Ciblé</th>
                      <th className="pb-2">Paramètre</th>
                      <th className="pb-2">Plage</th>
                      <th className="pb-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d333b]">
                    {mappings.map((m) => {
                      const targetNode = nodes.find((n) => n.id === m.targetNodeId);
                      return (
                        <tr key={m.id} className="text-zinc-200">
                          <td className="py-2 font-mono font-bold text-[#d7b86a]">
                            {m.messageType.toUpperCase()} {m.number}
                          </td>
                          <td className="py-2 text-zinc-400">Canal {m.channel}</td>
                          <td className="py-2 font-semibold">{targetNode?.name || m.targetNodeId}</td>
                          <td className="py-2 text-[#8fa79d] font-mono">{m.targetParamKey}</td>
                          <td className="py-2 text-zinc-400 text-[10px]">
                            {m.minRange} ➔ {m.maxRange}
                          </td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              onClick={() => midiDeviceEngine.removeMapping(m.id)}
                              className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-red-950/30"
                              title="Supprimer ce mapping"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Learn from Patch Nodes */}
          <div className="p-4 bg-[#101214] border border-[#2d333b] rounded-xl space-y-3">
            <span className="text-[10px] font-bold text-[#9ba4ae] uppercase tracking-wider block">
              Paramètres du Patch Actuel — Association 1-Clic
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {nodes.map((n) => (
                <div key={n.id} className="bg-[#1d2126] p-2.5 rounded-lg border border-[#2d333b] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{n.name}</span>
                    <span className="text-[9px] font-mono text-[#9ba4ae]">{n.category}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.values(n.params).map((p) => {
                      const isMapped = mappings.some(
                        (m) => m.targetNodeId === n.id && m.targetParamKey === p.key
                      );
                      const isCurrentlyLearning =
                        learnState.isActive &&
                        learnState.targetNodeId === n.id &&
                        learnState.targetParamKey === p.key;

                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => handleStartLearnForNode(n.id, p.key)}
                          className={`px-2 py-1 rounded text-[10px] font-semibold border flex items-center gap-1 transition-all ${
                            isCurrentlyLearning
                              ? 'bg-amber-500 text-black border-amber-400 animate-pulse font-bold'
                              : isMapped
                              ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                              : 'bg-[#171a1e] border-[#2d333b] text-zinc-300 hover:border-[#d7b86a]'
                          }`}
                        >
                          <span>{p.label}</span>
                          {isMapped && <Check className="w-3 h-3 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Guide Ableton Live */}
          <div className="p-4 bg-[#1d2126] border border-[#2d333b] rounded-xl text-zinc-300 space-y-2">
            <div className="font-bold text-white flex items-center gap-2">
              <Music className="w-4 h-4 text-[#d7b86a]" />
              <span>Intégration Ableton Live & Max for Live</span>
            </div>
            <p className="text-xs text-[#9ba4ae] leading-relaxed">
              Pour relier Ableton Live à No[co]de : activez le bus <strong>Driver IAC</strong> (macOS) ou installez <strong>loopMIDI</strong> (Windows). Dans les préférences MIDI d'Ableton, cochez "Piste" et "Télécommande" pour ce bus. Tout message CC ou note envoyé depuis une piste Ableton ou un patch Max for Live sera immédiatement intercepté par No[co]de en direct sans latence.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 px-5 border-t border-[#2d333b] bg-[#101214] flex items-center justify-between shrink-0">
          <span className="text-[10px] text-[#9ba4ae] font-mono">
            No[co]de Plug & Play Engine v3.3.9 · Sauvegarde locale persistante
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1d2126] border border-[#2d333b] hover:border-[#d7b86a] text-zinc-200 font-bold text-xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
