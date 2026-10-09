import React, { useRef, useEffect, useState } from 'react';
import { Play, RotateCcw, Copy, Check, FileCode, AlertCircle } from 'lucide-react';
import { CodePreset } from '../types/engine';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onReset: () => void;
  presets: CodePreset[];
  activePresetId: string;
  onSelectPreset: (preset: CodePreset) => void;
  errorLine?: number;
  engineName: string;
  isExecutable: boolean;
  // Hybrid secondary tab support
  hasSecondaryCode?: boolean;
  activeTab?: 'primary' | 'secondary';
  onTabChange?: (tab: 'primary' | 'secondary') => void;
  primaryTabLabel?: string;
  secondaryTabLabel?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  onRun,
  onReset,
  presets,
  activePresetId,
  onSelectPreset,
  errorLine,
  engineName,
  isExecutable,
  hasSecondaryCode = false,
  activeTab = 'primary',
  onTabChange,
  primaryTabLabel = 'Code Source',
  secondaryTabLabel = 'Post-Traitement GLSL',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const lines = code.split('\n');
  const lineCount = lines.length;

  // Synchronize scrolling between textarea and line numbers
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Keyboard navigation & indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to run
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (isExecutable) {
        onRun();
      }
      return;
    }

    // Tab key: insert 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      onChange(newCode);

      // Restore cursor position after state update
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800/80 rounded-lg overflow-hidden shadow-lg">
      {/* Editor Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 bg-zinc-900/90 border-b border-zinc-800 text-xs">
        {/* Left: Tabs or Title & Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          {hasSecondaryCode ? (
            <div className="flex items-center p-0.5 bg-zinc-950 rounded border border-zinc-800">
              <button
                onClick={() => onTabChange && onTabChange('primary')}
                className={`px-3 py-1 font-medium rounded transition-colors whitespace-nowrap ${
                  activeTab === 'primary'
                    ? 'bg-zinc-800 text-cyan-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {primaryTabLabel}
              </button>
              <button
                onClick={() => onTabChange && onTabChange('secondary')}
                className={`px-3 py-1 font-medium rounded transition-colors whitespace-nowrap ${
                  activeTab === 'secondary'
                    ? 'bg-zinc-800 text-cyan-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {secondaryTabLabel}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>{engineName}</span>
            </div>
          )}

          {/* Preset Selector */}
          {presets.length > 0 && (
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-zinc-500 hidden sm:inline">Exemple :</span>
              <select
                value={activePresetId}
                onChange={(e) => {
                  const found = presets.find((p) => p.id === e.target.value);
                  if (found) onSelectPreset(found);
                }}
                className="bg-zinc-950 text-zinc-300 border border-zinc-800 rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-500/80 cursor-pointer"
              >
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id} className="bg-zinc-950 text-zinc-200">
                    {preset.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right Actions: Run, Reset, Copy */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            title="Copier le code dans le presse-papier"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded border border-transparent hover:border-zinc-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onReset}
            title="Réinitialiser le code par défaut"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded border border-transparent hover:border-zinc-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {isExecutable ? (
            <button
              onClick={onRun}
              className="flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold text-zinc-950 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors shadow-sm"
              title="Exécuter (Raccourci: Ctrl+Entrée)"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Exécuter</span>
              <kbd className="hidden md:inline font-mono text-[10px] bg-cyan-500/40 text-zinc-900 px-1 py-0.2 rounded ml-1">
                Ctrl+↵
              </kbd>
            </button>
          ) : (
            <div className="px-2.5 py-1 text-[11px] font-medium text-amber-300/90 bg-amber-950/40 border border-amber-800/40 rounded flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-400" />
              <span>Non exécutable</span>
            </div>
          )}
        </div>
      </div>

      {/* Editor Main Surface (Line Numbers + Textarea) */}
      <div className="relative flex-1 flex overflow-hidden font-mono text-[13px] leading-relaxed">
        {/* Line Numbers Gutter */}
        <div
          ref={lineNumbersRef}
          aria-hidden="true"
          className="w-12 shrink-0 py-3 bg-zinc-950/80 border-r border-zinc-900 text-zinc-600 text-right select-none overflow-hidden pr-2.5 font-mono"
        >
          {Array.from({ length: lineCount }).map((_, i) => {
            const lineNum = i + 1;
            const isError = errorLine === lineNum;
            return (
              <div
                key={lineNum}
                className={`${
                  isError ? 'text-red-400 font-bold bg-red-950/40 -mr-2.5 pr-2.5 rounded-l' : ''
                }`}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        {/* Text Input Area */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="flex-1 p-3 bg-transparent text-zinc-200 resize-none focus:outline-none font-mono selection:bg-cyan-500/25 tab-size-2 whitespace-pre overflow-auto"
          placeholder="// Saisissez ou modifiez votre code ici..."
        />
      </div>

      {/* Bottom Status Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/60 border-t border-zinc-900 text-[11px] text-zinc-500 font-mono">
        <div className="flex items-center gap-3">
          <span>{lineCount} lignes</span>
          <span>·</span>
          <span>{code.length} caractères</span>
          {errorLine && (
            <>
              <span>·</span>
              <span className="text-red-400 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Erreur détectée L:{errorLine}
              </span>
            </>
          )}
        </div>
        <div className="text-zinc-500">UTF-8 · Tab: 2 espaces</div>
      </div>
    </div>
  );
};
