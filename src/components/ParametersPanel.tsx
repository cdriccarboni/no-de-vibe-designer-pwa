import React from 'react';
import { Sliders, RefreshCw } from 'lucide-react';

interface ParametersPanelProps {
  uniforms: Record<string, number>;
  onChange: (key: string, value: number) => void;
  onReset: () => void;
  bridgeParams?: Record<string, number>;
}

export const ParametersPanel: React.FC<ParametersPanelProps> = ({
  uniforms,
  onChange,
  onReset,
  bridgeParams,
}) => {
  const keys = Object.keys(uniforms);

  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-3 font-mono text-xs">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-900 select-none">
        <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>Contrôleurs Temps Réel (Uniforms)</span>
        </div>
        <button
          onClick={onReset}
          className="text-zinc-500 hover:text-zinc-300 text-[11px] flex items-center gap-1 transition-colors"
          title="Réinitialiser les paramètres"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Défaut</span>
        </button>
      </div>

      {/* Uniforms Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {keys.map((key) => {
          const val = uniforms[key];
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>{key}</span>
                <span className="text-cyan-400 font-semibold tabular-nums">{val.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                step="0.05"
                value={val}
                onChange={(e) => onChange(key, parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          );
        })}
      </div>

      {/* Bridge Variables from p5.js (if any) */}
      {bridgeParams && Object.keys(bridgeParams).length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-zinc-900">
          <div className="text-[11px] text-zinc-400 mb-1.5 flex items-center justify-between">
            <span className="text-cyan-400 font-semibold">Signaux émis par p5.js vers GLSL :</span>
            <span className="text-[10px] text-zinc-500">Transmis via `window.setBridgeUniforms`</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-zinc-300">
            {Object.entries(bridgeParams).map(([name, val]) => (
              <div key={name} className="p-1.5 bg-zinc-900/60 rounded border border-zinc-800/60 flex items-center justify-between">
                <span className="text-zinc-400 truncate mr-2">{name}</span>
                <span className="text-emerald-400 font-semibold tabular-nums">
                  {typeof val === 'number' ? val.toFixed(2) : String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
