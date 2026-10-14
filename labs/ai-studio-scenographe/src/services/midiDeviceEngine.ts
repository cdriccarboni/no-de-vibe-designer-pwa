// Service Web MIDI Plug & Play & MIDI Learn No[co]de Vibe Designer
// Détection automatique à chaud, compatibilité tous contrôleurs (Korg, Akai, Novation, Arturia...)
// MIDI Learn 1-clic pour associer n'importe quel bouton ou touche à n'importe quel paramètre.

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
  state: 'connected' | 'disconnected';
  type: 'input' | 'output';
}

export interface MidiMappingRule {
  id: string;
  sourceDevice?: string;
  channel: number;       // 1-16
  messageType: 'cc' | 'note' | 'pitchbend';
  number: number;        // CC number (0-127) ou Note number (0-127)
  targetNodeId: string;
  targetParamKey: string;
  minRange: number;
  maxRange: number;
}

export interface MidiLearnState {
  isActive: boolean;
  targetNodeId?: string;
  targetParamKey?: string;
  lastDetectedMessage?: string;
}

interface InternalMidiPort {
  id: string;
  name?: string;
  manufacturer?: string;
  state: string;
  send?: (data: Uint8Array | number[], timestamp?: number) => void;
  onmidimessage?: ((event: { data: Uint8Array | number[] }) => void) | null;
}

interface InternalMidiAccess {
  inputs: {
    forEach: (cb: (input: InternalMidiPort) => void) => void;
  };
  outputs: {
    forEach: (cb: (output: InternalMidiPort) => void) => void;
  };
  onstatechange?: ((e: { port: InternalMidiPort }) => void) | null;
}

export interface RawMidiMessage {
  type: 'note' | 'cc' | 'pitchbend';
  number: number;
  channel: number;
  velocity: number;
}

export function getMidiNoteName(noteNumber: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(noteNumber / 12) - 1; // Note 60 = C4, Note 36 = C1
  return `${noteNames[noteNumber % 12]}${octave}`;
}

class MidiDeviceEngine {
  private midiAccess: InternalMidiAccess | null = null;
  private isSupported = false;
  private devices: MidiDevice[] = [];
  private mappings: MidiMappingRule[] = [];
  private learnState: MidiLearnState = { isActive: false };
  private listeners: Set<() => void> = new Set();
  private rawMessageListeners: Set<(msg: RawMidiMessage) => void> = new Set();
  private lastActivityText = 'Prêt à connecter';

  constructor() {
    this.loadMappings();
    this.initMidi();
  }

  private loadMappings() {
    try {
      const stored = localStorage.getItem('nocode_midi_mappings');
      if (stored) {
        this.mappings = JSON.parse(stored);
      }
    } catch {
      // ignore
    }
  }

  private saveMappings() {
    try {
      localStorage.setItem('nocode_midi_mappings', JSON.stringify(this.mappings));
    } catch {
      // ignore
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public onRawMessage(listener: (msg: RawMidiMessage) => void): () => void {
    this.rawMessageListeners.add(listener);
    return () => this.rawMessageListeners.delete(listener);
  }

  private dispatchRawMessage(msg: RawMidiMessage) {
    this.rawMessageListeners.forEach((l) => {
      try {
        l(msg);
      } catch (err) {
        console.error('Erreur dans le listener MIDI brut:', err);
      }
    });
  }

  private notify() {
    this.saveMappings();
    this.listeners.forEach((l) => l());
  }

  public async initMidi(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.requestMIDIAccess) {
      this.isSupported = false;
      this.lastActivityText = 'Web MIDI non supporté sur ce navigateur';
      this.notify();
      return false;
    }

    try {
      this.midiAccess = (await (navigator as any).requestMIDIAccess({ sysex: false })) as InternalMidiAccess;
      this.isSupported = true;
      this.updateDeviceList();

      // Détection et reconnexion automatique à chaud (Hot-Plug)
      this.midiAccess.onstatechange = (e: { port: InternalMidiPort }) => {
        this.updateDeviceList();
        const port = e.port;
        this.lastActivityText = `${port.name || 'Périphérique'} ${port.state === 'connected' ? 'branché' : 'déconnecté'}`;
        this.notify();
      };

      // Attacher les écouteurs de messages sur toutes les entrées
      this.bindAllInputs();
      this.lastActivityText = 'MIDI Plug & Play actif';
      this.notify();
      return true;
    } catch {
      this.isSupported = false;
      this.lastActivityText = 'Accès MIDI refusé ou indisponible';
      this.notify();
      return false;
    }
  }

  private updateDeviceList() {
    if (!this.midiAccess) return;
    const devList: MidiDevice[] = [];

    this.midiAccess.inputs.forEach((input: InternalMidiPort) => {
      devList.push({
        id: input.id,
        name: input.name || 'Entrée MIDI Inconnue',
        manufacturer: input.manufacturer || 'Générique',
        state: input.state as any,
        type: 'input',
      });
    });

    this.midiAccess.outputs.forEach((output: InternalMidiPort) => {
      devList.push({
        id: output.id,
        name: output.name || 'Sortie MIDI Inconnue',
        manufacturer: output.manufacturer || 'Générique',
        state: output.state as any,
        type: 'output',
      });
    });

    this.devices = devList;
  }

  private bindAllInputs() {
    if (!this.midiAccess) return;
    this.midiAccess.inputs.forEach((input: InternalMidiPort) => {
      input.onmidimessage = (event: { data: Uint8Array | number[] }) => this.handleMidiMessage(event);
    });
  }

  private handleMidiMessage(event: { data: Uint8Array | number[] }) {
    const data = event.data;
    if (!data || data.length < 2) return;

    const status = data[0];
    const messageType = status >> 4;
    const channel = (status & 0x0f) + 1;
    const data1 = data[1];
    const data2 = data.length > 2 ? data[2] : 0;

    // 1. Control Change (CC) : status 0xB0 to 0xBF (type = 11)
    if (messageType === 11) {
      const ccNumber = data1;
      const ccValue = data2; // 0 to 127
      const normalized = ccValue / 127;
      this.lastActivityText = `CC ${ccNumber} : ${ccValue} (Ch ${channel})`;

      // Notifier les écouteurs de messages bruts (ex: CueCartPanel MIDI Learn)
      this.dispatchRawMessage({ type: 'cc', number: ccNumber, channel, velocity: normalized });

      // Mode MIDI Learn actif ?
      if (this.learnState.isActive && this.learnState.targetNodeId && this.learnState.targetParamKey) {
        this.assignLearnMapping({
          channel,
          messageType: 'cc',
          number: ccNumber,
          targetNodeId: this.learnState.targetNodeId,
          targetParamKey: this.learnState.targetParamKey,
          minRange: 0,
          maxRange: 1,
        });
        return;
      }

      // Appliquer les règles de mapping enregistrées
      this.applyMappings('cc', ccNumber, channel, normalized);
    }

    // 2. Note On : status 0x90 to 0x9F (type = 9) avec vélocité > 0
    else if (messageType === 9 && data2 > 0) {
      const noteNumber = data1;
      const velocity = data2 / 127;
      this.lastActivityText = `Note On ${noteNumber} (Ch ${channel})`;

      // Notifier les écouteurs de messages bruts (ex: CueCartPanel MIDI Learn)
      this.dispatchRawMessage({ type: 'note', number: noteNumber, channel, velocity });

      if (this.learnState.isActive && this.learnState.targetNodeId && this.learnState.targetParamKey) {
        this.assignLearnMapping({
          channel,
          messageType: 'note',
          number: noteNumber,
          targetNodeId: this.learnState.targetNodeId,
          targetParamKey: this.learnState.targetParamKey,
          minRange: 0,
          maxRange: 1,
        });
        return;
      }

      this.applyMappings('note', noteNumber, channel, velocity);
    }
  }

  private applyMappings(type: 'cc' | 'note', number: number, channel: number, val: number) {
    const matched = this.mappings.filter(
      (m) => m.messageType === type && m.number === number
    );

    if (matched.length > 0) {
      matched.forEach((rule) => {
        // Dispatch événement global et mise à jour du moteur de patch
        window.dispatchEvent(
          new CustomEvent('nocode_midi_control', {
            detail: {
              nodeId: rule.targetNodeId,
              paramKey: rule.targetParamKey,
              value: val,
            },
          })
        );
      });
      this.notify();
    }
  }

  // -------------------------------------------------------------
  // MIDI LEARN (ASSOCIATION EN 1 CLIC)
  // -------------------------------------------------------------

  public startMidiLearn(targetNodeId: string, targetParamKey: string) {
    this.learnState = {
      isActive: true,
      targetNodeId,
      targetParamKey,
      lastDetectedMessage: 'Tourne un bouton ou appuie sur une touche...',
    };
    this.notify();
  }

  public cancelMidiLearn() {
    this.learnState = { isActive: false };
    this.notify();
  }

  private assignLearnMapping(rule: Omit<MidiMappingRule, 'id'>) {
    // Supprimer règle existante sur ce paramètre
    this.mappings = this.mappings.filter(
      (m) => !(m.targetNodeId === rule.targetNodeId && m.targetParamKey === rule.targetParamKey)
    );

    const newRule: MidiMappingRule = {
      id: `midi-map-${Date.now()}`,
      ...rule,
    };

    this.mappings.push(newRule);
    this.learnState = {
      isActive: false,
      lastDetectedMessage: `Associé avec succès au CC ${rule.number} !`,
    };
    this.lastActivityText = `Mapping validé : CC ${rule.number} ➔ ${rule.targetParamKey}`;
    this.notify();
  }

  public removeMapping(ruleId: string) {
    this.mappings = this.mappings.filter((m) => m.id !== ruleId);
    this.notify();
  }

  public getDevices(): MidiDevice[] {
    return this.devices;
  }

  public getConnectedInputsCount(): number {
    return this.devices.filter((d) => d.type === 'input' && d.state === 'connected').length;
  }

  public getConnectedOutputsCount(): number {
    return this.devices.filter((d) => d.type === 'output' && d.state === 'connected').length;
  }

  public getOutputDevices(): MidiDevice[] {
    return this.devices.filter((d) => d.type === 'output');
  }

  /**
   * Envoie un message Control Change (CC) sur les sorties MIDI connectées
   * @param channel Canal MIDI (1 à 16)
   * @param ccNumber Numéro CC (0 à 127)
   * @param value Valeur CC (0 à 127)
   * @param deviceId ID optionnel de la sortie cible (ou 'all' pour diffuser partout)
   */
  public sendControlChange(channel: number, ccNumber: number, value: number, deviceId?: string): boolean {
    const safeChannel = Math.max(1, Math.min(16, channel));
    const safeCc = Math.max(0, Math.min(127, Math.round(ccNumber)));
    const safeVal = Math.max(0, Math.min(127, Math.round(value)));
    const statusByte = 0xB0 + (safeChannel - 1);
    const bytes = [statusByte, safeCc, safeVal];

    let sent = false;
    if (this.midiAccess) {
      this.midiAccess.outputs.forEach((output: InternalMidiPort) => {
        if (!deviceId || deviceId === 'all' || output.id === deviceId) {
          if (typeof output.send === 'function') {
            try {
              output.send(bytes);
              sent = true;
            } catch (err) {
              console.warn('[MidiDeviceEngine] Erreur envoi CC:', err);
            }
          }
        }
      });
    }

    this.lastActivityText = `SORTIE MIDI : CC ${safeCc} = ${safeVal} (Canal ${safeChannel})${sent ? ' [Envoyé matériel]' : ' [Simulé virtuel]'}`;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('nocode_midi_out', {
          detail: {
            type: 'control_change',
            channel: safeChannel,
            number: safeCc,
            value: safeVal,
            bytes,
            sentToHardware: sent
          }
        })
      );
    }
    this.notify();
    return sent;
  }

  /**
   * Envoie un message Program Change (PC) sur les sorties MIDI connectées
   * Utilisé pour rappeler des scènes de consoles d'éclairage ou des presets d'effets (réverbe, delay)
   * @param channel Canal MIDI (1 à 16)
   * @param programNumber Numéro de Programme (0 à 127)
   * @param deviceId ID optionnel de la sortie cible (ou 'all')
   */
  public sendProgramChange(channel: number, programNumber: number, deviceId?: string): boolean {
    const safeChannel = Math.max(1, Math.min(16, channel));
    const safeProg = Math.max(0, Math.min(127, Math.round(programNumber)));
    const statusByte = 0xC0 + (safeChannel - 1);
    const bytes = [statusByte, safeProg];

    let sent = false;
    if (this.midiAccess) {
      this.midiAccess.outputs.forEach((output: InternalMidiPort) => {
        if (!deviceId || deviceId === 'all' || output.id === deviceId) {
          if (typeof output.send === 'function') {
            try {
              output.send(bytes);
              sent = true;
            } catch (err) {
              console.warn('[MidiDeviceEngine] Erreur envoi Program Change:', err);
            }
          }
        }
      });
    }

    this.lastActivityText = `SORTIE MIDI : Program Change #${safeProg} (Canal ${safeChannel})${sent ? ' [Envoyé matériel]' : ' [Simulé virtuel]'}`;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('nocode_midi_out', {
          detail: {
            type: 'program_change',
            channel: safeChannel,
            number: safeProg,
            bytes,
            sentToHardware: sent
          }
        })
      );
    }
    this.notify();
    return sent;
  }

  public getMappings(): MidiMappingRule[] {
    return this.mappings;
  }

  public getLearnState(): MidiLearnState {
    return this.learnState;
  }

  public getLastActivity(): string {
    return this.lastActivityText;
  }

  public isMidiSupported(): boolean {
    return this.isSupported;
  }

  // Simulation pour tests directs sans contrôleur physique branché
  public simulateMidiMessage(type: 'cc' | 'note', number: number, normalizedValue: number, channel = 1) {
    const rawVal = Math.round(normalizedValue * 127);
    this.lastActivityText = `${type.toUpperCase()} ${number} : ${rawVal} (Ch ${channel}) [Simulé]`;

    this.dispatchRawMessage({ type, number, channel, velocity: normalizedValue });

    if (this.learnState.isActive && this.learnState.targetNodeId && this.learnState.targetParamKey) {
      this.assignLearnMapping({
        channel,
        messageType: type,
        number,
        targetNodeId: this.learnState.targetNodeId,
        targetParamKey: this.learnState.targetParamKey,
        minRange: 0,
        maxRange: 1,
      });
      return;
    }

    this.applyMappings(type, number, channel, normalizedValue);
  }

  public clearAllMappings() {
    this.mappings = [];
    this.lastActivityText = 'Tous les mappings MIDI réinitialisés';
    this.notify();
  }

  public exportMappingsJson(): string {
    return JSON.stringify(this.mappings, null, 2);
  }

  public importMappingsJson(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        this.mappings = parsed;
        this.notify();
        return true;
      }
    } catch {
      // error
    }
    return false;
  }
}

export const midiDeviceEngine = new MidiDeviceEngine();
