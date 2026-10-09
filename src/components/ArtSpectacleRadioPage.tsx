import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RefreshCw,
  Smartphone,
  Share2,
  ExternalLink,
  ShieldCheck,
  Wifi,
  ArrowLeft,
  Sparkles,
  Music,
  Calendar,
  Clock,
  QrCode,
  Check,
  Disc,
  Info,
  Waves
} from 'lucide-react';
import { artRadioCmsEngine, ArtShowRadioPage } from '../services/artRadioCmsEngine';

interface ArtSpectacleRadioPageProps {
  channelSlug: string;
  onBackToStudio?: () => void;
}

export const ArtSpectacleRadioPage: React.FC<ArtSpectacleRadioPageProps> = ({
  channelSlug,
  onBackToStudio,
}) => {
  const [page, setPage] = useState<ArtShowRadioPage>(() => {
    return (
      artRadioCmsEngine.getPageBySlug(channelSlug) || {
        id: 'fallback',
        slug: channelSlug,
        stationName: channelSlug.includes('pirate')
          ? 'Radio Pirate des Caraïbes — 104.7 FM'
          : channelSlug.includes('paillette')
          ? 'Radio Paillettes en grève — 98.4 FM'
          : `Radio /${channelSlug}`,
        frequencyDial: '104.7 MHz FM / Onde Courte',
        tagline: 'Fréquence clandestine théâtrale en direct de la scène',
        showTitle: 'Spectacle : Pirates Paillettes',
        hostName: 'Capitaine Barbe-Rose & La Troupe',
        badgeIcon: 'skull',
        themeAccent: '#d7b86a',
        synopsis: 'Diffusion clandestine pirate en direct du plateau.',
        scheduleText: 'Émission en direct uniquement les soirs de représentation.',
        isLive: false,
        onlyShowDays: true,
      }
    );
  });

  const [allPages, setAllPages] = useState<ArtShowRadioPage[]>(artRadioCmsEngine.getPages());
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [listenersCount, setListenersCount] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [liveDuration, setLiveDuration] = useState(0);
  const [spectrumBars, setSpectrumBars] = useState<number[]>(() => Array(32).fill(12));
  const [isCopied, setIsCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamUrl = `/api/radio/stream/${page.slug}`;

  // Sync with CMS and poll live status
  useEffect(() => {
    const unsub = artRadioCmsEngine.subscribe(() => {
      setAllPages(artRadioCmsEngine.getPages());
      const p = artRadioCmsEngine.getPageBySlug(channelSlug);
      if (p) setPage(p);
    });

    let isMounted = true;
    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/radio/status/${page.slug}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const liveState = !!(data.isLive || data.isTesting);
            setPage((prev) => ({
              ...prev,
              isLive: liveState,
              stationName: data.name || prev.stationName,
            }));
            setListenersCount(data.listenersCount || 0);
            setAudioError(null);
          }
        } else {
          if (isMounted) {
            setPage((prev) => ({ ...prev, isLive: false }));
          }
        }
      } catch {
        if (isMounted) {
          setPage((prev) => ({ ...prev, isLive: false }));
        }
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 3000);

    return () => {
      isMounted = false;
      unsub();
      clearInterval(interval);
    };
  }, [channelSlug, page.slug]);

  // Duration timer
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setLiveDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Dynamic Spectrum Visualizer
  useEffect(() => {
    if (!isPlaying) {
      setSpectrumBars(Array(32).fill(10));
      return;
    }

    const anim = setInterval(() => {
      setSpectrumBars((prev) =>
        prev.map(() => Math.floor(Math.random() * 65) + 12)
      );
    }, 100);

    return () => clearInterval(anim);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.src = `${streamUrl}?t=${Date.now()}`;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setAudioError(null);
        })
        .catch((err) => {
          console.warn('Erreur lecture audio:', err);
          setAudioError("La radio pirate n'émet pas actuellement. Attendez la prise d'antenne.");
          setIsPlaying(false);
        });
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) audioRef.current.volume = val;
    if (val > 0 && isMuted) setIsMuted(false);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audioRef.current.muted = nextMute;
  };

  const copyShareLink = () => {
    const fullUrl = `${window.location.origin}/${page.slug}`;
    navigator.clipboard.writeText(fullUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const fullShareUrl = typeof window !== 'undefined' ? `${window.location.origin}/${page.slug}` : `/${page.slug}`;

  return (
    <div className="min-h-screen bg-[#07090c] text-zinc-100 flex flex-col font-sans selection:bg-[#d7b86a]/30 selection:text-white">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        preload="none"
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          setAudioError("Flux audio en attente ou interrompu.");
        }}
      />

      {/* ========================================================= */}
      {/* EN-TÊTE OFFICIEL DU SITE ART                              */}
      {/* ========================================================= */}
      <header className="h-14 bg-[#101317] border-b border-[#242930] px-4 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#d7b86a] text-black font-black text-xs tracking-wider">
              ART
            </span>
            <div className="leading-tight">
              <span className="font-bold text-xs text-zinc-100 tracking-wide block">
                SCÈNE & SPECTACLE VIVANT
              </span>
              <span className="text-[10px] text-[#9ba4ae] block">
                Diffusion Radio & Transmissions Scéniques
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sélecteur rapide de stations du site ART */}
          <div className="hidden sm:flex items-center gap-1 bg-[#171b21] p-0.5 rounded-lg border border-[#2d333b] text-xs">
            {allPages.map((p) => (
              <button
                key={p.slug}
                onClick={() => {
                  window.history.pushState({}, '', `/${p.slug}`);
                  setPage(p);
                  setIsPlaying(false);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  p.slug === page.slug
                    ? 'bg-[#d7b86a] text-black shadow'
                    : 'text-[#9ba4ae] hover:text-white'
                }`}
              >
                /{p.slug}
              </button>
            ))}
          </div>

          {onBackToStudio && (
            <button
              onClick={onBackToStudio}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1d2126] border border-[#2d333b] hover:border-[#d7b86a] text-zinc-300 hover:text-white text-xs font-semibold transition-all"
              title="Retourner à la régie générale No[co]de"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#d7b86a]" />
              <span>Régie No[co]de</span>
            </button>
          )}
        </div>
      </header>

      {/* ========================================================= */}
      {/* CORPS PRINCIPAL : L'UNIVERS THÉÂTRAL ET LE LECTEUR RADIO */}
      {/* ========================================================= */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-4xl mx-auto w-full">
        {/* CARTE POSTALE DE LA STATION RADIO */}
        <div className="w-full bg-gradient-to-b from-[#14181f] via-[#101317] to-[#0c0e12] border border-[#282e37] rounded-2xl shadow-2xl overflow-hidden relative">
          {/* Lueur d'ambiance d'antenne */}
          <div
            className={`absolute -top-32 -right-32 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-1000 ${
              page.isLive ? 'bg-red-500/15' : 'bg-[#d7b86a]/10'
            }`}
          />

          {/* Bandeau supérieur de statut de diffusion */}
          <div className="px-5 py-3.5 border-b border-[#242930] flex items-center justify-between bg-[#0e1115]/80">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[#d7b86a] font-bold">
                {page.frequencyDial}
              </span>
              <span className="text-xs text-zinc-400 hidden sm:inline">
                {page.showTitle}
              </span>
            </div>

            {/* Voyant ON AIR / HORS ANTENNE officiel */}
            <div
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-2 border transition-all ${
                page.isLive
                  ? 'bg-red-950/80 text-red-200 border-red-600/80 shadow-lg shadow-red-950/60'
                  : 'bg-zinc-900/80 text-zinc-400 border-zinc-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  page.isLive ? 'bg-red-500 animate-pulse' : 'bg-zinc-600'
                }`}
              />
              <span>{page.isLive ? '🔴 EN DIRECT' : '⚪ HORS ANTENNE'}</span>
            </div>
          </div>

          <div className="p-6 md:p-8">
            {/* Titre et habillage théâtral */}
            <div className="text-center space-y-2 mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1b2027] border border-[#2d333b] text-xs text-[#d7b86a] font-semibold">
                <Radio className="w-3.5 h-3.5" />
                <span>{page.tagline}</span>
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                {page.stationName}
              </h1>

              <p className="text-xs md:text-sm text-zinc-400 max-w-lg mx-auto">
                {page.synopsis}
              </p>
            </div>

            {/* Cadran d'antenne & analyseur de spectre */}
            <div className="bg-[#090b0e] border border-[#242930] rounded-xl p-4 mb-6 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3 text-[11px] font-mono text-zinc-400">
                <span className="flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-[#d7b86a]" />
                  <span>Flux Audio Opus HD 192kbps</span>
                </span>
                <span>
                  {page.isLive ? `${listenersCount} auditeur${listenersCount > 1 ? 's' : ''} connectés` : 'En attente du spectacle'}
                </span>
              </div>

              {/* Barres du spectre de modulation */}
              <div className="h-16 flex items-end justify-center gap-1 px-2">
                {spectrumBars.map((height, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t transition-all duration-100 ${
                      isPlaying
                        ? 'bg-gradient-to-t from-[#d7b86a] to-emerald-400'
                        : 'bg-zinc-800/80'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>

              {/* Règle de syntonisation vintage simulée */}
              <div className="mt-3 pt-2 border-t border-zinc-800/80 flex justify-between text-[9px] font-mono text-zinc-500">
                <span>88 MHz</span>
                <span>94 MHz</span>
                <span className="text-[#d7b86a] font-bold">104.7 MHz (PIRATE)</span>
                <span>106 MHz</span>
                <span>108 MHz</span>
              </div>
            </div>

            {/* Avertissement / Info si Hors Antenne */}
            {!page.isLive && (
              <div className="mb-6 p-3.5 rounded-xl bg-amber-950/30 border border-amber-600/40 text-amber-200 text-xs flex items-start gap-3">
                <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="font-bold text-amber-300 block mb-0.5">
                    Diffusion uniquement les jours de spectacle
                  </strong>
                  <span>
                    La station pirate n'émet pas en permanence. La régie lance le flux direct pendant les représentations. {page.scheduleText}
                  </span>
                </div>
              </div>
            )}

            {/* Message d'erreur éventuel */}
            {audioError && (
              <div className="mb-6 p-3 rounded-lg bg-red-950/40 border border-red-600/50 text-red-200 text-xs text-center">
                {audioError}
              </div>
            )}

            {/* CONTRÔLES DE LECTURE DU LECTEUR */}
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={togglePlay}
                disabled={!page.isLive}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all transform active:scale-95 shadow-xl ${
                  page.isLive
                    ? 'bg-[#d7b86a] hover:bg-[#e4ca86] text-black shadow-[#d7b86a]/30 cursor-pointer font-bold'
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700'
                }`}
                title={page.isLive ? (isPlaying ? 'Mettre en pause' : 'Écouter le direct') : 'Radio actuellement hors antenne'}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 fill-current" />
                ) : (
                  <Play className="w-8 h-8 fill-current translate-x-0.5" />
                )}
              </button>

              <div className="text-center">
                <div className="text-sm font-bold text-zinc-200">
                  {page.isLive ? (isPlaying ? 'Diffusion en cours d’écoute' : 'Cliquez pour écouter le direct') : 'Hors antenne'}
                </div>
                {isPlaying && (
                  <div className="text-xs text-[#d7b86a] font-mono mt-0.5">
                    Temps d'écoute : {formatTime(liveDuration)}
                  </div>
                )}
              </div>

              {/* Barre de volume */}
              <div className="w-full max-w-xs flex items-center gap-2 pt-2">
                <button
                  onClick={toggleMute}
                  className="text-zinc-400 hover:text-white p-1 rounded"
                  title={isMuted ? 'Rétablir le son' : 'Couper le son'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-zinc-300" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="flex-1 h-1.5 bg-zinc-800 accent-[#d7b86a] rounded-lg cursor-pointer"
                />
                <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </span>
              </div>
            </div>

            {/* Pied de carte : Partage & Téléphone 4G/5G */}
            <div className="mt-8 pt-5 border-t border-[#242930] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={copyShareLink}
                  className="px-3 py-1.5 rounded-md bg-[#171a1e] border border-[#2d333b] hover:border-[#d7b86a] text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all"
                  title="Copier le lien public pour l'envoyer au public"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Lien copié !' : 'Partager la page'}</span>
                </button>
                <button
                  onClick={() => setShowQr(!showQr)}
                  className="px-3 py-1.5 rounded-md bg-[#171a1e] border border-[#2d333b] hover:border-cyan-400 text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all"
                  title="Afficher le QR code pour écouter sur smartphone 4G/5G"
                >
                  <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Écoute Smartphone (4G/5G)</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-zinc-500 font-mono text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Compatible tous navigateurs & réseaux mobiles</span>
              </div>
            </div>

            {/* Modal / Pop-over QR Code pour Smartphone */}
            {showQr && (
              <div className="mt-4 p-4 rounded-xl bg-[#090b0d] border border-[#2d333b] flex flex-col items-center gap-3 animate-in fade-in">
                <span className="text-xs font-bold text-zinc-200">
                  Scannez ce QR Code depuis votre smartphone (en 4G/5G ou Wi-Fi)
                </span>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    fullShareUrl
                  )}`}
                  alt="QR Code Radio Pirate"
                  className="w-40 h-40 rounded-lg border-2 border-zinc-700 bg-white p-2"
                />
                <span className="font-mono text-[11px] text-[#d7b86a] select-all break-all">
                  {fullShareUrl}
                </span>
                <button
                  onClick={() => setShowQr(false)}
                  className="text-xs text-zinc-400 hover:text-white underline mt-1"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ========================================================= */}
      {/* FOOTER OFFICIEL DU SITE ART                               */}
      {/* ========================================================= */}
      <footer className="h-12 bg-[#0c0e12] border-t border-[#242930] px-4 flex items-center justify-between text-[11px] text-zinc-500">
        <div>
          <span>ART · Association pour la Recherche Théâtrale & Numérique</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Relais Audio Haute Disponibilité</span>
          <span>·</span>
          <span>No[co]de Vibe Designer Streaming Engine</span>
        </div>
      </footer>
    </div>
  );
};
