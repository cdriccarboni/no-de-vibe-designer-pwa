// Gestionnaire et Moteur de Persistance des Banques de Pads du Cartoucheur (CueCartPanel)
// No[co]de Vibe Designer — Régie Spectacle Vivant
// Sauvegarde et chargement multi-banques (Banques A, B, C, D) via localStorage avec export/import JSON

import { CartPad, PadMode, PadMidiBinding, PadMidiOutBinding, MidiOutType } from '../components/CueCartPanel';

export type CartBankId = 'A' | 'B' | 'C' | 'D';

export interface BankMetadata {
  id: CartBankId;
  name: string;
  description: string;
  colorTheme: string;
}

export const DEFAULT_BANK_NAMES: Record<CartBankId, string> = {
  A: 'Ouverture & Impacts',
  B: 'Bruitages & Atmosphères Vivantes',
  C: 'Sci-Fi, Synthétiseurs & Tension',
  D: 'Transitions, Cérémonie & Rideau'
};

export const BANK_METADATA: Record<CartBankId, BankMetadata> = {
  A: {
    id: 'A',
    name: 'Ouverture & Impacts',
    description: 'Impacts majeurs, nappes d’ouverture et foleys scéniques',
    colorTheme: 'from-cyan-500 to-blue-600'
  },
  B: {
    id: 'B',
    name: 'Bruitages & Atmosphères Vivantes',
    description: 'Foleys théâtre, éléments météo continus, 3 coups de brigadier',
    colorTheme: 'from-emerald-500 to-teal-600'
  },
  C: {
    id: 'C',
    name: 'Sci-Fi, Synthétiseurs & Tension',
    description: 'Textures électroniques, risers, alarmes DMX et scans immersifs',
    colorTheme: 'from-purple-500 to-indigo-600'
  },
  D: {
    id: 'D',
    name: 'Transitions, Cérémonie & Rideau',
    description: 'Carillons, cloches sacrées, transitions plateau et chœurs lyriques',
    colorTheme: 'from-amber-500 to-rose-600'
  }
};

// ============================================================================
// PRESETS D'USINE : BANQUE A (Ouverture & Impacts)
// ============================================================================
export const FACTORY_BANK_A_PADS: CartPad[] = [
  // LIGNE 1 : IMPACTS & AMBIANCES OUVERTURE (Dossier Scène 1 : Ouverture)
  {
    id: 'pad-a-1',
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
    color: '#38bdf8',
    soundPreset: 'crystal_resonance',
    oscAddress: '/cart/pad/1',
    volume: 0.85,
    durationSec: 2.5,
    fadeTimeMs: 0,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 36, channel: 1, noteName: 'C1' },
    midiOut: { enabled: true, type: 'program_change', channel: 1, number: 1, description: 'Rappel Scène 1 : Ouverture DMX' }
  },
  {
    id: 'pad-a-2',
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
    color: '#818cf8',
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
    id: 'pad-a-3',
    gridIndex: 2,
    numberLabel: '3',
    keyboardKey: '3',
    label: 'Nappe Mer Nocturne',
    subLabel: 'Ambiance Fondue [G1]',
    customLabel: 'Mer Nappe [G1]',
    folderId: 'folder-a-1',
    groupName: 'Scène 1 : Ouverture',
    mode: 'loop',
    chokeGroup: 1,
    color: '#2dd4bf',
    soundPreset: 'wind_texture',
    oscAddress: '/cart/ambient/sea',
    volume: 0.75,
    durationSec: 4.0,
    fadeTimeMs: 1000,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 38, channel: 1, noteName: 'D1' }
  },
  {
    id: 'pad-a-4',
    gridIndex: 3,
    numberLabel: '4',
    keyboardKey: '4',
    label: 'Brise Stellaire',
    subLabel: 'Ambiance Ciel [G1]',
    customLabel: 'Vent Céleste [G1]',
    folderId: 'folder-a-1',
    groupName: 'Scène 1 : Ouverture',
    mode: 'loop',
    chokeGroup: 1,
    color: '#06b6d4',
    soundPreset: 'shimmer_reverb',
    oscAddress: '/cart/ambient/wind',
    volume: 0.75,
    durationSec: 4.5,
    fadeTimeMs: 1200,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 39, channel: 1, noteName: 'D#1' }
  },

  // LIGNE 2 : EFFETS VISUELS & FOLEYS SCÉNIQUES (Dossier Scène 2 : Foleys & Combats)
  {
    id: 'pad-a-5',
    gridIndex: 4,
    numberLabel: '5',
    keyboardKey: 'q',
    label: 'Éclair & Flash DMX',
    subLabel: 'Strobe Immédiat',
    customLabel: 'Strobe DMX',
    folderId: 'folder-a-2',
    groupName: 'Scène 2 : Foleys & Combats',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#f59e0b',
    soundPreset: 'metallic_pulse',
    oscAddress: '/lighting/strobe',
    volume: 0.8,
    durationSec: 1.2,
    fadeTimeMs: 0,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 40, channel: 1, noteName: 'E1' },
    midiOut: { enabled: true, type: 'control_change', channel: 1, number: 1, value: 127, description: 'Flash Strobe DMX Plein Feu' }
  },
  {
    id: 'pad-a-6',
    gridIndex: 5,
    numberLabel: '6',
    keyboardKey: 'w',
    label: 'Pas de Sabres Bois',
    subLabel: 'Bruitage Combat [G2]',
    customLabel: 'Sabres Bois [G2]',
    folderId: 'folder-a-2',
    groupName: 'Scène 2 : Foleys & Combats',
    mode: 'one-shot',
    chokeGroup: 2,
    color: '#fbbf24',
    soundPreset: 'footstep_wood',
    oscAddress: '/foley/sword',
    volume: 0.7,
    durationSec: 1.8,
    fadeTimeMs: 0,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 41, channel: 1, noteName: 'F1' }
  },
  {
    id: 'pad-a-7',
    gridIndex: 6,
    numberLabel: '7',
    keyboardKey: 'e',
    label: 'Gouttes Flottaison',
    subLabel: 'Bruitage Vagues [G2]',
    customLabel: 'Flottaison [G2]',
    folderId: 'folder-a-2',
    groupName: 'Scène 2 : Foleys & Combats',
    mode: 'one-shot',
    chokeGroup: 2,
    color: '#34d399',
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
    id: 'pad-a-8',
    gridIndex: 7,
    numberLabel: '8',
    keyboardKey: 'r',
    label: 'Bol Tibétain Scène',
    subLabel: 'Bascule Résonance',
    customLabel: 'Bol 432Hz',
    folderId: 'folder-a-2',
    groupName: 'Scène 2 : Foleys & Combats',
    mode: 'toggle',
    chokeGroup: null,
    color: '#a855f7',
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
    id: 'pad-a-9',
    gridIndex: 8,
    numberLabel: '9',
    keyboardKey: 'a',
    label: 'Arpège Paillettes',
    subLabel: 'Intermède Magique',
    customLabel: 'Paillettes Intro',
    folderId: 'folder-a-3',
    groupName: 'Scène 3 : Dialogues Comédiens',
    mode: 'toggle',
    chokeGroup: null,
    color: '#ec4899',
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
    id: 'pad-a-10',
    gridIndex: 9,
    numberLabel: '10',
    keyboardKey: 's',
    label: 'Voix Capitaine',
    subLabel: 'Réplique Scène [G3]',
    customLabel: 'Capitaine [G3]',
    folderId: 'folder-a-3',
    groupName: 'Scène 3 : Dialogues Comédiens',
    mode: 'choke',
    chokeGroup: 3,
    color: '#ef4444',
    soundPreset: 'bell_cue',
    oscAddress: '/dialogue/capitaine',
    volume: 0.9,
    durationSec: 2.8,
    fadeTimeMs: 150,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 45, channel: 1, noteName: 'A1' },
    midiOut: { enabled: true, type: 'program_change', channel: 2, number: 15, description: 'Preset Reverb Capitaine Lexicon' }
  },
  {
    id: 'pad-a-11',
    gridIndex: 10,
    numberLabel: '11',
    keyboardKey: 'd',
    label: 'Voix Moussaillon',
    subLabel: 'Réplique Scène [G3]',
    customLabel: 'Moussaillon [G3]',
    folderId: 'folder-a-3',
    groupName: 'Scène 3 : Dialogues Comédiens',
    mode: 'choke',
    chokeGroup: 3,
    color: '#f97316',
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
    id: 'pad-a-12',
    gridIndex: 11,
    numberLabel: '12',
    keyboardKey: 'f',
    label: 'Chant de la Sirène',
    subLabel: 'Réplique Scène [G3]',
    customLabel: 'Sirène Voix [G3]',
    folderId: 'folder-a-3',
    groupName: 'Scène 3 : Dialogues Comédiens',
    mode: 'choke',
    chokeGroup: 3,
    color: '#10b981',
    soundPreset: 'crystal_resonance',
    oscAddress: '/dialogue/sirene',
    volume: 0.9,
    durationSec: 3.2,
    fadeTimeMs: 500,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 47, channel: 1, noteName: 'B1' }
  },

  // LIGNE 4 : TRANSITIONS, BLACKOUT ET DRONES (Dossier Scène 4 : Clôture & Final)
  {
    id: 'pad-a-13',
    gridIndex: 12,
    numberLabel: '13',
    keyboardKey: 'z',
    label: 'Houle GLSL Houleuse',
    subLabel: 'Loop Texture Grave',
    customLabel: 'Houle Texture',
    folderId: 'folder-a-4',
    groupName: 'Scène 4 : Clôture & Final',
    mode: 'loop',
    chokeGroup: null,
    color: '#6366f1',
    soundPreset: 'sub_rumble',
    oscAddress: '/cart/loop/rumble',
    volume: 0.8,
    durationSec: 3.0,
    fadeTimeMs: 1000,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 48, channel: 1, noteName: 'C2' }
  },
  {
    id: 'pad-a-14',
    gridIndex: 13,
    numberLabel: '14',
    keyboardKey: 'x',
    label: 'Top Paillette Finale',
    subLabel: 'Crescendo Lumineux',
    customLabel: 'Crescendo Or',
    folderId: 'folder-a-4',
    groupName: 'Scène 4 : Clôture & Final',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#eab308',
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
    id: 'pad-a-15',
    gridIndex: 14,
    numberLabel: '15',
    keyboardKey: 'c',
    label: 'Blackout d’Urgence',
    subLabel: 'Noir Plateau Brutal',
    customLabel: 'Noir Plateau DMX',
    folderId: 'folder-a-4',
    groupName: 'Scène 4 : Clôture & Final',
    mode: 'toggle',
    chokeGroup: null,
    color: '#64748b',
    soundPreset: 'deep_sub_drone',
    oscAddress: '/lighting/blackout',
    volume: 0.8,
    durationSec: 2.0,
    fadeTimeMs: 0,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 50, channel: 1, noteName: 'D2' },
    midiOut: { enabled: true, type: 'program_change', channel: 1, number: 127, description: 'Blackout Général Lumière Console' }
  },
  {
    id: 'pad-a-16',
    gridIndex: 15,
    numberLabel: '16',
    keyboardKey: 'v',
    label: 'Chœur Astral Final',
    subLabel: 'Nappe Sacrée Polyphonie',
    customLabel: 'Chœur Astral',
    folderId: 'folder-a-4',
    groupName: 'Scène 4 : Clôture & Final',
    mode: 'loop',
    chokeGroup: null,
    color: '#d946ef',
    soundPreset: 'tibetan_bowl',
    oscAddress: '/cart/choir/final',
    volume: 0.85,
    durationSec: 5.0,
    fadeTimeMs: 1500,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 51, channel: 1, noteName: 'D#2' }
  }
];

// ============================================================================
// PRESETS D'USINE : BANQUE B (Bruitages & Atmosphères Vivantes Théâtre)
// ============================================================================
export const FACTORY_BANK_B_PADS: CartPad[] = [
  {
    id: 'pad-b-1',
    gridIndex: 0,
    numberLabel: '1',
    keyboardKey: '1',
    label: 'Les 3 Coups Brigadier',
    subLabel: 'Tradition Théâtre Française',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#b45309',
    soundPreset: 'footstep_wood',
    oscAddress: '/foley/brigadier',
    volume: 0.95,
    durationSec: 2.8,
    fadeTimeMs: 0,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 36, channel: 1, noteName: 'C1' }
  },
  {
    id: 'pad-b-2',
    gridIndex: 1,
    numberLabel: '2',
    keyboardKey: '2',
    label: 'Pluie & Averse Scénique',
    subLabel: 'Loop Eau Enveloppante [G1]',
    mode: 'loop',
    chokeGroup: 1,
    color: '#0284c7',
    soundPreset: 'water_droplet',
    oscAddress: '/weather/rain/loop',
    volume: 0.8,
    durationSec: 4.0,
    fadeTimeMs: 1200,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 37, channel: 1, noteName: 'C#1' }
  },
  {
    id: 'pad-b-3',
    gridIndex: 2,
    numberLabel: '3',
    keyboardKey: '3',
    label: 'Orage & Grêle Furieuse',
    subLabel: 'Loop Tempête [G1]',
    mode: 'loop',
    chokeGroup: 1,
    color: '#0f766e',
    soundPreset: 'sub_rumble',
    oscAddress: '/weather/storm/loop',
    volume: 0.85,
    durationSec: 4.5,
    fadeTimeMs: 1500,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 38, channel: 1, noteName: 'D1' }
  },
  {
    id: 'pad-b-4',
    gridIndex: 3,
    numberLabel: '4',
    keyboardKey: '4',
    label: 'Tonnerre Lointain Sub',
    subLabel: 'Grondement Collines',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#475569',
    soundPreset: 'deep_sub_drone',
    oscAddress: '/weather/thunder',
    volume: 0.9,
    durationSec: 3.5,
    fadeTimeMs: 300,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 39, channel: 1, noteName: 'D#1' }
  },
  {
    id: 'pad-b-5',
    gridIndex: 4,
    numberLabel: '5',
    keyboardKey: 'q',
    label: 'Craquement Parquet Chêne',
    subLabel: 'Foley Pas Mystère [G2]',
    mode: 'one-shot',
    chokeGroup: 2,
    color: '#d97706',
    soundPreset: 'footstep_wood',
    oscAddress: '/foley/creak',
    volume: 0.75,
    durationSec: 1.5,
    fadeTimeMs: 0,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 40, channel: 1, noteName: 'E1' }
  },
  {
    id: 'pad-b-6',
    gridIndex: 5,
    numberLabel: '6',
    keyboardKey: 'w',
    label: 'Course dans les Graviers',
    subLabel: 'Foley Fuite Nocturne [G2]',
    mode: 'one-shot',
    chokeGroup: 2,
    color: '#ea580c',
    soundPreset: 'metallic_pulse',
    oscAddress: '/foley/gravel',
    volume: 0.8,
    durationSec: 2.2,
    fadeTimeMs: 0,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 41, channel: 1, noteName: 'F1' }
  },
  {
    id: 'pad-b-7',
    gridIndex: 6,
    numberLabel: '7',
    keyboardKey: 'e',
    label: 'Battements de Cœur',
    subLabel: 'Tension Pulsee 72 BPM',
    mode: 'loop',
    chokeGroup: null,
    color: '#dc2626',
    soundPreset: 'deep_sub_drone',
    oscAddress: '/cart/tension/heartbeat',
    volume: 0.85,
    durationSec: 2.4,
    fadeTimeMs: 400,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 42, channel: 1, noteName: 'F#1' }
  },
  {
    id: 'pad-b-8',
    gridIndex: 7,
    numberLabel: '8',
    keyboardKey: 'r',
    label: 'Rumeur Salle & Murmures',
    subLabel: 'Loop Ambiance Foyer',
    mode: 'toggle',
    chokeGroup: null,
    color: '#059669',
    soundPreset: 'wind_texture',
    oscAddress: '/ambient/foyer',
    volume: 0.7,
    durationSec: 5.0,
    fadeTimeMs: 800,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 43, channel: 1, noteName: 'G1' }
  },
  {
    id: 'pad-b-9',
    gridIndex: 8,
    numberLabel: '9',
    keyboardKey: 'a',
    label: 'Cloche Dégagement Entracte',
    subLabel: 'Sonnerie Régie Rappel',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#16a34a',
    soundPreset: 'bell_cue',
    oscAddress: '/cart/bell/intermission',
    volume: 0.85,
    durationSec: 2.5,
    fadeTimeMs: 0,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 44, channel: 1, noteName: 'G#1' }
  },
  {
    id: 'pad-b-10',
    gridIndex: 9,
    numberLabel: '10',
    keyboardKey: 's',
    label: 'Oiseaux & Forêt Matinale',
    subLabel: 'Ambiance Nature [G3]',
    mode: 'choke',
    chokeGroup: 3,
    color: '#84cc16',
    soundPreset: 'sparkle_pentatonic',
    oscAddress: '/ambient/forest/day',
    volume: 0.75,
    durationSec: 4.2,
    fadeTimeMs: 1000,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 45, channel: 1, noteName: 'A1' }
  },
  {
    id: 'pad-b-11',
    gridIndex: 10,
    numberLabel: '11',
    keyboardKey: 'd',
    label: 'Grillons Crépuscule',
    subLabel: 'Ambiance Nuit Campagne [G3]',
    mode: 'choke',
    chokeGroup: 3,
    color: '#14b8a6',
    soundPreset: 'crystal_resonance',
    oscAddress: '/ambient/crickets/night',
    volume: 0.7,
    durationSec: 3.8,
    fadeTimeMs: 1000,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 46, channel: 1, noteName: 'A#1' }
  },
  {
    id: 'pad-b-12',
    gridIndex: 11,
    numberLabel: '12',
    keyboardKey: 'f',
    label: 'Vent dans les Arbres',
    subLabel: 'Nappe Végétale [G3]',
    mode: 'choke',
    chokeGroup: 3,
    color: '#065f46',
    soundPreset: 'wind_texture',
    oscAddress: '/ambient/trees/wind',
    volume: 0.8,
    durationSec: 4.0,
    fadeTimeMs: 1200,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 47, channel: 1, noteName: 'B1' }
  },
  {
    id: 'pad-b-13',
    gridIndex: 12,
    numberLabel: '13',
    keyboardKey: 'z',
    label: 'Horloge Comtoise Tic-Tac',
    subLabel: 'Pendule Salon Ancien',
    mode: 'loop',
    chokeGroup: null,
    color: '#78350f',
    soundPreset: 'footstep_wood',
    oscAddress: '/cart/clock/tick',
    volume: 0.7,
    durationSec: 2.0,
    fadeTimeMs: 200,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 48, channel: 1, noteName: 'C2' }
  },
  {
    id: 'pad-b-14',
    gridIndex: 13,
    numberLabel: '14',
    keyboardKey: 'x',
    label: 'Applaudissements Courtois',
    subLabel: 'Réaction Public Chaleureuse',
    mode: 'toggle',
    chokeGroup: null,
    color: '#ca8a04',
    soundPreset: 'shimmer_reverb',
    oscAddress: '/cart/crowd/applause',
    volume: 0.85,
    durationSec: 3.5,
    fadeTimeMs: 600,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 49, channel: 1, noteName: 'C#2' }
  },
  {
    id: 'pad-b-15',
    gridIndex: 14,
    numberLabel: '15',
    keyboardKey: 'c',
    label: 'Silence Total Salle',
    subLabel: 'Atténuation & Extinction',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#334155',
    soundPreset: 'sub_rumble',
    oscAddress: '/cart/room/silence',
    volume: 0.5,
    durationSec: 1.5,
    fadeTimeMs: 500,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 50, channel: 1, noteName: 'D2' }
  },
  {
    id: 'pad-b-16',
    gridIndex: 15,
    numberLabel: '16',
    keyboardKey: 'v',
    label: 'Gong de Salut Final',
    subLabel: 'Dernier Appel Acteurs',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#f59e0b',
    soundPreset: 'crystal_resonance',
    oscAddress: '/cart/curtain/bow',
    volume: 0.9,
    durationSec: 4.0,
    fadeTimeMs: 200,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 51, channel: 1, noteName: 'D#2' }
  }
];

// ============================================================================
// PRESETS D'USINE : BANQUE C (Sci-Fi, Synthétiseurs & Tension Immersive)
// ============================================================================
export const FACTORY_BANK_C_PADS: CartPad[] = [
  {
    id: 'pad-c-1',
    gridIndex: 0,
    numberLabel: '1',
    keyboardKey: '1',
    label: 'Riser Spatial Hypersonique',
    subLabel: 'Montée en Tension Scénique',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#8b5cf6',
    soundPreset: 'crystal_resonance',
    oscAddress: '/cart/scifi/riser',
    volume: 0.85,
    durationSec: 3.2,
    fadeTimeMs: 150,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 36, channel: 1, noteName: 'C1' }
  },
  {
    id: 'pad-c-2',
    gridIndex: 1,
    numberLabel: '2',
    keyboardKey: '2',
    label: 'Drone Modulaire 55Hz',
    subLabel: 'Nappe Basse Fréquence Cyber',
    mode: 'loop',
    chokeGroup: 1,
    color: '#6366f1',
    soundPreset: 'deep_sub_drone',
    oscAddress: '/cart/scifi/drone55',
    volume: 0.9,
    durationSec: 4.5,
    fadeTimeMs: 1500,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 37, channel: 1, noteName: 'C#1' }
  },
  {
    id: 'pad-c-3',
    gridIndex: 2,
    numberLabel: '3',
    keyboardKey: '3',
    label: 'Drone Aigu Métallique',
    subLabel: 'Onde Sinus Cristalline',
    mode: 'loop',
    chokeGroup: 1,
    color: '#a855f7',
    soundPreset: 'shimmer_reverb',
    oscAddress: '/cart/scifi/highdrone',
    volume: 0.75,
    durationSec: 4.0,
    fadeTimeMs: 1200,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 38, channel: 1, noteName: 'D1' }
  },
  {
    id: 'pad-c-4',
    gridIndex: 3,
    numberLabel: '4',
    keyboardKey: '4',
    label: 'Laser Pulse Cyberpunk',
    subLabel: 'Faisceau Scénique DMX',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#ec4899',
    soundPreset: 'metallic_pulse',
    oscAddress: '/lighting/laser/pulse',
    volume: 0.85,
    durationSec: 1.0,
    fadeTimeMs: 0,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 39, channel: 1, noteName: 'D#1' }
  },
  {
    id: 'pad-c-5',
    gridIndex: 4,
    numberLabel: '5',
    keyboardKey: 'q',
    label: 'Alarme Rouge Confinement',
    subLabel: 'Strobe Rouge Alerte [G2]',
    mode: 'toggle',
    chokeGroup: 2,
    color: '#ef4444',
    soundPreset: 'bell_cue',
    oscAddress: '/lighting/alarm/red',
    volume: 0.9,
    durationSec: 2.2,
    fadeTimeMs: 0,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 40, channel: 1, noteName: 'E1' }
  },
  {
    id: 'pad-c-6',
    gridIndex: 5,
    numberLabel: '6',
    keyboardKey: 'w',
    label: 'Scan Radar Sonar 1kHz',
    subLabel: 'Pulsion Écho Stroboscopique [G2]',
    mode: 'toggle',
    chokeGroup: 2,
    color: '#06b6d4',
    soundPreset: 'crystal_resonance',
    oscAddress: '/cart/scifi/sonar',
    volume: 0.8,
    durationSec: 2.8,
    fadeTimeMs: 250,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 41, channel: 1, noteName: 'F1' }
  },
  {
    id: 'pad-c-7',
    gridIndex: 6,
    numberLabel: '7',
    keyboardKey: 'e',
    label: 'Impact Sub Fusion Bass',
    subLabel: 'Kick 808 Distordu',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#f43f5e',
    soundPreset: 'sub_rumble',
    oscAddress: '/cart/scifi/subimpact',
    volume: 0.95,
    durationSec: 2.2,
    fadeTimeMs: 0,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 42, channel: 1, noteName: 'F#1' }
  },
  {
    id: 'pad-c-8',
    gridIndex: 7,
    numberLabel: '8',
    keyboardKey: 'r',
    label: 'Glitch Électrique Numérique',
    subLabel: 'Court-circuit Scène',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#eab308',
    soundPreset: 'metallic_pulse',
    oscAddress: '/cart/scifi/glitch',
    volume: 0.8,
    durationSec: 1.1,
    fadeTimeMs: 0,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 43, channel: 1, noteName: 'G1' }
  },
  {
    id: 'pad-c-9',
    gridIndex: 8,
    numberLabel: '9',
    keyboardKey: 'a',
    label: 'Arpège Synthwave Fluo',
    subLabel: 'Séquence Synthétique 120 BPM',
    mode: 'loop',
    chokeGroup: null,
    color: '#d946ef',
    soundPreset: 'sparkle_pentatonic',
    oscAddress: '/cart/scifi/synthwave',
    volume: 0.8,
    durationSec: 3.2,
    fadeTimeMs: 500,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 44, channel: 1, noteName: 'G#1' }
  },
  {
    id: 'pad-c-10',
    gridIndex: 9,
    numberLabel: '10',
    keyboardKey: 's',
    label: 'Sas Dépressurisation',
    subLabel: 'Jet d’Air Cryogénique',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#38bdf8',
    soundPreset: 'wind_texture',
    oscAddress: '/cart/scifi/airlock',
    volume: 0.85,
    durationSec: 2.0,
    fadeTimeMs: 100,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 45, channel: 1, noteName: 'A1' }
  },
  {
    id: 'pad-c-11',
    gridIndex: 10,
    numberLabel: '11',
    keyboardKey: 'd',
    label: 'Bip Confirmation Robotique',
    subLabel: 'Validation Terminal Validé [G3]',
    mode: 'choke',
    chokeGroup: 3,
    color: '#10b981',
    soundPreset: 'bell_cue',
    oscAddress: '/cart/scifi/ok',
    volume: 0.8,
    durationSec: 0.8,
    fadeTimeMs: 0,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 46, channel: 1, noteName: 'A#1' }
  },
  {
    id: 'pad-c-12',
    gridIndex: 11,
    numberLabel: '12',
    keyboardKey: 'f',
    label: 'Bip Rejet Erreur Critique',
    subLabel: 'Alerte Système Refusé [G3]',
    mode: 'choke',
    chokeGroup: 3,
    color: '#e11d48',
    soundPreset: 'metallic_pulse',
    oscAddress: '/cart/scifi/reject',
    volume: 0.85,
    durationSec: 1.0,
    fadeTimeMs: 0,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 47, channel: 1, noteName: 'B1' }
  },
  {
    id: 'pad-c-13',
    gridIndex: 12,
    numberLabel: '13',
    keyboardKey: 'z',
    label: 'Nappe Éther Électronique',
    subLabel: 'Texture Pad Stellaire',
    mode: 'loop',
    chokeGroup: null,
    color: '#818cf8',
    soundPreset: 'shimmer_reverb',
    oscAddress: '/cart/scifi/ether',
    volume: 0.75,
    durationSec: 5.0,
    fadeTimeMs: 1500,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 48, channel: 1, noteName: 'C2' }
  },
  {
    id: 'pad-c-14',
    gridIndex: 13,
    numberLabel: '14',
    keyboardKey: 'x',
    label: 'Drop Sub & Stop Beat',
    subLabel: 'Break Révolutionnaire',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#4f46e5',
    soundPreset: 'deep_sub_drone',
    oscAddress: '/cart/scifi/drop',
    volume: 0.95,
    durationSec: 2.5,
    fadeTimeMs: 50,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 49, channel: 1, noteName: 'C#2' }
  },
  {
    id: 'pad-c-15',
    gridIndex: 14,
    numberLabel: '15',
    keyboardKey: 'c',
    label: 'Freeze Vidéo & Audio',
    subLabel: 'Gel Temps Réel Millumin',
    mode: 'toggle',
    chokeGroup: null,
    color: '#0284c7',
    soundPreset: 'crystal_resonance',
    oscAddress: '/media/freeze',
    volume: 0.75,
    durationSec: 3.0,
    fadeTimeMs: 0,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 50, channel: 1, noteName: 'D2' }
  },
  {
    id: 'pad-c-16',
    gridIndex: 15,
    numberLabel: '16',
    keyboardKey: 'v',
    label: 'Vortex Étoiles Finale',
    subLabel: 'Clôture Cosmique Scène',
    mode: 'loop',
    chokeGroup: null,
    color: '#c084fc',
    soundPreset: 'tibetan_bowl',
    oscAddress: '/cart/scifi/vortex',
    volume: 0.85,
    durationSec: 5.5,
    fadeTimeMs: 2000,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 51, channel: 1, noteName: 'D#2' }
  }
];

// ============================================================================
// PRESETS D'USINE : BANQUE D (Transitions, Cérémonie & Rideau)
// ============================================================================
export const FACTORY_BANK_D_PADS: CartPad[] = [
  {
    id: 'pad-d-1',
    gridIndex: 0,
    numberLabel: '1',
    keyboardKey: '1',
    label: 'Carillon Magique Féerie',
    subLabel: 'Glissando Clochettes Dorées',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#f59e0b',
    soundPreset: 'sparkle_pentatonic',
    oscAddress: '/cart/magic/chimes',
    volume: 0.85,
    durationSec: 3.0,
    fadeTimeMs: 200,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 36, channel: 1, noteName: 'C1' }
  },
  {
    id: 'pad-d-2',
    gridIndex: 1,
    numberLabel: '2',
    keyboardKey: '2',
    label: 'Bol de Cristal Sacré',
    subLabel: 'Fréquence 432Hz Apaisante',
    mode: 'loop',
    chokeGroup: 1,
    color: '#06b6d4',
    soundPreset: 'tibetan_bowl',
    oscAddress: '/cart/ceremony/bowl432',
    volume: 0.8,
    durationSec: 6.0,
    fadeTimeMs: 1800,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 37, channel: 1, noteName: 'C#1' }
  },
  {
    id: 'pad-d-3',
    gridIndex: 2,
    numberLabel: '3',
    keyboardKey: '3',
    label: 'Cloche de Cathédrale',
    subLabel: 'Bourdon Solennel [G1]',
    mode: 'one-shot',
    chokeGroup: 1,
    color: '#7c3aed',
    soundPreset: 'crystal_resonance',
    oscAddress: '/cart/ceremony/cathedral',
    volume: 0.9,
    durationSec: 4.5,
    fadeTimeMs: 500,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 38, channel: 1, noteName: 'D1' }
  },
  {
    id: 'pad-d-4',
    gridIndex: 3,
    numberLabel: '4',
    keyboardKey: '4',
    label: 'Cymbal Swell & Roulade',
    subLabel: 'Crescendo Cuivre Doux',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#eab308',
    soundPreset: 'metallic_pulse',
    oscAddress: '/cart/ceremony/cymbal',
    volume: 0.85,
    durationSec: 3.5,
    fadeTimeMs: 800,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 39, channel: 1, noteName: 'D#1' }
  },
  {
    id: 'pad-d-5',
    gridIndex: 4,
    numberLabel: '5',
    keyboardKey: 'q',
    label: 'Transition Rideau Rouge',
    subLabel: 'Ouverture Baldaquin Scène [G2]',
    mode: 'toggle',
    chokeGroup: 2,
    color: '#b91c1c',
    soundPreset: 'footstep_wood',
    oscAddress: '/stage/curtain/open',
    volume: 0.8,
    durationSec: 3.0,
    fadeTimeMs: 1000,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 40, channel: 1, noteName: 'E1' }
  },
  {
    id: 'pad-d-6',
    gridIndex: 5,
    numberLabel: '6',
    keyboardKey: 'w',
    label: 'Fermeture Rideau Noir',
    subLabel: 'Fin d’Acte Tombée [G2]',
    mode: 'toggle',
    chokeGroup: 2,
    color: '#1e293b',
    soundPreset: 'deep_sub_drone',
    oscAddress: '/stage/curtain/close',
    volume: 0.85,
    durationSec: 2.8,
    fadeTimeMs: 800,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 41, channel: 1, noteName: 'F1' }
  },
  {
    id: 'pad-d-7',
    gridIndex: 6,
    numberLabel: '7',
    keyboardKey: 'e',
    label: 'Harpe Pentatonique Céleste',
    subLabel: 'Glissando Féerique Scène',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#10b981',
    soundPreset: 'sparkle_pentatonic',
    oscAddress: '/cart/music/harp',
    volume: 0.8,
    durationSec: 3.2,
    fadeTimeMs: 300,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 42, channel: 1, noteName: 'F#1' }
  },
  {
    id: 'pad-d-8',
    gridIndex: 7,
    numberLabel: '8',
    keyboardKey: 'r',
    label: 'Trompe Médiévale Royale',
    subLabel: 'Annonce Entrée Souverain',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#d97706',
    soundPreset: 'crystal_resonance',
    oscAddress: '/cart/music/fanfare',
    volume: 0.9,
    durationSec: 2.5,
    fadeTimeMs: 150,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 43, channel: 1, noteName: 'G1' }
  },
  {
    id: 'pad-d-9',
    gridIndex: 8,
    numberLabel: '9',
    keyboardKey: 'a',
    label: 'Nappe Violons Synthétique',
    subLabel: 'Émotion Scénique Solennelle',
    mode: 'loop',
    chokeGroup: null,
    color: '#ec4899',
    soundPreset: 'shimmer_reverb',
    oscAddress: '/cart/music/strings',
    volume: 0.8,
    durationSec: 5.0,
    fadeTimeMs: 1500,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 44, channel: 1, noteName: 'G#1' }
  },
  {
    id: 'pad-d-10',
    gridIndex: 9,
    numberLabel: '10',
    keyboardKey: 's',
    label: 'Pluie d’Or & Confettis',
    subLabel: 'Final Scène Apothéose',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#fbbf24',
    soundPreset: 'sparkle_pentatonic',
    oscAddress: '/cart/effect/confetti',
    volume: 0.85,
    durationSec: 3.5,
    fadeTimeMs: 300,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 45, channel: 1, noteName: 'A1' }
  },
  {
    id: 'pad-d-11',
    gridIndex: 10,
    numberLabel: '11',
    keyboardKey: 'd',
    label: 'Appel d’Acteur Loge 1',
    subLabel: 'Intercom Régie Plateau [G3]',
    mode: 'choke',
    chokeGroup: 3,
    color: '#0284c7',
    soundPreset: 'bell_cue',
    oscAddress: '/intercom/call/loge1',
    volume: 0.85,
    durationSec: 1.5,
    fadeTimeMs: 50,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 46, channel: 1, noteName: 'A#1' }
  },
  {
    id: 'pad-d-12',
    gridIndex: 11,
    numberLabel: '12',
    keyboardKey: 'f',
    label: 'Top Début Spectacle',
    subLabel: 'Signal Salle Noir [G3]',
    mode: 'choke',
    chokeGroup: 3,
    color: '#059669',
    soundPreset: 'crystal_resonance',
    oscAddress: '/intercom/top/show',
    volume: 0.9,
    durationSec: 2.0,
    fadeTimeMs: 50,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 47, channel: 1, noteName: 'B1' }
  },
  {
    id: 'pad-d-13',
    gridIndex: 12,
    numberLabel: '13',
    keyboardKey: 'z',
    label: 'Nappe Mer Calme Crépuscule',
    subLabel: 'Ambiance Vague Apaisée',
    mode: 'loop',
    chokeGroup: null,
    color: '#0d9488',
    soundPreset: 'wind_texture',
    oscAddress: '/ambient/dusk/sea',
    volume: 0.75,
    durationSec: 4.8,
    fadeTimeMs: 1500,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 48, channel: 1, noteName: 'C2' }
  },
  {
    id: 'pad-d-14',
    gridIndex: 13,
    numberLabel: '14',
    keyboardKey: 'x',
    label: 'Chœur Liturgique Nocturne',
    subLabel: 'Voix Mixtes A Cappella',
    mode: 'loop',
    chokeGroup: null,
    color: '#9333ea',
    soundPreset: 'tibetan_bowl',
    oscAddress: '/cart/choir/liturgy',
    volume: 0.85,
    durationSec: 5.0,
    fadeTimeMs: 2000,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 49, channel: 1, noteName: 'C#2' }
  },
  {
    id: 'pad-d-15',
    gridIndex: 14,
    numberLabel: '15',
    keyboardKey: 'c',
    label: 'Fondu au Noir Scénique (Blackout)',
    subLabel: 'Extinction Progressive Gradateurs',
    mode: 'toggle',
    chokeGroup: null,
    color: '#334155',
    soundPreset: 'deep_sub_drone',
    oscAddress: '/lighting/fadeout/black',
    volume: 0.8,
    durationSec: 3.5,
    fadeTimeMs: 1000,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 50, channel: 1, noteName: 'D2' }
  },
  {
    id: 'pad-d-16',
    gridIndex: 15,
    numberLabel: '16',
    keyboardKey: 'v',
    label: 'Standing Ovation & Triomphe',
    subLabel: 'Clôture Triomphale du Spectacle',
    mode: 'one-shot',
    chokeGroup: null,
    color: '#f43f5e',
    soundPreset: 'shimmer_reverb',
    oscAddress: '/cart/applause/triumph',
    volume: 0.95,
    durationSec: 5.0,
    fadeTimeMs: 500,
    status: 'idle',
    progress: 0,
    loopCount: 0,
    midiBinding: { messageType: 'note', number: 51, channel: 1, noteName: 'D#2' }
  }
];

export const ALL_FACTORY_BANKS: Record<CartBankId, CartPad[]> = {
  A: FACTORY_BANK_A_PADS,
  B: FACTORY_BANK_B_PADS,
  C: FACTORY_BANK_C_PADS,
  D: FACTORY_BANK_D_PADS
};

// ============================================================================
// FONCTIONS DE GESTION DU LOCALSTORAGE POUR LES BANQUES DE 16 PADS
// ============================================================================

const BANK_STORAGE_PREFIX = 'nocode_cue_cart_bank_';
const BANK_TIME_PREFIX = 'nocode_cue_cart_bank_time_';
const BANK_NAMES_STORAGE_KEY = 'nocode_cue_cart_bank_names';
const ACTIVE_BANK_STORAGE_KEY = 'nocode_cue_cart_active_bank';
const LEGACY_STORAGE_KEY = 'nocode_cue_cart_pads';

/**
 * Charge les 16 pads d'une banque depuis le localStorage,
 * avec repli automatique sur les presets d'usine.
 */
export const loadBankPadsFromStorage = (bankId: CartBankId): CartPad[] => {
  const factory = ALL_FACTORY_BANKS[bankId] || FACTORY_BANK_A_PADS;
  try {
    // 1. Clé spécifique à la banque
    let raw = localStorage.getItem(`${BANK_STORAGE_PREFIX}${bankId}`);

    // Si banque A et pas encore de clé bank_A, vérifier l'ancienne clé historique
    if (!raw && bankId === 'A') {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Garantir l'intégrité de chaque pad et repli pour les nouvelles propriétés (fadeTimeMs, etc.)
        return parsed.slice(0, 16).map((p: Partial<CartPad>, idx: number) => {
          const fallback = factory[idx] || FACTORY_BANK_A_PADS[idx];
          return {
            id: p.id || `pad-${bankId.toLowerCase()}-${idx + 1}`,
            gridIndex: idx,
            numberLabel: p.numberLabel || `${idx + 1}`,
            keyboardKey: p.keyboardKey || fallback.keyboardKey,
            label: p.label || fallback.label,
            subLabel: p.subLabel || fallback.subLabel,
            customLabel: typeof p.customLabel === 'string' ? p.customLabel : (fallback.customLabel ?? ''),
            groupName: typeof p.groupName === 'string' ? p.groupName : (fallback.groupName ?? ''),
            folderId: typeof p.folderId === 'string' ? p.folderId : (fallback.folderId ?? null),
            mode: (p.mode as PadMode) || fallback.mode,
            chokeGroup: p.chokeGroup !== undefined ? p.chokeGroup : fallback.chokeGroup,
            color: p.color || fallback.color,
            soundPreset: p.soundPreset || fallback.soundPreset,
            oscAddress: p.oscAddress || fallback.oscAddress,
            volume: typeof p.volume === 'number' ? Math.max(0, Math.min(1, p.volume)) : fallback.volume,
            durationSec: typeof p.durationSec === 'number' ? Math.max(0.1, p.durationSec) : fallback.durationSec,
            fadeTimeMs: typeof p.fadeTimeMs === 'number' ? Math.max(0, p.fadeTimeMs) : fallback.fadeTimeMs,
            status: 'idle',
            progress: 0,
            loopCount: 0,
            midiBinding: p.midiBinding !== undefined ? p.midiBinding : fallback.midiBinding,
            midiOut: p.midiOut !== undefined ? p.midiOut : (fallback.midiOut ?? null),
            crossfadeBehavior: (p.crossfadeBehavior as 'default' | 'bypass' | 'force') || (fallback.crossfadeBehavior ?? 'default'),
            customCrossfadeMs: typeof p.customCrossfadeMs === 'number' ? p.customCrossfadeMs : (fallback.customCrossfadeMs ?? null)
          };
        });
      }
    }
  } catch (err) {
    console.warn(`[CueCartBankManager] Erreur lors de la lecture de la banque ${bankId}:`, err);
  }

  // Retourne une copie fraîche de la banque d'usine
  return JSON.parse(JSON.stringify(factory));
};

/**
 * Sauvegarde les 16 pads d'une banque dans le localStorage
 */
export const saveBankPadsToStorage = (bankId: CartBankId, pads: CartPad[]): void => {
  try {
    // Nettoyer les statuts volatiles (status = idle, progress = 0) avant stockage
    const serializedPads = pads.map((p) => ({
      ...p,
      status: 'idle',
      progress: 0,
      loopCount: 0
    }));

    const json = JSON.stringify(serializedPads);
    localStorage.setItem(`${BANK_STORAGE_PREFIX}${bankId}`, json);
    localStorage.setItem(`${BANK_TIME_PREFIX}${bankId}`, new Date().toISOString());

    // Pour compatibilité descendante avec la banque A
    if (bankId === 'A') {
      localStorage.setItem(LEGACY_STORAGE_KEY, json);
    }
  } catch (err) {
    console.warn(`[CueCartBankManager] Erreur lors de la sauvegarde de la banque ${bankId}:`, err);
  }
};

/**
 * Charge les noms personnalisés des banques
 */
export const loadBankNamesFromStorage = (): Record<CartBankId, string> => {
  try {
    const raw = localStorage.getItem(BANK_NAMES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        A: parsed.A || DEFAULT_BANK_NAMES.A,
        B: parsed.B || DEFAULT_BANK_NAMES.B,
        C: parsed.C || DEFAULT_BANK_NAMES.C,
        D: parsed.D || DEFAULT_BANK_NAMES.D
      };
    }
  } catch {}
  return { ...DEFAULT_BANK_NAMES };
};

/**
 * Sauvegarde les noms personnalisés des banques
 */
export const saveBankNamesToStorage = (names: Record<CartBankId, string>): void => {
  try {
    localStorage.setItem(BANK_NAMES_STORAGE_KEY, JSON.stringify(names));
  } catch {}
};

/**
 * Récupère l'ID de la banque active
 */
export const loadActiveBankIdFromStorage = (): CartBankId => {
  try {
    const raw = localStorage.getItem(ACTIVE_BANK_STORAGE_KEY);
    if (raw === 'A' || raw === 'B' || raw === 'C' || raw === 'D') {
      return raw;
    }
  } catch {}
  return 'A';
};

/**
 * Sauvegarde l'ID de la banque active
 */
export const saveActiveBankIdToStorage = (bankId: CartBankId): void => {
  try {
    localStorage.setItem(ACTIVE_BANK_STORAGE_KEY, bankId);
  } catch {}
};

/**
 * Récupère la date de la dernière sauvegarde enregistrée pour une banque
 */
export const getBankLastSavedTime = (bankId: CartBankId): string | null => {
  try {
    return localStorage.getItem(`${BANK_TIME_PREFIX}${bankId}`);
  } catch {
    return null;
  }
};

/**
 * Exporte une banque sous forme de chaîne JSON prête au téléchargement
 */
export const exportBankToJsonString = (
  bankId: CartBankId,
  pads: CartPad[],
  bankName?: string
): string => {
  const exportPayload = {
    app: 'No[co]de Vibe Designer — Cue Cartridge Régie',
    version: '2.4.0',
    exportedAt: new Date().toISOString(),
    bankId,
    bankName: bankName || DEFAULT_BANK_NAMES[bankId],
    padsCount: pads.length,
    pads: pads.map((p) => ({
      ...p,
      status: 'idle',
      progress: 0,
      loopCount: 0
    }))
  };

  return JSON.stringify(exportPayload, null, 2);
};

/**
 * Importe une banque depuis une chaîne JSON
 */
export const importBankFromJsonString = (
  jsonString: string,
  targetBankId: CartBankId
): { success: boolean; pads?: CartPad[]; bankName?: string; error?: string } => {
  try {
    const parsed = JSON.parse(jsonString);
    const rawPads = parsed.pads || (Array.isArray(parsed) ? parsed : null);

    if (!Array.isArray(rawPads) || rawPads.length === 0) {
      return { success: false, error: 'Fichier JSON invalide : aucun pad détecté.' };
    }

    const factory = ALL_FACTORY_BANKS[targetBankId];
    const pads: CartPad[] = rawPads.slice(0, 16).map((p: Partial<CartPad>, idx: number) => {
      const fallback = factory[idx] || FACTORY_BANK_A_PADS[idx];
      return {
        id: p.id || `pad-${targetBankId.toLowerCase()}-${idx + 1}`,
        gridIndex: idx,
        numberLabel: p.numberLabel || `${idx + 1}`,
        keyboardKey: p.keyboardKey || fallback.keyboardKey,
        label: p.label || fallback.label,
        subLabel: p.subLabel || fallback.subLabel,
        customLabel: typeof p.customLabel === 'string' ? p.customLabel : (fallback.customLabel ?? ''),
        groupName: typeof p.groupName === 'string' ? p.groupName : (fallback.groupName ?? ''),
        folderId: typeof p.folderId === 'string' ? p.folderId : (fallback.folderId ?? null),
        mode: (p.mode as PadMode) || fallback.mode,
        chokeGroup: p.chokeGroup !== undefined ? p.chokeGroup : fallback.chokeGroup,
        color: p.color || fallback.color,
        soundPreset: p.soundPreset || fallback.soundPreset,
        oscAddress: p.oscAddress || fallback.oscAddress,
        volume: typeof p.volume === 'number' ? Math.max(0, Math.min(1, p.volume)) : fallback.volume,
        durationSec: typeof p.durationSec === 'number' ? Math.max(0.1, p.durationSec) : fallback.durationSec,
        fadeTimeMs: typeof p.fadeTimeMs === 'number' ? Math.max(0, p.fadeTimeMs) : fallback.fadeTimeMs,
        status: 'idle',
        progress: 0,
        loopCount: 0,
        midiBinding: p.midiBinding !== undefined ? p.midiBinding : fallback.midiBinding,
        midiOut: p.midiOut !== undefined ? p.midiOut : (fallback.midiOut ?? null),
        crossfadeBehavior: (p.crossfadeBehavior as 'default' | 'bypass' | 'force') || (fallback.crossfadeBehavior ?? 'default'),
        customCrossfadeMs: typeof p.customCrossfadeMs === 'number' ? p.customCrossfadeMs : (fallback.customCrossfadeMs ?? null)
      };
    });

    // Compléter à 16 si le JSON importé en avait moins
    while (pads.length < 16) {
      const idx = pads.length;
      pads.push({ ...factory[idx] });
    }

    return {
      success: true,
      pads,
      bankName: typeof parsed.bankName === 'string' ? parsed.bankName : undefined
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: `Erreur d'analyse JSON : ${err instanceof Error ? err.message : 'Format invalide'}`
    };
  }
};

/**
 * Réinitialise une banque aux valeurs d'usine
 */
export const resetBankToFactoryDefaults = (bankId: CartBankId): CartPad[] => {
  const factory = JSON.parse(JSON.stringify(ALL_FACTORY_BANKS[bankId]));
  saveBankPadsToStorage(bankId, factory);
  return factory;
};

/**
 * Duplique les pads d'une banque source vers une banque cible
 */
export const duplicateBankInStorage = (
  fromBank: CartBankId,
  toBank: CartBankId
): CartPad[] => {
  const sourcePads = loadBankPadsFromStorage(fromBank);
  const cloned: CartPad[] = sourcePads.map((p, idx) => ({
    ...p,
    id: `pad-${toBank.toLowerCase()}-${idx + 1}`,
    gridIndex: idx,
    status: 'idle',
    progress: 0,
    loopCount: 0
  }));
  saveBankPadsToStorage(toBank, cloned);
  return cloned;
};
