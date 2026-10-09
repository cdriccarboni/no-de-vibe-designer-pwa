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

class MidiDeviceEngine {
  private midiAccess: InternalMidiAccess | null = null;
  private isSupported = false;
  private devices: MidiDevice[] = [];
  private mappings: MidiMappingRule[] = [];
  private learnState: MidiLearnState = { isActive: false };
  private listeners: Set<() => void> = new Set();
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
