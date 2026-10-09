import React from 'react';
import { Wifi, WifiOff, HardDrive, Network } from 'lucide-react';

interface OfflineIndicatorProps {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  isLocalNetwork: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isOnline,
  isSimulatedOffline,
  onToggleSimulatedOffline,
  isLocalNetwork,
}) => {
  const isActuallyOffline = !isOnline || isSimulatedOffline;

  return (
    <div className="flex items-center gap-2 select-none">
      {/* Simulation Toggle Button */}
      <button
        onClick={onToggleSimulatedOffline}
        title={
          isSimulatedOffline
            ? 'Désactiver la coupure simulée'
            : 'Simuler une coupure Internet pour valider le fonctionnement hors-ligne scénique'
        }
        className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-colors flex items-center gap-1.5 ${
          isSimulatedOffline
            ? 'bg-amber-950/80 border-amber-600/80 text-amber-300 animate-pulse'
            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
        }`}
      >
        {isActuallyOffline ? (
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
        )}
        <span>
          {isSimulatedOffline
            ? 'Coupure Internet Simulée (Scène)'
            : 'Test Coupure Réseau'}
        </span>
      </button>

      {/* Network / LAN state */}
      <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-900/60 border border-zinc-800/80">
        {isLocalNetwork ? (
          <>
            <Network className="w-3 h-3 text-cyan-400" />
            <span>LAN Local (100% Autonome)</span>
          </>
        ) : (
          <>
            <HardDrive className="w-3 h-3 text-emerald-400" />
            <span>Assets Locaux Bundlés</span>
          </>
        )}
      </div>
    </div>
  );
};
