import React from 'react';
import { X, Layers, Cpu, Code2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ENGINE_ADAPTERS } from '../services/adapters';

interface ArchitectureDocModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureDocModal: React.FC<ArchitectureDocModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/80">
          <div>
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-cyan-400/20 text-cyan-400 flex items-center justify-center font-mono text-xs font-bold">
                N
              </span>
              <span>Architecture No[co]de Multilanguage Lab</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Plateforme de validation des moteurs créatifs pour No[co]de Vibe Designer
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-zinc-300 leading-relaxed">
          {/* Directive Fondamentale */}
          <div className="p-4 bg-cyan-950/20 border border-cyan-800/40 rounded-lg space-y-2">
            <h3 className="font-semibold text-cyan-300 text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Philosophie No[co]de — L'Artiste d'Abord</span>
            </h3>
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              No[co]de Vibe Designer est avant tout destiné aux artistes, scénographes, metteurs en scène et chorégraphes.
              Le système masque la complexité technique : l'artiste s'exprime en langage naturel ou par la voix,
              et No[co]de orchestre automatiquement les moteurs appropriés (JavaScript, GLSL, p5.js, ISF, WebGPU, Python).
              Le code n'est jamais imposé par défaut, mais reste accessible pour les utilisateurs avancés.
            </p>
          </div>

          {/* Phase A Status Matrix */}
          <div>
            <h4 className="font-semibold text-zinc-200 text-xs mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>État des Moteurs de la Phase A (Langages Web & Visuels)</span>
            </h4>
            <div className="space-y-2">
              {ENGINE_ADAPTERS.filter((a) => a.phase === 'Phase A').map((adapter) => (
                <div
                  key={adapter.id}
                  className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-200">{adapter.name}</span>
                      <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] font-mono text-cyan-400">
                        {adapter.statusBadge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{adapter.description}</p>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono shrink-0 ml-3">
                    {adapter.license}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Roadmap for Upcoming Phases */}
          <div className="border-t border-zinc-800 pt-4">
            <h4 className="font-semibold text-zinc-200 text-xs mb-2">
              Feuille de Route des Phases Suivantes
            </h4>
            <div className="grid grid-cols-2 gap-3 text-[11px] text-zinc-400">
              <div className="p-2.5 bg-zinc-900/30 rounded border border-zinc-850">
                <span className="text-amber-400 font-semibold block mb-0.5">Phase B — Audio & Synthèse</span>
                <p>Faust (faustwasm), WebChucK (WASM AudioWorklet), Pure Data (libpd). Activation audio volontaire requise.</p>
              </div>
              <div className="p-2.5 bg-zinc-900/30 rounded border border-zinc-850">
                <span className="text-zinc-300 font-semibold block mb-0.5">Phase C — Calcul Natif</span>
                <p>WebAssembly C++/Rust compilé, modules d'interopérabilité Processing.</p>
              </div>
              <div className="p-2.5 bg-zinc-900/30 rounded border border-zinc-850">
                <span className="text-zinc-300 font-semibold block mb-0.5">Phase D — Systèmes Nodaux</span>
                <p>cables.gl, LiteGraph.js, Rete.js en évaluation comparative.</p>
              </div>
              <div className="p-2.5 bg-zinc-900/30 rounded border border-zinc-850">
                <span className="text-zinc-300 font-semibold block mb-0.5">Phase E — Passerelles Scéniques</span>
                <p>Protocoles réseau TouchDesigner, Max/MSP, SuperCollider, OSC et WebMIDI.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
