// Moteur de Contrôle ETC Eos, Passerelles Response Nodes & Scénographie Augment3d
// No[co]de Vibe Designer — Référence Industrielle Spectacle Vivant & Pupitres Professionnels

import {
  EtcPalette,
  EtcDirectSelect,
  EtcResponseNode,
  RdmDevice,
  Augment3dEntity,
  EtcIfcbCategory,
} from '../types/etcAndNativeStage';
import { dmxLightingEngine } from './dmxLightingEngine';
import { qlabCueEngine } from './qlabCueEngine';

export interface EosCommandLineState {
  commandBuffer: string;
  history: string[];
  lastError: string | null;
  activeChannels: number[];
  pendingParameter: EtcIfcbCategory | null;
}

export class EtcEosEngine {
  private static instance: EtcEosEngine;

  private commandState: EosCommandLineState = {
    commandBuffer: '',
    history: ['Chan 1 Thru 10 At Full Enter', 'Cue 1 / 1 Go', 'Sneak 2'],
    lastError: null,
    activeChannels: [1, 2, 3],
    pendingParameter: null,
  };

  // Direct Selects officiels (Groupes, Palettes IFCB)
  private directSelects: EtcDirectSelect[] = [
    { id: 'ds-grp-1', type: 'group', number: 1, label: 'GRP 1 : Face Principale', color: '#fbbf24', active: true },
    { id: 'ds-grp-2', type: 'group', number: 2, label: 'GRP 2 : Contre & Zénith', color: '#f97316', active: false },
    { id: 'ds-grp-3', type: 'group', number: 3, label: 'GRP 3 : Cyclorama LED', color: '#06b6d4', active: false },
    { id: 'ds-grp-4', type: 'group', number: 4, label: 'GRP 4 : Lyres Mobiles', color: '#a855f7', active: false },
    { id: 'ds-cp-1', type: 'color_palette', number: 1, label: 'CP 1 : Ambre Royal (3200K)', color: '#d7b86a', active: true },
    { id: 'ds-cp-2', type: 'color_palette', number: 2, label: 'CP 2 : Nuit Caraïbes', color: '#1d4ed8', active: false },
    { id: 'ds-cp-3', type: 'color_palette', number: 3, label: 'CP 3 : Sang Pirate (Rouge)', color: '#dc2626', active: false },
    { id: 'ds-cp-4', type: 'color_palette', number: 4, label: 'CP 4 : Brume Phospho', color: '#10b981', active: false },
    { id: 'ds-fp-1', type: 'focus_palette', number: 1, label: 'FP 1 : Douche Centre Soliste', color: '#eab308', active: true },
    { id: 'ds-fp-2', type: 'focus_palette', number: 2, label: 'FP 2 : Balayage Croisé Jardin', color: '#6366f1', active: false },
    { id: 'ds-fp-3', type: 'focus_palette', number: 3, label: 'FP 3 : Lointain Rideau', color: '#ec4899', active: false },
    { id: 'ds-bp-1', type: 'beam_palette', number: 1, label: 'BP 1 : Faisceau Serré 12°', color: '#38bdf8', active: true },
    { id: 'ds-bp-2', type: 'beam_palette', number: 2, label: 'BP 2 : Wash Large 45°', color: '#22c55e', active: false },
    { id: 'ds-bp-3', type: 'beam_palette', number: 3, label: 'BP 3 : Strobe Impact 12Hz', color: '#f43f5e', active: false },
  ];

  // Palettes de paramètres IFCB
  private palettes: EtcPalette[] = [
    {
      id: 'pal-cp-1',
      number: 1,
      name: 'Ambre Royal (3200K)',
      category: 'color',
      colorHex: '#d7b86a',
      values: { red: 255, green: 170, blue: 60, white: 180 },
    },
    {
      id: 'pal-cp-2',
      number: 2,
      name: 'Nuit Caraïbes',
      category: 'color',
      colorHex: '#1d4ed8',
      values: { red: 10, green: 50, blue: 255, white: 0 },
    },
    {
      id: 'pal-fp-1',
      number: 1,
      name: 'Douche Soliste',
      category: 'focus',
      values: { pan: 0, tilt: -85 },
    },
    {
      id: 'pal-fp-2',
      number: 2,
      name: 'Croisé Jardin',
      category: 'focus',
      values: { pan: 35, tilt: -45 },
    },
    {
      id: 'pal-bp-1',
      number: 1,
      name: 'Faisceau Serré',
      category: 'beam',
      values: { iris: 40, zoom: 12, shutter: 255 },
    },
  ];

  // Passerelles réseau ETC Response Nodes
  private responseNodes: EtcResponseNode[] = [
    {
      id: 'node-etc-1',
      name: 'ETC Response 4-Port Gateway (Perche Face)',
      model: 'Response 4-Port',
      ipAddress: '10.101.50.101',
      macAddress: '00:C0:B6:45:54:01',
      firmwareVersion: 'v2.1.0.9',
      temperatureCelsius: 38.5,
      isOnline: true,
      rdmDevicesCount: 7,
      ports: [
        { portNumber: 1, direction: 'output', universe: 1, sacnPriority: 100, mergeMode: 'htp', status: 'active', packetRateFps: 44, rdmEnabled: true },
        { portNumber: 2, direction: 'output', universe: 2, sacnPriority: 100, mergeMode: 'htp', status: 'active', packetRateFps: 44, rdmEnabled: true },
        { portNumber: 3, direction: 'output', universe: 3, sacnPriority: 150, mergeMode: 'priority_only', status: 'active', packetRateFps: 44, rdmEnabled: true },
        { portNumber: 4, direction: 'input', universe: 4, sacnPriority: 100, mergeMode: 'ltp', status: 'standby', packetRateFps: 0, rdmEnabled: false },
      ],
    },
    {
      id: 'node-etc-2',
      name: 'ETC Response 2-Port DMX (Cour & Lointain)',
      model: 'Response 2-Port',
      ipAddress: '10.101.50.102',
      macAddress: '00:C0:B6:45:54:02',
      firmwareVersion: 'v2.1.0.9',
      temperatureCelsius: 36.2,
      isOnline: true,
      rdmDevicesCount: 4,
      ports: [
        { portNumber: 1, direction: 'output', universe: 1, sacnPriority: 100, mergeMode: 'htp', status: 'active', packetRateFps: 44, rdmEnabled: true },
        { portNumber: 2, direction: 'output', universe: 2, sacnPriority: 100, mergeMode: 'htp', status: 'active', packetRateFps: 44, rdmEnabled: true },
      ],
    },
  ];

  // Périphériques RDM (Remote Device Management) détectés sur le réseau
  private rdmDevices: RdmDevice[] = [
    {
      uid: '4554:010A1234',
      modelName: 'ETC Source Four LED Series 3 Lustr X8',
      manufacturer: 'Electronic Theatre Controls',
      universe: 1,
      dmxAddress: 1,
      footprint: 8,
      lampHours: 420,
      temperatureCelsius: 41.2,
      sensorAlerts: [],
      personality: 'Direct 8-Channel Lustr',
    },
    {
      uid: '4554:010A1235',
      modelName: 'ETC ColorSource Spot V Deep Blue',
      manufacturer: 'Electronic Theatre Controls',
      universe: 1,
      dmxAddress: 9,
      footprint: 5,
      lampHours: 850,
      temperatureCelsius: 39.8,
      sensorAlerts: [],
      personality: '5-Channel RGB+Lime+Indigo',
    },
    {
      uid: '4554:010A1236',
      modelName: 'High End Systems Halcyon Gold (Lyre Profile)',
      manufacturer: 'ETC / High End Systems',
      universe: 2,
      dmxAddress: 1,
      footprint: 34,
      lampHours: 190,
      temperatureCelsius: 46.5,
      sensorAlerts: [],
      personality: 'Standard 34-Ch Mode',
    },
    {
      uid: '4554:010A1237',
      modelName: 'ETC Desire Fresnel D22',
      manufacturer: 'Electronic Theatre Controls',
      universe: 1,
      dmxAddress: 14,
      footprint: 4,
      lampHours: 1120,
      temperatureCelsius: 42.0,
      sensorAlerts: [],
      personality: 'RGBW Studio Wash',
    },
  ];

  // Scénographie spatiale Augment3d (Positions 3D métriques, projecteurs & cibles de tracking)
  private augment3dEntities: Augment3dEntity[] = [
    {
      id: 'aug-fix-1',
      name: 'Source Four LED Series 3 (Cour Face)',
      type: 'fixture',
      x: 4.5,
      y: 6.5,
      z: -4.0,
      rotationX: -35,
      rotationY: 20,
      rotationZ: 0,
      targetEntityId: 'aug-target-actor-1',
      color: '#fbbf24',
    },
    {
      id: 'aug-fix-2',
      name: 'Source Four LED Series 3 (Jardin Face)',
      type: 'fixture',
      x: -4.5,
      y: 6.5,
      z: -4.0,
      rotationX: -35,
      rotationY: -20,
      rotationZ: 0,
      targetEntityId: 'aug-target-actor-1',
      color: '#fbbf24',
    },
    {
      id: 'aug-fix-3',
      name: 'Halcyon Gold Lyre (Zénith Soliste)',
      type: 'fixture',
      x: 0,
      y: 7.2,
      z: 0,
      rotationX: -85,
      rotationY: 0,
      rotationZ: 0,
      targetEntityId: 'aug-target-actor-1',
      color: '#d7b86a',
    },
    {
      id: 'aug-target-actor-1',
      name: 'Acteur : Maxime (Capitaine Pirate)',
      type: 'actor',
      x: 0.2,
      y: 0.0,
      z: 0.5,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      color: '#e11d48',
    },
    {
      id: 'aug-target-prop-1',
      name: 'Élément Décors : Gouvernail & Mât',
      type: 'scenic_prop',
      x: 0,
      y: 0,
      z: 4.0,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      color: '#854d0e',
    },
  ];

  // Paramètres d'encodeurs actifs (IFCB)
  private activeIfcbValues: Record<EtcIfcbCategory, Record<string, number>> = {
    intensity: { level: 255 },
    focus: { pan: 0, tilt: -60 },
    color: { red: 255, green: 180, blue: 60, white: 150, colorTempK: 3200 },
    beam: { zoom: 25, iris: 100, strobe: 0, edgeSoftness: 20 },
  };

  private listeners: (() => void)[] = [];

  private constructor() {}

  public static getInstance(): EtcEosEngine {
    if (!EtcEosEngine.instance) {
      EtcEosEngine.instance = new EtcEosEngine();
    }
    return EtcEosEngine.instance;
  }

  // =========================================================================
  // GESTION DE LA LIGNE DE COMMANDE EOS (Command Line Syntax)
  // =========================================================================

  public getCommandState(): EosCommandLineState {
    return { ...this.commandState };
  }

  public appendKey(key: string) {
    if (key === 'CLEAR') {
      this.commandState.commandBuffer = '';
      this.commandState.lastError = null;
    } else if (key === 'BACKSPACE') {
      this.commandState.commandBuffer = this.commandState.commandBuffer.trimEnd();
      const tokens = this.commandState.commandBuffer.split(' ');
      tokens.pop();
      this.commandState.commandBuffer = tokens.join(' ');
    } else if (key === 'ENTER') {
      this.executeCommandLine();
    } else {
      // Ajout du token avec espacement propre
      if (this.commandState.commandBuffer.length > 0 && !this.commandState.commandBuffer.endsWith(' ')) {
        this.commandState.commandBuffer += ' ' + key;
      } else {
        this.commandState.commandBuffer += key;
      }
    }
    this.notify();
  }

  public setCommandLine(cmd: string) {
    this.commandState.commandBuffer = cmd;
    this.notify();
  }

  public executeCommandLine(): boolean {
    const rawCmd = this.commandState.commandBuffer.trim();
    if (!rawCmd) return false;

    this.commandState.history.unshift(rawCmd);
    if (this.commandState.history.length > 20) {
      this.commandState.history.pop();
    }

    try {
      const parsed = this.parseEosCommand(rawCmd);
      if (parsed.success) {
        this.commandState.commandBuffer = '';
        this.commandState.lastError = null;
        this.notify();
        return true;
      } else {
        this.commandState.lastError = parsed.error || 'Erreur syntaxe Eos';
        this.notify();
        return false;
      }
    } catch (e: any) {
      this.commandState.lastError = e?.message || 'Erreur exécution Eos';
      this.notify();
      return false;
    }
  }

  private parseEosCommand(cmd: string): { success: boolean; error?: string } {
    const lower = cmd.toLowerCase();

    // Envoi asynchrone à la passerelle serveur /api/etc/cmd
    if (typeof fetch !== 'undefined') {
      fetch('/api/etc/cmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd }),
      }).catch(() => {});
    }

    // 1. Commande CUE : "Cue 1 / 5 Go" ou "Cue 2 Fire" ou "Go"
    if (lower.startsWith('cue') || lower === 'go') {
      if (lower === 'go') {
        dmxLightingEngine.fireNextCue();
        qlabCueEngine.fireGo();
        return { success: true };
      }
      // Extraction numéro de cue
      const cueMatch = cmd.match(/cue\s+([\d\.\/]+)/i);
      if (cueMatch) {
        const cueRef = cueMatch[1];
        // Chercher dans dmxLightingEngine
        const cues = dmxLightingEngine.getCues();
        const found = cues.find((c) => c.name.includes(cueRef) || c.id.includes(cueRef));
        if (found) {
          dmxLightingEngine.fireLightCue(found.id);
        } else if (cues.length > 0) {
          dmxLightingEngine.fireLightCue(cues[0].id);
        }
        // Avancer également QLab pour synchro scène
        qlabCueEngine.fireGo();
      }
      return { success: true };
    }

    // 2. Commande SNEAK : "Sneak" ou "Chan 1 Sneak 3"
    if (lower.includes('sneak')) {
      const fixtures = dmxLightingEngine.getFixtures();
      for (const f of fixtures) {
        dmxLightingEngine.updateFixtureChannel(f.id, 0, 0);
      }
      return { success: true };
    }

    // 3. Commande HIGHLIGHT / REM DIM
    if (lower.includes('rem dim')) {
      const activeChans = new Set(this.commandState.activeChannels);
      const fixtures = dmxLightingEngine.getFixtures();
      for (const f of fixtures) {
        if (!activeChans.has(f.startChannel)) {
          dmxLightingEngine.updateFixtureChannel(f.id, 0, 0);
        }
      }
      return { success: true };
    }

    if (lower.includes('highlight')) {
      const fixtures = dmxLightingEngine.getFixtures();
      for (const f of fixtures) {
        if (this.commandState.activeChannels.includes(f.startChannel)) {
          dmxLightingEngine.updateFixtureChannel(f.id, 0, 255);
        }
      }
      return { success: true };
    }

    // 4. Commande BLACKOUT / OUT / FULL
    if (lower === 'blackout' || lower === 'out') {
      dmxLightingEngine.setGrandMaster(0);
      return { success: true };
    }

    if (lower === 'full') {
      dmxLightingEngine.setGrandMaster(255);
      for (const ch of this.commandState.activeChannels) {
        dmxLightingEngine.setChannel(1, ch, 255);
      }
      return { success: true };
    }

    // 5. Commande RECORD CUE : "Record Cue 10"
    const recMatch = cmd.match(/record\s+cue\s+([\d\.\/]+)/i);
    if (recMatch) {
      const cueNum = recMatch[1];
      dmxLightingEngine.createLightCueFromLive(`Q-${cueNum}`, `Enregistré via console ETC Eos (${cmd})`, 2.0, 2.0);
      return { success: true };
    }

    // 6. Commande CANAL : "Chan 1 Thru 4 At Full" ou "Chan 3 At 50"
    const chanMatch = cmd.match(/chan\s+(\d+)(?:\s+thru\s+(\d+))?(?:\s+at\s+(\d+|full|out))?/i);
    if (chanMatch) {
      const startCh = parseInt(chanMatch[1], 10);
      const endCh = chanMatch[2] ? parseInt(chanMatch[2], 10) : startCh;
      const atValStr = chanMatch[3] ? chanMatch[3].toLowerCase() : null;

      const channels: number[] = [];
      for (let c = startCh; c <= endCh; c++) {
        channels.push(c);
      }
      this.commandState.activeChannels = channels;

      if (atValStr) {
        let val = 0;
        if (atValStr === 'full') val = 255;
        else if (atValStr === 'out') val = 0;
        else {
          const pct = parseInt(atValStr, 10);
          val = Math.round((pct / 100) * 255);
        }

        // Appliquer sur les canaux réels du dmxLightingEngine et les projecteurs
        for (const ch of channels) {
          dmxLightingEngine.setChannel(1, ch, val);
          const fixtures = dmxLightingEngine.getFixtures();
          for (const f of fixtures) {
            if (f.universe === 1 && ch >= f.startChannel && ch < f.startChannel + f.channelCount) {
              dmxLightingEngine.updateFixtureChannel(f.id, ch - f.startChannel, val);
            }
          }
        }
      }

      return { success: true };
    }

    // 7. Commande GROUP : "Group 1 At Full"
    const grpMatch = cmd.match(/group\s+(\d+)(?:\s+at\s+(\d+|full|out))?/i);
    if (grpMatch) {
      const grpNum = parseInt(grpMatch[1], 10);
      const atValStr = grpMatch[2] ? grpMatch[2].toLowerCase() : null;
      this.activateDirectSelect(`ds-grp-${grpNum}`);
      if (atValStr) {
        let val = atValStr === 'full' ? 255 : atValStr === 'out' ? 0 : Math.round((parseInt(atValStr, 10) / 100) * 255);
        dmxLightingEngine.setChannel(1, grpNum, val);
      }
      return { success: true };
    }

    return { success: false, error: 'Commande non reconnue (ex: Chan 1 Thru 4 At Full Enter)' };
  }

  // =========================================================================
  // PARAMÈTRES IFCB & PALETTES
  // =========================================================================

  public getPalettes(): EtcPalette[] {
    return this.palettes;
  }

  public getDirectSelects(): EtcDirectSelect[] {
    return this.directSelects;
  }

  public activateDirectSelect(dsId: string) {
    const ds = this.directSelects.find((d) => d.id === dsId);
    if (!ds) return;

    for (const item of this.directSelects) {
      if (item.type === ds.type) {
        item.active = item.id === dsId;
      }
    }

    // Appliquer l'effet de palette au moteur DMX
    if (ds.type === 'color_palette') {
      const pal = this.palettes.find((p) => p.category === 'color' && p.number === ds.number);
      if (pal) {
        const fixtures = dmxLightingEngine.getFixtures();
        for (const f of fixtures) {
          if (f.type === 'rgbw_par' || f.type === 'rgb_par' || f.type === 'moving_head') {
            dmxLightingEngine.updateFixtureChannel(f.id, 0, pal.values.red ?? 255);
            dmxLightingEngine.updateFixtureChannel(f.id, 1, pal.values.green ?? 180);
            dmxLightingEngine.updateFixtureChannel(f.id, 2, pal.values.blue ?? 60);
          }
        }
      }
    } else if (ds.type === 'focus_palette') {
      const pal = this.palettes.find((p) => p.category === 'focus' && p.number === ds.number);
      if (pal) {
        const fixtures = dmxLightingEngine.getFixtures();
        for (const f of fixtures) {
          if (f.type === 'moving_head') {
            dmxLightingEngine.updateFixturePosition(f.id, {
              ...f.stagePosition,
              panAngle: pal.values.pan ?? 0,
              tiltAngle: pal.values.tilt ?? -60,
            });
          }
        }
      }
    }

    this.notify();
  }

  public getIfcbValue(category: EtcIfcbCategory, param: string): number {
    return this.activeIfcbValues[category]?.[param] ?? 0;
  }

  public setIfcbParam(category: EtcIfcbCategory, param: string, value: number) {
    if (!this.activeIfcbValues[category]) {
      this.activeIfcbValues[category] = {};
    }
    this.activeIfcbValues[category][param] = value;

    // Répercussion sur le plateau DMX
    if (category === 'color') {
      const fixtures = dmxLightingEngine.getFixtures();
      for (const f of fixtures) {
        if (f.type === 'rgbw_par' || f.type === 'rgb_par') {
          if (param === 'red') dmxLightingEngine.updateFixtureChannel(f.id, 0, value);
          if (param === 'green') dmxLightingEngine.updateFixtureChannel(f.id, 1, value);
          if (param === 'blue') dmxLightingEngine.updateFixtureChannel(f.id, 2, value);
          if (param === 'white' && f.type === 'rgbw_par') dmxLightingEngine.updateFixtureChannel(f.id, 3, value);
        }
      }
    } else if (category === 'focus') {
      const fixtures = dmxLightingEngine.getFixtures();
      for (const f of fixtures) {
        if (f.type === 'moving_head') {
          if (param === 'pan') {
            dmxLightingEngine.updateFixturePosition(f.id, { ...f.stagePosition, panAngle: value });
          }
          if (param === 'tilt') {
            dmxLightingEngine.updateFixturePosition(f.id, { ...f.stagePosition, tiltAngle: value });
          }
        }
      }
    } else if (category === 'intensity') {
      if (param === 'level') {
        dmxLightingEngine.setGrandMaster(value);
      }
    }

    this.notify();
  }

  // =========================================================================
  // GESTION DES PASSERELLES ETC RESPONSE NODES & RDM
  // =========================================================================

  public getResponseNodes(): EtcResponseNode[] {
    return this.responseNodes;
  }

  public getRdmDevices(): RdmDevice[] {
    return this.rdmDevices;
  }

  public setPortPriority(nodeId: string, portNumber: number, priority: number) {
    const node = this.responseNodes.find((n) => n.id === nodeId);
    if (!node) return;
    const port = node.ports.find((p) => p.portNumber === portNumber);
    if (port) {
      port.sacnPriority = Math.max(1, Math.min(200, priority));
      this.notify();
    }
  }

  public setPortUniverse(nodeId: string, portNumber: number, universe: number) {
    const node = this.responseNodes.find((n) => n.id === nodeId);
    if (!node) return;
    const port = node.ports.find((p) => p.portNumber === portNumber);
    if (port) {
      port.universe = Math.max(1, Math.min(63999, universe));
      this.notify();
    }
  }

  public setPortMergeMode(nodeId: string, portNumber: number, mode: 'htp' | 'ltp' | 'priority_only') {
    const node = this.responseNodes.find((n) => n.id === nodeId);
    if (!node) return;
    const port = node.ports.find((p) => p.portNumber === portNumber);
    if (port) {
      port.mergeMode = mode;
      this.notify();
    }
  }

  public togglePortRdm(nodeId: string, portNumber: number) {
    const node = this.responseNodes.find((n) => n.id === nodeId);
    if (!node) return;
    const port = node.ports.find((p) => p.portNumber === portNumber);
    if (port) {
      port.rdmEnabled = !port.rdmEnabled;
      this.notify();
    }
  }

  // =========================================================================
  // AUGMENT3D : SCÉNOGRAPHIE SPATIALE & TRACKING 3D
  // =========================================================================

  public getAugment3dEntities(): Augment3dEntity[] {
    return this.augment3dEntities;
  }

  public updateActorPosition(actorId: string, x: number, z: number) {
    const actor = this.augment3dEntities.find((e) => e.id === actorId);
    if (actor) {
      actor.x = x;
      actor.z = z;

      // Calcul automatique des angles Pan & Tilt pour les lyres orientées vers cet acteur
      for (const ent of this.augment3dEntities) {
        if (ent.type === 'fixture' && ent.targetEntityId === actorId) {
          const dx = actor.x - ent.x;
          const dz = actor.z - ent.z;
          const dy = actor.y - ent.y; // négatif car perche en hauteur

          // Angle Pan (azimut)
          const pan = Math.atan2(dx, dz) * (180 / Math.PI);
          // Angle Tilt (élévation par rapport à la verticale)
          const distHorizontal = Math.sqrt(dx * dx + dz * dz);
          const tilt = Math.atan2(dy, distHorizontal) * (180 / Math.PI);

          ent.rotationY = Math.round(pan);
          ent.rotationX = Math.round(tilt);

          // Répercuter sur la lyre DMX
          const fixture = dmxLightingEngine.getFixtures().find((f) => f.type === 'moving_head');
          if (fixture) {
            dmxLightingEngine.updateFixturePosition(fixture.id, {
              ...fixture.stagePosition,
              panAngle: Math.round(pan),
              tiltAngle: Math.round(tilt),
            });
          }
        }
      }

      this.notify();
    }
  }

  // =========================================================================
  // SOUSCRIPTION AUX CHANGEMENTS D'ÉTAT
  // =========================================================================

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const l of this.listeners) {
      try {
        l();
      } catch {
        // ignore
      }
    }
  }
}

export const etcEosEngine = EtcEosEngine.getInstance();
