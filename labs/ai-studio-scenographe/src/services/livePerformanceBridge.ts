import {
  InteropSoftwareId,
  OSCMessage,
  BridgeTelemetry,
  ConnectionStatus
} from '../types/interop';
import { INTEROP_SOFTWARE_SPECS } from './interopSpecs';

export class LivePerformanceBridge {
  private status: ConnectionStatus = 'disconnected';
  private mode: 'real-websocket' | 'local-loopback' = 'local-loopback';
  private wsUrl: string = 'ws://127.0.0.1:9000';
  private ws: WebSocket | null = null;
  private activeTarget: InteropSoftwareId = 'touchdesigner';

  private pendingAcks: Map<string, { msg: OSCMessage; sentAt: number }> = new Map();
  private packetHistory: OSCMessage[] = [];

  private packetsSent = 0;
  private packetsReceived = 0;
  private packetsAcked = 0;
  private packetsDropped = 0;
  private rttHistory: number[] = [];

  private listeners: Array<(telemetry: BridgeTelemetry, history: OSCMessage[]) => void> = [];
  private simulateDropRate: number = 0; // 0 to 1

  constructor() {
    // Start by default in local loopback verified mode
    this.status = 'connected';
  }

  public setMode(mode: 'real-websocket' | 'local-loopback', url?: string) {
    this.mode = mode;
    if (url) this.wsUrl = url;

    if (this.mode === 'real-websocket') {
      this.connectWebSocket();
    } else {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      this.status = 'connected';
      this.notifyListeners();
    }
  }

  public setActiveTarget(target: InteropSoftwareId) {
    this.activeTarget = target;
    this.notifyListeners();
  }

  public setSimulateDropRate(rate: number) {
    this.simulateDropRate = Math.max(0, Math.min(1, rate));
  }

  public connectWebSocket() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }

    this.status = 'connecting';
    this.notifyListeners();

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.status = 'connected';
        this.notifyListeners();
      };

      this.ws.onmessage = (event) => {
        this.packetsReceived++;
        try {
          const data = JSON.parse(event.data);
          this.handleInboundPacket(data);
        } catch {
          // Non-JSON or binary OSC packet
        }
      };

      this.ws.onerror = () => {
        this.status = 'error';
        this.notifyListeners();
      };

      this.ws.onclose = () => {
        this.status = 'disconnected';
        this.notifyListeners();
      };
    } catch (err) {
      this.status = 'error';
      this.notifyListeners();
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'disconnected';
    this.notifyListeners();
  }

  /**
   * Envoi d'un message OSC.
   * RÈGLE ABSOLUE : Le message est enregistré comme NON acquitté.
   * Il n'est JAMAIS considéré comme reçu avant le retour effectif d'un paquet ACK.
   */
  public sendOSC(address: string, args: Array<number | string | boolean>): string {
    const id = `osc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = performance.now();

    const oscMsg: OSCMessage = {
      id,
      address,
      args,
      timestamp: Date.now(),
      direction: 'out',
      targetSoftware: this.activeTarget,
      acknowledged: false,
    };

    this.packetsSent++;
    this.pendingAcks.set(id, { msg: oscMsg, sentAt: now });
    this.packetHistory.unshift(oscMsg);
    if (this.packetHistory.length > 100) this.packetHistory.pop();

    // Envoi réel via WebSocket si connecté
    if (this.mode === 'real-websocket' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(oscMsg));
    } else if (this.mode === 'local-loopback') {
      // Simulation matériel local avec latence réaliste et gestion des pertes
      this.simulateHardwareLoopback(oscMsg, now);
    }

    // Watchdog de déconnexion / non-réception (Timeout 1500ms)
    setTimeout(() => {
      const pending = this.pendingAcks.get(id);
      if (pending && !pending.msg.acknowledged) {
        this.packetsDropped++;
        this.pendingAcks.delete(id);
        this.notifyListeners();
      }
    }, 1500);

    this.notifyListeners();
    return id;
  }

  private simulateHardwareLoopback(msg: OSCMessage, sentAt: number) {
    // Si simulation de perte de paquet active
    if (this.simulateDropRate > 0 && Math.random() < this.simulateDropRate) {
      return; // Paquet perdu sur le réseau local !
    }

    // Latence locale réaliste : boucle locale 1.2ms à 4.8ms + léger jitter
    const simulatedLatencyMs = 1.2 + Math.random() * 3.5;

    setTimeout(() => {
      // Réponse du logiciel cible
      let ackAddress = '/td/status';
      let ackArgs: Array<number | string | boolean> = [60.0, 1920, 1080, msg.id];

      if (this.activeTarget === 'maxmsp') {
        ackAddress = '/max/ack';
        const freqVal = typeof msg.args[0] === 'number' ? msg.args[0] : 440;
        ackArgs = [freqVal, 0.28, msg.id];
      } else if (this.activeTarget === 'puredata') {
        ackAddress = '/pd/ack';
        ackArgs = ['dsp_active', msg.args[0] || 440, msg.id];
      } else if (this.activeTarget === 'supercollider') {
        ackAddress = '/sc/ack';
        ackArgs = ['synth_active', msg.args[0] || 220, msg.id];
      } else if (this.activeTarget === 'millumin') {
        ackAddress = '/millumin/selectedCue';
        ackArgs = [msg.args[0] || 'Cue 1', msg.id];
      } else if (this.activeTarget === 'chataigne') {
        ackAddress = '/chataigne/ack';
        ackArgs = ['dmx_sent', msg.id];
      }

      const inboundPacket: OSCMessage = {
        id: `ack-${Date.now()}`,
        address: ackAddress,
        args: ackArgs,
        timestamp: Date.now(),
        direction: 'in',
        targetSoftware: this.activeTarget,
        acknowledged: true,
      };

      this.packetsReceived++;
      this.handleInboundPacket(inboundPacket, msg.id, sentAt);
    }, simulatedLatencyMs);
  }

  private handleInboundPacket(data: Partial<OSCMessage>, matchedId?: string, sentAtTime?: number) {
    const now = performance.now();
    // Recherche si ce paquet acquitte un message sortant
    const ackTargetId = matchedId || (Array.isArray(data.args) ? String(data.args[data.args.length - 1]) : '');

    if (ackTargetId && this.pendingAcks.has(ackTargetId)) {
      const { msg, sentAt } = this.pendingAcks.get(ackTargetId)!;
      const rtt = parseFloat((now - (sentAtTime || sentAt)).toFixed(2));

      msg.acknowledged = true;
      msg.ackTimestamp = Date.now();
      msg.rttMs = rtt;

      this.packetsAcked++;
      this.rttHistory.push(rtt);
      if (this.rttHistory.length > 50) this.rttHistory.shift();
      this.pendingAcks.delete(ackTargetId);
    }

    if (data.address) {
      const inboundRecord: OSCMessage = {
        id: data.id || `in-${Date.now()}`,
        address: data.address,
        args: data.args || [],
        timestamp: Date.now(),
        direction: 'in',
        targetSoftware: this.activeTarget,
        acknowledged: true,
      };
      this.packetHistory.unshift(inboundRecord);
      if (this.packetHistory.length > 100) this.packetHistory.pop();
    }

    this.notifyListeners();
  }

  public getTelemetry(): BridgeTelemetry {
    const avgRtt =
      this.rttHistory.length > 0
        ? parseFloat((this.rttHistory.reduce((a, b) => a + b, 0) / this.rttHistory.length).toFixed(2))
        : 0;

    // Calcul de la gigue (écart-type RTT)
    const jitter =
      this.rttHistory.length > 1
        ? parseFloat(
            Math.sqrt(
              this.rttHistory.map((x) => Math.pow(x - avgRtt, 2)).reduce((a, b) => a + b) /
                this.rttHistory.length
            ).toFixed(2)
          )
        : 0;

    return {
      status: this.status,
      mode: this.mode,
      wsUrl: this.wsUrl,
      packetsSent: this.packetsSent,
      packetsReceived: this.packetsReceived,
      packetsAcked: this.packetsAcked,
      packetsDropped: this.packetsDropped,
      lastRttMs: this.rttHistory.length > 0 ? this.rttHistory[this.rttHistory.length - 1] : 0,
      averageRttMs: avgRtt,
      jitterMs: jitter,
      activeTarget: this.activeTarget,
    };
  }

  public getHistory(): OSCMessage[] {
    return [...this.packetHistory];
  }

  public subscribe(fn: (telemetry: BridgeTelemetry, history: OSCMessage[]) => void) {
    this.listeners.push(fn);
    fn(this.getTelemetry(), this.getHistory());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notifyListeners() {
    const t = this.getTelemetry();
    const h = this.getHistory();
    for (const l of this.listeners) {
      l(t, h);
    }
  }
}

export const liveBridge = new LivePerformanceBridge();
