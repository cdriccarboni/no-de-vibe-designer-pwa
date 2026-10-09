export type EngineId = 
  // Phase A: Web & Visual Engines
  | 'javascript' 
  | 'typescript'
  | 'p5js' 
  | 'glsl' 
  | 'hybrid-p5-glsl'
  | 'isf'
  | 'pyodide' 
  | 'webgpu'
  // Phase B: Audio DSP (Upcoming)
  | 'faust' 
  | 'webchuck'
  | 'puredata'
  // Phase C: Native / WASM (Upcoming)
  | 'wasm-cpp'
  // Phase D: Graph Engines (Upcoming)
  | 'cablesgl'
  | 'litegraph'
  // Phase E: Gateways (Upcoming)
  | 'touchdesigner-bridge';

export type EngineCategory = 'web-visual' | 'audio-dsp' | 'compute' | 'graph-nodes' | 'bridge';

export type EngineStatus = 'functional' | 'partial' | 'hardware-dependent' | 'experimental' | 'planned';

export interface CodePreset {
  id: string;
  title: string;
  description: string;
  code: string;
  secondaryCode?: string; // For hybrid pipelines or dual code
  secondaryTitle?: string;
  defaultUniforms?: Record<string, number>;
  isfInputs?: Record<string, unknown>;
}

export interface EngineBenchmark {
  initTimeMs: number;
  execTimeMs: number;
  memoryMb?: number;
  fps: number;
  lastRunTimestamp?: string;
}

export interface ReproducibleTestResult {
  passed: boolean;
  message: string;
  durationMs: number;
  timestamp: string;
}

export interface EngineAdapter {
  id: EngineId;
  name: string;
  shortName: string;
  phase: 'Phase A' | 'Phase B' | 'Phase C' | 'Phase D' | 'Phase E';
  category: EngineCategory;
  version: string;
  status: EngineStatus;
  statusBadge: string;
  license: string;
  description: string;
  utilityForNocode: string;
  inputs: { name: string; type: string; description: string }[];
  outputs: { name: string; type: string; description: string }[];
  limits: string[];
  presets: CodePreset[];
  benchmark: EngineBenchmark;
  runReproducibleTest?: () => Promise<ReproducibleTestResult>;
}

export type EngineSpec = EngineAdapter;

export interface ConsoleLog {
  id: string;
  type: 'info' | 'warn' | 'error' | 'system';
  message: string;
  lineNumber?: number;
  timestamp: string;
  source?: string;
}

export interface ExecutionStats {
  fps: number;
  frameTimeMs: number;
  frameCount: number;
  renderStatus: 'running' | 'paused' | 'error' | 'idle' | 'stopped';
  gpuRenderer?: string;
}

export interface SavedExperiment {
  id: string;
  engineId: EngineId;
  title: string;
  savedAt: string;
  code: string;
  secondaryCode?: string;
  uniforms: Record<string, number>;
}
