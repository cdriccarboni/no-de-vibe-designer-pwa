// Modal interactif de mapping contextuel MIDI Learn pour CueCartPanel
// Permet d'assigner dynamiquement des faders, pads, boutons et molettes externes aux pads du cartoucheur
import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  X,
  Zap,
  Check,
  Volume2,
  Play,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Radio,
  Sparkles,
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  midiDeviceEngine,
  RawMidiMessage,
  getMidiNoteName
} from '../services/midiDeviceEngine';
import { CartPad, PadMidiBinding } from './CueCartPanel';
import { scenicAudio } from '../services/scenicAudioEngine';

interface PadMidiMappingContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  pad: CartPad | null;
  allPads: CartPad[];
  onUpdateBinding: (padId: string, binding: PadMidiBinding | null) => void;
  onSelectPad: (padId: string) => void;
  onTestTriggerPad: (padId: string) => void;
  onToast?: (msg: string) => void;
}

interface DetectedController {
  type: 'note' | 'cc' | 'pitchbend';
  number: number;
  channel: number;
  velocity: number; // 0..1
  rawValue: number; // 0..127
  noteName?: string;
  timestamp: number;
}

export const PadMidiMappingContextModal: React.FC<PadMidiMappingContextModalProps> = ({
  isOpen,
  onClose,
  pad,
  allPads,
  onUpdateBinding,
  onSelectPad,
  onTestTriggerPad,
  onToast
}) => {
  const [detectedController, setDetectedController] = useState<DetectedController | null>(null);
  const [autoAssign, setAutoAssign] = useState<boolean>(true);
  const [selectedRole, setSelectedRole] = useState<'trigger' | 'volume'>('trigger');
  const [threshold, setThreshold] = useState<number>(0.35); // 35% ~ CC 45
  const [selectedChannel, setSelectedChannel] = useState<number>(1);
  const [manualNumber, setManualNumber] = useState<number>(36);
  const [manualType, setManualType] = useState<'note' | 'cc'>('note');
  const [isOmniChannel, setIsOmniChannel] = useState<boolean>(false);
  const [lastAssignedInfo, setLastAssignedInfo] = useState<string | null>(null);
  const pulseTimer = useRef<number | null>(null);

  // Initialisation à l'ouverture ou au changement de pad ciblé
  useEffect(() => {
    if (!pad) return;

    if (pad.midiBinding) {
      setSelectedRole(pad.midiBinding.role || 'trigger');
      setThreshold(pad.midiBinding.threshold ?? 0.35);
      setSelectedChannel(pad.midiBinding.channel === 0 ? 1 : pad.midiBinding.channel);
      setIsOmniChannel(pad.midiBinding.channel === 0);
      setManualNumber(pad.midiBinding.number);
      setManualType(pad.midiBinding.messageType);
    } else {
      // Valeurs par défaut intelligentes basées sur la grille
      const defaultNote = 36 + pad.gridIndex;
      setSelectedRole('trigger');
      setThreshold(0.35);
      setSelectedChannel(1);
      setIsOmniChannel(false);
      setManualNumber(defaultNote);
      setManualType('note');
    }
  }, [pad]);

  // Écoute temps réel des flux MIDI bruts (Hot Listen)
  useEffect(() => {
    if (!isOpen || !pad) return;

    const unsubRaw = midiDeviceEngine.onRawMessage((msg: RawMidiMessage) => {
      const rawVal = Math.round(msg.velocity * 127);
      const isNote = msg.type === 'note';
      const noteName = isNote ? getMidiNoteName(msg.number) : undefined;

      const detected: DetectedController = {
        type: msg.type,
        number: msg.number,
        channel: msg.channel,
        velocity: msg.velocity,
        rawValue: rawVal,
        noteName,
        timestamp: Date.now()
      };

      setDetectedController(detected);

      // Si l'assignation automatique est activée et qu'on reçoit une frappe ou mouvement significatif
      if (autoAssign) {
        // Pour une note : nécessite noteOn (vélocité > 0)
        // Pour un CC : mouvement ou fader
        const isValidInput = isNote ? msg.velocity > 0 : true;

        if (isValidInput) {
          // Détermination du rôle par défaut : les CC peuvent être des faders ou boutons
          const roleToSet: 'trigger' | 'volume' = msg.type === 'cc' ? selectedRole : 'trigger';

          const newBinding: PadMidiBinding = {
            messageType: msg.type === 'note' ? 'note' : 'cc',
            number: msg.number,
            channel: isOmniChannel ? 0 : msg.channel,
            noteName,
            role: roleToSet,
            threshold: roleToSet === 'trigger' && msg.type === 'cc' ? threshold : undefined
          };

          onUpdateBinding(pad.id, newBinding);
          scenicAudio.playPreset('crystal_resonance', 0.4);

          const desc = `${msg.type.toUpperCase()} #${msg.number}${noteName ? ` [${noteName}]` : ''} (Canal ${msg.channel})`;
          setLastAssignedInfo(`Assigné : ${desc}`);

          if (onToast) {
            onToast(`✨ Pad ${pad.numberLabel} (${pad.label}) assigné dynamiquement à ${desc} !`);
          }

          if (pulseTimer.current) clearTimeout(pulseTimer.current);
          pulseTimer.current = window.setTimeout(() => setLastAssignedInfo(null), 3000);
        }
      }
    });

    return () => {
      unsubRaw();
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
    };
  }, [isOpen, pad, autoAssign, selectedRole, threshold, isOmniChannel, onUpdateBinding, onToast]);

  if (!isOpen || !pad) return null;

  // Calcul du pad précédent / suivant
  const currentIndex = allPads.findIndex((p) => p.id === pad.id);
  const prevPad = currentIndex > 0 ? allPads[currentIndex - 1] : allPads[allPads.length - 1];
  const nextPad = currentIndex < allPads.length - 1 ? allPads[currentIndex + 1] : allPads[0];

  // Vérification de conflits avec d'autres pads
  const conflictPad = detectedController
    ? allPads.find(
        (p) =>
          p.id !== pad.id &&
          p.midiBinding &&
          p.midiBinding.messageType === (detectedController.type === 'note' ? 'note' : 'cc') &&
          p.midiBinding.number === detectedController.number &&
          (p.midiBinding.channel === 0 || p.midiBinding.channel === detectedController.channel)
      )
    : null;

  // Assignation manuelle du contrôleur détecté
  const handleAssignDetected = () => {
    if (!detectedController) return;

    const newBinding: PadMidiBinding = {
      messageType: detectedController.type === 'note' ? 'note' : 'cc',
      number: detectedController.number,
      channel: isOmniChannel ? 0 : detectedController.channel,
      noteName: detectedController.noteName,
      role: detectedController.type === 'cc' ? selectedRole : 'trigger',
      threshold: selectedRole === 'trigger' && detectedController.type === 'cc' ? threshold : undefined
    };

    onUpdateBinding(pad.id, newBinding);
    scenicAudio.playPreset('crystal_resonance', 0.4);

    const desc = `${newBinding.messageType.toUpperCase()} #${newBinding.number}${newBinding.noteName ? ` [${newBinding.noteName}]` : ''}`;
    setLastAssignedInfo(`Assigné : ${desc}`);

    if (onToast) {
      onToast(`✨ Pad ${pad.numberLabel} assigné avec succès à ${desc} !`);
    }
  };

  // Sauvegarde des paramètres manuels (rôle, seuil, canal)
  const handleSaveManual = () => {
    const newBinding: PadMidiBinding = {
      messageType: manualType,
      number: manualNumber,
      channel: isOmniChannel ? 0 : selectedChannel,
      noteName: manualType === 'note' ? getMidiNoteName(manualNumber) : undefined,
      role: manualType === 'cc' ? selectedRole : 'trigger',
      threshold: manualType === 'cc' && selectedRole === 'trigger' ? threshold : undefined
    };

    onUpdateBinding(pad.id, newBinding);
    scenicAudio.playPreset('crystal_resonance', 0.4);

    if (onToast) {
      onToast(`✅ Mapping enregistré pour le Pad ${pad.numberLabel} (${pad.label})`);
    }
  };

  const handleClearBinding = () => {
    onUpdateBinding(pad.id, null);
    if (onToast) {
      onToast(`🗑️ Assignation MIDI retirée du Pad ${pad.numberLabel}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#0e1219] border border-amber-500/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* EN-TÊTE DU CONTEXTE DE MAPPING */}
        <div className="px-4 py-3 bg-gradient-to-r from-[#171d28] via-[#1a2130] to-[#171d28] border-b border-[#2d3748] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-950 font-black text-sm shadow-md"
              style={{ backgroundColor: pad.color }}
            >
              {pad.numberLabel}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white tracking-wide">
                  MIDI LEARN CONTEXTUEL — PAD {pad.numberLabel}
                </h2>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold flex items-center gap-1">
                  <Activity className="w-2.5 h-2.5 animate-pulse text-amber-400" />
                  DÉTECTION À CHAUD
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                <span className="text-zinc-200 font-semibold">{pad.label}</span>
                {pad.customLabel && (
                  <span className="text-amber-400 font-mono text-[10px]">({pad.customLabel})</span>
                )}
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-500">{pad.groupName || 'Cartoucheur'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Navigation Pad Précédent / Suivant */}
            <button
              type="button"
              onClick={() => onSelectPad(prevPad.id)}
              className="p-1.5 rounded-lg bg-[#141a24] hover:bg-[#1e2736] border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white transition-all text-xs flex items-center gap-1"
              title={`Passer au Pad précédent (${prevPad.numberLabel} - ${prevPad.label})`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono text-zinc-500 px-1">
              {currentIndex + 1}/16
            </span>
            <button
              type="button"
              onClick={() => onSelectPad(nextPad.id)}
              className="p-1.5 rounded-lg bg-[#141a24] hover:bg-[#1e2736] border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white transition-all text-xs flex items-center gap-1"
              title={`Passer au Pad suivant (${nextPad.numberLabel} - ${nextPad.label})`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#141a24] hover:bg-red-950/60 border border-zinc-700 hover:border-red-500 text-zinc-400 hover:text-red-200 transition-all ml-2"
              title="Fermer la fenêtre de mapping (Échap)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SELECTEUR RAPIDE MINI-GRILLE 4x4 DES PADS */}
        <div className="px-4 py-2 bg-[#090c10] border-b border-[#1c2433] flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider mr-1 hidden sm:inline">
              Pads du Cart :
            </span>
            <div className="grid grid-cols-16 gap-1">
              {allPads.map((p) => {
                const isCurrent = p.id === pad.id;
                const hasBinding = !!p.midiBinding;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectPad(p.id)}
                    className={`w-6 h-6 rounded flex items-center justify-center font-mono text-[9px] font-black transition-all ${
                      isCurrent
                        ? 'ring-2 ring-amber-400 text-zinc-950 font-bold scale-110 shadow-md'
                        : hasBinding
                        ? 'bg-[#18202d] border border-amber-500/50 text-amber-300 hover:border-amber-400'
                        : 'bg-[#10141c] border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                    }`}
                    style={{
                      backgroundColor: isCurrent ? p.color : undefined
                    }}
                    title={`Pad ${p.numberLabel} : ${p.label}${hasBinding ? ' (Mappé)' : ''}`}
                  >
                    {p.numberLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[10px] text-amber-300 cursor-pointer select-none bg-amber-950/40 px-2 py-1 rounded border border-amber-600/40 hover:bg-amber-950/60 transition-colors">
              <input
                type="checkbox"
                checked={autoAssign}
                onChange={(e) => setAutoAssign(e.target.checked)}
                className="w-3.5 h-3.5 accent-amber-400 rounded cursor-pointer"
              />
              <span className="font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Auto-Assign à la frappe / mouvement
              </span>
            </label>
          </div>
        </div>

        {/* CORPS DU MODAL : RADAR DE DÉTECTION & OPTIONS DU MAPPING */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* BANDEAU DE STATUT D'ASSIGNATION RAPIDE */}
          {lastAssignedInfo && (
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/80 text-emerald-200 text-xs flex items-center justify-between animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 font-semibold">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{lastAssignedInfo}</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">
                Opérationnel en régie
              </span>
            </div>
          )}

          {/* ZONE 1 : DÉTECTEUR EN DIRECT DU CONTRÔLEUR PHYSIQUE (HOT-LEARN RADAR) */}
          <div className="bg-[#121722] border-2 border-dashed border-amber-500/50 rounded-xl p-3.5 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <Activity className="w-3.5 h-3.5 animate-spin text-amber-400" />
                </div>
                <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
                  Radar Détecteur de Contrôleur MIDI en Direct
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 bg-black/40 px-2 py-0.5 rounded border border-zinc-800">
                Touchez un fader, pad ou bouton...
              </span>
            </div>

            {detectedController ? (
              <div className="bg-[#0b0e14] border border-[#232b3b] rounded-lg p-3 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {detectedController.type === 'note' ? '🥁 NOTE / PAD' : '🎛️ CONTROL CHANGE (FADER / POTARD)'}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {detectedController.type === 'note'
                        ? `Note #${detectedController.number} (${detectedController.noteName || 'Note'})`
                        : `CC #${detectedController.number}`}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded">
                      Canal {detectedController.channel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-amber-400 font-bold">
                      Valeur : {detectedController.rawValue} / 127 ({Math.round(detectedController.velocity * 100)}%)
                    </span>
                    {!autoAssign && (
                      <button
                        type="button"
                        onClick={handleAssignDetected}
                        className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1 shadow-md transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Assigner ce Contrôleur</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Jauge visuelle de niveau / vélocité */}
                <div className="space-y-1">
                  <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-75"
                      style={{ width: `${Math.round(detectedController.velocity * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-zinc-500">
                    <span>0 (Min)</span>
                    <span>64 (Médian)</span>
                    <span>127 (Plein Débattement)</span>
                  </div>
                </div>

                {/* Avertissement de conflit éventuel */}
                {conflictPad && (
                  <div className="p-2 rounded bg-amber-950/60 border border-amber-600/60 text-amber-300 text-[11px] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Attention : Ce contrôleur est déjà associé au <strong>Pad {conflictPad.numberLabel} ({conflictPad.label})</strong>. Vous pouvez soit le réassigner, soit partager le déclencheur.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-zinc-400 italic bg-[#0b0e14]/50 rounded-lg border border-dashed border-zinc-800">
                Actionnez une touche, déplacez un fader physique ou tournez un potentiomètre pour détecter son identifiant Web MIDI instantanément.
              </div>
            )}
          </div>

          {/* ZONE 2 : ASSIGNATION ACTUELLE ET RÔLE FONCTIONNEL */}
          <div className="bg-[#121620] border border-[#263143] rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-zinc-200 tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Assignation Actuelle du Pad {pad.numberLabel}
              </span>
              {pad.midiBinding ? (
                <button
                  type="button"
                  onClick={handleClearBinding}
                  className="text-[10px] text-red-400 hover:text-red-300 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Détacher le mapping</span>
                </button>
              ) : (
                <span className="text-[10px] text-zinc-500 italic">Aucun mapping actif</span>
              )}
            </div>

            {pad.midiBinding ? (
              <div className="p-3 bg-[#0a0d14] border border-amber-500/40 rounded-lg flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-xs">
                    {pad.midiBinding.messageType === 'note' ? 'N' : 'CC'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>
                        {pad.midiBinding.messageType === 'note'
                          ? `Note #${pad.midiBinding.number} (${pad.midiBinding.noteName || 'Note'})`
                          : `Control Change (CC) #${pad.midiBinding.number}`}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded">
                        {pad.midiBinding.channel === 0 ? 'Omni (Tous Canaux)' : `Canal ${pad.midiBinding.channel}`}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      Rôle :{' '}
                      <strong className="text-amber-300">
                        {pad.midiBinding.role === 'volume'
                          ? 'Fader de Volume Continu'
                          : pad.midiBinding.messageType === 'cc'
                          ? `Déclencheur par Seuil (${Math.round((pad.midiBinding.threshold ?? 0.35) * 100)}%)`
                          : 'Déclencheur de Pad (Frappe)'}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onTestTriggerPad(pad.id)}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1 transition-colors"
                    title="Déclencher le son de ce pad"
                  >
                    <Play className="w-3 h-3 text-emerald-400" />
                    <span>Tester Pad</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      midiDeviceEngine.simulateMidiMessage(
                        pad.midiBinding!.messageType,
                        pad.midiBinding!.number,
                        0.9,
                        pad.midiBinding!.channel || 1
                      );
                    }}
                    className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1 transition-colors"
                    title="Simuler un coup de fader ou une frappe MIDI matérielle"
                  >
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Simuler Signal</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-[#0a0d14] border border-zinc-800 rounded-lg text-xs text-zinc-400 italic">
                Ce pad n’est pas encore assigné à un contrôleur matériel externe. Actionnez un fader ou un pad avec l’Auto-Assign coché pour le lier immédiatement.
              </div>
            )}

            {/* CHOIX DU RÔLE FONCTIONNEL POUR LES FADERS & POTENTIOMÈTRES */}
            <div className="pt-2 border-t border-[#1e2634] space-y-2">
              <label className="text-[11px] font-bold text-zinc-300 block">
                Comportement Fonctionnel du Contrôleur Externe :
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole('trigger')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    selectedRole === 'trigger'
                      ? 'bg-amber-950/40 border-amber-400 text-white shadow-md'
                      : 'bg-[#0a0d14] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Déclencheur de Pad (Trigger)</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-tight">
                    Frappe de pad (Note On) ou montée de fader au-dessus du seuil déclenchant la lecture du pad.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('volume')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    selectedRole === 'volume'
                      ? 'bg-indigo-950/40 border-indigo-400 text-white shadow-md'
                      : 'bg-[#0a0d14] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Fader de Volume Continu (CC)</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-tight">
                    Le fader physique contrôle en direct et en continu le volume spécifique de ce pad de 0% à 100%.
                  </p>
                </button>
              </div>

              {/* Si Déclencheur par Seuil sur un fader CC */}
              {selectedRole === 'trigger' && (
                <div className="p-2.5 bg-[#0a0d14] border border-zinc-800 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-300 font-semibold">
                      Seuil de Déclenchement pour Fader / Potard CC :
                    </span>
                    <span className="font-mono text-amber-400 font-bold">
                      {Math.round(threshold * 100)}% (Valeur CC ~ {Math.round(threshold * 127)})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.95"
                    step="0.05"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="w-full h-1.5 accent-amber-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                    <span>Sensibilité Haute (10%)</span>
                    <span>Par défaut (35%)</span>
                    <span>Haut de Fader (80%)</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ZONE 3 : SÉLECTEURS AVANCÉS & PRÉSETS MATÉRIELS CLASSIQUES */}
          <div className="bg-[#121620] border border-[#263143] rounded-xl p-3.5 space-y-3">
            <span className="text-xs font-bold uppercase text-zinc-300 tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Sélecteurs Manuels & Presets Contrôleurs
            </span>

            {/* Presets rapides de marques */}
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-400 font-semibold uppercase">Presets Régie 1-Clic :</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  {
                    label: `Akai MPK / APC (Pad ${pad.gridIndex + 1})`,
                    type: 'note' as const,
                    num: 36 + pad.gridIndex,
                    chan: 1,
                    role: 'trigger' as const
                  },
                  {
                    label: `Korg nanoKONTROL (Fader CC ${pad.gridIndex % 8})`,
                    type: 'cc' as const,
                    num: pad.gridIndex % 8,
                    chan: 1,
                    role: 'volume' as const
                  },
                  {
                    label: `Fader Trigger CC #${14 + (pad.gridIndex % 8)}`,
                    type: 'cc' as const,
                    num: 14 + (pad.gridIndex % 8),
                    chan: 1,
                    role: 'trigger' as const
                  },
                  {
                    label: `Clavier Chromatique (Note ${48 + pad.gridIndex})`,
                    type: 'note' as const,
                    num: 48 + pad.gridIndex,
                    chan: 1,
                    role: 'trigger' as const
                  }
                ].map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setManualType(p.type);
                      setManualNumber(p.num);
                      setSelectedChannel(p.chan);
                      setSelectedRole(p.role);
                      const newBinding: PadMidiBinding = {
                        messageType: p.type,
                        number: p.num,
                        channel: p.chan,
                        noteName: p.type === 'note' ? getMidiNoteName(p.num) : undefined,
                        role: p.role,
                        threshold: p.role === 'trigger' && p.type === 'cc' ? threshold : undefined
                      };
                      onUpdateBinding(pad.id, newBinding);
                      scenicAudio.playPreset('crystal_resonance', 0.4);
                      if (onToast) {
                        onToast(`Preset appliqué : ${p.label}`);
                      }
                    }}
                    className="px-2 py-1 rounded bg-[#0b0e14] hover:bg-[#1a2332] border border-zinc-700 hover:border-amber-400 text-zinc-300 hover:text-white text-[10px] font-mono transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Champs manuels fins */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs pt-2 border-t border-[#1e2634]">
              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">Type de Message</label>
                <select
                  value={manualType}
                  onChange={(e) => setManualType(e.target.value as 'note' | 'cc')}
                  className="w-full bg-[#0a0d14] border border-zinc-700 rounded px-2 py-1 text-white text-xs"
                >
                  <option value="note">Note (Pad / Touche)</option>
                  <option value="cc">Control Change (Fader / CC)</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">
                  Numéro (0-127) {manualType === 'note' ? `[${getMidiNoteName(manualNumber)}]` : ''}
                </label>
                <input
                  type="number"
                  min="0"
                  max="127"
                  value={manualNumber}
                  onChange={(e) => setManualNumber(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-[#0a0d14] border border-zinc-700 rounded px-2 py-1 text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">Canal MIDI</label>
                <select
                  disabled={isOmniChannel}
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(parseInt(e.target.value, 10))}
                  className="w-full bg-[#0a0d14] border border-zinc-700 rounded px-2 py-1 text-white text-xs disabled:opacity-50"
                >
                  {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (
                    <option key={ch} value={ch}>
                      Canal {ch}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-1.5 text-[10px] text-zinc-300 cursor-pointer pb-1.5 select-none">
                  <input
                    type="checkbox"
                    checked={isOmniChannel}
                    onChange={(e) => setIsOmniChannel(e.target.checked)}
                    className="w-3.5 h-3.5 accent-amber-400 rounded cursor-pointer"
                  />
                  <span>Omni (Tous canaux)</span>
                </label>
                <button
                  type="button"
                  onClick={handleSaveManual}
                  className="w-full py-1 rounded bg-[#18212e] hover:bg-[#222d3e] border border-zinc-700 hover:border-amber-400 text-zinc-200 text-xs font-bold transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PIED DU MODAL */}
        <div className="px-4 py-3 bg-[#0a0d12] border-t border-[#1f2838] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-400">
              Contrôleurs connectés : <strong>{midiDeviceEngine.getConnectedInputsCount()} entrée(s)</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectPad(nextPad.id)}
              className="px-3 py-1.5 rounded-lg bg-[#151c27] hover:bg-[#1f2a3a] border border-zinc-700 text-zinc-200 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <span>Pad Suivant</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs transition-colors shadow-md"
            >
              Terminer & Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
