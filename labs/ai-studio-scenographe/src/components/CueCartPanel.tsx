// Panneau de Cartoucheur Tactile (Cue Cart 4x4) Inspiré de QLab & StreamDeck / TouchOSC
// No[co]de Vibe Designer — Régie Spectacle Vivant & Déclenchements Imprévus
// Fonctionnalités :
// - Grille 4x4 de 16 pads tactiles haute réactivité
// - MASTER FADER DE VOLUME GLOBAL DANS L'EN-TÊTE : contrôle en direct la sortie audio de TOUS les pads simultanément via le bus dédié (cartBusGain)
// - Touche MUTE Master, presets 0 dB, -6 dB, -12 dB et pilotage MIDI CC physique
// - 4 Modes de lecture : 'one-shot', 'loop', 'toggle' et 'choke group' (exclusivité de groupe)
// - 'MIDI LEARN' temps réel pour mapper physiquement des contrôleurs MIDI externes (Akai, Novation, Korg...)
// - Bouton d'urgence 'PANIC / STOP ALL' global avec raccourci Échap
// - Liaison Web Audio, OSC (/cart/master/volume, /cart/master/mute) et persistance locale

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Square,
  Repeat,
  Zap,
  Sliders,
  Settings2,
  Volume2,
  VolumeX,
  RotateCcw,
  AlertTriangle,
  Flame,
  Music,
  Radio,
  Layers,
  Sparkles,
  X,
  Check,
  Download,
  Upload,
  Activity,
  ShieldAlert,
  ChevronDown,
  Info,
  Cpu,
  Timer,
  Save,
  FolderOpen,
  Tag,
  Folder,
  FolderPlus,
  Grid,
  Plus,
  Trash2,
  Filter,
  Send,
  Shuffle,
  Keyboard
} from 'lucide-react';
import { scenicAudio } from '../services/scenicAudioEngine';
import { liveBridge } from '../services/livePerformanceBridge';
import { qlabCueEngine } from '../services/qlabCueEngine';
import { midiDeviceEngine, RawMidiMessage, getMidiNoteName } from '../services/midiDeviceEngine';
import { CartAudioVuMeter } from './CartAudioVuMeter';
import {
  CartBankId,
  BANK_METADATA,
  DEFAULT_BANK_NAMES,
  loadBankPadsFromStorage,
  saveBankPadsToStorage,
  loadBankNamesFromStorage,
  saveBankNamesToStorage,
  loadActiveBankIdFromStorage,
  saveActiveBankIdToStorage,
  exportBankToJsonString
} from '../services/cueCartBankManager';
import { CartBankManagerModal } from './CartBankManagerModal';
import { PadWaveformVisualizer } from './PadWaveformVisualizer';
import {
  CartKeyboardShortcutsModal,
  ColumnTriggerMode,
  KeyboardLayoutType
} from './CartKeyboardShortcutsModal';
import { PadMidiMappingContextModal } from './PadMidiMappingContextModal';

export type PadMode = 'one-shot' | 'loop' | 'toggle' | 'choke';

export type MidiOutType = 'program_change' | 'control_change';

export interface PadMidiBinding {
  messageType: 'note' | 'cc';
  number: number; // 0 à 127
  channel: number; // 1-16 (ou 0 pour omni/tous canaux)
  noteName?: string; // ex: "C1", "D#1", "F2"
  role?: 'trigger' | 'volume'; // 'trigger' (déclencheur) ou 'volume' (fader de volume continu)
  threshold?: number; // Seuil de déclenchement pour faders CC (0.05 à 0.95, défaut 0.35)
}

export interface PadMidiOutBinding {
  enabled: boolean;
  type: MidiOutType;    // 'program_change' ou 'control_change'
  channel: number;     // 1 à 16
  number: number;      // Program Number (0-127) ou CC Number (0-127)
  value?: number;      // Valeur CC (0-127), par défaut 127
  description?: string; // Description de l'action (ex: "Preset Reverb Hall", "Scène DMX 12", "Blackout Console")
}

export interface PadGroupFolder {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface CartPad {
  id: string;
  gridIndex: number; // 0 à 15
  numberLabel: string; // "1" à "16"
  keyboardKey?: string; // e.g. "1", "2", "q", "w"
  label: string;
  subLabel: string;
  customLabel?: string; // Champ de saisie 'Label' optionnel pour identifier visuellement le contenu audio dans la grille
  folderId?: string | null; // ID du groupe ou dossier thématique/scénique
  groupName?: string; // Nom du dossier / thématique / scène
  mode: PadMode;
  chokeGroup: number | null; // 1, 2, 3 ou null
  color: string;
  soundPreset: string;
  oscAddress: string;
  volume: number; // 0..1
  durationSec: number;
  fadeTimeMs: number; // Temps de fondu en millisecondes (0 ms = cut direct, 500 ms, 1000 ms, etc.)
  status: 'idle' | 'playing' | 'stopping';
  progress: number; // 0..100
  loopCount: number;
  midiBinding?: PadMidiBinding | null; // Mapping d'entrée (Contrôleur physique déclenchant le pad)
  midiOut?: PadMidiOutBinding | null;  // Signal MIDI sortant envoyé au déclenchement (Program Change ou Control Change)
  crossfadeBehavior?: 'default' | 'bypass' | 'force'; // 'default' = participe au crossfade auto séquentiel, 'bypass' = couche perpétuelle indépendante
  customCrossfadeMs?: number | null; // Surcharge optionnelle de durée de crossfade propre à ce pad (en ms)
}

/**
 * Convertit un niveau de volume linéaire (0..1) en échelle décibels affichable
 */
export const volumeToDbString = (vol: number): string => {
  if (vol <= 0.001) return '-∞ dB';
  const db = 20 * Math.log10(vol);
  return `${db >= 0 ? '+' : ''}${db.toFixed(1)} dB`;
};

// Configuration par défaut des Dossiers & Thématiques Scéniques par Banque
export const DEFAULT_BANK_FOLDERS: Record<CartBankId, PadGroupFolder[]> = {
  A: [
    { id: 'folder-a-1', name: 'Scène 1 : Ouverture', color: '#38bdf8', description: 'Gongs célestes, vibrations sub et montées de rideau' },
    { id: 'folder-a-2', name: 'Scène 2 : Foleys & Combats', color: '#f59e0b', description: 'Éclairs DMX, pas de sabres en bois et cloches' },
    { id: 'folder-a-3', name: 'Scène 3 : Dialogues Comédiens', color: '#10b981', description: 'Voix du capitaine, moussaillon et chant sirène' },
    { id: 'folder-a-4', name: 'Scène 4 : Clôture & Final', color: '#d946ef', description: 'Drones sub, blackouts d’urgence et chœur sacré' }
  ],
  B: [
    { id: 'folder-b-1', name: 'Régie & Foyer', color: '#b45309', description: '3 coups brigadier, rappels entracte et applaudissements' },
    { id: 'folder-b-2', name: 'Météo & Éléments', color: '#0284c7', description: 'Pluie battante, orage lointain et coups de tonnerre' },
    { id: 'folder-b-3', name: 'Bruitages Scéniques', color: '#d97706', description: 'Parquet qui craque, graviers et battements de cœur' },
    { id: 'folder-b-4', name: 'Nature & Forêt', color: '#16a34a', description: 'Oiseaux matinaux, grillons de nuit et vent dans les arbres' }
  ],
  C: [
    { id: 'folder-c-1', name: 'Tension & Risers', color: '#8b5cf6', description: 'Risers hypersoniques, drones 55Hz et nappes éther' },
    { id: 'folder-c-2', name: 'Alarmes & Lasers', color: '#ef4444', description: 'Pulsations laser DMX, gyrophares et alarmes rouges' },
    { id: 'folder-c-3', name: 'Rythmes & Sub Bass', color: '#f43f5e', description: 'Impacts 808 sub, arpeggiators synthwave et glitches' },
    { id: 'folder-c-4', name: 'Terminaux Cyber', color: '#06b6d4', description: 'Bips de validation, scans radar et sas cryogéniques' }
  ],
  D: [
    { id: 'folder-d-1', name: 'Cérémonie & Cloches', color: '#f59e0b', description: 'Carillons magiques, bols 432Hz et bourdon cathédrale' },
    { id: 'folder-d-2', name: 'Rideaux & Scénographie', color: '#b91c1c', description: 'Ouverture/fermeture rideau rouge, tops début spectacle' },
    { id: 'folder-d-3', name: 'Musique de Scène', color: '#10b981', description: 'Harpe féerique, trompette royale et cordes lyriques' },
    { id: 'folder-d-4', name: 'Final & Saluts', color: '#9333ea', description: 'Pluie d’or confettis, chœur liturgique et ovation' }
  ]
};

// Configuration d'usine des 16 pads (Grille 4x4)
// Pré-mappée par défaut sur le standard contrôleurs pads (Notes 36 à 51 / Canal 1)
const INITIAL_CART_PADS: CartPad[] = [
  // LIGNE 1 : IMPACTS & AMBIANCES OUVERTURE (Dossier Scène 1 : Ouverture)
  {
    id: 'pad-1',
    gridIndex: 0,
    numberLabel: '1',
    keyboardKey: '1',
    label: 'Gong Céleste',
    subLabel: 'Ouverture Spectacle',
    customLabel: 'Top Ouverture',
    folderId: 'folder-a-1',
    groupName: 'Scène 1 : Ouverture',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#38bdf8', // Cyan
    soundPreset: 'crystal_resonance',
    oscAddress: '/cart/pad/1',
    volume: 0.85,
    durationSec: 2.5,
    fadeTimeMs: 0, // Cut direct percussion
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 36, channel: 1, noteName: 'C1' },
    midiOut: { enabled: true, type: 'program_change', channel: 1, number: 1, description: 'Rappel Scène 1 : Ouverture DMX' }
  },
  {
    id: 'pad-2',
    gridIndex: 1,
    numberLabel: '2',
    keyboardKey: '2',
    label: 'Sub Rumble 40Hz',
    subLabel: 'Vibration de Scène',
    customLabel: 'Sub 40Hz Bass',
    folderId: 'folder-a-1',
    groupName: 'Scène 1 : Ouverture',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#818cf8', // Indigo
    soundPreset: 'deep_sub_drone',
    oscAddress: '/cart/pad/2',
    volume: 0.9,
    durationSec: 3.0,
    fadeTimeMs: 200,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 37, channel: 1, noteName: 'C#1' }
  },
  {
    id: 'pad-3',
    gridIndex: 2,
    numberLabel: '3',
    keyboardKey: '3',
    label: 'Nappe Mer Nocturne',
    subLabel: 'Ambiance Fondue [G1]',
    customLabel: 'Mer Nappe [G1]',
    folderId: 'folder-a-1',
    groupName: 'Scène 1 : Ouverture',
    mode: 'loop',
    chokeGroup: 1, // Exclusif avec Pad 4
    color: '#2dd4bf', // Teal
    soundPreset: 'wind_texture',
    oscAddress: '/cart/ambient/sea',
    volume: 0.75,
    durationSec: 4.0,
    fadeTimeMs: 1000, // Fondu ambré 1.0s
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 38, channel: 1, noteName: 'D1' }
  },
  {
    id: 'pad-4',
    gridIndex: 3,
    numberLabel: '4',
    keyboardKey: '4',
    label: 'Brise Stellaire',
    subLabel: 'Ambiance Ciel [G1]',
    folderId: 'folder-a-1',
    groupName: 'Scène 1 : Ouverture',
    mode: 'loop',
    chokeGroup: 1, // Exclusif avec Pad 3
    color: '#06b6d4', // Cyan sombre
    soundPreset: 'shimmer_reverb',
    oscAddress: '/cart/ambient/wind',
    volume: 0.75,
    durationSec: 4.5,
    fadeTimeMs: 1200, // Fondu doux 1.2s
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 39, channel: 1, noteName: 'D#1' }
  },

  // LIGNE 2 : EFFETS VISUELS & FOLEYS SCÉNIQUES (Dossier Scène 2 : Foleys & Combats)
  {
    id: 'pad-5',
    gridIndex: 4,
    numberLabel: '5',
    keyboardKey: 'q',
    label: 'Éclair & Flash DMX',
    subLabel: 'Strobe Immédiat',
    folderId: 'folder-a-2',
    groupName: 'Scène 2 : Foleys & Combats',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#f59e0b', // Ambre
    soundPreset: 'metallic_pulse',
    oscAddress: '/lighting/strobe',
    volume: 0.8,
    durationSec: 1.2,
    fadeTimeMs: 0, // Cut instantané
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 40, channel: 1, noteName: 'E1' },
    midiOut: { enabled: true, type: 'control_change', channel: 1, number: 1, value: 127, description: 'Flash Strobe DMX Plein Feu' }
  },
  {
    id: 'pad-6',
    gridIndex: 5,
    numberLabel: '6',
    keyboardKey: 'w',
    label: 'Pas de Sabres Bois',
    subLabel: 'Bruitage Combat [G2]',
    folderId: 'folder-a-2',
    groupName: 'Scène 2 : Foleys & Combats',
    mode: 'one-shot',
    chokeGroup: 2, // Exclusif avec Pad 7
    color: '#fbbf24', // Jaune
    soundPreset: 'footstep_wood',
    oscAddress: '/foley/sword',
    volume: 0.7,
    durationSec: 1.8,
    fadeTimeMs: 0, // Percussion nette
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 41, channel: 1, noteName: 'F1' }
  },
  {
    id: 'pad-7',
    gridIndex: 6,
    numberLabel: '7',
    keyboardKey: 'e',
    label: 'Gouttes Flottaison',
    subLabel: 'Bruitage Vagues [G2]',
    folderId: 'folder-a-2',
    groupName: 'Scène 2 : Foleys & Combats',
    mode: 'one-shot',
    chokeGroup: 2, // Exclusif avec Pad 6
    color: '#34d399', // Émeraude
    soundPreset: 'water_droplet',
    oscAddress: '/foley/water',
    volume: 0.75,
    durationSec: 2.0,
    fadeTimeMs: 250,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 42, channel: 1, noteName: 'F#1' }
  },
  {
    id: 'pad-8',
    gridIndex: 7,
    numberLabel: '8',
    keyboardKey: 'r',
    label: 'Bol Tibétain Scène',
    subLabel: 'Bascule Résonance',
    folderId: 'folder-a-2',
    groupName: 'Scène 2 : Foleys & Combats',
    mode: 'toggle',
    chokeGroup: null,
    color: '#a855f7', // Violet
    soundPreset: 'tibetan_bowl',
    oscAddress: '/cart/toggle/bowl',
    volume: 0.8,
    durationSec: 5.0,
    fadeTimeMs: 600,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 43, channel: 1, noteName: 'G1' }
  },

  // LIGNE 3 : DIALOGUES EXCLUSIFS (CHOKE GROUP 3) & LEADS (Dossier Scène 3 : Dialogues Comédiens)
  {
    id: 'pad-9',
    gridIndex: 8,
    numberLabel: '9',
    keyboardKey: 'a',
    label: 'Arpège Paillettes',
    subLabel: 'Intermède Magique',
    folderId: 'folder-a-3',
    groupName: 'Scène 3 : Dialogues Comédiens',
    mode: 'toggle',
    chokeGroup: null,
    color: '#ec4899', // Rose
    soundPreset: 'sparkle_pentatonic',
    oscAddress: '/cart/lead/sparkle',
    volume: 0.75,
    durationSec: 3.5,
    fadeTimeMs: 400,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 44, channel: 1, noteName: 'G#1' }
  },
  {
    id: 'pad-10',
    gridIndex: 9,
    numberLabel: '10',
    keyboardKey: 's',
    label: 'Voix Capitaine',
    subLabel: 'Réplique Scène [G3]',
    folderId: 'folder-a-3',
    groupName: 'Scène 3 : Dialogues Comédiens',
    mode: 'choke',
    chokeGroup: 3, // Choke Group 3 (Dialogues exclusifs)
    color: '#ef4444', // Rouge
    soundPreset: 'bell_cue',
    oscAddress: '/dialogue/capitaine',
    volume: 0.9,
    durationSec: 2.8,
    fadeTimeMs: 150, // Anti-clic vocal
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 45, channel: 1, noteName: 'A1' },
    midiOut: { enabled: true, type: 'program_change', channel: 2, number: 15, description: 'Preset Reverb Capitaine Lexicon' }
  },
  {
    id: 'pad-11',
    gridIndex: 10,
    numberLabel: '11',
    keyboardKey: 'd',
    label: 'Voix Moussaillon',
    subLabel: 'Réplique Scène [G3]',
    folderId: 'folder-a-3',
    groupName: 'Scène 3 : Dialogues Comédiens',
    mode: 'choke',
    chokeGroup: 3, // Choke Group 3 (Dialogues exclusifs)
    color: '#f97316', // Orange
    soundPreset: 'metallic_pulse',
    oscAddress: '/dialogue/moussaillon',
    volume: 0.9,
    durationSec: 2.4,
    fadeTimeMs: 150,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 46, channel: 1, noteName: 'A#1' }
  },
  {
    id: 'pad-12',
    gridIndex: 11,
    numberLabel: '12',
    keyboardKey: 'f',
    label: 'Chant de la Sirène',
    subLabel: 'Réplique Scène [G3]',
    folderId: 'folder-a-3',
    groupName: 'Scène 3 : Dialogues Comédiens',
    mode: 'choke',
    chokeGroup: 3, // Choke Group 3 (Dialogues exclusifs)
    color: '#10b981', // Vert
    soundPreset: 'crystal_resonance',
    oscAddress: '/dialogue/sirene',
    volume: 0.9,
    durationSec: 3.2,
    fadeTimeMs: 500, // Voix lyrique fondue
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 47, channel: 1, noteName: 'B1' }
  },

  // LIGNE 4 : TRANSITIONS, BLACKOUT ET DRONES (Dossier Scène 4 : Clôture & Final)
  {
    id: 'pad-13',
    gridIndex: 12,
    numberLabel: '13',
    keyboardKey: 'z',
    label: 'Houle GLSL Houleuse',
    subLabel: 'Loop Texture Grave',
    folderId: 'folder-a-4',
    groupName: 'Scène 4 : Clôture & Final',
    mode: 'loop',
    chokeGroup: null,
    color: '#6366f1', // Indigo clair
    soundPreset: 'sub_rumble',
    oscAddress: '/cart/loop/rumble',
    volume: 0.8,
    durationSec: 3.0,
    fadeTimeMs: 1000, // Fondu de texture 1s
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 48, channel: 1, noteName: 'C2' }
  },
  {
    id: 'pad-14',
    gridIndex: 13,
    numberLabel: '14',
    keyboardKey: 'x',
    label: 'Top Paillette Finale',
    subLabel: 'Crescendo Lumineux',
    folderId: 'folder-a-4',
    groupName: 'Scène 4 : Clôture & Final',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#eab308', // Or
    soundPreset: 'sparkle_pentatonic',
    oscAddress: '/cart/crescendo',
    volume: 0.85,
    durationSec: 3.0,
    fadeTimeMs: 300,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 49, channel: 1, noteName: 'C#2' }
  },
  {
    id: 'pad-15',
    gridIndex: 14,
    numberLabel: '15',
    keyboardKey: 'c',
    label: 'Blackout d’Urgence',
    subLabel: 'Noir Plateau Brutal',
    folderId: 'folder-a-4',
    groupName: 'Scène 4 : Clôture & Final',
    mode: 'toggle',
    chokeGroup: null,
    color: '#64748b', // Slate
    soundPreset: 'deep_sub_drone',
    oscAddress: '/lighting/blackout',
    volume: 0.8,
    durationSec: 2.0,
    fadeTimeMs: 0, // Cut sec
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 50, channel: 1, noteName: 'D2' },
    midiOut: { enabled: true, type: 'program_change', channel: 1, number: 127, description: 'Blackout Général Lumière Console' }
  },
  {
    id: 'pad-16',
    gridIndex: 15,
    numberLabel: '16',
    keyboardKey: 'v',
    label: 'Chœur Astral Final',
    subLabel: 'Nappe Sacrée Polyphonie',
    folderId: 'folder-a-4',
    groupName: 'Scène 4 : Clôture & Final',
    mode: 'loop',
    chokeGroup: null,
    color: '#d946ef', // Fuchsia
    soundPreset: 'tibetan_bowl',
    oscAddress: '/cart/choir/final',
    volume: 0.85,
    durationSec: 5.0,
    fadeTimeMs: 1500, // Grand fondu 1.5s
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 51, channel: 1, noteName: 'D#2' },
    midiOut: { enabled: true, type: 'control_change', channel: 1, number: 91, value: 110, description: 'Reverb Wet Send 85% Multieffet' }
  }
];

export interface CueCartPanelProps {
  onTriggerOsc?: (address: string, args: unknown[]) => void;
  className?: string;
  isCompact?: boolean;
}

export const CueCartPanel: React.FC<CueCartPanelProps> = ({
  onTriggerOsc,
  className = '',
  isCompact = false
}) => {
  // 1. ÉTAT DES BANQUES (A, B, C, D) & GESTIONNAIRE DE SAUVEGARDE LOCALSTORAGE
  const [activeBank, setActiveBank] = useState<CartBankId>(() => loadActiveBankIdFromStorage());
  const [bankNames, setBankNames] = useState<Record<CartBankId, string>>(() => loadBankNamesFromStorage());
  const [isBankModalOpen, setIsBankModalOpen] = useState<boolean>(false);
  const [isSavedRecently, setIsSavedRecently] = useState<boolean>(false);

  // 1.1 ÉTAT DES 16 PADS DE LA BANQUE ACTIVE (CHARGÉS DEPUIS LOCALSTORAGE)
  const [pads, setPads] = useState<CartPad[]>(() => {
    const currentActive = loadActiveBankIdFromStorage();
    return loadBankPadsFromStorage(currentActive);
  });

  // 1.2 ÉTAT DES GROUPES / DOSSIERS THÉMATIQUES & SCÉNIQUES (PERSISTANCE LOCALSTORAGE)
  const [folders, setFolders] = useState<PadGroupFolder[]>(() => {
    const currentActive = loadActiveBankIdFromStorage();
    try {
      const stored = localStorage.getItem(`nocode_cue_cart_folders_${currentActive}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_BANK_FOLDERS[currentActive] || DEFAULT_BANK_FOLDERS.A;
  });

  const [activeFolderFilter, setActiveFolderFilter] = useState<string | null>(null);
  const [cartViewMode, setCartViewMode] = useState<'grid' | 'grouped'>('grid');
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [newFolderColor, setNewFolderColor] = useState<string>('#38bdf8');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderNameValue, setEditingFolderNameValue] = useState<string>('');

  // -------------------------------------------------------------
  // MASTER FADER GLOBAL & MUTE DU BUS AUDIO CUE CART
  // -------------------------------------------------------------
  const [masterVolume, setMasterVolume] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('nocode_cue_cart_master_vol');
      return stored ? parseFloat(stored) : 0.85;
    } catch {
      return 0.85;
    }
  });

  const [isMasterMuted, setIsMasterMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nocode_cue_cart_master_mute') === 'true';
    } catch {
      return false;
    }
  });

  // Assignation MIDI CC pour le Master Fader physique (par défaut CC 7 = standard Master Volume)
  const [masterFaderMidiCc, setMasterFaderMidiCc] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem('nocode_cue_cart_fader_cc');
      return stored ? parseInt(stored, 10) : 7;
    } catch {
      return 7;
    }
  });
  const [isLearningMasterFader, setIsLearningMasterFader] = useState<boolean>(false);

  // Pad en cours d'édition dans le tiroir d'inspection
  const [editingPad, setEditingPad] = useState<CartPad | null>(null);

  // État Panic / Notification d'urgence
  const [panicActive, setPanicActive] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastChokedInfo, setLastChokedInfo] = useState<string | null>(null);

  // -------------------------------------------------------------
  // CROSSFADE AUTOMATIQUE SÉQUENTIEL MULTI-LAYERS & SONS
  // -------------------------------------------------------------
  const [isAutoCrossfadeEnabled, setIsAutoCrossfadeEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('nocode_cue_cart_autoxfade');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const [crossfadeDurationMs, setCrossfadeDurationMs] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('nocode_cue_cart_xfade_duration');
      return stored ? parseInt(stored, 10) : 1200;
    } catch {
      return 1200;
    }
  });

  const [crossfadeScope, setCrossfadeScope] = useState<'all' | 'same_folder'>(() => {
    try {
      const stored = localStorage.getItem('nocode_cue_cart_xfade_scope');
      return stored === 'same_folder' ? 'same_folder' : 'all';
    } catch {
      return 'all';
    }
  });

  const [lastCrossfadeInfo, setLastCrossfadeInfo] = useState<string | null>(null);

  const handleToggleAutoCrossfade = useCallback(() => {
    setIsAutoCrossfadeEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nocode_cue_cart_autoxfade', String(next));
      } catch {}
      setToastMessage(next ? '🔀 Fondu croisé auto activé (transitions fluides)' : '⏹️ Fondu croisé auto désactivé');
      setTimeout(() => setToastMessage(null), 2500);
      return next;
    });
  }, []);

  const handleSetCrossfadeDuration = useCallback((durationMs: number) => {
    const clamped = Math.max(50, Math.min(10000, durationMs));
    setCrossfadeDurationMs(clamped);
    try {
      localStorage.setItem('nocode_cue_cart_xfade_duration', String(clamped));
    } catch {}
  }, []);

  const handleSetCrossfadeScope = useCallback((scope: 'all' | 'same_folder') => {
    setCrossfadeScope(scope);
    try {
      localStorage.setItem('nocode_cue_cart_xfade_scope', scope);
    } catch {}
  }, []);

  // -------------------------------------------------------------
  // RACCOURCIS CLAVIER GLOBAUX RÉGIE LIVE (TOUCHES 1-4, ESPACE...)
  // -------------------------------------------------------------
  const [isKeyboardModalOpen, setIsKeyboardModalOpen] = useState<boolean>(false);
  const [columnTriggerMode, setColumnTriggerMode] = useState<ColumnTriggerMode>(() => {
    try {
      const stored = localStorage.getItem('nocode_cue_cart_col_mode');
      return (stored as ColumnTriggerMode) || 'step';
    } catch {
      return 'step';
    }
  });
  const [columnStepIndex, setColumnStepIndex] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [activeColumnFlash, setActiveColumnFlash] = useState<number | null>(null);
  const [keyboardLayout, setKeyboardLayout] = useState<KeyboardLayoutType>(() => {
    try {
      const stored = localStorage.getItem('nocode_cue_cart_kb_layout');
      return (stored as KeyboardLayoutType) || 'azerty';
    } catch {
      return 'azerty';
    }
  });

  // -------------------------------------------------------------
  // ÉTATS ET LOGIQUE MIDI LEARN
  // -------------------------------------------------------------
  const [isMidiLearnActive, setIsMidiLearnActive] = useState<boolean>(false);
  const [learningPadId, setLearningPadId] = useState<string | null>(null);
  const [contextualMidiModalPadId, setContextualMidiModalPadId] = useState<string | null>(null);
  const [lastMidiActivity, setLastMidiActivity] = useState<string | null>(null);
  const [lastMidiOutActivity, setLastMidiOutActivity] = useState<string | null>(null);
  const [midiDeviceCount, setMidiDeviceCount] = useState<number>(midiDeviceEngine.getConnectedInputsCount());
  const [midiOutDeviceCount, setMidiOutDeviceCount] = useState<number>(midiDeviceEngine.getConnectedOutputsCount());

  // Référence pour la détection de front montant des curseurs/faders CC
  const prevCcValues = useRef<Map<string, number>>(new Map());

  // Références d'animation pour les timers et barres de progression
  const animIntervals = useRef<Map<string, number>>(new Map());

  // Mise à jour ciblée du binding MIDI d'un pad
  const handleUpdatePadBinding = useCallback((padId: string, binding: PadMidiBinding | null) => {
    setPads((prev) =>
      prev.map((p) => (p.id === padId ? { ...p, midiBinding: binding } : p))
    );
    if (editingPad && editingPad.id === padId) {
      setEditingPad((prev) => (prev ? { ...prev, midiBinding: binding } : null));
    }
  }, [editingPad]);

  // Nombre de pads actuellement en lecture
  const activePadsCount = pads.filter((p) => p.status === 'playing').length;

  // -------------------------------------------------------------
  // SYNCHRONISATION DU MASTER FADER AVEC LE MOTEUR WEB AUDIO
  // -------------------------------------------------------------
  const handleMasterVolumeChange = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setMasterVolume(clamped);

    // Modulation en direct du bus Web Audio cartBusGain (affecte instantanément tous les sons en cours)
    scenicAudio.setCartMasterVolume(isMasterMuted ? 0 : clamped);

    // Envoi réseau OSC
    liveBridge.sendOSC('/cart/master/volume', [clamped, volumeToDbString(clamped)]);
    if (onTriggerOsc) onTriggerOsc('/cart/master/volume', [clamped]);

    try {
      localStorage.setItem('nocode_cue_cart_master_vol', clamped.toString());
    } catch {}
  }, [isMasterMuted, onTriggerOsc]);

  const handleToggleMasterMute = useCallback(() => {
    setIsMasterMuted((prev) => {
      const next = !prev;
      scenicAudio.setCartMute(next);
      liveBridge.sendOSC('/cart/master/mute', [next ? 1 : 0]);
      if (onTriggerOsc) onTriggerOsc('/cart/master/mute', [next ? 1 : 0]);
      try {
        localStorage.setItem('nocode_cue_cart_master_mute', next.toString());
      } catch {}
      return next;
    });
  }, [onTriggerOsc]);

  // Initialisation du bus Web Audio au montage
  useEffect(() => {
    scenicAudio.setCartMasterVolume(masterVolume);
    scenicAudio.setCartMute(isMasterMuted);
  }, [masterVolume, isMasterMuted]);

  // Sauvegarde automatique locale des pads de la banque active
  useEffect(() => {
    saveBankPadsToStorage(activeBank, pads);
  }, [activeBank, pads]);

  // Sauvegarde automatique locale des dossiers de la banque active
  useEffect(() => {
    try {
      localStorage.setItem(`nocode_cue_cart_folders_${activeBank}`, JSON.stringify(folders));
    } catch {}
  }, [folders, activeBank]);

  // Nettoyage des timers au démontage
  useEffect(() => {
    return () => {
      animIntervals.current.forEach((id) => clearInterval(id));
      animIntervals.current.clear();
    };
  }, []);

  // -------------------------------------------------------------
  // LOGIQUE DE DÉCLENCHEMENT DES MODES ('one-shot', 'loop', 'toggle', 'choke')
  // -------------------------------------------------------------

  const stopSinglePad = useCallback((padId: string, fadeMs?: number) => {
    const existing = animIntervals.current.get(padId);
    if (existing) {
      clearInterval(existing);
      animIntervals.current.delete(padId);
    }
    const pendingStop = animIntervals.current.get(`stop_${padId}`);
    if (pendingStop) {
      clearTimeout(pendingStop);
      animIntervals.current.delete(`stop_${padId}`);
    }

    const pad = pads.find((p) => p.id === padId);
    const fade = fadeMs !== undefined ? fadeMs : (pad?.fadeTimeMs ?? 100);
    scenicAudio.stopCartPad(padId, fade);

    if (fade > 250) {
      // Met le pad en état visuel 'stopping' pendant la durée du fondu
      setPads((prev) =>
        prev.map((p) =>
          p.id === padId
            ? { ...p, status: 'stopping' }
            : p
        )
      );

      const stopTimer = window.setTimeout(() => {
        setPads((prev) =>
          prev.map((p) =>
            p.id === padId
              ? { ...p, status: 'idle', progress: 0 }
              : p
          )
        );
        animIntervals.current.delete(`stop_${padId}`);
      }, fade);

      animIntervals.current.set(`stop_${padId}`, stopTimer);
    } else {
      setPads((prev) =>
        prev.map((p) =>
          p.id === padId
            ? { ...p, status: 'idle', progress: 0 }
            : p
        )
      );
    }
  }, [pads]);

  const triggerPad = useCallback((padId: string) => {
    const pad = pads.find((p) => p.id === padId);
    if (!pad) return;

    // Nettoyage de tout timer de stop ou d'animation préalable sur ce pad
    const existing = animIntervals.current.get(pad.id);
    if (existing) {
      clearInterval(existing);
      animIntervals.current.delete(pad.id);
    }
    const pendingStop = animIntervals.current.get(`stop_${pad.id}`);
    if (pendingStop) {
      clearTimeout(pendingStop);
      animIntervals.current.delete(`stop_${pad.id}`);
    }

    // A. GESTION DU CROSSFADE AUTOMATIQUE SÉQUENTIEL MULTI-LAYERS
    // Permet des transitions fluides entre sons, vidéos et effets (layers) sans coupure brutale
    const shouldCrossfade =
      (isAutoCrossfadeEnabled || pad.crossfadeBehavior === 'force') &&
      pad.crossfadeBehavior !== 'bypass';

    let effectiveFadeInMs = pad.fadeTimeMs;

    if (shouldCrossfade) {
      const outgoingPads = pads.filter((p) => {
        if (p.id === pad.id) return false;
        if (p.status !== 'playing' && p.status !== 'stopping') return false;
        if (p.crossfadeBehavior === 'bypass') return false; // Couche permanente bypassée
        if (crossfadeScope === 'same_folder' && p.folderId !== pad.folderId) return false;
        return true;
      });

      if (outgoingPads.length > 0) {
        const effectiveCrossfadeMs = pad.customCrossfadeMs ?? crossfadeDurationMs;
        effectiveFadeInMs = Math.max(pad.fadeTimeMs, effectiveCrossfadeMs);

        outgoingPads.forEach((op) => {
          stopSinglePad(op.id, effectiveCrossfadeMs);
        });

        const infoMsg = `Fondu croisé ${effectiveCrossfadeMs}ms : [${pad.label}] ➜ [${outgoingPads.map((o) => o.label).join(', ')}]`;
        setLastCrossfadeInfo(infoMsg);
        setTimeout(() => setLastCrossfadeInfo(null), Math.max(3000, effectiveCrossfadeMs + 500));

        // Envoi OSC de transition fluide multi-layers (vidéos Resolume/QLab, lumières DMX, effets)
        liveBridge.sendOSC('/cart/crossfade', [
          pad.id,
          pad.label,
          effectiveCrossfadeMs,
          outgoingPads.map((o) => o.id).join(','),
          outgoingPads.length
        ]);
        if (onTriggerOsc) {
          onTriggerOsc('/cart/crossfade', [effectiveCrossfadeMs, outgoingPads.length]);
        }
      }
    }

    // B. GESTION DU CHOKE GROUP (EXCLUSIVITÉ DE GROUPE) AVEC FONDU CROISÉ
    if (pad.chokeGroup !== null) {
      const chokedPads = pads.filter(
        (p) => p.id !== pad.id && p.chokeGroup === pad.chokeGroup && (p.status === 'playing' || p.status === 'stopping')
      );

      if (chokedPads.length > 0) {
        chokedPads.forEach((cp) =>
          stopSinglePad(cp.id, Math.max(pad.fadeTimeMs, cp.fadeTimeMs))
        );
        const fadeLabel = pad.fadeTimeMs > 0 ? ` (fondu ${pad.fadeTimeMs}ms)` : '';
        setLastChokedInfo(
          `Groupe ${pad.chokeGroup} étouffé${fadeLabel} [${chokedPads.map((c) => c.label).join(', ')}]`
        );
        setTimeout(() => setLastChokedInfo(null), 2500);

        // Envoi OSC Choke
        liveBridge.sendOSC('/cart/choke', [pad.chokeGroup, pad.id, pad.fadeTimeMs]);
      }
    }

    // C. LOGIQUE SELON LE MODE DE LECTURE

    // 1. MODE 'TOGGLE' : bascule ON / OFF avec fondu de sortie
    if (pad.mode === 'toggle') {
      if (pad.status === 'playing') {
        stopSinglePad(pad.id, pad.fadeTimeMs);
        liveBridge.sendOSC(pad.oscAddress, [0, 'toggle_off', pad.fadeTimeMs]);
        if (onTriggerOsc) onTriggerOsc(pad.oscAddress, [0]);
        return;
      }
    }

    // 2. MODE 'LOOP' : si déjà en train de jouer, un clic arrête la boucle avec fondu
    if (pad.mode === 'loop' && pad.status === 'playing') {
      stopSinglePad(pad.id, pad.fadeTimeMs);
      liveBridge.sendOSC(pad.oscAddress, [0, 'loop_stop', pad.fadeTimeMs]);
      if (onTriggerOsc) onTriggerOsc(pad.oscAddress, [0]);
      return;
    }

    // 3. DÉMARRAGE DU PAD
    // Jouer le son via le bus dédié du Cartoucheur avec Fade Time progressif (incluant rampe crossfade)
    scenicAudio.playCartSound(pad.soundPreset, pad.volume, effectiveFadeInMs, pad.id);

    // Envoi OSC avec indication du temps de fondu
    liveBridge.sendOSC(pad.oscAddress, [1, pad.label, pad.mode, effectiveFadeInMs]);
    if (onTriggerOsc) onTriggerOsc(pad.oscAddress, [1, pad.label, effectiveFadeInMs]);

    // ENVOI DE SIGNAL MIDI SORTANT (PROGRAM CHANGE OU CONTROL CHANGE)
    // Permet de piloter pupitres d'éclairage DMX (ETC Eos, GrandMA), projecteurs ou processeurs d'effets externes
    if (pad.midiOut && pad.midiOut.enabled) {
      if (pad.midiOut.type === 'program_change') {
        const sent = midiDeviceEngine.sendProgramChange(pad.midiOut.channel, pad.midiOut.number);
        setLastMidiOutActivity(
          `PC #${pad.midiOut.number} (Ch ${pad.midiOut.channel}) ${pad.midiOut.description ? `« ${pad.midiOut.description} »` : ''} ${sent ? '⚡ Matériel' : '🌐 Simulé'}`
        );
      } else if (pad.midiOut.type === 'control_change') {
        const val = pad.midiOut.value ?? 127;
        const sent = midiDeviceEngine.sendControlChange(pad.midiOut.channel, pad.midiOut.number, val);
        setLastMidiOutActivity(
          `CC #${pad.midiOut.number}=${val} (Ch ${pad.midiOut.channel}) ${pad.midiOut.description ? `« ${pad.midiOut.description} »` : ''} ${sent ? '⚡ Matériel' : '🌐 Simulé'}`
        );
      }
    }

    // Passage du pad à l'état 'playing'
    setPads((prev) =>
      prev.map((p) =>
        p.id === pad.id
          ? { ...p, status: 'playing', progress: 0, loopCount: p.mode === 'loop' ? p.loopCount + 1 : 0 }
          : p
      )
    );

    // Démarrage de l'animation de progression
    const durationMs = Math.max(500, pad.durationSec * 1000);
    const startTimestamp = performance.now();

    const intervalId = window.setInterval(() => {
      const elapsed = performance.now() - startTimestamp;
      const pct = (elapsed / durationMs) * 100;

      if (pct >= 100) {
        if (pad.mode === 'loop') {
          // Relance la boucle sur le bus Master du Cartoucheur
          scenicAudio.playCartSound(pad.soundPreset, pad.volume * 0.95, Math.min(pad.fadeTimeMs, 250), pad.id);
          setPads((prev) =>
            prev.map((p) =>
              p.id === pad.id
                ? { ...p, progress: 0, loopCount: p.loopCount + 1 }
                : p
            )
          );
        } else if (pad.mode === 'toggle') {
          setPads((prev) =>
            prev.map((p) =>
              p.id === pad.id ? { ...p, progress: 100 } : p
            )
          );
        } else {
          clearInterval(intervalId);
          animIntervals.current.delete(pad.id);
          scenicAudio.stopCartPad(pad.id, Math.min(pad.fadeTimeMs, 150));
          setPads((prev) =>
            prev.map((p) =>
              p.id === pad.id ? { ...p, status: 'idle', progress: 0 } : p
            )
          );
        }
      } else {
        setPads((prev) =>
          prev.map((p) =>
            p.id === pad.id ? { ...p, progress: Math.min(100, pct) } : p
          )
        );
      }
    }, 30);

    animIntervals.current.set(pad.id, intervalId);
  }, [pads, stopSinglePad, onTriggerOsc, isAutoCrossfadeEnabled, crossfadeDurationMs, crossfadeScope]);

  // -------------------------------------------------------------
  // BOUTON GLOBAL 'PANIC / STOP ALL' D'URGENCE DE LA RÉGIE
  // -------------------------------------------------------------

  const handlePanicStopAll = useCallback(() => {
    // 1. Arrêt immédiat de tous les intervalles actifs
    animIntervals.current.forEach((id) => clearInterval(id));
    animIntervals.current.clear();

    // 2. Coupure audio nette des gains et déconnexion Web Audio
    scenicAudio.panicCartStop();

    // 3. Réinitialisation de tous les pads
    setPads((prev) =>
      prev.map((p) => ({
        ...p,
        status: 'idle',
        progress: 0
      }))
    );

    // 4. Mute d'urgence instantané du bus audio Cartoucheur
    scenicAudio.setCartMasterVolume(0);
    setTimeout(() => {
      scenicAudio.setCartMasterVolume(isMasterMuted ? 0 : masterVolume);
    }, 300);

    // 5. Panic global de la régie QLab & Audio
    qlabCueEngine.panic();
    scenicAudio.triggerFootstep(30, 0.7);

    // 6. Envoi OSC Panic
    liveBridge.sendOSC('/cart/panic', ['HARD_STOP_ALL']);
    liveBridge.sendOSC('/cue/panic', ['STOP_ALL']);

    // 6. Feedback visuel d'urgence
    setPanicActive(true);
    setToastMessage('🚨 PANIC EXÉCUTÉ : Tous les pads et flux coupés net !');
    setTimeout(() => {
      setPanicActive(false);
      setToastMessage(null);
    }, 2800);
  }, [isMasterMuted, masterVolume]);

  // -------------------------------------------------------------
  // ARRÊT DOUX DE TOUS LES PADS (TOUCHE ESPACE / STOP ALL)
  // -------------------------------------------------------------
  const handleStopAllPads = useCallback(() => {
    const activePads = pads.filter((p) => p.status === 'playing' || p.status === 'stopping');
    if (activePads.length > 0) {
      activePads.forEach((p) => {
        stopSinglePad(p.id, Math.max(150, p.fadeTimeMs));
      });
      liveBridge.sendOSC('/cart/stop', ['SPACE_KEY', activePads.length]);
      if (onTriggerOsc) onTriggerOsc('/cart/stop', [activePads.length]);
      setToastMessage(`⏹️ STOP ALL (ESPACE) : ${activePads.length} pad(s) arrêté(s) en douceur !`);
    } else {
      setToastMessage('⏹️ STOP ALL (ESPACE) : Aucun son actif à arrêter.');
    }
    setTimeout(() => setToastMessage(null), 2200);
  }, [pads, stopSinglePad, onTriggerOsc]);

  // -------------------------------------------------------------
  // DÉCLENCHEMENT DE COLONNE PAR RACCOURCIS 1, 2, 3, 4
  // -------------------------------------------------------------
  const triggerColumn = useCallback((colIndex: number, modeOverride?: ColumnTriggerMode) => {
    if (colIndex < 0 || colIndex > 3) return;

    // Flash visuel sur le bouton d'en-tête de colonne
    setActiveColumnFlash(colIndex);
    setTimeout(() => setActiveColumnFlash(null), 300);

    const mode = modeOverride || columnTriggerMode;
    // Les 4 pads de cette colonne (ex: col 0 -> indices 0, 4, 8, 12)
    const colPadIndices = [colIndex, colIndex + 4, colIndex + 8, colIndex + 12];
    const colPads = colPadIndices.map((idx) => pads[idx]).filter(Boolean);

    if (colPads.length === 0) return;

    if (mode === 'all') {
      // Déclenchement simultané de tous les pads de la colonne
      colPads.forEach((cp) => triggerPad(cp.id));
      liveBridge.sendOSC('/cart/column/all', [colIndex + 1, colPads.length]);
      setToastMessage(`⌨️ Colonne ${colIndex + 1} : Plein Feu Déclenché (${colPads.length} pads)`);
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }

    if (mode === 'direct') {
      // Déclenche le pad de tête de la colonne (Ligne 1)
      const topPad = colPads[0];
      if (topPad) {
        triggerPad(topPad.id);
        setToastMessage(`⌨️ Colonne ${colIndex + 1} (Pad 1) : [${topPad.numberLabel}] ${topPad.label}`);
        setTimeout(() => setToastMessage(null), 2000);
      }
      return;
    }

    // Mode 'step' (Par défaut) : Avance séquentielle dans la colonne avec fondu croisé
    const currentlyPlayingIdx = colPads.findIndex((p) => p.status === 'playing' || p.status === 'stopping');

    let nextStep = 0;
    if (currentlyPlayingIdx !== -1) {
      // Passe au pad suivant dans la colonne (cyclique 0 -> 1 -> 2 -> 3 -> 0)
      nextStep = (currentlyPlayingIdx + 1) % colPads.length;
    } else {
      nextStep = columnStepIndex[colIndex] % colPads.length;
    }

    const targetPad = colPads[nextStep];
    if (targetPad) {
      triggerPad(targetPad.id);

      // Met à jour l'étape mémorisée pour le prochain appui
      setColumnStepIndex((prev) => {
        const next: [number, number, number, number] = [...prev];
        next[colIndex] = (nextStep + 1) % colPads.length;
        return next;
      });

      liveBridge.sendOSC('/cart/column/step', [colIndex + 1, nextStep + 1, targetPad.id]);
      setToastMessage(
        `⌨️ Colonne ${colIndex + 1} (Étape ${nextStep + 1}/4) : [${targetPad.numberLabel}] ${targetPad.label}`
      );
      setTimeout(() => setToastMessage(null), 2500);
    }
  }, [columnTriggerMode, columnStepIndex, pads, triggerPad]);

  // Application rapide d'un préset de disposition clavier (AZERTY ou QWERTY)
  const handleApplyLayoutPreset = useCallback((layout: KeyboardLayoutType) => {
    setKeyboardLayout(layout);
    try {
      localStorage.setItem('nocode_cue_cart_kb_layout', layout);
    } catch {}

    // AZERTY : 1,2,3,4 / a,z,e,r / q,s,d,f / w,x,c,v
    // QWERTY : 1,2,3,4 / q,w,e,r / a,s,d,f / z,x,c,v
    const azertyKeys = [
      '1', '2', '3', '4',
      'a', 'z', 'e', 'r',
      'q', 's', 'd', 'f',
      'w', 'x', 'c', 'v'
    ];
    const qwertyKeys = [
      '1', '2', '3', '4',
      'q', 'w', 'e', 'r',
      'a', 's', 'd', 'f',
      'z', 'x', 'c', 'v'
    ];
    const targetKeys = layout === 'azerty' ? azertyKeys : qwertyKeys;

    setPads((prev) =>
      prev.map((p, idx) => ({
        ...p,
        keyboardKey: targetKeys[idx] || p.keyboardKey
      }))
    );

    setToastMessage(`⌨️ Disposition ${layout.toUpperCase()} appliquée aux 16 pads !`);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // -------------------------------------------------------------
  // GESTIONNAIRE DE BASULE & SAUVEGARDE DES BANQUES DE 16 PADS
  // -------------------------------------------------------------

  const handleSelectBank = useCallback((targetBank: CartBankId) => {
    if (targetBank === activeBank) return;

    // 1. Sauvegarder d'abord la banque actuelle dans le localStorage
    saveBankPadsToStorage(activeBank, pads);

    // 2. Arrêt immédiat de toute lecture active sur l'ancienne banque
    handlePanicStopAll();

    // 3. Charger les 16 pads de la banque cible depuis le localStorage
    const nextPads = loadBankPadsFromStorage(targetBank);
    setPads(nextPads);
    setActiveBank(targetBank);
    saveActiveBankIdToStorage(targetBank);

    // Charger les dossiers thématiques de la banque cible
    try {
      const storedFolders = localStorage.getItem(`nocode_cue_cart_folders_${targetBank}`);
      if (storedFolders) {
        setFolders(JSON.parse(storedFolders));
      } else {
        setFolders(DEFAULT_BANK_FOLDERS[targetBank] || DEFAULT_BANK_FOLDERS.A);
      }
    } catch {
      setFolders(DEFAULT_BANK_FOLDERS[targetBank] || DEFAULT_BANK_FOLDERS.A);
    }
    setActiveFolderFilter(null);

    // 4. Notification réseau OSC
    liveBridge.sendOSC('/cart/bank/select', [targetBank]);
    if (onTriggerOsc) onTriggerOsc('/cart/bank/select', [targetBank]);

    // 5. Message toast informatif pour la régie
    const targetName = bankNames[targetBank] || `Banque ${targetBank}`;
    setToastMessage(`📂 Banque ${targetBank} [${targetName}] chargée (16 pads)`);
    setTimeout(() => setToastMessage(null), 3000);
  }, [activeBank, pads, bankNames, handlePanicStopAll, onTriggerOsc]);

  const handleQuickSaveCurrentBank = useCallback(() => {
    saveBankPadsToStorage(activeBank, pads);
    try {
      localStorage.setItem(`nocode_cue_cart_folders_${activeBank}`, JSON.stringify(folders));
    } catch {}
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2000);

    const bankName = bankNames[activeBank] || `Banque ${activeBank}`;
    setToastMessage(`💾 Banque ${activeBank} [${bankName}] sauvegardée dans le localStorage !`);
    setTimeout(() => setToastMessage(null), 2500);
  }, [activeBank, pads, bankNames, folders]);

  // -------------------------------------------------------------
  // GESTION DES GROUPES & DOSSIERS THÉMATIQUES SCÉNIQUES
  // -------------------------------------------------------------

  const handleCreateFolder = useCallback((name: string, color: string) => {
    if (!name.trim()) return;
    const newFolder: PadGroupFolder = {
      id: `folder-${Date.now()}`,
      name: name.trim(),
      color,
      description: 'Groupe scénique personnalisé'
    };
    setFolders((prev) => [...prev, newFolder]);
    setIsCreatingFolder(false);
    setNewFolderName('');
    setToastMessage(`📁 Dossier « ${name.trim()} » créé avec succès !`);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  const handleDeleteFolder = useCallback((folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    setPads((prev) =>
      prev.map((p) =>
        p.folderId === folderId ? { ...p, folderId: null, groupName: '' } : p
      )
    );
    if (activeFolderFilter === folderId) {
      setActiveFolderFilter(null);
    }
    setToastMessage('🗑️ Dossier supprimé. Les pads restent dans la grille.');
    setTimeout(() => setToastMessage(null), 2500);
  }, [activeFolderFilter]);

  const handleRenameFolder = useCallback((folderId: string, newName: string) => {
    if (!newName.trim()) return;
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, name: newName.trim() } : f))
    );
    setPads((prev) =>
      prev.map((p) =>
        p.folderId === folderId ? { ...p, groupName: newName.trim() } : p
      )
    );
    setEditingFolderId(null);
    setToastMessage(`Dossier renommé en « ${newName.trim()} »`);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  const handleAssignPadToFolder = useCallback((padId: string, folderId: string | null) => {
    const targetFolder = folders.find((f) => f.id === folderId);
    setPads((prev) =>
      prev.map((p) =>
        p.id === padId
          ? {
              ...p,
              folderId,
              groupName: targetFolder ? targetFolder.name : ''
            }
          : p
      )
    );
    if (editingPad && editingPad.id === padId) {
      setEditingPad((prev) =>
        prev
          ? {
              ...prev,
              folderId,
              groupName: targetFolder ? targetFolder.name : ''
            }
          : null
      );
    }
  }, [folders, editingPad]);

  const handleStopFolderPads = useCallback((folderId: string) => {
    const folderPads = pads.filter((p) => p.folderId === folderId && p.status === 'playing');
    folderPads.forEach((p) => stopSinglePad(p.id));
    const folderName = folders.find((f) => f.id === folderId)?.name || 'Groupe';
    setToastMessage(`⏹️ Pads du dossier « ${folderName} » arrêtés (${folderPads.length})`);
    setTimeout(() => setToastMessage(null), 2500);
  }, [pads, folders, stopSinglePad]);

  // -------------------------------------------------------------
  // ÉCOUTEUR MIDI TEMPS RÉEL : MIDI LEARN, MASTER FADER & PADS
  // -------------------------------------------------------------
  useEffect(() => {
    // Synchronisation périphériques connectés (entrées et sorties)
    const unsubDevice = midiDeviceEngine.subscribe(() => {
      setMidiDeviceCount(midiDeviceEngine.getConnectedInputsCount());
      setMidiOutDeviceCount(midiDeviceEngine.getConnectedOutputsCount());
    });

    // Écoute des émissions de signaux MIDI sortants pour monitoring en régie
    const handleMidiOutCustomEvent = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail) {
        const { type, channel, number, value, sentToHardware } = custom.detail;
        const typeStr = type === 'program_change' ? 'PC' : 'CC';
        const valStr = type === 'control_change' ? `=${value}` : '';
        setLastMidiOutActivity(`${typeStr} #${number}${valStr} (Ch ${channel})${sentToHardware ? ' [Matériel]' : ''}`);
      }
    };
    window.addEventListener('nocode_midi_out', handleMidiOutCustomEvent);

    // Écoute des événements MIDI bruts (USB / Bluetooth / Contrôleur virtuel)
    const unsubRaw = midiDeviceEngine.onRawMessage((msg: RawMidiMessage) => {
      const isNoteOn = msg.type === 'note' && msg.velocity > 0;
      const isCcTrigger = msg.type === 'cc' && msg.velocity > 0.4;
      const noteLabel = msg.type === 'note' ? `${getMidiNoteName(msg.number)} (#${msg.number})` : `CC ${msg.number}`;
      setLastMidiActivity(`${msg.type.toUpperCase()} ${noteLabel} (Ch ${msg.channel})`);

      // CAS 0 : APPRENTISSAGE MIDI LEARN POUR LE MASTER FADER
      if (isLearningMasterFader && msg.type === 'cc') {
        setMasterFaderMidiCc(msg.number);
        setIsLearningMasterFader(false);
        scenicAudio.playPreset('crystal_resonance', 0.5);
        setToastMessage(`🎛️ Master Fader assigné avec succès au contrôleur physique CC ${msg.number} !`);
        setTimeout(() => setToastMessage(null), 3000);
        try {
          localStorage.setItem('nocode_cue_cart_fader_cc', msg.number.toString());
        } catch {}
        return;
      }

      // CAS 0.5 : CONTRÔLE EN DIRECT DU MASTER FADER PAR UN FADER PHYSIQUE MIDI CC
      if (msg.type === 'cc' && masterFaderMidiCc !== null && msg.number === masterFaderMidiCc) {
        handleMasterVolumeChange(msg.velocity);
        return;
      }

      // CAS 1 : MODE MIDI LEARN ACTIF AVEC UN PAD CIBLÉ
      if (learningPadId) {
        const targetPad = pads.find((p) => p.id === learningPadId);
        if (targetPad) {
          const newBinding: PadMidiBinding = {
            messageType: msg.type === 'note' ? 'note' : 'cc',
            number: msg.number,
            channel: msg.channel,
            noteName: msg.type === 'note' ? getMidiNoteName(msg.number) : undefined
          };

          setPads((prev) =>
            prev.map((p) =>
              p.id === learningPadId
                ? { ...p, midiBinding: newBinding }
                : p
            )
          );

          if (editingPad && editingPad.id === learningPadId) {
            setEditingPad((prev) => (prev ? { ...prev, midiBinding: newBinding } : null));
          }

          // Son de confirmation agréable & notification
          scenicAudio.playPreset('crystal_resonance', 0.5);
          setToastMessage(
            `🎹 Pad ${targetPad.numberLabel} (${targetPad.label}) assigné à ${
              newBinding.messageType === 'note' ? `Note ${newBinding.number} [${newBinding.noteName}]` : `CC ${newBinding.number}`
            } (Canal ${newBinding.channel}) !`
          );
          setTimeout(() => setToastMessage(null), 3000);

          setLearningPadId(null);
        }
        return;
      }

      // Si le mode MIDI Learn est activé mais aucun pad spécifique n'est sélectionné, ignorer
      if (isMidiLearnActive) {
        return;
      }

      // CAS 2 : MODE NORMAL — DÉCLENCHEMENT & MODULATION DES PADS MAPPÉS
      if (msg.type === 'note') {
        if (isNoteOn) {
          const matched = pads.filter((p) => {
            if (!p.midiBinding) return false;
            const typeMatch = p.midiBinding.messageType === 'note';
            const numMatch = p.midiBinding.number === msg.number;
            const chanMatch = p.midiBinding.channel === 0 || p.midiBinding.channel === msg.channel;
            return typeMatch && numMatch && chanMatch;
          });

          if (matched.length > 0) {
            matched.forEach((mp) => {
              triggerPad(mp.id);
            });
          }
        }
      } else if (msg.type === 'cc') {
        pads.forEach((p) => {
          if (!p.midiBinding || p.midiBinding.messageType !== 'cc' || p.midiBinding.number !== msg.number) {
            return;
          }
          const chanMatch = p.midiBinding.channel === 0 || p.midiBinding.channel === msg.channel;
          if (!chanMatch) return;

          // 1. Contrôle en direct du fader de volume propre au pad
          if (p.midiBinding.role === 'volume') {
            const nextVol = Math.max(0, Math.min(1, msg.velocity));
            setPads((prev) =>
              prev.map((item) => (item.id === p.id ? { ...item, volume: nextVol } : item))
            );
            if (editingPad && editingPad.id === p.id) {
              setEditingPad((prev) => (prev ? { ...prev, volume: nextVol } : null));
            }
            return;
          }

          // 2. Déclenchement de pad par franchissement de seuil (Front Montant)
          const th = p.midiBinding.threshold ?? 0.35;
          const prevVal = prevCcValues.current.get(p.id) ?? 0;
          prevCcValues.current.set(p.id, msg.velocity);

          if (prevVal < th && msg.velocity >= th) {
            triggerPad(p.id);
          }
        });
      }
    });

    return () => {
      unsubDevice();
      unsubRaw();
      window.removeEventListener('nocode_midi_out', handleMidiOutCustomEvent);
    };
  }, [
    isLearningMasterFader,
    masterFaderMidiCc,
    handleMasterVolumeChange,
    learningPadId,
    isMidiLearnActive,
    pads,
    editingPad,
    triggerPad
  ]);

  // -------------------------------------------------------------
  // SYSTÈME DE RACCOURCIS CLAVIER GLOBAUX RÉGIE LIVE
  // Touches 1-4 : Colonnes (Séquentiel / Step ou Plein Feu)
  // ESPACE : Stop All doux de tous les flux
  // ÉCHAP : Panic d'Urgence instantané
  // M : Mute / Rétablissement Master Fader
  // ↑ / ↓ : Ajustement Master Fader (+/- 5%)
  // Shift + A/B/C/D : Bascule de Banque
  // V / G : Bascule Vue Grille / Dossiers
  // ? ou Ctrl+K : Aide Raccourcis Clavier
  // -------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      // 1. TOUCHE ÉCHAP : PANIC HARD STOP OU FERMETURE DE MODALE
      if (e.key === 'Escape') {
        e.preventDefault();
        if (contextualMidiModalPadId !== null) {
          setContextualMidiModalPadId(null);
          return;
        }
        if (isKeyboardModalOpen) {
          setIsKeyboardModalOpen(false);
          return;
        }
        if (isBankModalOpen) {
          setIsBankModalOpen(false);
          return;
        }
        if (editingPad) {
          setEditingPad(null);
          return;
        }
        if (isMidiLearnActive || learningPadId || isLearningMasterFader) {
          setIsMidiLearnActive(false);
          setLearningPadId(null);
          setIsLearningMasterFader(false);
          setToastMessage('Mode MIDI Learn annulé.');
          setTimeout(() => setToastMessage(null), 1500);
          return;
        }
        handlePanicStopAll();
        return;
      }

      // 2. TOUCHE ESPACE : STOP ALL DOUX DE TOUS LES PADS EN COURS
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleStopAllPads();
        return;
      }

      // Si le mode MIDI Learn est actif, ignorer les autres raccourcis de lecture
      if (isMidiLearnActive || isLearningMasterFader) return;

      // 3. TOUCHE M : BASCULE MUTE / DÉMUTE MASTER BUS
      if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleToggleMasterMute();
        return;
      }

      // 4. TOUCHES FLÈCHE HAUT / BAS : AJUSTEMENT DU MASTER FADER (+/- 5%)
      if (e.key === 'ArrowUp' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const nextVol = Math.min(1.0, masterVolume + 0.05);
        handleMasterVolumeChange(nextVol);
        setToastMessage(`🔊 Master Fader : ${volumeToDbString(nextVol)} (${Math.round(nextVol * 100)}%)`);
        setTimeout(() => setToastMessage(null), 1500);
        return;
      }
      if (e.key === 'ArrowDown' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const nextVol = Math.max(0.0, masterVolume - 0.05);
        handleMasterVolumeChange(nextVol);
        setToastMessage(`🔉 Master Fader : ${volumeToDbString(nextVol)} (${Math.round(nextVol * 100)}%)`);
        setTimeout(() => setToastMessage(null), 1500);
        return;
      }

      // 5. TOUCHE ? OU CTRL/CMD+K : AIDE RACCOURCIS CLAVIER
      if (e.key === '?' || ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        setIsKeyboardModalOpen((prev) => !prev);
        return;
      }

      // 6. TOUCHES SHIFT + A / B / C / D : BASCULE RAPIDE DE BANQUE
      if (e.shiftKey && ['A', 'B', 'C', 'D'].includes(e.key.toUpperCase()) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const bankTarget = e.key.toUpperCase() as CartBankId;
        handleSelectBank(bankTarget);
        return;
      }

      // 7. TOUCHE V OU G : BASCULE MODE VUE GRILLE 4x4 / DOSSIERS
      if ((e.key === 'v' || e.key === 'V' || e.key === 'g' || e.key === 'G') && e.altKey) {
        e.preventDefault();
        setCartViewMode((prev) => (prev === 'grid' ? 'grouped' : 'grid'));
        return;
      }

      // 8. TOUCHE ALT+X : BASCULE CROSSFADE AUTO
      if ((e.key === 'x' || e.key === 'X') && (e.altKey || e.ctrlKey)) {
        e.preventDefault();
        handleToggleAutoCrossfade();
        return;
      }

      // 9. TOUCHES 1, 2, 3, 4 (OU NUMPAD 1-4) : DÉCLENCHEMENT DES COLONNES 1 À 4
      // Prise en charge des codes Digit1-4 (compatible AZERTY et QWERTY sans obligation de Shift)
      const digitMatch =
        e.code === 'Digit1' || e.key === '1' || e.code === 'Numpad1' ? 0 :
        e.code === 'Digit2' || e.key === '2' || e.code === 'Numpad2' ? 1 :
        e.code === 'Digit3' || e.key === '3' || e.code === 'Numpad3' ? 2 :
        e.code === 'Digit4' || e.key === '4' || e.code === 'Numpad4' ? 3 : -1;

      if (digitMatch !== -1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (e.altKey) {
          // Alt + 1..4 : Plein Feu Colonne
          triggerColumn(digitMatch, 'all');
        } else {
          // Touche 1..4 : Déclenchement Colonne selon le mode sélectionné (Step / Séquentiel par défaut)
          triggerColumn(digitMatch);
        }
        return;
      }

      // 10. TOUCHES DE PADS INDIVIDUELS (LETTRES Q, W, E, R, A, S, D, F, Z, X, C, V...)
      const pressedKey = e.key.toLowerCase();
      const matchedPad = pads.find((p) => p.keyboardKey && p.keyboardKey.toLowerCase() === pressedKey);
      if (matchedPad) {
        e.preventDefault();
        triggerPad(matchedPad.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    pads,
    triggerPad,
    handlePanicStopAll,
    handleStopAllPads,
    triggerColumn,
    isMidiLearnActive,
    learningPadId,
    isLearningMasterFader,
    isKeyboardModalOpen,
    contextualMidiModalPadId,
    isBankModalOpen,
    editingPad,
    handleToggleMasterMute,
    handleToggleAutoCrossfade,
    handleMasterVolumeChange,
    masterVolume,
    handleSelectBank
  ]);

  // Mise à jour d'un pad personnalisé depuis l'inspecteur
  const handleUpdatePad = (updatedFields: Partial<CartPad>) => {
    if (!editingPad) return;
    const newPad = { ...editingPad, ...updatedFields };
    setEditingPad(newPad);
    setPads((prev) => prev.map((p) => (p.id === editingPad.id ? newPad : p)));
  };

  // Modification directe du champ 'Label' optionnel d'un slot depuis la grille
  const handleSlotCustomLabelChange = useCallback((padId: string, customLabel: string) => {
    setPads((prev) =>
      prev.map((p) => (p.id === padId ? { ...p, customLabel } : p))
    );
    if (editingPad && editingPad.id === padId) {
      setEditingPad((prev) => (prev ? { ...prev, customLabel } : null));
    }
  }, [editingPad]);

  // Présets rapides de mapping MIDI
  const handleApplyAkaiPreset = () => {
    setPads((prev) =>
      prev.map((p, idx) => {
        const noteNum = 36 + idx; // 36 à 51 (C1 à D#2)
        return {
          ...p,
          midiBinding: {
            messageType: 'note',
            number: noteNum,
            channel: 1,
            noteName: getMidiNoteName(noteNum)
          }
        };
      })
    );
    setToastMessage('✅ Preset Akai MPK / Launchpad appliqué (Notes 36 à 51 sur Canal 1).');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleApplyChromaticPreset = () => {
    setPads((prev) =>
      prev.map((p, idx) => {
        const noteNum = 48 + idx; // 48 à 63 (C2 à D#3)
        return {
          ...p,
          midiBinding: {
            messageType: 'note',
            number: noteNum,
            channel: 1,
            noteName: getMidiNoteName(noteNum)
          }
        };
      })
    );
    setToastMessage('✅ Preset Clavier Chromatique appliqué (Notes 48 à 63 sur Canal 1).');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleClearAllMidi = () => {
    if (window.confirm('Effacer toutes les assignations MIDI des 16 pads ?')) {
      setPads((prev) => prev.map((p) => ({ ...p, midiBinding: null })));
      setToastMessage('Tous les mappings MIDI ont été effacés.');
      setTimeout(() => setToastMessage(null), 2000);
    }
  };

  // Réinitialiser les pads à la configuration d'usine
  const handleResetToFactory = () => {
    if (window.confirm("Réinitialiser les 16 pads du cartoucheur aux réglages d'usine ?")) {
      handlePanicStopAll();
      setPads(INITIAL_CART_PADS);
      setIsMidiLearnActive(false);
      setLearningPadId(null);
      handleMasterVolumeChange(0.85);
      setToastMessage('Cartoucheur 4x4 réinitialisé avec succès.');
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  // Rendu modulaire d'un Pad Tactile (utilisé en vue Grille 4x4 et en vue Dossiers / Scènes)
  const renderPadCard = (pad: CartPad) => {
    const isPlaying = pad.status === 'playing';
    const isStopping = pad.status === 'stopping';
    const isAudioActive = isPlaying || isStopping;
    const hasChoke = pad.chokeGroup !== null;
    const isLearningTarget = learningPadId === pad.id;
    const currentFolder = folders.find((f) => f.id === pad.folderId);

    return (
      <div
        key={pad.id}
        onClick={() => {
          if (isMidiLearnActive) {
            setContextualMidiModalPadId(pad.id);
          } else {
            triggerPad(pad.id);
          }
        }}
        className={`relative group rounded-xl p-2.5 flex flex-col justify-between cursor-pointer border transition-all duration-150 select-none overflow-hidden min-h-[11.8rem] ${
          isLearningTarget || contextualMidiModalPadId === pad.id
            ? 'border-amber-400 ring-4 ring-amber-400/80 bg-amber-950/40 scale-[1.02] shadow-2xl shadow-amber-500/40 animate-pulse'
            : isMidiLearnActive
            ? 'border-dashed border-amber-500/50 hover:border-amber-300 bg-[#161a22]'
            : isStopping
            ? 'border-amber-400/70 bg-amber-950/30 scale-[1.01] shadow-lg shadow-amber-950/50 opacity-90'
            : isPlaying
            ? 'border-white/80 scale-[1.02] shadow-xl'
            : 'border-[#232934] hover:border-zinc-500 bg-[#14181f]/90 hover:bg-[#1a2029]'
        }`}
        style={{
          backgroundColor: !isMidiLearnActive && isAudioActive ? `${pad.color}25` : undefined,
          boxShadow: !isMidiLearnActive && isAudioActive ? `0 0 20px ${pad.color}40` : undefined,
          borderColor: !isMidiLearnActive && isPlaying ? pad.color : undefined
        }}
      >
        {/* BARRE DE PROGRESSION INFÉRIEURE */}
        {isPlaying && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60 overflow-hidden">
            <div
              className="h-full transition-all duration-75"
              style={{
                width: `${pad.progress}%`,
                backgroundColor: pad.color
              }}
            />
          </div>
        )}

        {/* HAUT DU PAD : NUMÉRO, BADGE MIDI, RACCOURCI CLAVIER & MODE */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-mono font-black text-[10px] bg-black/50 border border-white/10 text-zinc-300">
              {pad.numberLabel}
            </span>

            {/* BADGE DU MAPPING MIDI PHYSIQUE & INTERFACE CONTEXTUELLE */}
            {pad.midiBinding ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setContextualMidiModalPadId(pad.id);
                }}
                className="text-[8px] font-mono px-1 py-0.2 rounded bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/50 text-amber-300 flex items-center gap-0.5 transition-all cursor-pointer shadow-sm"
                title={`Mappé au contrôleur MIDI : ${pad.midiBinding.messageType.toUpperCase()} ${pad.midiBinding.number} (${pad.midiBinding.noteName || ''}) sur Canal ${pad.midiBinding.channel}${pad.midiBinding.role === 'volume' ? ' [Fader Volume]' : ''}. Cliquer pour configurer.`}
              >
                <span>{pad.midiBinding.role === 'volume' ? '🎛️' : '🎹'}</span>
                <span>{pad.midiBinding.noteName || `${pad.midiBinding.messageType === 'note' ? 'N' : 'CC'}${pad.midiBinding.number}`}</span>
                {pad.midiBinding.role === 'volume' && (
                  <span className="text-[7px] text-amber-200 uppercase font-black">VOL</span>
                )}
              </button>
            ) : isMidiLearnActive ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setContextualMidiModalPadId(pad.id);
                }}
                className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black flex items-center gap-0.5 animate-pulse cursor-pointer shadow-md"
                title="Cliquer pour configurer le mapping MIDI contextuel de ce pad"
              >
                <Zap className="w-2.5 h-2.5" />
                <span>MAP</span>
              </button>
            ) : (
              pad.keyboardKey && (
                <span className="text-[9px] font-mono text-zinc-500 uppercase">
                  [{pad.keyboardKey}]
                </span>
              )
            )}

            {/* BADGE DU SIGNAL MIDI SORTANT (SORTIE DMX / FX EXTERNE) */}
            {pad.midiOut && pad.midiOut.enabled && (
              <span
                className="text-[8px] font-mono px-1 py-0.2 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center gap-0.5"
                title={`Signal MIDI Sortant : ${pad.midiOut.type === 'program_change' ? 'Program Change' : 'Control Change'} #${pad.midiOut.number} (Canal ${pad.midiOut.channel})${pad.midiOut.description ? ` — ${pad.midiOut.description}` : ''}`}
              >
                <Send className="w-2 h-2 text-purple-400" />
                <span>{pad.midiOut.type === 'program_change' ? `PC#${pad.midiOut.number}` : `CC#${pad.midiOut.number}`}</span>
              </span>
            )}

            {/* BADGE COMPORTEMENT CROSSFADE AUTO */}
            {pad.crossfadeBehavior === 'bypass' ? (
              <span
                className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-0.5"
                title="Bypass Crossfade : Cette couche reste active sans être coupée lors du déclenchement d'autres pads"
              >
                <span>🛡️</span>
                <span>BYPASS</span>
              </span>
            ) : pad.customCrossfadeMs ? (
              <span
                className="text-[8px] font-mono px-1 py-0.2 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center gap-0.5"
                title={`Durée de Crossfade propre à ce pad : ${pad.customCrossfadeMs} ms`}
              >
                <Shuffle className="w-2 h-2 text-indigo-400" />
                <span>{pad.customCrossfadeMs}ms</span>
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            {/* BADGE DE MODE */}
            <span
              className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${
                pad.mode === 'one-shot'
                  ? 'bg-sky-950/60 text-sky-300 border-sky-800'
                  : pad.mode === 'loop'
                  ? 'bg-teal-950/60 text-teal-300 border-teal-800'
                  : pad.mode === 'toggle'
                  ? 'bg-purple-950/60 text-purple-300 border-purple-800'
                  : 'bg-red-950/60 text-red-300 border-red-800'
              }`}
            >
              {pad.mode === 'choke' ? `CHOKE G${pad.chokeGroup}` : pad.mode}
            </span>

            {/* PASTILLE DE COULEUR / ÉTAT */}
            <span
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                isPlaying ? 'animate-ping' : ''
              }`}
              style={{ backgroundColor: pad.color }}
            />

            {/* BOUTON D'ÉDITION DU PAD */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditingPad(pad);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/60 text-zinc-400 hover:text-white transition-opacity ml-0.5"
              title="Personnaliser ce pad (nom, mapping MIDI, son, choke, dossier)"
            >
              <Settings2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* BADGE DU DOSSIER / GROUPE SCÉNIQUE DU PAD AVEC SÉLECTEUR RAPIDE */}
        <div
          className="my-0.5 relative z-10"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {currentFolder ? (
            <div
              className="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono border"
              style={{
                backgroundColor: `${currentFolder.color}18`,
                borderColor: `${currentFolder.color}45`,
                color: currentFolder.color
              }}
              title={`Dossier / Scène : ${currentFolder.name}`}
            >
              <div className="flex items-center gap-1 truncate max-w-[70%]">
                <Folder className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate font-bold">{currentFolder.name}</span>
              </div>
              <select
                value={pad.folderId || ''}
                onChange={(e) => handleAssignPadToFolder(pad.id, e.target.value || null)}
                className="bg-transparent text-zinc-400 hover:text-white text-[8px] cursor-pointer focus:outline-none max-w-[28%]"
                title="Changer de dossier"
              >
                <option value={currentFolder.id} className="bg-zinc-900 text-white">📁 {currentFolder.name}</option>
                <option value="" className="bg-zinc-900 text-zinc-400">Aucun dossier</option>
                {folders.filter((f) => f.id !== currentFolder.id).map((f) => (
                  <option key={f.id} value={f.id} className="bg-zinc-900 text-white">📁 {f.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center">
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) handleAssignPadToFolder(pad.id, e.target.value);
                }}
                className="w-full bg-black/40 hover:bg-black/70 border border-zinc-800 hover:border-zinc-600 rounded px-1 py-0.5 text-[8px] text-zinc-500 hover:text-zinc-300 font-mono focus:outline-none cursor-pointer"
                title="Assigner ce pad à un dossier / scène"
              >
                <option value="" disabled>+ Dossier / Scène...</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id} className="bg-zinc-900 text-white">📁 {f.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* MILIEU DU PAD : TITRE ET SOUS-TITRE */}
        <div className="my-0.5">
          <div className="font-black text-xs text-white leading-snug truncate drop-shadow-sm">
            {pad.label}
          </div>
          <div className="text-[10px] text-zinc-400 truncate flex items-center gap-1">
            <span>{pad.subLabel}</span>
            {hasChoke && pad.mode !== 'choke' && (
              <span className="text-[8px] text-amber-400 font-mono font-bold">
                [G{pad.chokeGroup}]
              </span>
            )}
          </div>
        </div>

        {/* CHAMP DE SAISIE 'LABEL' OPTIONNEL SUR LE SLOT DU PAD */}
        <div
          className="my-0.5 relative z-10"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-all ${
              pad.customLabel && pad.customLabel.trim().length > 0
                ? 'bg-amber-950/60 border-amber-500/60 text-amber-200 shadow-sm shadow-amber-950/40'
                : 'bg-black/50 hover:bg-black/75 focus-within:bg-black/90 focus-within:border-amber-400/80 border-white/10 hover:border-zinc-600 text-zinc-300'
            }`}
          >
            <Tag
              className={`w-2.5 h-2.5 shrink-0 ${
                pad.customLabel && pad.customLabel.trim().length > 0
                  ? 'text-amber-400'
                  : 'text-zinc-500'
              }`}
            />
            <input
              type="text"
              value={pad.customLabel ?? ''}
              onChange={(e) => handleSlotCustomLabelChange(pad.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              placeholder="Label optionnel..."
              className="w-full bg-transparent text-[9px] font-mono tracking-tight placeholder:text-zinc-600 focus:outline-none focus:text-white truncate"
              title="Saisir un label optionnel pour identifier visuellement ce contenu audio dans la grille"
            />
            {pad.customLabel && pad.customLabel.trim().length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSlotCustomLabelChange(pad.id, '');
                }}
                className="text-zinc-500 hover:text-amber-300 text-[10px] leading-none shrink-0 px-0.5"
                title="Effacer le label"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* VISUALISATION DE LA FORME D'ONDE (WAVEFORM) DU CONTENU AUDIO */}
        <div
          className="my-0.5 relative z-10"
          onClick={(e) => {
            // Un clic sur la forme d'onde déclenche ou relance le pad directement
            e.stopPropagation();
            if (!isMidiLearnActive) {
              triggerPad(pad.id);
            }
          }}
        >
          <PadWaveformVisualizer
            preset={pad.soundPreset}
            durationSec={pad.durationSec}
            fadeTimeMs={pad.fadeTimeMs}
            color={pad.color}
            progress={pad.progress}
            isPlaying={isAudioActive}
            compact={true}
          />
        </div>

        {/* BAS DU PAD : ÉTAT D'EXÉCUTION OU VOYANT MIDI LEARN */}
        <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400">
          <div className="flex items-center gap-1">
            {isLearningTarget ? (
              <span className="text-amber-300 font-bold animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                TOUCHEZ MATÉRIEL MIDI...
              </span>
            ) : isMidiLearnActive ? (
              <span className="text-amber-400/80 hover:underline">
                CLIQUEZ POUR ASSIGNER
              </span>
            ) : isStopping ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-amber-300 font-bold">FONDU...</span>
              </>
            ) : isPlaying ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-300 font-bold">
                  {pad.mode === 'loop' ? `LOOP (${pad.loopCount})` : 'LECTURE'}
                </span>
              </>
            ) : (
              <span className="text-zinc-500">PRÊT</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {pad.fadeTimeMs > 0 ? (
              <span
                className="text-[8px] font-mono px-1 py-0.2 rounded bg-cyan-950/70 border border-cyan-800/60 text-cyan-300 flex items-center gap-0.5"
                title={`Fondu progressif configuré : ${pad.fadeTimeMs} ms (${(pad.fadeTimeMs / 1000).toFixed(1)}s)`}
              >
                <Timer className="w-2.5 h-2.5 text-cyan-400" />
                <span>{pad.fadeTimeMs}ms</span>
              </span>
            ) : (
              <span className="text-[8px] font-mono text-zinc-600" title="Départ Cut direct sans fondu (0 ms)">
                Cut
              </span>
            )}

            <span className="text-[8px] text-zinc-500 font-mono">
              {pad.durationSec}s
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`flex flex-col bg-[#0f1216] border border-[#2a303c] rounded-xl overflow-hidden select-none text-white shadow-2xl relative ${className} ${
        panicActive ? 'ring-4 ring-red-600 animate-pulse' : ''
      }`}
    >
      {/* BANDEAU NOTIFICATION TOAST */}
      {toastMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-zinc-900/95 border-2 border-amber-500 text-amber-200 text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in duration-150">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. EN-TÊTE SUPÉRIEUR DU CARTOUCHEUR : TITRE, MASTER FADER & RÉGIE */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2.5 bg-[#14181f] border-b border-[#2a303c] gap-2.5">
        {/* Titre & Banques A/B/C */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-sm">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs flex items-center gap-1.5 leading-tight">
                <span>CUE CART TACTILE 4x4</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-mono">
                  {activePadsCount > 0 ? `${activePadsCount} ACTIF(S)` : 'STANDBY'}
                </span>
                {midiDeviceCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                    MIDI IN ({midiDeviceCount})
                  </span>
                )}
                {midiOutDeviceCount > 0 ? (
                  <span className="text-[9px] px-1.5 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded font-mono flex items-center gap-1" title="Sorties MIDI connectées pour contrôle DMX / Effets">
                    <Send className="w-2.5 h-2.5 text-purple-400" />
                    MIDI OUT ({midiOutDeviceCount})
                  </span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.2 bg-purple-950/40 text-purple-300 border border-purple-800/40 rounded font-mono flex items-center gap-1" title="Émission MIDI Out active au déclenchement des pads">
                    <Send className="w-2.5 h-2.5 text-purple-400" />
                    MIDI OUT PRÊT
                  </span>
                )}
                {lastMidiOutActivity && (
                  <span className="hidden xl:flex text-[9px] font-mono px-1.5 py-0.2 bg-purple-950/80 text-purple-200 border border-purple-600/50 rounded items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                    <span>{lastMidiOutActivity}</span>
                  </span>
                )}
                {lastCrossfadeInfo && (
                  <span className="hidden lg:flex text-[9px] font-mono px-2 py-0.2 bg-indigo-950/90 text-indigo-200 border border-indigo-500/60 rounded items-center gap-1 animate-pulse">
                    <Shuffle className="w-2.5 h-2.5 text-indigo-400" />
                    <span>{lastCrossfadeInfo}</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400">
                Pads QLab Cart · Sortie Mix Bus Synchrone Web Audio
              </p>
            </div>
          </div>

          {/* Banques de Pads & Sauvegarde localStorage */}
          <div className="flex items-center gap-1.5 ml-2">
            {/* Sélecteur de Banque A / B / C / D */}
            <div className="flex items-center bg-[#0a0d10] p-0.5 rounded-lg border border-[#2a303c]">
              {(['A', 'B', 'C', 'D'] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleSelectBank(b)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all relative ${
                    activeBank === b
                      ? 'bg-amber-500 text-zinc-950 shadow-sm font-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title={`Banque ${b} : ${bankNames[b] || '16 pads'}`}
                >
                  <span>{b}</span>
                </button>
              ))}
            </div>

            {/* Bouton Sauvegarder Rapide (localStorage) */}
            <button
              type="button"
              onClick={handleQuickSaveCurrentBank}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all border ${
                isSavedRecently
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-500/50'
                  : 'bg-[#0f141c] hover:bg-[#18202d] text-zinc-300 border-[#2a3447] hover:border-amber-400/60'
              }`}
              title="Sauvegarder immédiatement les 16 pads de la banque active dans le localStorage"
            >
              {isSavedRecently ? (
                <>
                  <Check className="w-3 h-3 text-white" />
                  <span className="hidden sm:inline">SAUVÉ</span>
                </>
              ) : (
                <>
                  <Save className="w-3 h-3 text-amber-400" />
                  <span className="hidden sm:inline">SAUVER</span>
                </>
              )}
            </button>

            {/* Bouton Gérer les Banques (Ouvre le modal de gestion avancée) */}
            <button
              type="button"
              onClick={() => setIsBankModalOpen(true)}
              className="px-2 py-1 rounded-lg bg-[#0f141c] hover:bg-[#18202d] text-zinc-300 hover:text-white text-[10px] font-bold flex items-center gap-1 border border-[#2a3447] hover:border-cyan-400/60 transition-all"
              title="Ouvrir le gestionnaire de banques : renommer, dupliquer, réinitialiser ou exporter/importer JSON"
            >
              <FolderOpen className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">BANQUES</span>
            </button>

            {/* Bouton Raccourcis Clavier Régie Live */}
            <button
              type="button"
              onClick={() => setIsKeyboardModalOpen(true)}
              className="px-2 py-1 rounded-lg bg-[#0f141c] hover:bg-[#18202d] text-zinc-300 hover:text-white text-[10px] font-bold flex items-center gap-1 border border-[#2a3447] hover:border-amber-400/60 transition-all"
              title="Afficher & configurer les raccourcis clavier de régie live (Touches 1-4 pour colonnes, Espace pour Stop All...)"
            >
              <Keyboard className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">RACCOURCIS</span>
            </button>
          </div>
        </div>

        {/* SECTION VU-MÈTRE WEB AUDIO, MASTER FADER & COMMANDES DE SORTIE AUDIO */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* ========================================================= */}
          {/* VISUALISEUR DE NIVEAU SONORE AVEC FADER MASTER GAIN SYSTÈME */}
          {/* ========================================================= */}
          <CartAudioVuMeter
            onGainChange={(gain) => {
              liveBridge.sendOSC('/audio/master/gain', [gain]);
              if (onTriggerOsc) onTriggerOsc('/audio/master/gain', [gain]);
            }}
          />

          {/* ========================================================= */}
          {/* LE MASTER FADER DE VOLUME GLOBAL (BUS AUDIO CUE CART) */}
          {/* ========================================================= */}
          <div className="flex items-center gap-2 px-2.5 py-1 bg-[#090c0f] border border-[#2d3748] rounded-xl shadow-inner">
            {/* Bouton Mute Master avec voyant rétro-éclairé */}
            <button
              type="button"
              onClick={handleToggleMasterMute}
              className={`p-1.5 rounded-lg transition-all flex items-center gap-1 font-mono text-[9px] font-black border ${
                isMasterMuted
                  ? 'bg-red-600 text-white border-red-400 shadow-md shadow-red-900/60 animate-pulse'
                  : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
              }`}
              title={isMasterMuted ? 'Rétablir la sortie Master' : 'Couper le son Master (Mute)'}
            >
              {isMasterMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>MUTE</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[8px] text-emerald-400">ON</span>
                </>
              )}
            </button>

            {/* Fader & Échelle dB */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[9px] font-mono leading-none">
                <span className="text-zinc-400 font-bold tracking-wider text-[8px] uppercase">MASTER CART</span>
                <span className={`font-bold ${isMasterMuted ? 'text-red-400' : masterVolume > 0.85 ? 'text-amber-300' : 'text-zinc-200'}`}>
                  {isMasterMuted ? '-∞ dB (MUTE)' : `${volumeToDbString(masterVolume)} · ${Math.round(masterVolume * 100)}%`}
                </span>
              </div>

              {/* Fader Track & Curseur Haute Précision */}
              <div className="relative flex items-center">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMasterMuted ? 0 : masterVolume}
                  onChange={(e) => handleMasterVolumeChange(parseFloat(e.target.value))}
                  className="w-28 sm:w-36 h-2 rounded-lg appearance-none cursor-pointer accent-amber-400 bg-zinc-800"
                  title={`Master Fader: ${Math.round(masterVolume * 100)}% (${volumeToDbString(masterVolume)})`}
                />
              </div>
            </div>

            {/* Presets rapides dB & Mapping MIDI Fader */}
            <div className="hidden lg:flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleMasterVolumeChange(1.0)}
                className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border transition-all ${
                  !isMasterMuted && masterVolume === 1.0
                    ? 'bg-amber-500 text-black border-amber-300 font-black'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
                title="Régler le Master à 0 dB (100%)"
              >
                0dB
              </button>
              <button
                type="button"
                onClick={() => handleMasterVolumeChange(0.5)}
                className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border transition-all ${
                  !isMasterMuted && Math.abs(masterVolume - 0.5) < 0.05
                    ? 'bg-amber-500 text-black border-amber-300 font-black'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
                title="Régler le Master à -6 dB (50%)"
              >
                -6dB
              </button>
              <button
                type="button"
                onClick={() => handleMasterVolumeChange(0.25)}
                className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border transition-all ${
                  !isMasterMuted && Math.abs(masterVolume - 0.25) < 0.05
                    ? 'bg-amber-500 text-black border-amber-300 font-black'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
                title="Régler le Master à -12 dB (25%)"
              >
                -12dB
              </button>

              {/* Bouton MIDI Map du Master Fader */}
              <button
                type="button"
                onClick={() => {
                  setIsLearningMasterFader((prev) => !prev);
                  setToastMessage(
                    !isLearningMasterFader
                      ? '🎛️ Actionnez un potentiomètre ou fader sur votre contrôleur MIDI...'
                      : null
                  );
                }}
                className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border transition-all flex items-center gap-0.5 ${
                  isLearningMasterFader
                    ? 'bg-amber-400 text-black border-amber-300 animate-pulse'
                    : masterFaderMidiCc !== null
                    ? 'bg-indigo-950/70 text-indigo-300 border-indigo-700/60 hover:border-amber-400'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
                title={
                  isLearningMasterFader
                    ? 'En écoute... Bougez un fader MIDI'
                    : masterFaderMidiCc !== null
                    ? `Master Fader piloté par MIDI CC ${masterFaderMidiCc} (Cliquez pour réassigner)`
                    : 'Assigner ce Master Fader à un fader physique MIDI CC'
                }
              >
                <span>🎛️</span>
                <span>{isLearningMasterFader ? 'LEARN...' : masterFaderMidiCc !== null ? `CC${masterFaderMidiCc}` : 'MIDI'}</span>
              </button>
            </div>
          </div>

          {/* BOUTON COMMUTATEUR MIDI LEARN PADS */}
          <button
            type="button"
            onClick={() => {
              if (isMidiLearnActive) {
                setIsMidiLearnActive(false);
                setLearningPadId(null);
              } else {
                setIsMidiLearnActive(true);
                setToastMessage('Mode MIDI Learn activé. Cliquez sur un pad pour lui assigner une touche physique.');
                setTimeout(() => setToastMessage(null), 3000);
              }
            }}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all border ${
              isMidiLearnActive
                ? 'bg-amber-500 text-zinc-950 border-amber-300 shadow-lg shadow-amber-500/30 animate-pulse'
                : 'bg-[#181d24] text-zinc-300 border-zinc-700 hover:border-amber-400 hover:text-white'
            }`}
            title="Activer le mode MIDI Learn pour mapper des touches ou pads de contrôleur MIDI externe"
          >
            <Sliders className={`w-3 h-3 ${isMidiLearnActive ? 'text-zinc-950' : 'text-amber-400'}`} />
            <span>MIDI LEARN</span>
            {isMidiLearnActive && (
              <span className="text-[8px] px-1 py-0.2 bg-black/30 rounded font-black">
                ACTIF
              </span>
            )}
          </button>

          {/* COMMUTATEUR ET RÉGLAGES DU CROSSFADE AUTOMATIQUE SÉQUENTIEL */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#090c0f] border border-[#2d3748] rounded-xl shadow-inner">
            <button
              type="button"
              onClick={handleToggleAutoCrossfade}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all border ${
                isAutoCrossfadeEnabled
                  ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white border-indigo-400 shadow-md shadow-indigo-950/60 font-black'
                  : 'bg-[#181d24] text-zinc-400 border-zinc-700 hover:text-zinc-200'
              }`}
              title={
                isAutoCrossfadeEnabled
                  ? `Crossfade auto ACTIF (${(crossfadeDurationMs / 1000).toFixed(1)}s) : transitions fluides automatiques entre sons, vidéos et effets lors des déclenchements`
                  : 'Activer le fondu croisé (Crossfade) automatique entre les pads lors du lancement séquentiel'
              }
            >
              <Shuffle className={`w-3 h-3 ${isAutoCrossfadeEnabled ? 'text-amber-300' : 'text-zinc-400'}`} />
              <span>CROSSFADE</span>
              <span className={`text-[8px] px-1 py-0.2 rounded font-mono font-black ${
                isAutoCrossfadeEnabled ? 'bg-black/40 text-amber-300' : 'bg-black/30 text-zinc-500'
              }`}>
                {isAutoCrossfadeEnabled ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Réglage Durée Slider & Presets rapides */}
            <div className="flex items-center gap-1 pl-1 border-l border-zinc-800">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-[8px] font-mono leading-none text-zinc-400 gap-1">
                  <span>DURÉE</span>
                  <span className={`font-bold ${isAutoCrossfadeEnabled ? 'text-indigo-300' : 'text-zinc-500'}`}>
                    {(crossfadeDurationMs / 1000).toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="6000"
                  step="100"
                  value={crossfadeDurationMs}
                  onChange={(e) => handleSetCrossfadeDuration(parseInt(e.target.value, 10))}
                  className="w-16 sm:w-20 h-1.5 accent-indigo-400 cursor-pointer bg-zinc-800 rounded"
                  title={`Durée du crossfade : ${crossfadeDurationMs} ms (${(crossfadeDurationMs / 1000).toFixed(1)}s)`}
                />
              </div>

              {/* Presets rapides de fondu croisé */}
              <div className="hidden xl:flex items-center gap-0.5">
                {[
                  { label: '0.5s', ms: 500 },
                  { label: '1.2s', ms: 1200 },
                  { label: '2.5s', ms: 2500 }
                ].map((p) => (
                  <button
                    key={p.ms}
                    type="button"
                    onClick={() => handleSetCrossfadeDuration(p.ms)}
                    className={`px-1 py-0.5 rounded text-[8px] font-mono transition-colors ${
                      crossfadeDurationMs === p.ms
                        ? 'bg-indigo-500 text-white font-bold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                    title={`Régler la durée du crossfade à ${p.ms} ms`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Sélecteur de Scope : Global vs Même Dossier */}
              <button
                type="button"
                onClick={() => handleSetCrossfadeScope(crossfadeScope === 'all' ? 'same_folder' : 'all')}
                className={`px-1.5 py-1 rounded text-[8px] font-mono border transition-all ${
                  crossfadeScope === 'same_folder'
                    ? 'bg-purple-950/80 text-purple-200 border-purple-600/70'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
                title={
                  crossfadeScope === 'same_folder'
                    ? 'Scope : Ne fond que les pads du même dossier / scène'
                    : 'Scope : Fond tous les layers actifs sur l’ensemble du cartoucheur'
                }
              >
                {crossfadeScope === 'same_folder' ? 'Dossier' : 'Global'}
              </button>
            </div>
          </div>

          {/* BOUTON STOP ALL DOUX DE TOUS LES PADS EN LECTURE (TOUCHE ESPACE) */}
          <button
            type="button"
            onClick={handleStopAllPads}
            className="px-3 py-1.5 rounded-lg bg-[#181d26] hover:bg-[#202734] text-amber-300 hover:text-amber-200 font-black text-xs flex items-center gap-1.5 shadow-md border border-amber-500/50 hover:border-amber-400 active:scale-95 transition-all tracking-wider uppercase"
            title="Arrêt doux de tous les pads en lecture avec fondu (Raccourci clavier : Touche ESPACE)"
          >
            <Square className="w-3.5 h-3.5 fill-current text-amber-400" />
            <span>STOP ALL</span>
            <span className="text-[9px] px-1.5 py-0.2 bg-black/40 rounded border border-amber-500/30 font-mono text-amber-300 font-bold">
              ESPACE
            </span>
          </button>

          {/* LE BOUTON PANIC / STOP ALL GLOBAL DE LA RÉGIE */}
          <button
            type="button"
            onClick={handlePanicStopAll}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-red-950/60 border border-red-400/80 active:scale-95 transition-all tracking-wider uppercase group"
            title="Arrêt d'urgence immédiat de tous les pads et flux de régie (Raccourci clavier : Touche ÉCHAP)"
          >
            <ShieldAlert className="w-4 h-4 text-white animate-pulse group-hover:scale-125 transition-transform" />
            <span>PANIC / STOP ALL</span>
            <span className="text-[9px] px-1 py-0.2 bg-black/40 rounded border border-white/20 font-mono">
              ÉCHAP
            </span>
          </button>
        </div>
      </div>

      {/* BANDEAU D'AIDE ET ACTIONS LORSQUE MIDI LEARN EST ACTIF */}
      {isMidiLearnActive && (
        <div className="px-3 py-2 bg-gradient-to-r from-amber-950/90 via-[#1e1b13] to-amber-950/90 border-b border-amber-500/50 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-200">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="font-bold">
              {learningPadId
                ? `En attente d'une frappe MIDI pour le Pad ${pads.find((p) => p.id === learningPadId)?.numberLabel} (${pads.find((p) => p.id === learningPadId)?.label})...`
                : "MODE MIDI LEARN : Cliquez sur un pad ci-dessous pour l'associer à une touche de votre contrôleur physique."}
            </span>
            {lastMidiActivity && (
              <span className="text-[10px] font-mono bg-black/50 px-2 py-0.5 rounded text-amber-300 border border-amber-500/30">
                Dernier message : {lastMidiActivity}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                const targetId = learningPadId || pads[0]?.id;
                if (targetId) setContextualMidiModalPadId(targetId);
              }}
              className="px-2.5 py-1 rounded bg-amber-500 text-zinc-950 hover:bg-amber-400 text-[10px] font-black flex items-center gap-1 shadow-md transition-all"
              title="Ouvrir l'interface de mapping contextuel avec radar de détection et assignation dynamique des faders/pads"
            >
              <Sliders className="w-3 h-3" />
              <span>Mapping Contextuel Dynamique</span>
            </button>
            <button
              type="button"
              onClick={handleApplyAkaiPreset}
              className="px-2 py-1 rounded bg-[#0a0d10] border border-amber-500/40 hover:border-amber-400 text-amber-300 text-[10px] font-bold"
              title="Pré-configurer pour Akai MPK Mini, APC, Novation Launchpad (Notes 36 à 51)"
            >
              Preset Akai (36-51)
            </button>
            <button
              type="button"
              onClick={handleApplyChromaticPreset}
              className="px-2 py-1 rounded bg-[#0a0d10] border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-[10px]"
              title="Pré-configurer pour clavier chromatique (Notes 48 à 63)"
            >
              Preset Chromatique (48-63)
            </button>
            <button
              type="button"
              onClick={() => {
                const targetNote = learningPadId
                  ? (pads.find((p) => p.id === learningPadId)?.gridIndex ?? 0) + 36
                  : 36;
                midiDeviceEngine.simulateMidiMessage('note', targetNote, 0.9, 1);
              }}
              className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold"
              title="Simuler l'arrivée d'une note physique pour tester le mapping"
            >
              Simuler Note MIDI
            </button>
            <button
              type="button"
              onClick={handleClearAllMidi}
              className="px-2 py-1 rounded bg-zinc-800 hover:bg-red-900/60 text-zinc-300 hover:text-red-200 text-[10px]"
            >
              Effacer MIDI
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMidiLearnActive(false);
                setLearningPadId(null);
              }}
              className="px-2 py-1 rounded bg-amber-500 text-black text-[10px] font-bold"
            >
              Terminer Learn
            </button>
          </div>
        </div>
      )}

      {/* 2. BANDEAU DE GESTION DES DOSSIERS / GROUPES THÉMATIQUES & SCÉNIQUES */}
      <div className="px-3 py-2 bg-[#12161e] border-b border-[#232936] flex flex-wrap items-center justify-between gap-2">
        {/* Gauche : Sélecteur de Vue (Grille vs Dossiers) & Filtres par Dossier */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Bascule Mode Grille 4x4 vs Mode Par Dossiers */}
          <div className="flex items-center bg-[#0a0d10] p-0.5 rounded-lg border border-[#2a303c]">
            <button
              type="button"
              onClick={() => {
                setCartViewMode('grid');
                setActiveFolderFilter(null);
              }}
              className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                cartViewMode === 'grid'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm font-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Affichage Grille standard 4x4 (16 pads)"
            >
              <Grid className="w-3 h-3" />
              <span>Grille 4x4</span>
            </button>
            <button
              type="button"
              onClick={() => setCartViewMode('grouped')}
              className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                cartViewMode === 'grouped'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm font-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Affichage organisé par Dossiers & Thématiques Scéniques"
            >
              <Folder className="w-3 h-3" />
              <span>Vue Dossiers ({folders.length})</span>
            </button>
          </div>

          {/* Séparateur vertical */}
          <div className="h-4 w-px bg-zinc-700 hidden sm:block" />

          {/* Onglets / Filtres par dossier */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveFolderFilter(null)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                activeFolderFilter === null
                  ? 'bg-[#1e2530] text-amber-300 border-amber-500/60 shadow-sm'
                  : 'bg-[#0e1218] text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200'
              }`}
              title="Afficher tous les pads (16)"
            >
              <Filter className="w-2.5 h-2.5" />
              <span>Tous (16)</span>
            </button>

            {folders.map((folder) => {
              const padsInFolder = pads.filter((p) => p.folderId === folder.id);
              const isFolderActive = activeFolderFilter === folder.id;
              const isAnyPlaying = padsInFolder.some((p) => p.status === 'playing');

              return (
                <div key={folder.id} className="relative group flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (cartViewMode === 'grouped') {
                        setCartViewMode('grid');
                        setActiveFolderFilter(folder.id);
                      } else {
                        setActiveFolderFilter(isFolderActive ? null : folder.id);
                      }
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
                      isFolderActive
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'bg-[#0e1218] text-zinc-300 border-zinc-800 hover:border-zinc-600'
                    }`}
                    style={{
                      borderColor: isFolderActive ? folder.color : undefined,
                      boxShadow: isFolderActive ? `0 0 10px ${folder.color}30` : undefined
                    }}
                    title={`Filtrer par « ${folder.name} » (${padsInFolder.length} pad${padsInFolder.length > 1 ? 's' : ''})`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${isAnyPlaying ? 'animate-ping' : ''}`}
                      style={{ backgroundColor: folder.color }}
                    />
                    <span className="truncate max-w-[110px]">{folder.name}</span>
                    <span
                      className="text-[9px] px-1 py-0.2 rounded font-mono font-bold"
                      style={{ backgroundColor: `${folder.color}20`, color: folder.color }}
                    >
                      {padsInFolder.length}
                    </span>
                  </button>

                  {/* Bouton Stop Rapide pour ce dossier si au moins un son joue */}
                  {isAnyPlaying && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStopFolderPads(folder.id);
                      }}
                      className="ml-0.5 p-1 rounded bg-red-900/80 hover:bg-red-800 text-white text-[9px] border border-red-500 animate-pulse"
                      title={`Couper immédiatement tous les sons en cours dans « ${folder.name} »`}
                    >
                      <Square className="w-2.5 h-2.5 fill-current" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Droite : Bouton Nouveau Dossier */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsCreatingFolder((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all border ${
              isCreatingFolder
                ? 'bg-cyan-500 text-zinc-950 border-cyan-300 shadow-md font-black'
                : 'bg-[#18202c] hover:bg-[#202b3c] text-cyan-300 border-cyan-800/60 hover:border-cyan-400'
            }`}
            title="Créer un nouveau groupe ou dossier pour organiser les 16 pads par thématique sonore ou par scène"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ NOUVEAU DOSSIER</span>
          </button>
        </div>
      </div>

      {/* PANNEAU DE CRÉATION DE NOUVEAU DOSSIER INLINE */}
      {isCreatingFolder && (
        <div className="px-3 py-2.5 bg-gradient-to-r from-[#111927] via-[#141e30] to-[#111927] border-b border-cyan-500/40 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <FolderPlus className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs font-bold text-cyan-200 shrink-0">Nouveau Dossier / Scène :</span>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="ex: Scène 5 : Tempête, Bruitages Monstres, Chœurs..."
                className="flex-1 bg-zinc-900 border border-cyan-700/60 rounded px-2.5 py-1 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder(newFolderName, newFolderColor);
                  if (e.key === 'Escape') setIsCreatingFolder(false);
                }}
                autoFocus
              />
            </div>

            {/* Palette de couleurs */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-400">Couleur :</span>
              {[
                '#38bdf8', // Cyan
                '#f59e0b', // Ambre
                '#10b981', // Émeraude
                '#d946ef', // Fuchsia
                '#6366f1', // Indigo
                '#f43f5e', // Rose
                '#8b5cf6', // Violet
                '#ef4444'  // Rouge
              ].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewFolderColor(color)}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    newFolderColor === color ? 'scale-125 ring-2 ring-white shadow-lg' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleCreateFolder(newFolderName, newFolderColor)}
                className="px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs"
              >
                Créer
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingFolder(false);
                  setNewFolderName('');
                }}
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2.1 AFFICHAGE : VUE GRILLE 4x4 STANDARD */}
      {cartViewMode === 'grid' && (
        <div className="p-3 bg-[#0c0e12]">
          {/* Notification de filtre actif */}
          {activeFolderFilter && (
            <div className="mb-2 px-3 py-1.5 rounded-lg bg-[#141824] border border-amber-500/40 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-zinc-300">
                  Filtre actif : <strong className="text-amber-300">{folders.find((f) => f.id === activeFolderFilter)?.name || 'Dossier'}</strong> ({pads.filter((p) => p.folderId === activeFolderFilter).length} pads)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveFolderFilter(null)}
                className="text-[10px] text-amber-400 hover:underline font-bold"
              >
                Afficher tous les 16 pads
              </button>
            </div>
          )}

          {/* BARRE DE DÉCLENCHEMENT DES COLONNES EN RÉGIE LIVE (TOUCHES 1-4) */}
          {!activeFolderFilter && (
            <div className="mb-2.5 bg-[#0e121a] p-1.5 rounded-xl border border-[#252f3f] shadow-inner">
              <div className="flex items-center justify-between mb-1 px-1">
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
                  <Keyboard className="w-3 h-3 text-amber-400" />
                  <span className="font-bold text-zinc-300">DÉCLENCHEMENT PAR COLONNES (TOUCHES 1-4)</span>
                  <span className="text-[9px] text-zinc-500 hidden md:inline">
                    · Mode : {columnTriggerMode === 'step' ? 'Séquentiel (Step)' : columnTriggerMode === 'all' ? 'Plein Feu' : 'Ligne 1'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-zinc-500 font-mono hidden sm:inline">
                    Appuyez sur 1, 2, 3, 4 au clavier
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsKeyboardModalOpen(true)}
                    className="text-[9px] font-mono text-amber-400 hover:underline flex items-center gap-0.5 ml-1 font-bold"
                  >
                    <span>Config ⌨</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((colIdx) => {
                  const colPadIndices = [colIdx, colIdx + 4, colIdx + 8, colIdx + 12];
                  const colPads = colPadIndices.map((idx) => pads[idx]).filter(Boolean);
                  const isAnyPlaying = colPads.some((p) => p.status === 'playing');
                  const isAnyStopping = colPads.some((p) => p.status === 'stopping');
                  const isFlashed = activeColumnFlash === colIdx;
                  const nextStepIdx = columnStepIndex[colIdx] % colPads.length;
                  const nextPad = colPads[nextStepIdx];
                  const activePlayingPad = colPads.find((p) => p.status === 'playing' || p.status === 'stopping');

                  return (
                    <button
                      key={colIdx}
                      type="button"
                      onClick={() => triggerColumn(colIdx)}
                      className={`px-2 py-1.5 rounded-lg border text-left flex items-center justify-between transition-all select-none group relative overflow-hidden ${
                        isFlashed
                          ? 'bg-amber-400 text-zinc-950 border-amber-300 ring-2 ring-amber-400 scale-[1.02] shadow-lg shadow-amber-500/40'
                          : isAnyPlaying
                          ? 'bg-gradient-to-r from-emerald-950/80 to-[#101b1b] border-emerald-500/60 text-emerald-200 shadow-md shadow-emerald-950/40'
                          : isAnyStopping
                          ? 'bg-amber-950/60 border-amber-500/60 text-amber-200'
                          : 'bg-[#141822] hover:bg-[#1b2230] border-[#252f3f] hover:border-amber-400/60 text-zinc-300'
                      }`}
                      title={`Déclencher Colonne ${colIdx + 1} (Raccourci clavier : Touche ${colIdx + 1}) · Prochain pad : ${nextPad?.label || ''}`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {/* Touche clavier badge */}
                        <span className={`w-5 h-5 rounded flex items-center justify-center font-mono font-black text-xs border shrink-0 transition-transform ${
                          isFlashed
                            ? 'bg-black text-amber-300 border-black scale-110'
                            : isAnyPlaying
                            ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400/50'
                            : 'bg-black/60 text-amber-400 border-amber-500/30 group-hover:border-amber-400'
                        }`}>
                          {colIdx + 1}
                        </span>
                        <div className="flex flex-col truncate leading-tight">
                          <span className="text-[10px] font-bold uppercase tracking-wider truncate flex items-center gap-1">
                            <span>COLONNE {colIdx + 1}</span>
                            {isAnyPlaying && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
                          </span>
                          <span className="text-[9px] text-zinc-400 truncate">
                            {activePlayingPad ? (
                              <span className="text-emerald-300 font-semibold truncate">▶ {activePlayingPad.label}</span>
                            ) : (
                              <span className="truncate">Step : {nextPad?.label || `Pad ${colIdx + 1}`}</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-black/40 text-zinc-400 border border-white/10">
                          {nextStepIdx + 1}/4
                        </span>
                        <Play className={`w-3 h-3 ${isAnyPlaying ? 'text-emerald-400 fill-current' : 'text-zinc-500 group-hover:text-amber-400'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(activeFolderFilter ? pads.filter((p) => p.folderId === activeFolderFilter) : pads).map(renderPadCard)}
          </div>
        </div>
      )}

      {/* 2.2 AFFICHAGE : VUE ORGANISÉE PAR DOSSIERS / SCÈNES */}
      {cartViewMode === 'grouped' && (
        <div className="p-3 bg-[#0c0e12] space-y-4">
          {folders.map((folder) => {
            const folderPads = pads.filter((p) => p.folderId === folder.id);
            const isAnyPlaying = folderPads.some((p) => p.status === 'playing');
            const isEditingThisFolder = editingFolderId === folder.id;

            return (
              <div
                key={folder.id}
                className="rounded-xl border bg-[#11151c]/90 overflow-hidden shadow-lg transition-all"
                style={{ borderColor: `${folder.color}40` }}
              >
                {/* En-tête du Dossier / Scène */}
                <div
                  className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 border-b"
                  style={{
                    backgroundColor: `${folder.color}15`,
                    borderColor: `${folder.color}30`
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ${isAnyPlaying ? 'animate-ping' : ''}`}
                      style={{ backgroundColor: folder.color }}
                    />
                    <Folder className="w-4 h-4 shrink-0" style={{ color: folder.color }} />

                    {isEditingThisFolder ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="text"
                          value={editingFolderNameValue}
                          onChange={(e) => setEditingFolderNameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameFolder(folder.id, editingFolderNameValue);
                            if (e.key === 'Escape') setEditingFolderId(null);
                          }}
                          className="bg-zinc-900 border border-amber-400 rounded px-2 py-0.5 text-xs text-white font-bold"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameFolder(folder.id, editingFolderNameValue)}
                          className="p-1 rounded bg-amber-500 text-black text-xs font-bold"
                          title="Valider"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingFolderId(null)}
                          className="p-1 rounded bg-zinc-800 text-zinc-300 text-xs"
                          title="Annuler"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-white">{folder.name}</span>
                        <span
                          className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold"
                          style={{ backgroundColor: `${folder.color}25`, color: folder.color }}
                        >
                          {folderPads.length} pad{folderPads.length > 1 ? 's' : ''}
                        </span>
                        {folder.description && (
                          <span className="text-[10px] text-zinc-400 hidden md:inline">
                            — {folder.description}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions du dossier : Stop Groupe, Renommer, Supprimer */}
                  <div className="flex items-center gap-1.5">
                    {isAnyPlaying && (
                      <button
                        type="button"
                        onClick={() => handleStopFolderPads(folder.id)}
                        className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm animate-pulse"
                        title="Arrêter tous les sons en cours dans ce dossier"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        <span>STOP GROUPE</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFolderId(folder.id);
                        setEditingFolderNameValue(folder.name);
                      }}
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white text-[10px]"
                      title="Renommer ce dossier"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Supprimer le dossier « ${folder.name} » ? Les pads seront conservés.`)) {
                          handleDeleteFolder(folder.id);
                        }
                      }}
                      className="p-1 rounded hover:bg-red-950/60 text-zinc-500 hover:text-red-400 text-[10px]"
                      title="Supprimer ce dossier"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Grille des pads du dossier */}
                <div className="p-2.5">
                  {folderPads.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {folderPads.map(renderPadCard)}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-xs text-zinc-500 flex flex-col items-center justify-center gap-1">
                      <Folder className="w-5 h-5 opacity-40" />
                      <span>Aucun pad assigné à ce dossier.</span>
                      <span className="text-[10px] text-zinc-600">
                        Assignez des pads depuis la grille standard ou le panneau d'inspection.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Section des Pads Non Assignés */}
          {pads.filter((p) => !p.folderId).length > 0 && (
            <div className="rounded-xl border border-dashed border-zinc-700 bg-[#0d1015]/80 overflow-hidden">
              <div className="px-3 py-2 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/60">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 text-xs font-bold">Pads Sans Dossier / Non Classés</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                    {pads.filter((p) => !p.folderId).length} pad(s)
                  </span>
                </div>
              </div>
              <div className="p-2.5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {pads.filter((p) => !p.folderId).map(renderPadCard)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. LÉGENDE PÉDAGOGIQUE RÉGIE */}
      <div className="px-3 py-1.5 bg-[#0a0d10] border-t border-[#2a303c] flex flex-wrap items-center justify-between text-[10px] text-zinc-400 gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-zinc-500 font-semibold uppercase tracking-wider">Modes :</span>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>One-Shot</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            <span>Loop (Boucle)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>Toggle</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span>Choke (Exclusif)</span>
          </div>
          <div className="flex items-center gap-1 text-amber-300 ml-2">
            <span>🎛️</span>
            <span>Master Fader & Mix Bus</span>
          </div>
          <div className="flex items-center gap-1 text-cyan-300 ml-1">
            <span>⏳</span>
            <span>Fade Time Réglable (0-5000 ms)</span>
          </div>
          <div className="flex items-center gap-1 text-amber-300/90 ml-1">
            <Tag className="w-2.5 h-2.5 text-amber-400" />
            <span>Label Identifiant Slot</span>
          </div>
          <div className="flex items-center gap-1 text-purple-300 ml-1">
            <Folder className="w-2.5 h-2.5 text-purple-400" />
            <span>Dossiers Thématiques & Scènes</span>
          </div>
          <div className="flex items-center gap-1 text-purple-300 ml-1">
            <Send className="w-2.5 h-2.5 text-purple-400" />
            <span>Sortie MIDI (PC / CC DMX & FX)</span>
          </div>
          <div className="flex items-center gap-1 text-cyan-300 ml-1">
            <Activity className="w-2.5 h-2.5 text-cyan-400" />
            <span>Formes d'Onde Audio (Waveforms Dynamiques)</span>
          </div>
          <div className="flex items-center gap-1 text-indigo-300 ml-1">
            <Shuffle className="w-2.5 h-2.5 text-indigo-400" />
            <span>Crossfade Auto Séquentiel Multi-Layers</span>
          </div>
          <div className="flex items-center gap-1 text-amber-300 ml-1 font-mono">
            <Keyboard className="w-2.5 h-2.5 text-amber-400" />
            <span>[1-4] Colonnes · [ESPACE] Stop All · [ÉCHAP] Panic</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetToFactory}
          className="text-[9px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
          title="Réinitialiser tous les pads"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span>Défaut Usine</span>
        </button>
      </div>

      {/* 4. TIROIR D'INSPECTION & PERSONNALISATION DE PAD */}
      {editingPad && (
        <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md p-4 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-150 overflow-y-auto">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-700 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm">
                  Personnaliser Pad {editingPad.numberLabel} : {editingPad.label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingPad(null)}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Titre & Sous-titre */}
              <div className="space-y-1">
                <label className="text-zinc-400 text-[10px]">Titre du Pad</label>
                <input
                  type="text"
                  value={editingPad.label}
                  onChange={(e) => handleUpdatePad({ label: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-white font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 text-[10px]">Sous-titre / Note</label>
                <input
                  type="text"
                  value={editingPad.subLabel}
                  onChange={(e) => handleUpdatePad({ subLabel: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-zinc-200"
                />
              </div>

              {/* Champ de saisie 'Label' optionnel pour identifier visuellement le contenu audio dans la grille */}
              <div className="md:col-span-2 space-y-1 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-amber-300 font-bold text-[10px] flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Champ de saisie 'Label' optionnel (Identifiant visuel du slot dans la grille)</span>
                  </label>
                  <span className="text-[9px] text-zinc-400 font-mono">Affiché directement sur le pad</span>
                </div>
                <input
                  type="text"
                  value={editingPad.customLabel ?? ''}
                  onChange={(e) => handleUpdatePad({ customLabel: e.target.value })}
                  placeholder="ex: SFX Orage / Voix Off / Top Éclairage / Intro Solo..."
                  className="w-full bg-zinc-900 border border-amber-500/40 rounded px-2.5 py-1 text-amber-200 font-medium placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 text-xs"
                />
                <p className="text-[10px] text-zinc-400">
                  Ce label personnalisé s'affiche directement dans le slot de la grille pour identifier visuellement le contenu audio sans ambiguïté en régie.
                </p>
              </div>

              {/* Groupe ou Dossier Scénique / Thématique du Pad */}
              <div className="md:col-span-2 space-y-1 bg-[#101726] border border-cyan-500/40 rounded-lg p-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-cyan-300 font-bold text-[10px] flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Groupe ou Dossier Scénique / Thématique</span>
                  </label>
                  {editingPad.folderId && (
                    <span
                      className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border"
                      style={{
                        backgroundColor: `${folders.find(f => f.id === editingPad.folderId)?.color || '#38bdf8'}20`,
                        borderColor: `${folders.find(f => f.id === editingPad.folderId)?.color || '#38bdf8'}50`,
                        color: folders.find(f => f.id === editingPad.folderId)?.color || '#38bdf8'
                      }}
                    >
                      📁 {folders.find(f => f.id === editingPad.folderId)?.name || 'Dossier'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-zinc-400 text-[10px] block mb-0.5">Dossier Assigné</label>
                    <select
                      value={editingPad.folderId || ''}
                      onChange={(e) => {
                        const val = e.target.value || null;
                        handleAssignPadToFolder(editingPad.id, val);
                      }}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-white text-xs font-semibold"
                    >
                      <option value="">Aucun dossier (Indépendant)</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          📁 {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingFolder(true);
                        setEditingPad(null);
                      }}
                      className="w-full px-2.5 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Créer un nouveau dossier...</span>
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400 pt-0.5">
                  Organisez les 16 pads par acte, par scène (Scène 1, Scène 2...) ou par thématique sonore (Foleys, Météo, Dialogues).
                </p>
              </div>

              {/* Mode de Déclenchement */}
              <div className="space-y-1">
                <label className="text-zinc-400 text-[10px]">Mode de Déclenchement</label>
                <select
                  value={editingPad.mode}
                  onChange={(e) => handleUpdatePad({ mode: e.target.value as PadMode })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-amber-300 font-bold"
                >
                  <option value="one-shot">One-Shot (Déclenchement unique)</option>
                  <option value="loop">Loop (Boucle temporelle continue)</option>
                  <option value="toggle">Toggle (Verrouillage On / Off)</option>
                  <option value="choke">Choke Group (Étouffe les autres pads du groupe)</option>
                </select>
              </div>

              {/* Choke Group */}
              <div className="space-y-1">
                <label className="text-zinc-400 text-[10px]">Groupe d'Étouffement (Choke Group)</label>
                <select
                  value={editingPad.chokeGroup === null ? 'none' : editingPad.chokeGroup.toString()}
                  onChange={(e) =>
                    handleUpdatePad({
                      chokeGroup: e.target.value === 'none' ? null : parseInt(e.target.value, 10)
                    })
                  }
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-white"
                >
                  <option value="none">Aucun (Indépendant)</option>
                  <option value="1">Groupe 1 (Exclusif Ambiances)</option>
                  <option value="2">Groupe 2 (Exclusif Foleys / Pas)</option>
                  <option value="3">Groupe 3 (Exclusif Dialogues Comédiens)</option>
                  <option value="4">Groupe 4 (Exclusif Effets Spéciaux)</option>
                </select>
              </div>

              {/* Preset Sonore & Durée */}
              <div className="space-y-1">
                <label className="text-zinc-400 text-[10px]">Preset Audio Synchrone</label>
                <select
                  value={editingPad.soundPreset}
                  onChange={(e) => handleUpdatePad({ soundPreset: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-white"
                >
                  <option value="crystal_resonance">Cristal / Cloche Aiguë</option>
                  <option value="deep_sub_drone">Sub Drone 40Hz</option>
                  <option value="metallic_pulse">Impact Métallique</option>
                  <option value="water_droplet">Goutte d’Eau Résonante</option>
                  <option value="footstep_wood">Pas de Bois / Sabre</option>
                  <option value="sparkle_pentatonic">Scintillement Pentatonique</option>
                  <option value="tibetan_bowl">Bol Tibétain Scène</option>
                  <option value="wind_texture">Texture Vent / Mer</option>
                  <option value="bell_cue">Signal TOP Chime</option>
                  <option value="sub_rumble">Rumble Sismique</option>
                  <option value="shimmer_reverb">Brise Stellaire / Shimmer</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 text-[10px]">Adresse OSC Réseau</label>
                <input
                  type="text"
                  value={editingPad.oscAddress}
                  onChange={(e) => handleUpdatePad({ oscAddress: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-cyan-300 font-mono"
                  placeholder="/cart/pad/1"
                />
              </div>

              {/* VISUALISATION STUDIO ÉTENDUE DE LA FORME D'ONDE (WAVEFORM) */}
              <div className="md:col-span-2 bg-[#090d14] border border-cyan-500/40 rounded-xl p-3 my-1">
                <PadWaveformVisualizer
                  preset={editingPad.soundPreset}
                  durationSec={editingPad.durationSec}
                  fadeTimeMs={editingPad.fadeTimeMs}
                  color={editingPad.color}
                  progress={editingPad.progress}
                  isPlaying={editingPad.status === 'playing'}
                  compact={false}
                  onSeek={() => triggerPad(editingPad.id)}
                />
              </div>

              {/* SECTION SPÉCIFIQUE : MAPPING MIDI LEARN POUR CE PAD */}
              <div className="md:col-span-2 bg-[#141820] border border-amber-500/40 rounded-xl p-3 my-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-xs text-amber-200">
                      MAPPING MATÉRIEL DU CONTRÔLEUR MIDI PHYSIQUE
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {editingPad.midiBinding
                      ? `${editingPad.midiBinding.messageType.toUpperCase()} ${editingPad.midiBinding.number} (${editingPad.midiBinding.noteName || ''}) · Canal ${editingPad.midiBinding.channel}`
                      : 'Aucun mapping MIDI'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {/* Bouton MIDI Learn pour ce pad */}
                  <button
                    type="button"
                    onClick={() => {
                      setLearningPadId(editingPad.id);
                      setIsMidiLearnActive(true);
                      setToastMessage(`🎹 Touchez maintenant un pad physique pour associer "${editingPad.label}"...`);
                      setTimeout(() => setToastMessage(null), 3000);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      learningPadId === editingPad.id
                        ? 'bg-amber-400 text-black animate-pulse shadow-lg'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>
                      {learningPadId === editingPad.id ? 'EN ÉCOUTE... TOUCHEZ CONTRÔLEUR' : 'ACTIVER MIDI LEARN SUR CE PAD'}
                    </span>
                  </button>

                  {/* Ouvrir l'interface de mapping contextuel complet */}
                  <button
                    type="button"
                    onClick={() => setContextualMidiModalPadId(editingPad.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 hover:from-amber-400 hover:to-amber-500 shadow-md transition-all"
                    title="Ouvrir l'interface de mapping contextuel avec radar de détection en direct et réglage faders/pads"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Mapping Contextuel Dynamique</span>
                  </button>

                  {/* Tester la note MIDI */}
                  {editingPad.midiBinding && (
                    <button
                      type="button"
                      onClick={() => {
                        midiDeviceEngine.simulateMidiMessage(
                          editingPad.midiBinding!.messageType,
                          editingPad.midiBinding!.number,
                          0.9,
                          editingPad.midiBinding!.channel || 1
                        );
                      }}
                      className="px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1"
                      title="Simuler l'arrivée de ce message MIDI"
                    >
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>Simuler Frappe MIDI</span>
                    </button>
                  )}

                  {/* Supprimer le mapping MIDI */}
                  {editingPad.midiBinding && (
                    <button
                      type="button"
                      onClick={() => handleUpdatePad({ midiBinding: null })}
                      className="px-2 py-1.5 rounded bg-red-950/60 hover:bg-red-900 border border-red-700/60 text-red-300 text-xs"
                    >
                      Supprimer Mapping
                    </button>
                  )}
                </div>

                {/* Sélecteurs manuels avancés */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-2 border-t border-zinc-800">
                  <div>
                    <label className="text-zinc-400 text-[10px] block mb-0.5">Type de Message</label>
                    <select
                      value={editingPad.midiBinding?.messageType || 'note'}
                      onChange={(e) => {
                        const current = editingPad.midiBinding || { number: 36, channel: 1 };
                        const newType = e.target.value as 'note' | 'cc';
                        handleUpdatePad({
                          midiBinding: {
                            messageType: newType,
                            number: current.number,
                            channel: current.channel,
                            noteName: newType === 'note' ? getMidiNoteName(current.number) : undefined
                          }
                        });
                      }}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded p-1 text-white text-[11px]"
                    >
                      <option value="note">Note On (Pads percussion, Touches)</option>
                      <option value="cc">Control Change CC (Boutons, Faders)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-400 text-[10px] block mb-0.5">
                      Numéro (0-127) {editingPad.midiBinding?.noteName ? `[${editingPad.midiBinding.noteName}]` : ''}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="127"
                      value={editingPad.midiBinding?.number ?? 36}
                      onChange={(e) => {
                        const num = parseInt(e.target.value, 10) || 0;
                        const current = editingPad.midiBinding || { messageType: 'note', channel: 1 };
                        handleUpdatePad({
                          midiBinding: {
                            ...current,
                            number: num,
                            noteName: current.messageType === 'note' ? getMidiNoteName(num) : undefined
                          }
                        });
                      }}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded p-1 text-white font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 text-[10px] block mb-0.5">Canal MIDI</label>
                    <select
                      value={editingPad.midiBinding?.channel ?? 1}
                      onChange={(e) => {
                        const chan = parseInt(e.target.value, 10);
                        const current = editingPad.midiBinding || { messageType: 'note', number: 36 };
                        handleUpdatePad({
                          midiBinding: {
                            ...current,
                            channel: chan
                          }
                        });
                      }}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded p-1 text-white text-[11px]"
                    >
                      <option value="0">Tous les canaux (Omni)</option>
                      {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (
                        <option key={ch} value={ch}>
                          Canal {ch}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION SIGNAL MIDI SORTANT (PROGRAM CHANGE & CONTROL CHANGE POUR DMX / EFFETS) */}
              <div className="md:col-span-2 bg-[#171226] border border-purple-500/50 rounded-xl p-3 my-1">
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Send className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-xs text-purple-200 uppercase tracking-wide">
                      SORTIE MIDI : PILOTAGE ÉCLAIRAGES DMX & EFFETS EXTERNES
                    </span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer bg-purple-950/70 border border-purple-600/60 px-2.5 py-1 rounded-lg hover:border-purple-400 transition-colors">
                    <input
                      type="checkbox"
                      checked={editingPad.midiOut?.enabled ?? false}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        const current = editingPad.midiOut || {
                          enabled: true,
                          type: 'program_change' as const,
                          channel: 1,
                          number: 1,
                          value: 127,
                          description: 'Scène Lumière / Preset FX'
                        };
                        handleUpdatePad({
                          midiOut: { ...current, enabled }
                        });
                      }}
                      className="rounded accent-purple-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="text-[11px] text-purple-200 font-bold select-none">
                      {editingPad.midiOut?.enabled ? 'Signal MIDI Out Activé' : 'Activer l’envoi MIDI Out'}
                    </span>
                  </label>
                </div>

                <p className="text-[10px] text-zinc-400 mb-2 leading-relaxed">
                  Envoie un message MIDI (Program Change ou Control Change) au déclenchement de ce pad pour piloter automatiquement des pupitres lumière DMX (ETC Eos, GrandMA), projecteurs asservis, gradateurs ou processeurs d'effets audio (réverbes, delays).
                </p>

                {editingPad.midiOut?.enabled ? (
                  <div className="space-y-2.5 pt-2 border-t border-purple-900/60 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px]">
                      {/* Type : Program Change ou Control Change */}
                      <div>
                        <label className="text-zinc-400 text-[10px] block mb-0.5">Type de Signal</label>
                        <select
                          value={editingPad.midiOut?.type || 'program_change'}
                          onChange={(e) => {
                            const current: PadMidiOutBinding = editingPad.midiOut || { enabled: true, type: 'program_change', channel: 1, number: 1, value: 127 };
                            handleUpdatePad({
                              midiOut: {
                                ...current,
                                type: e.target.value as MidiOutType,
                                value: current.value ?? 127
                              }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-purple-700/60 rounded p-1 text-purple-200 text-[11px] font-bold"
                        >
                          <option value="program_change">Program Change (PC) — Preset / Scène</option>
                          <option value="control_change">Control Change (CC) — Fader / Paramètre</option>
                        </select>
                      </div>

                      {/* Canal MIDI (1-16) */}
                      <div>
                        <label className="text-zinc-400 text-[10px] block mb-0.5">Canal MIDI (1-16)</label>
                        <select
                          value={editingPad.midiOut?.channel ?? 1}
                          onChange={(e) => {
                            const chan = parseInt(e.target.value, 10);
                            const current = editingPad.midiOut || { enabled: true, type: 'program_change' as const, number: 1 };
                            handleUpdatePad({
                              midiOut: { ...current, channel: chan }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded p-1 text-white text-[11px]"
                        >
                          {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (
                            <option key={ch} value={ch}>
                              Canal {ch} {ch === 1 ? '(Lumière DMX / Master)' : ch === 2 ? '(Processeur Effets FX)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Numéro Program (0-127) ou Numéro CC (0-127) */}
                      <div>
                        <label className="text-zinc-400 text-[10px] block mb-0.5">
                          {editingPad.midiOut?.type === 'program_change' ? 'Numéro de Programme (0-127)' : 'Numéro de CC (0-127)'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="127"
                          value={editingPad.midiOut?.number ?? 1}
                          onChange={(e) => {
                            const num = Math.max(0, Math.min(127, parseInt(e.target.value, 10) || 0));
                            const current = editingPad.midiOut || { enabled: true, type: 'program_change' as const, channel: 1 };
                            handleUpdatePad({
                              midiOut: { ...current, number: num }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-purple-700/60 rounded p-1 text-purple-200 font-mono text-[11px] font-bold"
                        />
                      </div>

                      {/* Valeur CC (si control_change) */}
                      {editingPad.midiOut?.type === 'control_change' ? (
                        <div>
                          <div className="flex items-center justify-between text-[10px] mb-0.5">
                            <label className="text-zinc-400">Valeur CC (0-127)</label>
                            <span className="font-mono text-purple-300 font-bold">{editingPad.midiOut?.value ?? 127}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="range"
                              min="0"
                              max="127"
                              value={editingPad.midiOut?.value ?? 127}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 0;
                                const current = editingPad.midiOut || { enabled: true, type: 'control_change' as const, channel: 1, number: 1 };
                                handleUpdatePad({
                                  midiOut: { ...current, value: val }
                                });
                              }}
                              className="flex-1 h-1.5 accent-purple-400 cursor-pointer"
                            />
                            <input
                              type="number"
                              min="0"
                              max="127"
                              value={editingPad.midiOut?.value ?? 127}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(127, parseInt(e.target.value, 10) || 0));
                                const current = editingPad.midiOut || { enabled: true, type: 'control_change' as const, channel: 1, number: 1 };
                                handleUpdatePad({
                                  midiOut: { ...current, value: val }
                                });
                              }}
                              className="w-12 bg-zinc-900 border border-zinc-700 rounded p-1 text-center font-mono text-[10px] text-white"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-end">
                          <span className="text-[10px] text-zinc-500 font-mono py-1">Standard MIDI Bank/Prog</span>
                        </div>
                      )}
                    </div>

                    {/* Description de l'action externe */}
                    <div className="space-y-1">
                      <label className="text-zinc-400 text-[10px] block">Description / Rôle du signal MIDI sortant</label>
                      <input
                        type="text"
                        value={editingPad.midiOut?.description ?? ''}
                        onChange={(e) => {
                          const current = editingPad.midiOut || { enabled: true, type: 'program_change' as const, channel: 1, number: 1 };
                          handleUpdatePad({
                            midiOut: { ...current, description: e.target.value }
                          });
                        }}
                        placeholder="ex: Scène DMX 12 Plein Feu, Flash Strobe, Rappel Preset Reverb Cathédrale..."
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-purple-200 placeholder:text-zinc-600 text-xs"
                      />
                    </div>

                    {/* Presets rapides de régie & Test immédiat */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-purple-950">
                      <div className="flex items-center gap-1 flex-wrap text-[10px]">
                        <span className="text-zinc-500 uppercase text-[9px] font-semibold">Presets :</span>
                        {[
                          { label: 'Scène DMX 1 (PC 1)', type: 'program_change' as const, channel: 1, num: 1, desc: 'Scène DMX 1 : Ouverture' },
                          { label: 'Flash Strobe (CC 1=127)', type: 'control_change' as const, channel: 1, num: 1, val: 127, desc: 'Strobe Flash DMX Plein Feu' },
                          { label: 'Blackout (PC 127)', type: 'program_change' as const, channel: 1, num: 127, desc: 'Blackout Général Lumière Console' },
                          { label: 'Reverb Hall (PC 15 Ch 2)', type: 'program_change' as const, channel: 2, num: 15, desc: 'Preset Reverb Hall Lexicon' },
                          { label: 'Delay Echo (PC 24 Ch 2)', type: 'program_change' as const, channel: 2, num: 24, desc: 'Preset Delay Echo Rack' }
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              handleUpdatePad({
                                midiOut: {
                                  enabled: true,
                                  type: preset.type,
                                  channel: preset.channel,
                                  number: preset.num,
                                  value: preset.val ?? 127,
                                  description: preset.desc
                                }
                              });
                            }}
                            className="px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-purple-950 border border-zinc-700 hover:border-purple-500 text-zinc-300 hover:text-purple-200 font-mono text-[9px] transition-colors"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!editingPad.midiOut) return;
                          let sent = false;
                          if (editingPad.midiOut.type === 'program_change') {
                            sent = midiDeviceEngine.sendProgramChange(editingPad.midiOut.channel, editingPad.midiOut.number);
                          } else {
                            sent = midiDeviceEngine.sendControlChange(editingPad.midiOut.channel, editingPad.midiOut.number, editingPad.midiOut.value ?? 127);
                          }
                          scenicAudio.playPreset('crystal_resonance', 0.4);
                          setToastMessage(
                            `⚡ MIDI OUT envoyé : ${editingPad.midiOut.type === 'program_change' ? `Program Change #${editingPad.midiOut.number}` : `Control Change #${editingPad.midiOut.number}=${editingPad.midiOut.value ?? 127}`} (Canal ${editingPad.midiOut.channel}) ${sent ? '[Matériel]' : '[Simulé]'}`
                          );
                          setTimeout(() => setToastMessage(null), 3000);
                        }}
                        className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-md shadow-purple-900/40 transition-colors"
                        title="Tester immédiatement l'émission de ce signal MIDI"
                      >
                        <Zap className="w-3 h-3 text-amber-300" />
                        <span>Tester Signal MIDI Out</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-zinc-500 italic py-0.5">
                    Cochez la case ci-dessus pour configurer un ordre Program Change ou Control Change envoyé lors du déclenchement de ce pad.
                  </div>
                )}
              </div>

              {/* SECTION TEMPS DE FONDU (FADE TIME EN MILLISECONDES) */}
              <div className="md:col-span-2 bg-[#0d1520] border border-cyan-500/50 rounded-xl p-3 my-1">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Timer className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-xs text-cyan-200 uppercase tracking-wide">
                      Temps de Fondu / Fade Time (en millisecondes)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-700/60 px-2 py-0.5 rounded">
                      {editingPad.fadeTimeMs} ms
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      ({(editingPad.fadeTimeMs / 1000).toFixed(2)}s)
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-400 mb-2 leading-relaxed">
                  Définit la rampe d’attaque progressive (Fade-in) au lancement et la transition de fondu lors des bascules d'arrêts ou d'étouffements (Choke group). Permet des enchaînements souples et élimine les clics audio de transitoire.
                </p>

                {/* Curseur et Champ numérique précis */}
                <div className="flex items-center gap-3 mb-2.5">
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    step="50"
                    value={editingPad.fadeTimeMs}
                    onChange={(e) =>
                      handleUpdatePad({ fadeTimeMs: parseInt(e.target.value, 10) || 0 })
                    }
                    className="flex-1 h-2 accent-cyan-400 cursor-pointer bg-zinc-800 rounded-lg"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="10000"
                      step="50"
                      value={editingPad.fadeTimeMs}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(10000, parseInt(e.target.value, 10) || 0));
                        handleUpdatePad({ fadeTimeMs: val });
                      }}
                      className="w-20 bg-zinc-900 border border-cyan-700/60 rounded px-2 py-1 text-right text-cyan-200 font-mono text-xs font-bold"
                    />
                    <span className="text-zinc-400 text-[10px] font-mono">ms</span>
                  </div>
                </div>

                {/* Presets rapides de fondu pour la régie de spectacle */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-cyan-950/80">
                  <span className="text-[9px] text-zinc-500 font-semibold uppercase">Presets régie :</span>
                  {[
                    { label: 'Cut Direct (0 ms)', val: 0 },
                    { label: 'Anti-clic (150 ms)', val: 150 },
                    { label: 'Doux (400 ms)', val: 400 },
                    { label: 'Transition (800 ms)', val: 800 },
                    { label: 'Fondu 1.5s (1500 ms)', val: 1500 },
                    { label: 'Nappe 3s (3000 ms)', val: 3000 }
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => handleUpdatePad({ fadeTimeMs: preset.val })}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                        editingPad.fadeTimeMs === preset.val
                          ? 'bg-cyan-500 text-black font-bold shadow'
                          : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/80'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION COMPORTEMENT DE CROSSFADE AUTOMATIQUE & GESTION MULTI-LAYERS */}
              <div className="md:col-span-2 bg-[#121426] border border-indigo-500/50 rounded-xl p-3 my-1">
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Shuffle className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-xs text-indigo-200 uppercase tracking-wide">
                      CROSSFADE AUTOMATIQUE & GESTION MULTI-LAYERS (TRANSITIONS FLUIDES)
                    </span>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/60 text-indigo-300">
                    {editingPad.crossfadeBehavior === 'bypass'
                      ? '🛡️ Mode Bypass (Couche Permanente)'
                      : editingPad.crossfadeBehavior === 'force'
                      ? '⚡ Force Crossfade Global'
                      : '🔄 Participe au Crossfade (Défaut)'}
                  </span>
                </div>

                <p className="text-[10px] text-zinc-400 mb-2.5 leading-relaxed">
                  Contrôle le comportement de transition de ce pad lors des déclenchements séquentiels. Permet d'enchaîner sans coupure les sons, les vidéos scéniques (Resolume / Millumin / QLab) et les ambiances lumineuses DMX.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] mb-2">
                  {/* Comportement Crossfade */}
                  <div className="space-y-1">
                    <label className="text-zinc-400 text-[10px] block">Règle de Transition Multi-Layers</label>
                    <select
                      value={editingPad.crossfadeBehavior || 'default'}
                      onChange={(e) =>
                        handleUpdatePad({
                          crossfadeBehavior: e.target.value as 'default' | 'bypass' | 'force'
                        })
                      }
                      className="w-full bg-zinc-900 border border-indigo-700/60 rounded px-2 py-1 text-indigo-200 font-bold text-[11px]"
                    >
                      <option value="default">🔄 Standard : Participe au Crossfade auto (estompé par les nouveaux pads)</option>
                      <option value="bypass">🛡️ Bypass : Couche Permanente (Ne s’éteint JAMAIS — drones, météo, boucles)</option>
                      <option value="force">⚡ Force Crossfade : Estompe toujours les autres couches au lancement</option>
                    </select>
                  </div>

                  {/* Surcharge Optionnelle de Durée */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <label className="text-zinc-400">Durée de Crossfade Dédiée</label>
                      <span className="font-mono text-indigo-300 font-bold">
                        {editingPad.customCrossfadeMs !== null && editingPad.customCrossfadeMs !== undefined
                          ? `${editingPad.customCrossfadeMs} ms (${(editingPad.customCrossfadeMs / 1000).toFixed(1)}s)`
                          : `Durée globale (${crossfadeDurationMs} ms)`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={editingPad.customCrossfadeMs !== null && editingPad.customCrossfadeMs !== undefined ? 'custom' : 'global'}
                        onChange={(e) => {
                          if (e.target.value === 'global') {
                            handleUpdatePad({ customCrossfadeMs: null });
                          } else {
                            handleUpdatePad({ customCrossfadeMs: crossfadeDurationMs });
                          }
                        }}
                        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-300 text-[11px]"
                      >
                        <option value="global">Durée globale ({crossfadeDurationMs} ms)</option>
                        <option value="custom">Surcharge personnalisée</option>
                      </select>

                      {editingPad.customCrossfadeMs !== null && editingPad.customCrossfadeMs !== undefined && (
                        <div className="flex items-center gap-1 flex-1">
                          <input
                            type="range"
                            min="100"
                            max="8000"
                            step="100"
                            value={editingPad.customCrossfadeMs}
                            onChange={(e) =>
                              handleUpdatePad({ customCrossfadeMs: parseInt(e.target.value, 10) || 100 })
                            }
                            className="flex-1 h-1.5 accent-indigo-400 cursor-pointer"
                          />
                          <input
                            type="number"
                            min="50"
                            max="10000"
                            step="50"
                            value={editingPad.customCrossfadeMs}
                            onChange={(e) => {
                              const val = Math.max(50, Math.min(10000, parseInt(e.target.value, 10) || 50));
                              handleUpdatePad({ customCrossfadeMs: val });
                            }}
                            className="w-16 bg-zinc-900 border border-indigo-700/60 rounded p-1 text-center font-mono text-[10px] text-white"
                          />
                          <span className="text-zinc-500 text-[9px] font-mono">ms</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Presets rapides de transition */}
                {editingPad.customCrossfadeMs !== null && editingPad.customCrossfadeMs !== undefined && (
                  <div className="flex items-center gap-1 flex-wrap pt-1.5 border-t border-indigo-950/80">
                    <span className="text-[9px] text-zinc-500 font-semibold uppercase">Presets transition :</span>
                    {[
                      { label: 'Subtile (400 ms)', ms: 400 },
                      { label: 'Standard (1.2s)', ms: 1200 },
                      { label: 'Scénique (2.5s)', ms: 2500 },
                      { label: 'Lente / Nappe (4.5s)', ms: 4500 }
                    ].map((p) => (
                      <button
                        key={p.ms}
                        type="button"
                        onClick={() => handleUpdatePad({ customCrossfadeMs: p.ms })}
                        className={`px-2 py-0.5 rounded text-[9px] font-mono transition-colors ${
                          editingPad.customCrossfadeMs === p.ms
                            ? 'bg-indigo-500 text-white font-bold'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Couleur LED */}
              <div className="space-y-1">
                <label className="text-zinc-400 text-[10px]">Couleur LED du Pad</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editingPad.color}
                    onChange={(e) => handleUpdatePad({ color: e.target.value })}
                    className="w-8 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-zinc-400">{editingPad.color}</span>
                </div>
              </div>

              {/* Volume Pad */}
              <div className="space-y-1">
                <label className="text-zinc-400 text-[10px]">Volume Propre du Pad ({Math.round(editingPad.volume * 100)}%)</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={editingPad.volume}
                  onChange={(e) => handleUpdatePad({ volume: parseFloat(e.target.value) })}
                  className="w-full h-1.5 accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-zinc-800 pt-3">
            <button
              type="button"
              onClick={() => {
                triggerPad(editingPad.id);
              }}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs font-bold flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tester le Pad</span>
            </button>
            <button
              type="button"
              onClick={() => setEditingPad(null)}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded text-xs"
            >
              Enregistrer & Fermer
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE GESTIONNAIRE & SAUVEGARDE DES BANQUES */}
      <CartBankManagerModal
        isOpen={isBankModalOpen}
        onClose={() => {
          setIsBankModalOpen(false);
          setBankNames(loadBankNamesFromStorage());
        }}
        activeBankId={activeBank}
        currentPads={pads}
        onSelectBank={(b) => handleSelectBank(b)}
        onReloadBankPads={(newPads) => setPads(newPads)}
        onToast={(msg) => {
          setToastMessage(msg);
          setTimeout(() => setToastMessage(null), 3500);
        }}
      />

      {/* MODAL D'AIDE ET DE CONFIGURATION DES RACCOURCIS CLAVIER RÉGIE LIVE */}
      <CartKeyboardShortcutsModal
        isOpen={isKeyboardModalOpen}
        onClose={() => setIsKeyboardModalOpen(false)}
        columnTriggerMode={columnTriggerMode}
        onChangeColumnTriggerMode={(mode) => {
          setColumnTriggerMode(mode);
          try {
            localStorage.setItem('nocode_cue_cart_col_mode', mode);
          } catch {}
          setToastMessage(`Mode colonne : ${mode === 'step' ? 'Séquentiel (Step)' : mode === 'all' ? 'Plein Feu' : 'Ligne 1'}`);
          setTimeout(() => setToastMessage(null), 2000);
        }}
        onApplyLayoutPreset={handleApplyLayoutPreset}
        onTriggerColumn={(colIdx) => triggerColumn(colIdx)}
        onStopAll={handleStopAllPads}
        onPanic={handlePanicStopAll}
        onToast={(msg) => {
          setToastMessage(msg);
          setTimeout(() => setToastMessage(null), 3000);
        }}
      />

      {/* MODAL DE MAPPING MIDI CONTEXTUEL DYNAMIQUE (FADERS, PADS & POTARDS) */}
      <PadMidiMappingContextModal
        isOpen={contextualMidiModalPadId !== null}
        onClose={() => setContextualMidiModalPadId(null)}
        pad={pads.find((p) => p.id === contextualMidiModalPadId) || null}
        allPads={pads}
        onUpdateBinding={handleUpdatePadBinding}
        onSelectPad={(newPadId) => setContextualMidiModalPadId(newPadId)}
        onTestTriggerPad={(targetPadId) => triggerPad(targetPadId)}
        onToast={(msg) => {
          setToastMessage(msg);
          setTimeout(() => setToastMessage(null), 3000);
        }}
      />
    </div>
  );
};
