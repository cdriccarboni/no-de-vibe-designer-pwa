import React, { useState } from 'react';
import { EngineId, ConsoleLog, EngineAdapter } from '../types/engine';
import { ENGINE_ADAPTERS, transpileTypeScript, parseISF } from '../services/adapters';
import { CodeEditor } from './CodeEditor';
import { ConsolePanel } from './ConsolePanel';
import { ParametersPanel } from './ParametersPanel';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  Cpu,
  Layers,
  FileCode,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface TechnicalLabViewProps {
  currentEngineId: EngineId;
  onSelectEngine: (id: EngineId) => void;
  onReturnToStudio: () => void;
  code: string;
  onCodeChange: (code: string) => void;
  secondaryCode?: string;
  onSecondaryCodeChange?: (code: string) => void;
  uniforms: Record<string, number>;
  onUniformChange: (name: string, val: number) => void;
  onResetUniforms: () => void;
  onRun: () => void;
  onResetCode: () => void;
  logs: ConsoleLog[];
  onClearLogs: () => void;
  renderSurface: React.ReactNode;
  fps: number;
}

export const TechnicalLabView: React.FC<TechnicalLabViewProps> = ({
  currentEngineId,
  onSelectEngine,
  onReturnToStudio,
  code,
  onCodeChange,
  secondaryCode,
  onSecondaryCodeChange,
  uniforms,
  onUniformChange,
  onResetUniforms,
  onRun,
  onResetCode,
  logs,
  onClearLogs,
  renderSurface,
  fps,
}) => {
  const currentAdapter = ENGINE_ADAPTERS.find((a) => a.id === currentEngineId) || ENGINE_ADAPTERS[0];
  const [activeTab, setActiveTab] = useState<'primary' | 'secondary'>('primary');
  const [testResult, setTestResult] = useState<{ passed: boolean; message: string; durationMs: number } | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);

  // Run reproducible test for current engine
  const handleRunSelfTest = async () => {
    if (!currentAdapter.runReproducibleTest) return;
    setIsRunningTest(true);
    setTestResult(null);
    try {
      const res = await currentAdapter.runReproducibleTest();
      setTestResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({
        passed: false,
        message: `Erreur inattendue du test : ${msg}`,
        durationMs: 0,
      });
    } finally {
      setIsRunningTest(false);
    }
  };

  // Inspect ISF inputs if current engine is ISF
  const parsedISF = currentEngineId === 'isf' ? parseISF(code) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-53px)] bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Top Engineering Toolbar */}
      <div className="flex items-center justify-between gap-4 px-6 py-2.5 bg-zinc-900 border-b border-zinc-800 text-xs select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={onReturnToStudio}
            className="flex items-center gap-1.5 px-3 py-1 font-semibold text-zinc-950 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour à l'Atelier Artiste</span>
          </button>

          <span className="text-zinc-600">·</span>
          <span className="text-zinc-300 font-semibold text-sm">Mode Ingénierie & Validation</span>
          <span className="text-zinc-600">·</span>

          {/* Engine Selector Dropdown */}
          <select
            value={currentEngineId}
            onChange={(e) => onSelectEngine(e.target.value as EngineId)}
            className="bg-zinc-950 text-cyan-400 font-mono border border-zinc-700 rounded px-2.5 py-1 text-xs focus:outline-none cursor-pointer"
          >
            <optgroup label="Phase A : Langages Web & Visuels (Opérationnels)">
              <option value="javascript">JavaScript (Canvas 2D)</option>
              <option value="typescript">TypeScript (In-Browser Transpiler)</option>
              <option value="p5js">p5.js (Processing)</option>
              <option value="glsl">GLSL / WebGL (Fragment Shaders)</option>
              <option value="hybrid-p5-glsl">Pipeline Hybride (p5 ➔ GLSL)</option>
              <option value="isf">ISF (Interactive Shader Format)</option>
              <option value="pyodide">Python (Pyodide WebAssembly)</option>
              <option value="webgpu">WebGPU (WGSL Shaders)</option>
            </optgroup>
            <optgroup label="Phases Suivantes (Feuille de Route & Spécifications)">
              <option value="faust">Phase B : Faust DSP</option>
              <option value="webchuck">Phase B : WebChucK</option>
              <option value="puredata">Phase B : Pure Data</option>
              <option value="wasm-cpp">Phase C : C++/Rust WebAssembly</option>
              <option value="cablesgl">Phase D : cables.gl</option>
              <option value="litegraph">Phase D : LiteGraph.js</option>
              <option value="touchdesigner-bridge">Phase E : Passerelles TouchDesigner/Max</option>
            </optgroup>
          </select>
        </div>

        {/* Right Info: Status, License & Self-Test Trigger */}
        <div className="flex items-center gap-2">
          {/* License badge */}
          <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
            Licence : {currentAdapter.license}
          </span>

          {/* Self-test button */}
          {currentAdapter.runReproducibleTest && (
            <button
              onClick={handleRunSelfTest}
              disabled={isRunningTest}
              className="px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 rounded transition-colors flex items-center gap-1.5"
              title="Exécute une vérification d'intégrité non-régressive"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isRunningTest ? 'Test en cours...' : 'Test Non-Régression'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Self-Test Banner (if triggered) */}
      {testResult && (
        <div
          className={`px-6 py-2 border-b text-xs flex items-center justify-between ${
            testResult.passed
              ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300'
              : 'bg-red-950/40 border-red-900/60 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {testResult.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
            <span>Résultat du test : {testResult.message}</span>
            <span className="font-mono text-zinc-400">({testResult.durationMs} ms)</span>
          </div>
          <button onClick={() => setTestResult(null)} className="text-zinc-400 hover:text-zinc-200 text-xs">
            Fermer
          </button>
        </div>
      )}

      {/* Main Engineering Body: Split Panes (Code on Left, Preview & Telemetry on Right) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Code Editor + Engine Specs / ISF Inspector */}
        <div className="w-full lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-800 overflow-hidden">
          <div className="flex-1 overflow-hidden p-3">
            <CodeEditor
              code={
                currentEngineId === 'hybrid-p5-glsl' && activeTab === 'secondary'
                  ? secondaryCode || ''
                  : code
              }
              onChange={(val) => {
                if (currentEngineId === 'hybrid-p5-glsl' && activeTab === 'secondary') {
                  if (onSecondaryCodeChange) onSecondaryCodeChange(val);
                } else {
                  onCodeChange(val);
                }
              }}
              onRun={onRun}
              onReset={onResetCode}
              presets={currentAdapter.presets}
              activePresetId={currentAdapter.presets[0]?.id || ''}
              onSelectPreset={(p) => {
                onCodeChange(p.code);
                if (p.secondaryCode && onSecondaryCodeChange) {
                  onSecondaryCodeChange(p.secondaryCode);
                }
              }}
              engineName={currentAdapter.name}
              isExecutable={currentAdapter.status === 'functional' || currentAdapter.status === 'hardware-dependent'}
              hasSecondaryCode={currentEngineId === 'hybrid-p5-glsl'}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              primaryTabLabel="1. Animation p5.js"
              secondaryTabLabel="2. Shader GLSL Post-Process"
            />
          </div>

          {/* Technical Metadata & I/O Contract Panel */}
          <div className="h-36 border-t border-zinc-800 bg-zinc-950 p-3 overflow-y-auto text-xs font-mono text-zinc-400">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-900 text-zinc-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Contrat Technique & E/S ({currentAdapter.shortName})</span>
              </span>
              <span className="text-[11px] text-zinc-500">Benchmark : {currentAdapter.benchmark.initTimeMs}ms init</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-zinc-500 block mb-0.5">Entrées acceptées :</span>
                <ul className="list-disc pl-4 space-y-0.5 text-zinc-300">
                  {currentAdapter.inputs.map((inp) => (
                    <li key={inp.name}>
                      <span className="text-cyan-400 font-semibold">{inp.name}</span> ({inp.type})
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-zinc-500 block mb-0.5">Sorties produites :</span>
                <ul className="list-disc pl-4 space-y-0.5 text-zinc-300">
                  {currentAdapter.outputs.map((out) => (
                    <li key={out.name}>
                      <span className="text-emerald-400 font-semibold">{out.name}</span> ({out.type})
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {parsedISF && parsedISF.inputs.length > 0 && (
              <div className="mt-2 pt-2 border-t border-zinc-900">
                <span className="text-cyan-400 font-semibold">Entrées ISF détectées dans le JSON :</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {parsedISF.inputs.map((inp) => (
                    <span key={inp.NAME} className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px]">
                      {inp.NAME} ({inp.TYPE}, def: {String(inp.DEFAULT)})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Render Surface + Sliders + Real Console Panel */}
        <div className="w-full lg:w-1/2 flex flex-col overflow-hidden">
          {/* Upper Right: Visual Render Surface */}
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden border-b border-zinc-800">
            {renderSurface}
          </div>

          {/* Middle Right: Live Parameters / Sliders */}
          <div className="p-3 border-b border-zinc-800 bg-zinc-950">
            <ParametersPanel
              uniforms={uniforms}
              onChange={onUniformChange}
              onReset={onResetUniforms}
            />
          </div>

          {/* Bottom Right: Real Console Panel with error line tracking */}
          <div className="h-44 bg-zinc-950">
            <ConsolePanel logs={logs} onClear={onClearLogs} />
          </div>
        </div>
      </div>
    </div>
  );
};
