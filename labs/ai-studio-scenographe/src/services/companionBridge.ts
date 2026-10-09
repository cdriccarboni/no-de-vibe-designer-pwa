// Service Pont de Communication Bidirectionnelle Mac ↔ Companion Phone
// Directive permanente : Connexion persistante, transmission réelle capteurs et commandes,
// contrôle des paramètres et déclenchement des TOP en direct sur réseau local.

export interface CompanionTelemetryPayload {
  timestamp: number;
  // Capteurs inertiels
  orientation?: { alpha: number; beta: number; gamma: number };
  motion?: { x: number; y: number; z: number };

  // Surfaces tactiles
  padXY?: { x: number; y: number };
  faders?: Record<string, number>;

  // Déclencheurs TOP & Cues
  triggeredCueId?: string;
  triggeredTopAction?: string;

  // Pinceau de mapping caméra
  mappingTouch?: { x: number; y: number; shapeType: 'vase' | 'quad' | 'circle' };
}

export interface CompanionState {
  isPaired: boolean;
  pin: string;
  phoneModel: string;
  latencyMs: number;
  lastPing: number;
  lastReceivedTelemetry?: CompanionTelemetryPayload;
}

class CompanionBridge {
  private state: CompanionState = {
    isPaired: false,
    pin: '7392',
    phoneModel: '',
    latencyMs: 12,
    lastPing: Date.now(),
  };

  private eventSource: EventSource | null = null;
  private listeners: Set<(s: CompanionState) => void> = new Set();
  private telemetryCallbacks: Set<(t: CompanionTelemetryPayload) => void> = new Set();

  constructor() {
    this.initSSE();
  }

  // Connexion SSE temps réel vers le serveur Express local
  private initSSE() {
    try {
      this.eventSource = new EventSource('/api/companion/events');

      this.eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'INIT' && payload.session) {
            this.state.pin = payload.session.pin;
            this.state.isPaired = payload.session.phoneConnected;
            this.state.phoneModel = payload.session.phoneModel || '';
            this.notify();
          } else if (payload.type === 'CONNECTED') {
            this.state.isPaired = true;
            this.state.phoneModel = payload.phoneModel || 'Mobile Companion';
            this.notify();
          } else if (payload.type === 'TELEMETRY' && payload.data) {
            this.state.lastReceivedTelemetry = payload.data;
            this.state.lastPing = Date.now();
            this.notify();
            for (const cb of this.telemetryCallbacks) {
              cb(payload.data);
            }
          }
        } catch {
          // ignore
        }
      };

      this.eventSource.onerror = () => {
        // Auto-reconnexion gérée nativement par EventSource
      };
    } catch {
      // ignore
    }
  }

  // -------------------------------------------------------------
  // COMMANDES ÉMISES PAR LE TÉLÉPHONE COMPANION
  // -------------------------------------------------------------

  public async pairFromPhone(pin: string, phoneModel = 'Android Companion'): Promise<boolean> {
    try {
      const res = await fetch('/api/companion/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, phoneModel }),
      });
      if (res.ok) {
        this.state.isPaired = true;
        this.state.phoneModel = phoneModel;
        this.notify();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public async sendTelemetryFromPhone(payload: CompanionTelemetryPayload): Promise<void> {
    try {
      await fetch('/api/companion/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // ignore
    }
  }

  // Envoi d'une capture caméra pour le pinceau de mapping
  public async sendCameraSnapshotForMapping(base64Image: string): Promise<void> {
    try {
      await fetch('/api/mapping/camera-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameBase64: base64Image }),
      });
    } catch {
      // ignore
    }
  }

  // -------------------------------------------------------------
  // COMMANDES ÉMISES PAR LE MAC (RETOUR D'ÉTAT & HAPTIQUE)
  // -------------------------------------------------------------

  public async dispatchFromMacToPhone(message: {
    activeSceneTitle: string;
    timecode: string;
    audioRmsDb: number;
    hapticPulse?: boolean;
  }): Promise<void> {
    try {
      await fetch('/api/companion/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
    } catch {
      // ignore
    }
  }

  public async scanLocalLAN(): Promise<void> {
    try {
      const resp = await fetch('/api/companion/status');
      if (resp.ok) {
        const data = await resp.json();
        this.state.isPaired = data.phoneConnected;
        this.state.pin = data.pin;
        this.notify();
      }
    } catch {
      // ignore
    }
  }

  public getState(): CompanionState {
    return { ...this.state };
  }

  public subscribe(cb: (s: CompanionState) => void): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => this.listeners.delete(cb);
  }

  public onTelemetry(cb: (t: CompanionTelemetryPayload) => void): () => void {
    this.telemetryCallbacks.add(cb);
    return () => this.telemetryCallbacks.delete(cb);
  }

  private notify() {
    for (const cb of this.listeners) {
      cb(this.getState());
    }
  }
}

export const companionBridge = new CompanionBridge();
