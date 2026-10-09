import React, { useState, useEffect } from 'react';
import {
  Download,
  Laptop,
  Smartphone,
  Wifi,
  QrCode,
  Check,
  ArrowLeft,
  Share2,
  HardDrive,
  Copy,
  ExternalLink,
  ShieldCheck,
  Zap,
  Sparkles
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallHubViewProps {
  onBackToApp: () => void;
}

export const InstallHubView: React.FC<InstallHubViewProps> = ({ onBackToApp }) => {
  const { isInstallable, install, isInstalled } = usePWAInstall();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<'pwa' | 'mac' | 'windows' | 'android'>('pwa');
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#090b0d] text-zinc-100 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="h-14 px-6 border-b border-[#2d333b] bg-[#171a1e] flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToApp}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1d2126] border border-[#2d333b] hover:border-[#d7b86a] text-zinc-300 hover:text-white text-xs font-semibold transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour à l'application</span>
          </button>

          <div className="flex items-center gap-2 ml-2">
            <div className="w-8 h-8 rounded-lg bg-[#090b0d] border border-[#454d57] p-1 flex items-center justify-center">
              <img src="/nocode-rings.svg" alt="No[co]de Rings" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1">
                <span>No</span>
                <span className="text-[#d7b86a] font-black">[co]</span>
                <span>de Vibe Designer</span>
                <span className="text-xs text-[#9ba4ae] font-normal">— Centre d'Installation</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500 text-emerald-300 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>PUBLIÉ ET PRÊT À L'INSTALLATION</span>
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-8">
        <div className="text-center max-w-2xl mx-auto flex flex-col items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1d2126] border border-[#2d333b] text-xs text-[#d7b86a] font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Déploiement Multi-Machines & Installation Hors-Ligne</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Installer No[co]de sur un deuxième ordinateur
          </h1>

          <p className="text-sm text-[#9ba4ae] leading-relaxed">
            No[co]de Vibe Designer est conçu pour fonctionner en local et en réseau sans abonnement.
            Installez l'application en 1 clic sur votre 2e Mac, PC Windows, régie plateau ou téléphone Companion.
          </p>
        </div>

        {/* Action Immédiate : PWA 1-Click Install or URL Link */}
        <div className="bg-[#171a1e] border border-[#2d333b] rounded-2xl p-6 shadow-2xl grid md:grid-cols-2 gap-6">
          {/* Bloc 1 : Installer comme application native */}
          <div className="flex flex-col justify-between p-5 rounded-xl bg-[#1d2126] border border-[#2d333b]">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Laptop className="w-5 h-5 text-[#d7b86a]" />
                <span>Installation PWA 1-Clic (Recommandé)</span>
              </div>
              <p className="text-xs text-[#9ba4ae] leading-relaxed">
                Transforme No[co]de en véritable application de bureau indépendante sur votre ordinateur avec son propre dock, gestion des fenêtres et fonctionnement 100% hors-ligne.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={install}
                className="w-full py-3 px-4 rounded-xl bg-[#d7b86a] hover:bg-[#e4ca86] text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>INSTALLER NO[CO]DE SUR CET ORDINATEUR</span>
              </button>
              <span className="text-[10px] text-center text-[#9ba4ae]">
                Compatible Chrome, Edge, Brave, Safari, Opera (Mac, Windows, Linux)
              </span>
            </div>
          </div>

          {/* Bloc 2 : Ouvrir sur un autre appareil via le réseau */}
          <div className="flex flex-col justify-between p-5 rounded-xl bg-[#1d2126] border border-[#2d333b]">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Wifi className="w-5 h-5 text-[#8fa79d]" />
                <span>Ouvrir depuis le 2e ordinateur ou téléphone</span>
              </div>
              <p className="text-xs text-[#9ba4ae] leading-relaxed">
                Tapez cette adresse dans le navigateur de votre deuxième ordinateur ou scannez le QR code avec votre téléphone pour connecter No[co]de Companion :
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 bg-[#090b0d] border border-[#2d333b] rounded-lg p-2 font-mono text-xs text-zinc-200">
                <span className="truncate flex-1">{currentUrl}</span>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-2 py-1 rounded bg-[#1d2126] hover:bg-zinc-700 text-xs text-zinc-300 flex items-center gap-1 shrink-0"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#9ba4ae] px-1">
                <span>Code PIN d'association régie :</span>
                <span className="font-mono font-bold text-[#d7b86a] text-sm bg-zinc-900 px-2 py-0.5 rounded border border-zinc-700">
                  7392
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Guide d'installation par plateforme */}
        <div className="flex flex-col gap-4">
          <div className="flex border-b border-[#2d333b] gap-6 text-sm font-semibold text-[#9ba4ae]">
            <button
              onClick={() => setActiveTab('pwa')}
              className={`pb-3 transition-colors ${activeTab === 'pwa' ? 'text-[#d7b86a] border-b-2 border-[#d7b86a]' : 'hover:text-white'}`}
            >
              1. Deuxième Ordi (PWA / Web)
            </button>
            <button
              onClick={() => setActiveTab('mac')}
              className={`pb-3 transition-colors ${activeTab === 'mac' ? 'text-[#d7b86a] border-b-2 border-[#d7b86a]' : 'hover:text-white'}`}
            >
              2. Mac (Apple Silicon / Intel)
            </button>
            <button
              onClick={() => setActiveTab('windows')}
              className={`pb-3 transition-colors ${activeTab === 'windows' ? 'text-[#d7b86a] border-b-2 border-[#d7b86a]' : 'hover:text-white'}`}
            >
              3. Windows & Linux
            </button>
            <button
              onClick={() => setActiveTab('android')}
              className={`pb-3 transition-colors ${activeTab === 'android' ? 'text-[#d7b86a] border-b-2 border-[#d7b86a]' : 'hover:text-white'}`}
            >
              4. Android Companion (Téléphone)
            </button>
          </div>

          <div className="bg-[#171a1e] border border-[#2d333b] rounded-xl p-5 text-xs text-zinc-300 leading-relaxed">
            {activeTab === 'pwa' && (
              <div className="flex flex-col gap-3">
                <div className="font-bold text-sm text-white">Comment installer sur un 2e ordinateur :</div>
                <ol className="list-decimal list-inside space-y-2 text-[#9ba4ae]">
                  <li>Ouvrez votre navigateur (Chrome, Edge ou Brave) sur le 2e ordinateur.</li>
                  <li>Entrez l'adresse de votre instance No[co]de : <span className="font-mono text-zinc-200">{currentUrl}</span>.</li>
                  <li>Cliquez sur l'icône d'installation dans la barre d'adresse (ou dans le menu trois points : <em>"Installer No[co]de Vibe Designer"</em>).</li>
                  <li>L'application s'ouvre immédiatement en fenêtre indépendante et est accessible même sans connexion Internet !</li>
                </ol>
              </div>
            )}

            {activeTab === 'mac' && (
              <div className="flex flex-col gap-3">
                <div className="font-bold text-sm text-white">Application Bureau macOS :</div>
                <p className="text-[#9ba4ae]">
                  Le binaire Electron universel (compatible Mac Apple Silicon M1/M2/M3/M4 et Mac Intel) permet d'accéder directement au matériel audio ASIO/CoreAudio, Web MIDI et aux ports série USB pour les capteurs de spectacle.
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <a
                    href="/export/nocode-scenographe-candidat-01.zip"
                    download
                    className="px-4 py-2 rounded-lg bg-[#1d2126] border border-[#2d333b] hover:border-[#d7b86a] text-zinc-200 font-bold flex items-center gap-2"
                  >
                    <Download className="w-4 h-4 text-[#d7b86a]" />
                    <span>Télécharger l'archive universelle Mac</span>
                  </a>
                </div>
              </div>
            )}

            {activeTab === 'windows' && (
              <div className="flex flex-col gap-3">
                <div className="font-bold text-sm text-white">Application Windows & Linux :</div>
                <p className="text-[#9ba4ae]">
                  Sous Windows et Linux, No[co]de s'exécute nativement via Chrome/Edge en mode PWA standalone ou via le binaire de bureau. Les pilotes MIDI et WebGL 2.0 / WebGPU sont automatiquement gérés.
                </p>
              </div>
            )}

            {activeTab === 'android' && (
              <div className="flex flex-col gap-3">
                <div className="font-bold text-sm text-white">No[co]de Companion pour Téléphone :</div>
                <p className="text-[#9ba4ae]">
                  Sur votre smartphone Android ou iPhone, ouvrez <span className="font-mono text-zinc-200">{currentUrl}/companion</span>.
                  Installez la PWA sur votre écran d'accueil pour profiter du mode plein écran et des capteurs de mouvement haute précision (gyroscope, accéléromètre, pinceau de mapping vidéo).
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Récapitulatif des différentes pages du projet */}
        <div className="bg-[#171a1e] border border-[#2d333b] rounded-xl p-5 flex flex-col gap-3">
          <div className="font-bold text-sm text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#d7b86a]" />
            <span>Toutes les pages disponibles et opérationnelles :</span>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <a
              href="/"
              className="p-3 rounded-lg bg-[#1d2126] border border-[#2d333b] hover:border-[#d7b86a] flex flex-col gap-1 transition-all"
            >
              <span className="font-bold text-white">/ (Designer Principal)</span>
              <span className="text-[10px] text-[#9ba4ae]">Patch Canvas, Vibe, Timeline, Library, Inspecteur</span>
            </a>

            <a
              href="/radio-paillettes"
              className="p-3 rounded-lg bg-[#1d2126] border border-[#2d333b] hover:border-red-500 flex flex-col gap-1 transition-all"
            >
              <span className="font-bold text-red-300">/radio-paillettes (P00)</span>
              <span className="text-[10px] text-[#9ba4ae]">Lecteur de diffusion audio direct pour téléphone ou 2e ordi</span>
            </a>

            <a
              href="/companion"
              className="p-3 rounded-lg bg-[#1d2126] border border-[#2d333b] hover:border-emerald-500 flex flex-col gap-1 transition-all"
            >
              <span className="font-bold text-emerald-300">/companion (Mobile)</span>
              <span className="text-[10px] text-[#9ba4ae]">Contrôleur téléphone, capteurs gyro & auto-mapping</span>
            </a>

            <button
              onClick={onBackToApp}
              className="p-3 rounded-lg bg-[#1d2126] border border-[#2d333b] hover:border-[#8fa79d] flex flex-col gap-1 transition-all text-left"
            >
              <span className="font-bold text-[#8fa79d]">Surtitres & Karaoké</span>
              <span className="text-[10px] text-[#9ba4ae]">Module natif Glypheo avec conduite spectacle</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
