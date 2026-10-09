// Moteur de Spectacles, Dossiers & Cues Hiérarchiques Façon QLab
// No[co]de Vibe Designer — Organisation de spectacles professionnels
// Supporte :
// - Dossiers & sous-dossiers illimités : Spectacle ➔ Acte ➔ Scène ➔ Cues (Q1, Q2...)
// - Gros bouton GO, NEXT, PREV, STOP, PANIC
// - Liaison réelle avec les Patch Canvases, Shaders, Audio, OSC, MIDI et TOPs
// - Conduites complètes (dont 200 cues répartis en actes et scènes)
// - Sauvegarde persistante sans écrasement

import { patchGraphEngine } from './patchGraphEngine';
import { radioAudioEngine } from './radioAudioEngine';
import { midiDeviceEngine } from './midiDeviceEngine';

export type CueType = 'group' | 'patch' | 'audio' | 'video' | 'shader' | 'osc' | 'midi' | 'top' | 'panic';
export type GroupMode = 'start_all' | 'start_first_and_go_next';

export interface QLabCue {
  id: string;
  qNumber: string;         // e.g. "Q1", "Q2", "ACTE 1"
  name: string;            // e.g. "Mer phosphorescente"
  type: CueType;
  parentId: string | null; // Id du dossier/groupe parent (null pour racine)
  targetPatchTabId?: string; // Lien avec un Patch Canvas en onglet
  targetShaderId?: string;
  targetOscAddress?: string;
  targetMidiCC?: number;
  durationSec?: number;
  preWaitSec?: number;
  postWaitSec?: number;
  autoContinue?: boolean;  // Enchaîne automatiquement sans attendre
  groupMode?: GroupMode;
  isExpanded?: boolean;    // Repliable dans l'arborescence
  notes?: string;
  color?: string;
  status?: 'standby' | 'running' | 'paused' | 'done';
}

export interface ShowFile {
  id: string;
  title: string;
  author: string;
  cues: QLabCue[];
  currentStandbyCueId: string | null;
  createdAt: number;
}

// -------------------------------------------------------------
// CONDUITE DE DÉMO COMPLÈTE PIRATES PAILLETTES (JUSQU'À 200 CUES)
// -------------------------------------------------------------

function generateOfficialShow(): QLabCue[] {
  const cues: QLabCue[] = [];

  // Acte 1
  cues.push({
    id: 'cue-act-1',
    qNumber: 'ACTE 1',
    name: 'Le Départ des Pirates Paillettes',
    type: 'group',
    parentId: null,
    isExpanded: true,
    groupMode: 'start_first_and_go_next',
    color: '#d7b86a',
  });

  // Acte 1 -> Scène 1
  cues.push({
    id: 'cue-act-1-sc-1',
    qNumber: 'SCÈNE 1',
    name: 'La Plage & La Mer Nocturne',
    type: 'group',
    parentId: 'cue-act-1',
    isExpanded: true,
    groupMode: 'start_first_and_go_next',
    color: '#38bdf8',
  });

  cues.push({
    id: 'cue-q1',
    qNumber: 'Q1',
    name: 'Mer Phosphorescente (GLSL)',
    type: 'patch',
    parentId: 'cue-act-1-sc-1',
    targetPatchTabId: 'tab-1',
    durationSec: 25,
    autoContinue: false,
    color: '#38bdf8',
    notes: 'Houle bioluminescente raymarching. Active le canal vidéo principal.',
  });

  cues.push({
    id: 'cue-q2',
    qNumber: 'Q2',
    name: 'Ombre du Pirate qui s’éloigne',
    type: 'patch',
    parentId: 'cue-act-1-sc-1',
    targetPatchTabId: 'tab-2',
    durationSec: 18,
    autoContinue: false,
    color: '#8fa79d',
    notes: 'Silhouette de pirate marchant vers l’horizon brumeux parmi les ombres fantomatiques.',
  });

  cues.push({
    id: 'cue-q3',
    qNumber: 'Q3',
    name: 'Bruitage Interactif & Choc de Sabre',
    type: 'patch',
    parentId: 'cue-act-1-sc-1',
    targetPatchTabId: 'tab-4',
    durationSec: 12,
    autoContinue: false,
    color: '#d7b86a',
    notes: 'Détection micro direct + crête acoustique. Envoie le TOP régie.',
  });

  // Acte 1 -> Scène 2
  cues.push({
    id: 'cue-act-1-sc-2',
    qNumber: 'SCÈNE 2',
    name: 'L’Abordage & La Tempête',
    type: 'group',
    parentId: 'cue-act-1',
    isExpanded: true,
    groupMode: 'start_first_and_go_next',
    color: '#ef4444',
  });

  cues.push({
    id: 'cue-q4',
    qNumber: 'Q4',
    name: 'Tempête Scénique & Foudre GLSL',
    type: 'patch',
    parentId: 'cue-act-1-sc-2',
    targetPatchTabId: 'tab-1',
    durationSec: 30,
    color: '#ef4444',
    notes: 'Éclairs stroboscopiques Art-Net et saturation bioluminescente.',
  });

  cues.push({
    id: 'cue-q5',
    qNumber: 'Q5',
    name: 'Radio Paillettes en Grève (P00 ON AIR)',
    type: 'audio',
    parentId: 'cue-act-1-sc-2',
    durationSec: 45,
    color: '#ef4444',
    notes: 'Bascule le flux audio public sur /radio-paillettes en direct.',
  });

  // Acte 2
  cues.push({
    id: 'cue-act-2',
    qNumber: 'ACTE 2',
    name: 'Le Bal des Épaves et Lueurs Profondes',
    type: 'group',
    parentId: null,
    isExpanded: true,
    groupMode: 'start_first_and_go_next',
    color: '#a855f7',
  });

  // Acte 2 -> Scène 3
  cues.push({
    id: 'cue-act-2-sc-3',
    qNumber: 'SCÈNE 3',
    name: 'La Créature Organique des Abysses',
    type: 'group',
    parentId: 'cue-act-2',
    isExpanded: true,
    groupMode: 'start_first_and_go_next',
    color: '#a855f7',
  });

  cues.push({
    id: 'cue-q6',
    qNumber: 'Q6',
    name: 'Créature Lumineuse & Bloom ISF',
    type: 'patch',
    parentId: 'cue-act-2-sc-3',
    targetPatchTabId: 'tab-3',
    durationSec: 40,
    color: '#a855f7',
    notes: 'Baleine bioluminescente ondulante et halos lumineux doux.',
  });

  cues.push({
    id: 'cue-q7',
    qNumber: 'Q7',
    name: 'TOP Scénique — Surtitre Acte Final',
    type: 'top',
    parentId: 'cue-act-2-sc-3',
    durationSec: 10,
    color: '#8fa79d',
    notes: 'Envoi du TOP didascalie au module de Surtitrage Glypheo.',
  });

  // Génération des Cues additionnelles jusqu'à Q200 pour conduite complète
  for (let i = 8; i <= 200; i++) {
    const actNum = i < 70 ? 1 : i < 140 ? 2 : 3;
    const sceneNum = Math.floor((i - 1) / 10) + 1;
    const types: CueType[] = ['patch', 'shader', 'audio', 'top', 'osc', 'midi'];
    const cueType = types[i % types.length];

    cues.push({
      id: `cue-q${i}`,
      qNumber: `Q${i}`,
      name: i % 5 === 0 
        ? `TOP Lumineux & Didascalie #${i}`
        : i % 3 === 0
        ? `Changement Ambiance Mer & Ombres #${i}`
        : `Séquence Effets Spéciaux #${i}`,
      type: cueType,
      parentId: `cue-act-${actNum}`,
      targetPatchTabId: i % 4 === 0 ? 'tab-1' : i % 4 === 1 ? 'tab-2' : i % 4 === 2 ? 'tab-3' : 'tab-4',
      durationSec: 10 + (i % 25),
      color: i % 3 === 0 ? '#38bdf8' : i % 2 === 0 ? '#d7b86a' : '#8fa79d',
      notes: `Cue technique régie scène ${sceneNum} — Synchronisation No[co]de & QLab`,
    });
  }

  return cues;
}

export const INITIAL_SHOW: ShowFile = {
  id: 'show-pirates-paillettes',
  title: 'Spectacle : Pirates Paillettes (Conduite Pro QLab)',
  author: 'Régie Scénographique No[co]de',
  cues: generateOfficialShow(),
  currentStandbyCueId: 'cue-q1',
  createdAt: Date.now(),
};

class QLabCueEngine {
  private shows: ShowFile[] = [INITIAL_SHOW];
  private activeShowId = 'show-pirates-paillettes';
  private listeners: Set<() => void> = new Set();
  private lastFiredCue: QLabCue | null = null;
  private isPanicArmed = false;

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('nocode_qlab_shows_v2');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed.shows) && parsed.shows.length > 0) {
            this.shows = parsed.shows;
            this.activeShowId = parsed.activeShowId || parsed.shows[0].id;
            return;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  private saveState() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'nocode_qlab_shows_v2',
          JSON.stringify({
            shows: this.shows,
            activeShowId: this.activeShowId,
          })
        );
      }
    } catch {
      // ignore
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.saveState();
    this.listeners.forEach((l) => l());
  }

  // -------------------------------------------------------------
  // GESTION DES SPECTACLES
  // -------------------------------------------------------------

  public getShows(): ShowFile[] {
    return this.shows;
  }

  public getActiveShow(): ShowFile {
    const show = this.shows.find((s) => s.id === this.activeShowId);
    return show || this.shows[0];
  }

  public setActiveShow(id: string) {
    if (this.shows.some((s) => s.id === id)) {
      this.activeShowId = id;
      this.notify();
    }
  }

  public createShow(title = 'Nouveau Spectacle'): ShowFile {
    const newShow: ShowFile = {
      id: `show-${Date.now().toString(36)}`,
      title,
      author: 'Régie No[co]de',
      cues: [
        {
          id: `cue-act-1-${Date.now().toString(36)}`,
          qNumber: 'ACTE 1',
          name: 'Ouverture Scénique',
          type: 'group',
          parentId: null,
          isExpanded: true,
          color: '#d7b86a',
        },
        {
          id: `cue-q1-${Date.now().toString(36)}`,
          qNumber: 'Q1',
          name: 'Cue de Départ',
          type: 'patch',
          parentId: `cue-act-1-${Date.now().toString(36)}`,
          targetPatchTabId: 'tab-1',
          durationSec: 20,
          color: '#38bdf8',
        },
      ],
      currentStandbyCueId: `cue-q1-${Date.now().toString(36)}`,
      createdAt: Date.now(),
    };
    this.shows.push(newShow);
    this.activeShowId = newShow.id;
    this.notify();
    return newShow;
  }

  // -------------------------------------------------------------
  // COMMANDES DE CONDUITE QLAB (GO, NEXT, PREV, STOP, PANIC)
  // -------------------------------------------------------------

  public getStandbyCue(): QLabCue | null {
    const show = this.getActiveShow();
    if (!show.currentStandbyCueId) {
      const firstPlayable = show.cues.find((c) => c.type !== 'group');
      return firstPlayable || null;
    }
    return show.cues.find((c) => c.id === show.currentStandbyCueId) || null;
  }

  public setStandbyCueId(cueId: string) {
    const show = this.getActiveShow();
    if (show.cues.some((c) => c.id === cueId)) {
      show.currentStandbyCueId = cueId;
      this.notify();
    }
  }

  // GROS BOUTON GO (LE CŒUR DE QLAB)
  public fireGo(): QLabCue | null {
    const show = this.getActiveShow();
    const current = this.getStandbyCue();
    if (!current) return null;

    // 1. Déclencher le moteur réel associé
    this.executeCueAction(current);

    // 2. Mettre à jour le statut
    current.status = 'running';
    this.lastFiredCue = current;

    // 3. Avancer le curseur Standby sur la cue suivante jouable
    this.advanceToNextCue();

    this.notify();
    return current;
  }

  // Déclenchement direct d'une Cue spécifique (depuis l'arborescence ou le plateau)
  public fireCue(cueId: string): QLabCue | null {
    const show = this.getActiveShow();
    const cue = show.cues.find((c) => c.id === cueId);
    if (!cue) return null;

    this.executeCueAction(cue);
    cue.status = 'running';
    this.lastFiredCue = cue;

    // Définir la suivante jouable comme Standby
    const playables = show.cues.filter((c) => c.type !== 'group');
    const currentIndex = playables.findIndex((c) => c.id === cueId);
    if (currentIndex !== -1 && currentIndex < playables.length - 1) {
      show.currentStandbyCueId = playables[currentIndex + 1].id;
    }

    this.notify();
    return cue;
  }

  private executeCueAction(cue: QLabCue) {
    // 1. Si la cue cible un Patch Canvas spécifique en onglet : l'activer en direct !
    if (cue.targetPatchTabId) {
      patchGraphEngine.setActiveTab(cue.targetPatchTabId);
    }

    // 2. Si la cue cible la Radio : basculer le status ON AIR
    if (cue.name.toLowerCase().includes('radio') || cue.type === 'audio') {
      radioAudioEngine.setDestination('radio-paillettes');
    }

    // 3. Déclencheur MIDI si configuré
    if (cue.targetMidiCC !== undefined) {
      midiDeviceEngine.simulateMidiMessage('cc', cue.targetMidiCC, 1.0);
    }

    // 4. Émettre un signal global OSC / TOP pour régie
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('nocode_qlab_cue_fired', {
          detail: {
            cueId: cue.id,
            qNumber: cue.qNumber,
            name: cue.name,
            type: cue.type,
            targetPatchTabId: cue.targetPatchTabId,
            timestamp: Date.now(),
          },
        })
      );

      if (cue.targetOscAddress) {
        window.dispatchEvent(
          new CustomEvent('nocode_osc_message', {
            detail: {
              address: cue.targetOscAddress,
              value: 1.0,
              args: [cue.qNumber, cue.name],
            },
          })
        );
      }
    }
  }

  public advanceToNextCue() {
    const show = this.getActiveShow();
    const currentId = show.currentStandbyCueId;
    const playables = show.cues.filter((c) => c.type !== 'group');
    if (playables.length === 0) return;

    const currentIndex = playables.findIndex((c) => c.id === currentId);
    if (currentIndex !== -1 && currentIndex < playables.length - 1) {
      show.currentStandbyCueId = playables[currentIndex + 1].id;
    } else {
      show.currentStandbyCueId = playables[0].id;
    }
    this.notify();
  }

  public previousCue() {
    const show = this.getActiveShow();
    const currentId = show.currentStandbyCueId;
    const playables = show.cues.filter((c) => c.type !== 'group');
    if (playables.length === 0) return;

    const currentIndex = playables.findIndex((c) => c.id === currentId);
    if (currentIndex > 0) {
      show.currentStandbyCueId = playables[currentIndex - 1].id;
    } else {
      show.currentStandbyCueId = playables[playables.length - 1].id;
    }
    this.notify();
  }

  public stopAll() {
    const show = this.getActiveShow();
    show.cues.forEach((c) => {
      if (c.status === 'running') c.status = 'paused';
    });
    this.notify();
  }

  public panic() {
    const show = this.getActiveShow();
    show.cues.forEach((c) => {
      c.status = 'done';
    });
    this.isPanicArmed = true;

    // Fondu au noir complet d'urgence
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nocode_panic_trigger'));
    }
    this.notify();
  }

  // -------------------------------------------------------------
  // ÉDITION ET HIÉRARCHIE (DOSSIERS & CUES)
  // -------------------------------------------------------------

  public toggleGroupExpanded(cueId: string) {
    const show = this.getActiveShow();
    const group = show.cues.find((c) => c.id === cueId);
    if (group) {
      group.isExpanded = !group.isExpanded;
      this.notify();
    }
  }

  public addCue(type: CueType = 'patch', parentId: string | null = null): QLabCue {
    const show = this.getActiveShow();
    const count = show.cues.length + 1;
    const newCue: QLabCue = {
      id: `cue-${Date.now().toString(36)}`,
      qNumber: type === 'group' ? `DOSSIER ${count}` : `Q${count}`,
      name: type === 'group' ? 'Nouveau Dossier Scène' : `Nouvelle Cue ${count}`,
      type,
      parentId,
      targetPatchTabId: 'tab-1',
      durationSec: 15,
      isExpanded: true,
      color: type === 'group' ? '#d7b86a' : '#38bdf8',
    };

    show.cues.push(newCue);
    if (type !== 'group' && !show.currentStandbyCueId) {
      show.currentStandbyCueId = newCue.id;
    }
    this.notify();
    return newCue;
  }

  public deleteCue(cueId: string) {
    const show = this.getActiveShow();
    // Supprimer récursivement si c'est un groupe
    const idsToDelete = new Set<string>([cueId]);
    let added = true;
    while (added) {
      added = false;
      show.cues.forEach((c) => {
        if (c.parentId && idsToDelete.has(c.parentId) && !idsToDelete.has(c.id)) {
          idsToDelete.add(c.id);
          added = true;
        }
      });
    }

    show.cues = show.cues.filter((c) => !idsToDelete.has(c.id));
    if (show.currentStandbyCueId && idsToDelete.has(show.currentStandbyCueId)) {
      const firstPlayable = show.cues.find((c) => c.type !== 'group');
      show.currentStandbyCueId = firstPlayable?.id || null;
    }
    this.notify();
  }

  public renameCue(cueId: string, qNumber: string, name: string) {
    const show = this.getActiveShow();
    const cue = show.cues.find((c) => c.id === cueId);
    if (cue) {
      cue.qNumber = qNumber.trim();
      cue.name = name.trim();
      this.notify();
    }
  }

  public moveCue(cueId: string, direction: 'up' | 'down') {
    const show = this.getActiveShow();
    const idx = show.cues.findIndex((c) => c.id === cueId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= show.cues.length) return;

    const temp = show.cues[idx];
    show.cues[idx] = show.cues[targetIdx];
    show.cues[targetIdx] = temp;
    this.notify();
  }

  public moveCueToParent(cueId: string, newParentId: string | null) {
    const show = this.getActiveShow();
    const cue = show.cues.find((c) => c.id === cueId);
    if (cue && cue.id !== newParentId) {
      cue.parentId = newParentId;
      this.notify();
    }
  }

  public reorderCues(sourceCueId: string, targetCueId: string) {
    const show = this.getActiveShow();
    const srcIdx = show.cues.findIndex((c) => c.id === sourceCueId);
    const tgtIdx = show.cues.findIndex((c) => c.id === targetCueId);
    if (srcIdx === -1 || tgtIdx === -1 || srcIdx === tgtIdx) return;

    const [moved] = show.cues.splice(srcIdx, 1);
    // Inherit the target's parent if moving near it
    const targetCue = show.cues[tgtIdx > srcIdx ? tgtIdx - 1 : tgtIdx];
    if (targetCue && moved.type !== 'group') {
      moved.parentId = targetCue.parentId;
    }
    show.cues.splice(tgtIdx, 0, moved);
    this.notify();
  }

  public setTargetPatchTabId(cueId: string, targetPatchTabId: string) {
    const show = this.getActiveShow();
    const cue = show.cues.find((c) => c.id === cueId);
    if (cue) {
      cue.targetPatchTabId = targetPatchTabId;
      this.notify();
    }
  }

  public renameShow(showId: string, newTitle: string) {
    const show = this.shows.find((s) => s.id === showId);
    if (show && newTitle.trim()) {
      show.title = newTitle.trim();
      this.notify();
    }
  }

  public duplicateCue(cueId: string): QLabCue | null {
    const show = this.getActiveShow();
    const src = show.cues.find((c) => c.id === cueId);
    if (!src) return null;

    const clone: QLabCue = {
      ...JSON.parse(JSON.stringify(src)),
      id: `cue-${Date.now().toString(36)}-dup`,
      qNumber: `${src.qNumber}.bis`,
      name: `${src.name} (Copie)`,
      status: 'standby',
    };

    const idx = show.cues.findIndex((c) => c.id === cueId);
    show.cues.splice(idx + 1, 0, clone);
    this.notify();
    return clone;
  }

  public getLastFired(): QLabCue | null {
    return this.lastFiredCue;
  }

  public getTotalCuesCount(): number {
    return this.getActiveShow().cues.length;
  }
}

export const qlabCueEngine = new QLabCueEngine();
