import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Monitor, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running standalone, hide the prompt
  if (isInstalled) {
    return (
      <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/60 text-[10px] text-emerald-400 font-mono">
        <span>App Installée (Standalone)</span>
      </div>
    );
  }

  // Chromium / Android / Desktop Install
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="px-2.5 py-1 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded transition-colors flex items-center gap-1.5 shadow-sm"
        title="Installer l'application pour une exécution 100% hors-ligne (Desktop/Mobile)"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Installer l'App (Offline)</span>
      </button>
    );
  }

  // iOS Safari Flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-900 border border-zinc-800 rounded transition-colors flex items-center gap-1.5"
        >
          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
          <span>Installer sur iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-xl bg-zinc-950 border border-zinc-800 p-5 shadow-2xl text-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <h3 className="font-semibold text-zinc-100 text-sm">Installation iPad / iPhone</h3>
                <button onClick={() => setShowIOSGuide(false)} className="text-zinc-400 hover:text-zinc-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-zinc-300 leading-relaxed">
                Pour utiliser No[co]de en régie de spectacle sans connexion Internet :
              </p>
              <ol className="list-decimal pl-4 space-y-1.5 text-zinc-400">
                <li>Touchez l'icône <strong>Partager</strong> dans la barre Safari.</li>
                <li>Faites défiler et choisissez <strong>Sur l'écran d'accueil</strong>.</li>
                <li>L'application fonctionnera en plein écran 100% autonome.</li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full mt-2 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded font-medium"
              >
                Compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback manual install badge / button for desktop Chrome / Edge
  return (
    <button
      onClick={() => {
        alert(
          "Installation Hors-Ligne :\nPour installer l'application sur macOS/Windows/Linux, cliquez sur l'icône d'installation dans la barre d'adresse de votre navigateur (Chrome/Edge/Brave) ou ajoutez-la à vos applications."
        );
      }}
      className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 rounded transition-colors"
      title="Informations d'installation hors-ligne"
    >
      <Monitor className="w-3.5 h-3.5 text-zinc-400" />
      <span>PWA Prête</span>
    </button>
  );
};
