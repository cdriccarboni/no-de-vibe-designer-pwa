// Modal de Gestion & Sauvegarde des Banques de Pads (CueCartPanel)
// No[co]de Vibe Designer — Régie Spectacle Vivant
// Permet de basculer, renommer, sauvegarder, dupliquer, exporter et importer des banques de 16 pads

import React, { useState, useRef } from 'react';
import {
  X,
  Check,
  Save,
  Download,
  Upload,
  RotateCcw,
  Copy,
  Edit2,
  Layers,
  Sparkles,
  AlertTriangle,
  FolderOpen,
  Calendar,
  Clock
} from 'lucide-react';
import {
  CartBankId,
  BANK_METADATA,
  loadBankPadsFromStorage,
  saveBankPadsToStorage,
  loadBankNamesFromStorage,
  saveBankNamesToStorage,
  getBankLastSavedTime,
  exportBankToJsonString,
  importBankFromJsonString,
  resetBankToFactoryDefaults,
  duplicateBankInStorage
} from '../services/cueCartBankManager';
import { CartPad } from './CueCartPanel';

interface CartBankManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBankId: CartBankId;
  currentPads: CartPad[];
  onSelectBank: (bankId: CartBankId) => void;
  onReloadBankPads: (newPads: CartPad[]) => void;
  onToast: (msg: string) => void;
}

export const CartBankManagerModal: React.FC<CartBankManagerModalProps> = ({
  isOpen,
  onClose,
  activeBankId,
  currentPads,
  onSelectBank,
  onReloadBankPads,
  onToast
}) => {
  const [bankNames, setBankNames] = useState<Record<CartBankId, string>>(() => loadBankNamesFromStorage());
  const [editingNameBank, setEditingNameBank] = useState<CartBankId | null>(null);
  const [editingNameValue, setEditingNameValue] = useState<string>('');
  const [duplicateTargetBank, setDuplicateTargetBank] = useState<{ from: CartBankId; to: CartBankId } | null>(null);
  const [confirmResetBank, setConfirmResetBank] = useState<CartBankId | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importTargetBank, setImportTargetBank] = useState<CartBankId>('A');

  if (!isOpen) return null;

  const banksList: CartBankId[] = ['A', 'B', 'C', 'D'];

  const handleStartRename = (bankId: CartBankId) => {
    setEditingNameBank(bankId);
    setEditingNameValue(bankNames[bankId]);
  };

  const handleSaveRename = (bankId: CartBankId) => {
    if (!editingNameValue.trim()) {
      setEditingNameBank(null);
      return;
    }
    const updated = { ...bankNames, [bankId]: editingNameValue.trim() };
    setBankNames(updated);
    saveBankNamesToStorage(updated);
    setEditingNameBank(null);
    onToast(`Banque ${bankId} renommée en « ${editingNameValue.trim()} »`);
  };

  const handleExportBank = (bankId: CartBankId) => {
    // Si c'est la banque active, utiliser les pads en mémoire
    const padsToExport = bankId === activeBankId ? currentPads : loadBankPadsFromStorage(bankId);
    const jsonStr = exportBankToJsonString(bankId, padsToExport, bankNames[bankId]);

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanName = bankNames[bankId].toLowerCase().replace(/[^a-z0-9]/gi, '_');
    a.download = `cue_cart_banque_${bankId}_${cleanName}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onToast(`📥 Banque ${bankId} exportée au format JSON`);
  };

  const handleTriggerImport = (bankId: CartBankId) => {
    setImportTargetBank(bankId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const result = importBankFromJsonString(content, importTargetBank);
      if (result.success && result.pads) {
        saveBankPadsToStorage(importTargetBank, result.pads);
        if (result.bankName) {
          const updated = { ...bankNames, [importTargetBank]: result.bankName };
          setBankNames(updated);
          saveBankNamesToStorage(updated);
        }

        // Si la banque importée est actuellement active, rafraîchir l'écran
        if (importTargetBank === activeBankId) {
          onReloadBankPads(result.pads);
        }

        onToast(`✅ Banque ${importTargetBank} importée avec succès (16 pads chargés)`);
      } else {
        onToast(`❌ Échec import : ${result.error || 'Fichier JSON invalide'}`);
      }
    };
    reader.readAsText(file);
  };

  const handleDuplicate = (from: CartBankId, to: CartBankId) => {
    const sourcePads = from === activeBankId ? currentPads : loadBankPadsFromStorage(from);
    saveBankPadsToStorage(to, sourcePads);

    if (to === activeBankId) {
      onReloadBankPads(sourcePads);
    }

    setDuplicateTargetBank(null);
    onToast(`📋 Banque ${from} dupliquée vers la Banque ${to} avec succès`);
  };

  const handleResetToFactory = (bankId: CartBankId) => {
    const defaultPads = resetBankToFactoryDefaults(bankId);
    if (bankId === activeBankId) {
      onReloadBankPads(defaultPads);
    }
    setConfirmResetBank(null);
    onToast(`🔄 Banque ${bankId} réinitialisée aux presets d'usine`);
  };

  const handleSaveActiveToStorage = () => {
    saveBankPadsToStorage(activeBankId, currentPads);
    onToast(`💾 Banque ${activeBankId} sauvegardée dans le localStorage !`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-[#0b0e14] border border-[#2a3447] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl shadow-cyan-950/40 overflow-hidden text-zinc-100">
        {/* EN-TÊTE MODAL */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2535] bg-[#0f131a]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide uppercase text-zinc-100 flex items-center gap-2">
                <span>Gestionnaire des Banques de Pads (localStorage)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
                  4 Banques · 64 Slots
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Sauvegarde locale, renommage de scène, duplication et export/import JSON pour la régie
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveActiveToStorage}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/50 border border-emerald-400/50 transition-all active:scale-95"
              title="Sauvegarder immédiatement l'état de la banque active en mémoire locale"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Sauvegarder Banque {activeBankId}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              title="Fermer la fenêtre (Échap)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENU PRINCIPAL : LISTE DES 4 BANQUES */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banksList.map((bankId) => {
              const meta = BANK_METADATA[bankId];
              const isActive = bankId === activeBankId;
              const name = bankNames[bankId];
              const lastSaved = getBankLastSavedTime(bankId);
              const formattedDate = lastSaved
                ? new Date(lastSaved).toLocaleDateString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })
                : "Preset d'usine";

              return (
                <div
                  key={bankId}
                  className={`relative rounded-xl border p-4 transition-all flex flex-col justify-between ${
                    isActive
                      ? 'bg-[#101726] border-cyan-500/70 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-500/40'
                      : 'bg-[#0e121a] border-zinc-800/90 hover:border-zinc-700'
                  }`}
                >
                  {/* Badge Banque & Statut Actif */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs font-mono border ${
                            isActive
                              ? 'bg-amber-500 text-black border-amber-300 shadow-md shadow-amber-500/30'
                              : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                          }`}
                        >
                          {bankId}
                        </span>

                        {editingNameBank === bankId ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingNameValue}
                              onChange={(e) => setEditingNameValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(bankId)}
                              autoFocus
                              className="px-2 py-0.5 text-xs bg-zinc-900 border border-cyan-500 rounded text-white focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRename(bankId)}
                              className="p-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px]"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group">
                            <h3 className="font-bold text-xs text-white tracking-wide">{name}</h3>
                            <button
                              type="button"
                              onClick={() => handleStartRename(bankId)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-cyan-300 transition-opacity"
                              title="Renommer cette banque pour le spectacle"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {isActive && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          BANQUE CHARGÉE
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-400 mb-2 leading-relaxed">
                      {meta.description}
                    </p>

                    <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono mb-4">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-zinc-400" />
                        16 Pads tactiles
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        {formattedDate}
                      </span>
                    </div>
                  </div>

                  {/* BOUTONS D'ACTIONS DE LA BANQUE */}
                  <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectBank(bankId);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded-md shadow-sm transition-all"
                          title={`Charger la Banque ${bankId} sur les 16 pads`}
                        >
                          Charger cette Banque
                        </button>
                      )}

                      {/* Dupliquer vers */}
                      <button
                        type="button"
                        onClick={() =>
                          setDuplicateTargetBank({
                            from: bankId,
                            to: bankId === 'A' ? 'B' : 'A'
                          })
                        }
                        className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[10px] rounded-md border border-zinc-700 transition-all flex items-center gap-1"
                        title="Dupliquer les pads de cette banque vers une autre"
                      >
                        <Copy className="w-2.5 h-2.5" />
                        <span>Dupliquer</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Exporter JSON */}
                      <button
                        type="button"
                        onClick={() => handleExportBank(bankId)}
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-cyan-300 text-[10px] rounded-md border border-zinc-700 transition-all"
                        title="Exporter cette banque en fichier JSON"
                      >
                        <Download className="w-3 h-3" />
                      </button>

                      {/* Importer JSON */}
                      <button
                        type="button"
                        onClick={() => handleTriggerImport(bankId)}
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-amber-300 text-[10px] rounded-md border border-zinc-700 transition-all"
                        title="Importer un fichier JSON dans cette banque"
                      >
                        <Upload className="w-3 h-3" />
                      </button>

                      {/* Réinitialiser aux valeurs d'usine */}
                      <button
                        type="button"
                        onClick={() => setConfirmResetBank(bankId)}
                        className="p-1.5 bg-zinc-800 hover:bg-red-900/60 text-zinc-400 hover:text-red-200 text-[10px] rounded-md border border-zinc-700 transition-all"
                        title="Restaurer la configuration d'usine pour cette banque"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Confirmation Reset */}
                  {confirmResetBank === bankId && (
                    <div className="absolute inset-0 bg-black/95 rounded-xl p-4 flex flex-col justify-center items-center text-center z-10 animate-in fade-in">
                      <AlertTriangle className="w-6 h-6 text-red-400 mb-1" />
                      <p className="text-xs font-bold text-white mb-1">
                        Réinitialiser la Banque {bankId} ?
                      </p>
                      <p className="text-[10px] text-zinc-400 mb-3">
                        Tous les réglages actuels de cette banque seront remplacés par les presets d'usine.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleResetToFactory(bankId)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold"
                        >
                          Confirmer Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmResetBank(null)}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px]"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Dialogue Duplication */}
                  {duplicateTargetBank?.from === bankId && (
                    <div className="absolute inset-0 bg-black/95 rounded-xl p-4 flex flex-col justify-center items-center text-center z-10 animate-in fade-in">
                      <Copy className="w-6 h-6 text-indigo-400 mb-1" />
                      <p className="text-xs font-bold text-white mb-1">
                        Dupliquer Banque {bankId} vers :
                      </p>
                      <div className="flex items-center gap-1.5 mb-3">
                        {banksList
                          .filter((b) => b !== bankId)
                          .map((target) => (
                            <button
                              key={target}
                              type="button"
                              onClick={() => handleDuplicate(bankId, target)}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded border border-indigo-400"
                            >
                              Banque {target}
                            </button>
                          ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setDuplicateTargetBank(null)}
                        className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px]"
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* PIED DE MODAL */}
        <div className="px-5 py-3 border-t border-[#1e2535] bg-[#0c0f16] flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Persistance automatique activée dans localStorage</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg text-xs transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>

        {/* INPUT DE FICHIER INVISIBLE POUR L'IMPORT JSON */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
};
