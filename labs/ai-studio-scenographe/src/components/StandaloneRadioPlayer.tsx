import React, { useState, useEffect, useRef } from 'react';
import { Radio, Volume2, VolumeX, Play, Pause, RefreshCw, Smartphone, ExternalLink, ShieldCheck, Wifi, ArrowLeft } from 'lucide-react';

interface StandaloneRadioPlayerProps {
  channelSlug: string;
  onBackToStudio?: () => void;
}

export const StandaloneRadioPlayer: React.FC<StandaloneRadioPlayerProps> = ({
  channelSlug,
  onBackToStudio,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [isLive, setIsLive] = useState(false);
  const [channelName, setChannelName] = useState(() => {
    if (channelSlug.includes('paillette')) return 'Radio Paillettes en grève';
    if (channelSlug.includes('pirate')) return 'Radio Pirate des Caraïbes';
    return `Radio /${channelSlug}`;
  });
  const [listenersCount, setListenersCount] = useState(0);
  const [bytesReceived, setBytesReceived] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [liveDuration, setLiveDuration] = useState(0);
  const [waveformBars, setWaveformBars] = useState<number[]>(() => Array(24).fill(12));

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamUrl = `/api/radio/stream/${channelSlug}`;

  // Poll status from server
  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/radio/status/${channelSlug}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setIsLive(data.isLive || data.isTesting);
            if (data.name) setChannelName(data.name);
            setListenersCount(data.listenersCount || 0);
            setAudioError(null);
          }
        } else {
          if (isMounted) {
            setIsLive(false);
            setAudioError(`Page ou canal "${channelSlug}" inactif sur le relais.`);
          }
        }
      } catch {
        if (isMounted) {
          setIsLive(false);
          setAudioError('Relais Radio local non joignable.');
        }
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [channelSlug]);

  // Duration timer
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setLiveDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Visualizer loop while playing
  useEffect(() => {
    if (!isPlaying) {
      setWaveformBars(Array(24).fill(10));
      return;
    }

    const anim = setInterval(() => {
      setWaveformBars((prev) =>
        prev.map(() => Math.floor(Math.random() * 55) + 12)
      );
    }, 120);

    return () => clearInterval(anim);
  }, [isPlaying]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Re-stamp cache buster to join live head
      audioRef.current.src = `${streamUrl}?t=${Date.now()}`;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setAudioError(null);
        })
        .catch((err) => {
          console.warn('Playback error:', err);
          setAudioError('Le flux n\'a pas encore démarré ou attend la diffusion ON AIR.');
          setIsPlaying(false);
        });
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
    if (val > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audioRef.current.muted = nextMute;
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#090b0e] text-zinc-100 flex flex-col items-center justify-center p-4 selection:bg-rose-500/30">
      {/* Hidden audio element streaming from live endpoint */}
      <audio
        ref={audioRef}
        preload="none"
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          setAudioError('Flux audio indisponible pour le moment.');
        }}
      />

      {/* Top Bar with Return to Studio */}
      {onBackToStudio && (
        <div className="w-full max-w-md mb-4 flex items-center justify-between text-xs text-zinc-400">
          <button
            onClick={onBackToStudio}
            className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors py-1 px-2.5 rounded bg-zinc-900 border border-zinc-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour à No[co]de Studio</span>
          </button>
          <span className="font-mono text-[11px] text-zinc-500">Lecteur Web Mobile</span>
        </div>
      )}

      {/* Main Player Card */}
      <div className="w-full max-w-md bg-gradient-to-b from-[#13171d] to-[#0c0e12] border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Glowing aura effect */}
        <div
          className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-opacity duration-1000 ${
            isLive ? 'bg-rose-600/20' : 'bg-cyan-600/10'
          }`}
        />

        {/* Header : Brand & Live Indicator */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center font-mono text-xs font-bold text-cyan-400">
              N[c]
            </span>
            <div>
              <div className="text-xs font-semibold text-zinc-300">No[co]de Vibe Designer</div>
              <div className="text-[10px] text-zinc-500 font-mono">Diffusion Radio Directe</div>
            </div>
          </div>

          {/* ON AIR Badge */}
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-2 border transition-all ${
              isLive
                ? 'bg-rose-950/80 text-rose-300 border-rose-700/80 shadow-lg shadow-rose-950/50'
                : 'bg-zinc-900 text-zinc-500 border-zinc-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLive ? 'bg-rose-500 animate-pulse' : 'bg-zinc-600'
              }`}
            />
            <span>{isLive ? 'ON AIR' : 'HORS LIGNE'}</span>
          </div>
        </div>

        {/* Station Title & Destination */}
        <div className="text-center my-6 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/40 text-cyan-400 border border-cyan-800/60 text-[11px] font-mono">
            <Radio className="w-3 h-3" />
            <span>/{channelSlug}</span>
          </div>

          <h1 className="text-xl font-bold tracking-tight text-white">
            {channelName}
          </h1>

          <p className="text-xs text-zinc-400">
            Flux audio sécurisé en direct de la scène
          </p>
        </div>

        {/* Real-time Waveform Bars */}
        <div className="h-16 bg-[#08090c] rounded-xl border border-zinc-850 flex items-end justify-center gap-1.5 px-4 py-2 mb-6">
          {waveformBars.map((height, i) => (
            <div
              key={i}
              className={`w-2 rounded-t transition-all duration-100 ${
                isPlaying
                  ? 'bg-gradient-to-t from-rose-600 to-amber-400'
                  : 'bg-zinc-800'
              }`}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>

        {/* Player Controls */}
        <div className="flex flex-col items-center gap-5">
          {/* Main Play/Pause Button */}
          <button
            onClick={togglePlay}
            disabled={!isLive}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all transform active:scale-95 shadow-xl ${
              isLive
                ? 'bg-gradient-to-tr from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-rose-900/40 cursor-pointer'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700'
            }`}
            title={isLive ? (isPlaying ? 'Mettre en pause' : 'Écouter le direct') : 'Radio actuellement hors ligne'}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </button>

          {/* Volume Control */}
          <div className="w-full flex items-center gap-3 px-2">
            <button
              onClick={toggleMute}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-full accent-rose-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>

        {/* Error / Offline Banner */}
        {audioError && (
          <div className="mt-5 p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/80 text-[11px] text-rose-300 text-center">
            {audioError}
          </div>
        )}

        {/* Telemetry info */}
        <div className="mt-6 pt-4 border-t border-zinc-850 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <div className="flex items-center gap-1.5">
            <Wifi className={`w-3.5 h-3.5 ${isLive ? 'text-emerald-400' : 'text-zinc-600'}`} />
            <span>{isLive ? 'Opus 128 kb/s' : 'En attente'}</span>
          </div>

          {isPlaying && (
            <div className="text-amber-400">
              En écoute : {formatTime(liveDuration)}
            </div>
          )}

          <div className="flex items-center gap-1">
            <Smartphone className="w-3 h-3 text-zinc-400" />
            <span>{listenersCount} auditeur{listenersCount > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-xs text-zinc-600 max-w-sm space-y-1">
        <p>Diffuseur No[co]de Vibe Designer officiel.</p>
        <p className="text-[11px] text-zinc-700">Audio direct sécurisé sans compression dégradante.</p>
      </div>
    </div>
  );
};
