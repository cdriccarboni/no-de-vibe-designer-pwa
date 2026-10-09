import React, { useState } from 'react';
import { ConsoleLog } from '../types/engine';
import { Terminal, Trash2, AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface ConsolePanelProps {
  logs: ConsoleLog[];
  onClear: () => void;
  onSelectLine?: (line: number) => void;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({
  logs,
  onClear,
  onSelectLine,
}) => {
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    if (filter === 'error') return log.type === 'error';
    if (filter === 'warn') return log.type === 'warn';
    if (filter === 'info') return log.type === 'info' || log.type === 'system';
    return true;
  });

  const errorCount = logs.filter((l) => l.type === 'error').length;
  const warnCount = logs.filter((l) => l.type === 'warn').length;

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800/80 rounded-lg overflow-hidden font-mono text-xs">
      {/* Console Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/90 border-b border-zinc-800 select-none">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-semibold text-zinc-200 text-xs">Console & Diagnostic</span>

          {errorCount > 0 && (
            <span className="text-[11px] text-red-400 font-semibold ml-1">
              ({errorCount} erreur{errorCount > 1 ? 's' : ''})
            </span>
          )}
        </div>

        {/* Filter buttons & Clear */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center p-0.5 bg-zinc-950 rounded border border-zinc-800 text-[11px]">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === 'all' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Tous ({logs.length})
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === 'error' ? 'bg-red-950/60 text-red-300 font-semibold' : 'text-zinc-500 hover:text-red-400'
              }`}
            >
              Erreurs ({errorCount})
            </button>
            <button
              onClick={() => setFilter('warn')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === 'warn' ? 'bg-amber-950/60 text-amber-300 font-semibold' : 'text-zinc-500 hover:text-amber-400'
              }`}
            >
              Alertes ({warnCount})
            </button>
          </div>

          <button
            onClick={onClear}
            title="Effacer la console"
            className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors ml-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Console Log Output */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 selection:bg-zinc-800">
        {filteredLogs.length === 0 ? (
          <div className="h-full min-h-[90px] flex items-center justify-center text-zinc-600 gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500/70" />
            <span>Console prête · Aucun message d'erreur d'exécution</span>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isError = log.type === 'error';
            const isWarn = log.type === 'warn';

            return (
              <div
                key={log.id}
                className={`p-2 rounded border flex items-start gap-2.5 transition-colors ${
                  isError
                    ? 'bg-red-950/20 border-red-900/40 text-red-300'
                    : isWarn
                    ? 'bg-amber-950/20 border-amber-900/40 text-amber-300'
                    : 'bg-zinc-900/30 border-zinc-850 text-zinc-300'
                }`}
              >
                {/* Icon */}
                <div className="shrink-0 mt-0.5">
                  {isError ? (
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  ) : isWarn ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Info className="w-3.5 h-3.5 text-cyan-400/80" />
                  )}
                </div>

                {/* Message & Meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-500 mb-0.5">
                    <span className="font-mono">{log.timestamp}</span>
                    {log.source && <span className="text-zinc-600">{log.source}</span>}
                    {log.lineNumber && (
                      <button
                        onClick={() => onSelectLine && onSelectLine(log.lineNumber!)}
                        className="text-red-400 hover:underline font-semibold"
                        title="Localiser l'erreur"
                      >
                        Ligne {log.lineNumber}
                      </button>
                    )}
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
                    {log.message}
                  </pre>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
