export type InteropSoftwareId =
  | 'touchdesigner'
  | 'maxmsp'
  | 'puredata'
  | 'supercollider'
  | 'millumin'
  | 'chataigne';

export type TransportProtocol = 'osc-udp' | 'websocket' | 'tcp' | 'webrtc' | 'shared-memory';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface OSCMessage {
  id: string;
  address: string;
  args: Array<number | string | boolean>;
  timestamp: number;
  direction: 'out' | 'in';
  targetSoftware: InteropSoftwareId;
  acknowledged?: boolean;
  ackTimestamp?: number;
  rttMs?: number;
}

export type ValidationStatus =
  | 'tested_local_loopback' // Validé et testé en boucle locale bidirectionnelle (ACK vérifié)
  | 'simulated_external'    // Schéma & script validés, simulé en boucle d'attente d'instance externe
  | 'pending_hardware';     // Spécification formelle prête, en attente de machine physique de régie

export interface InteropSoftwareSpec {
  id: InteropSoftwareId;
  name: string;
  category: 'Visuel temps réel' | 'Audio & Synthèse' | 'Régie Vidéo' | 'Orchestration & Contrôle';
  defaultPortIn: number;
  defaultPortOut: number;
  protocols: TransportProtocol[];
  twoWaySupported: boolean;
  ackSupported: boolean;
  validationStatus: ValidationStatus;
  validationDetails: string;
  hardwareTestScope: string;
  summary: string;
  architectureDetails: string;
  offlineReady: boolean;
  aiSeparationPolicy: string;
  exampleFiles: {
    filename: string;
    description: string;
    content: string;
    mimeType: string;
  }[];
}

export interface BridgeTelemetry {
  status: ConnectionStatus;
  mode: 'real-websocket' | 'local-loopback';
  wsUrl: string;
  packetsSent: number;
  packetsReceived: number;
  packetsAcked: number;
  packetsDropped: number;
  lastRttMs: number;
  averageRttMs: number;
  jitterMs: number;
  activeTarget: InteropSoftwareId;
}
