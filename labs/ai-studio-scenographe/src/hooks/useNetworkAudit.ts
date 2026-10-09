import { useEffect, useState, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  effectiveOffline: boolean;
  isLocalNetwork: boolean;
  connectionType?: string;
  offlineTestingSummary: {
    testedAt?: string;
    enginesVerifiedOffline: string[];
    hasRemoteDependencies: boolean;
  };
}

export function useNetworkAudit() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [verifiedEngines, setVerifiedEngines] = useState<string[]>([
    'JavaScript (Canvas 2D)',
    'TypeScript (Sucrase in-memory)',
    'GLSL / WebGL',
    'Pipeline Hybride (p5 ➔ GLSL)',
    'ISF (VIDVOX Engine)',
    'WebGPU (WGSL)',
  ]);

  const isLocalNetwork = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.')
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleSimulateOffline = useCallback(() => {
    setIsSimulatedOffline((prev) => !prev);
  }, []);

  const effectiveOffline = !isOnline || isSimulatedOffline;

  return {
    isOnline,
    isSimulatedOffline,
    effectiveOffline,
    isLocalNetwork,
    toggleSimulateOffline,
    verifiedEngines,
  };
}
