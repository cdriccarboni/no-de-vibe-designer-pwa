import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Play,
  Square,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Maximize2,
  Mic,
  Sliders,
  Layers,
  ChevronDown,
  ChevronRight,
  Radio,
  ExternalLink,
  Smartphone,
  Eye,
  EyeOff,
  Trash2,
  Music,
  Waves,
  ShieldAlert,
  Send,
  HelpCircle,
  FileCode,
  Check,
  Type,
  Folder,
  FolderPlus,
  ListOrdered,
  FastForward,
  Rewind,
  Copy,
  Edit2,
  AlertOctagon,
  ArrowRight
} from 'lucide-react';
import {
  patchGraphEngine,
  PatchNode,
  PatchWire,
  PatchTab,
  NodeCategory,
  PortDataType
} from '../services/patchGraphEngine';
import { localAiEngine, CreativePromptResult } from '../services/localAiEngine';
import { radioAudioEngine } from '../services/radioAudioEngine';
import { midiDeviceEngine, MidiMappingRule, MidiLearnState } from '../services/midiDeviceEngine';
import { qlabCueEngine, QLabCue, ShowFile } from '../services/qlabCueEngine';

interface OfficialWorkspaceProps {
  onOpenRadioStudio: () => void;
  onOpenMappingStudio: () => void;
  onOpenCompanionModal: () => void;
  onOpenLiveFoleyModal: () => void;
  onOpenAbletonModal: () => void;
  onOpenSurtitrage?: () => void;
  onOpenMidiHub?: () => void;
}

interface LibraryItem {
  name: string;
  category: NodeCategory;
  desc: string;
  isExperimental?: boolean;
}

const OFFICIAL_LIBRARY_ITEMS: LibraryItem[] = [
  // 1. Audio & Broadcast
  { name: 'Radio Broadcast Bus (P00)', category: 'output', desc: 'Mixage et diffusion web sur /radio-paillettes' },
  { name: 'Micro Scène & Plateau', category: 'audio', desc: 'Entrée micro direct avec préampli et seuil' },
  { name: 'Analyseur FFT & Enveloppe', category: 'audio', desc: 'Extraction des fréquences et crêtes d’énergie' },
  { name: 'Bruitage Vivant Pirates Paillettes', category: 'audio', desc: 'Détection acoustique de gestes et d’objets' },
  { name: 'Passerelle Ableton Link', category: 'audio', desc: 'Synchronisation tempo et pistes audio' },
  { name: 'libpd (Pure Data)', category: 'audio', desc: 'Moteur audio modulaire Pure Data Vanilla' },
  { name: 'Enveloppe ADSR', category: 'audio', desc: 'Générateur d’enveloppe Gate/Attack/Decay/Sustain' },
  { name: 'Filtre audio', category: 'audio', desc: 'Filtre résonant coupe-bas, passe-bande, coupe-haut' },
  { name: 'Delay audio', category: 'audio', desc: 'Ligne à retard stéréo avec réinjection' },
  { name: 'Organic Audio', category: 'audio', desc: 'Synthèse sonore granulaire réactive' },
  { name: 'Mémo sonore', category: 'audio', desc: 'Enregistrement et lecture d’échantillons vocaux' },
  { name: 'Générateur Test Tone', category: 'audio', desc: 'Signal 440 Hz / Bruit rose de calibration' },

  // 2. Shaders & Effets (dont Shaders.zip importés)
  { name: 'Mer Phosphorescente (GLSL)', category: 'shader', desc: 'Houle marine bioluminescente raymarching' },
  { name: 'xLights Audio — Circle Wave', category: 'shader', desc: 'Archive Shaders.zip · Onde circulaire audio réactive' },
  { name: 'Cosmic Journey — Hyperespace', category: 'shader', desc: 'Archive Shaders.zip · Champ d’étoiles volumétrique 3D' },
  { name: 'Circuits — Carte Électronique', category: 'shader', desc: 'Archive Shaders.zip · Pistes luminescentes et signaux' },
  { name: 'Electrocardiogram — Pouls Vital', category: 'shader', desc: 'Archive Shaders.zip · Oscilloscope ECG battements de cœur' },
  { name: 'Great Ball Of Fire — Plasma', category: 'shader', desc: 'Archive Shaders.zip · Sphère solaire de flammes rayonnantes' },
  { name: 'Matrix — Pluie Numérique', category: 'shader', desc: 'Archive Shaders.zip · Chute verticale de caractères fluorescents' },
  { name: 'Underwater+ — Caustiques Marines', category: 'shader', desc: 'Archive Shaders.zip · Rayons sous-marins et réfraction' },
  { name: 'Total Eclipse — Couronne Solaire', category: 'shader', desc: 'Archive Shaders.zip · Disque lunaire et éruptions solaires' },
  { name: 'Shader Lab', category: 'shader', desc: 'Éditeur de fragment shader GLSL / ISF temps réel' },
  { name: 'Creative FX', category: 'shader', desc: 'Chaîne d’effets combinés et distorsions' },
  { name: 'Storm Forge', category: 'shader', desc: 'Éclairs, foudre et tempête visuelle' },
  { name: 'Bending Lab', category: 'shader', desc: 'Torsion géométrique et anamorphose' },
  { name: 'Bloom & Luminescence ISF', category: 'shader', desc: 'Éclat lumineux doux et diffusion halo' },
  { name: 'Feedback & Distorsion Temporelle', category: 'shader', desc: 'Traînées persistantes et boucle visuelle' },
  { name: 'Threshold & Silhouette Mask', category: 'shader', desc: 'Détourage seuillé noir & blanc' },
  { name: 'Optical Flow', category: 'shader', desc: 'Détection des vecteurs de mouvement caméra' },
  { name: 'Fluid Warp', category: 'shader', desc: 'Déformation fluide Navier-Stokes en direct' },

  // 3. Générateurs & Vibe
  { name: 'Système Particules Bioluminescentes', category: 'generator', desc: 'Nuage dynamique réactif au flux sonore' },
  { name: 'Simulation Fluide WebGL', category: 'generator', desc: 'Écoulement de fumée et de vagues liquides' },
  { name: 'Trame de Fils & Cordages', category: 'generator', desc: 'Structure géométrique inspirée du spectacle' },
  { name: 'Formes SDF & Ombres 3D', category: 'generator', desc: 'Rendu volumétrique haute performance' },
  { name: 'Baleine interactive', category: 'generator', desc: 'Créature organique majestueuse réactive au pointeur' },
  { name: 'Blob organique', category: 'generator', desc: 'Forme vivante déformable par le son' },
  { name: 'Flow Field / Particules', category: 'generator', desc: 'Champs vectoriels de Perlin noise' },
  { name: 'Reaction Diffusion', category: 'generator', desc: 'Motifs de Turing et textures chimiques vivantes' },
  { name: 'Ribbon Trails', category: 'generator', desc: 'Rubans lumineux et traînées cinétiques' },

  // 4. Contrôle Scène & Cues
  { name: 'Surtitrage Glypheo & Karaoké Pro', category: 'control', desc: 'Module natif de surtitrage multi-langues et karaoké' },
  { name: 'Conduite de Cues Millumin', category: 'control', desc: 'Séquenceur de scènes et déclenchement TOP' },
  { name: 'MIDI Hub Plug & Play', category: 'control', desc: 'Entrées/sorties contrôleurs et MIDI Learn' },
  { name: 'OSC I/O', category: 'control', desc: 'Passerelle Open Sound Control réseau' },
  { name: 'Art-Net / DMX', category: 'control', desc: 'Contrôle projecteurs lumière et gradateurs' },
  { name: 'Input Mapper', category: 'control', desc: 'Mise à l’échelle min/max et courbes de réponse' },
  { name: 'Sécurité Scénique PANIC', category: 'control', desc: 'Bouton d’arrêt d’urgence et fondu au noir' },

  // 5. Tracking & Mapping
  { name: 'Auto-Mapping 3s & Pinceau', category: 'mapping', desc: 'Calibration projecteur-caméra et homographie' },
  { name: 'Sortie Scène / Plein Écran', category: 'mapping', desc: 'Sortie vidéo HDMI / DisplayPort dédiée régie' },
  { name: 'NDI In / NDI Out', category: 'mapping', desc: 'Flux vidéo IP réseau sans latence' },
  { name: 'Tracking de Points', category: 'mapping', desc: 'Suivi de repères lumineux et corps sur scène' },

  // 6. Logique & Automation
  { name: 'Nombre', category: 'logic', desc: 'Valeur numérique constante ou modulable' },
  { name: 'Booléen', category: 'logic', desc: 'Interrupteur Tout-Ou-Rien (0 ou 1)' },
  { name: 'Texte', category: 'logic', desc: 'Chaîne de caractères dynamique' },
  { name: 'Addition & Maths', category: 'logic', desc: 'Opérations arithmétiques combinées' },
  { name: 'Lissage (Smooth)', category: 'logic', desc: 'Amortissement inertiel des variations' },
  { name: 'Timer & Chronomètre', category: 'logic', desc: 'Déclencheur temporisé et rampes de temps' },

  // 7. Arduino, ESP32 & Capteurs
  { name: 'AutoCode Arduino IDE', category: 'hardware', desc: 'Communication série USB avec cartes Arduino' },
  { name: 'ESP32 / Wemos Serial', category: 'hardware', desc: 'Microcontrôleur Wi-Fi / Bluetooth sans fil' },
  { name: 'GPIO I/O', category: 'hardware', desc: 'Entrées/sorties TOR et capteurs physiques' },
  { name: 'Servomoteurs', category: 'hardware', desc: 'Pilotage angulaire de moteurs pas-à-pas et servos' },
  { name: 'RFID / QR Scanner', category: 'hardware', desc: 'Détection d’objets connectés sur scène' },

  // 8. Passerelles Professionnelles
  { name: 'TWOZERO / TD Bridge', category: 'gateway', desc: 'Liaison temps réel TouchDesigner' },
  { name: 'Chataigne Bridge', category: 'gateway', desc: 'Protocole inter-logiciel universel Chataigne' },
  { name: 'Millumin Bridge', category: 'gateway', desc: 'Contrôle bidirectionnel Millumin V4' },
  { name: 'Max/MSP & Pure Data', category: 'gateway', desc: 'Sous-patchs audio et messages UDP' },

  // 9. Mobile & Companion
  { name: 'Companion Phone & Mapping', category: 'mobile', desc: 'Téléphone régie, gyroscopes et faders' },
  { name: 'Capteurs Gyroscope / Accéléromètre', category: 'mobile', desc: 'Orientation spatiale 3 axes du téléphone' },
  { name: 'Vibrations Haptiques', category: 'mobile', desc: 'Retour haptique sur TOPs de spectacle' },

  // 10. IA Locale & ML
  { name: 'Chat IA Local (Ollama)', category: 'ai', desc: 'Génération de paramètres et dialogue sans clé API' },
  { name: 'ml5 · Tracking Main', category: 'ai', desc: 'Reconnaissance des doigts et gestes sans contact' },
  { name: 'ml5 · Pose Corps Entier', category: 'ai', desc: 'Squelette corporel et silhouettes d’interprètes' },
];

export const OfficialWorkspace: React.FC<OfficialWorkspaceProps> = ({
  onOpenRadioStudio,
  onOpenMappingStudio,
  onOpenCompanionModal,
  onOpenLiveFoleyModal,
  onOpenAbletonModal,
  onOpenSurtitrage,
  onOpenMidiHub,
}) => {
  // Graphe de Patch State
  const [nodes, setNodes] = useState<PatchNode[]>(patchGraphEngine.getNodes());
  const [wires, setWires] = useState<PatchWire[]>(patchGraphEngine.getWires());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(patchGraphEngine.getSelectedNodeId());

  // Dragging node on canvas
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Creating wire connection
  const [connectingStart, setConnectingStart] = useState<{ nodeId: string; portId: string; type: PortDataType } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Canvas zoom & pan
  const [zoom, setZoom] = useState(1);
  const patchCanvasRef = useRef<HTMLDivElement>(null);

  // Library search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [showExperimental, setShowExperimental] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Timeline State
  const [isPlaying, setIsPlaying] = useState(false);
  const [timecode, setTimecode] = useState(0); // seconds
  const [activeCueIndex, setActiveCueIndex] = useState(0);

  // Vibe Preview WebGL Canvas simulation
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [previewPoints, setPreviewPoints] = useState<Array<{ x: number; y: number; id: number }>>([]);

  // Créateur Vibe + CX Prompt
  const [vibePrompt, setVibePrompt] = useState('Crée une mer phosphorescente qui réagit au son.');
  const [vibeResult, setVibeResult] = useState<CreativePromptResult | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Patch Canvases Multiples en Onglets
  const [tabs, setTabs] = useState<PatchTab[]>(patchGraphEngine.getTabs());
  const [activeTabId, setActiveTabId] = useState<string>(patchGraphEngine.getActiveTabId());

  // Conduite Hiérarchique Façon QLab
  const [activeShow, setActiveShow] = useState<ShowFile>(qlabCueEngine.getActiveShow());
  const [standbyCue, setStandbyCue] = useState<QLabCue | null>(qlabCueEngine.getStandbyCue());
  const [lastFiredCue, setLastFiredCue] = useState<QLabCue | null>(qlabCueEngine.getLastFired());
  const [qlabSearch, setQlabSearch] = useState<string>('');
  const [activeShaderOverride, setActiveShaderOverride] = useState<string | null>(null);

  // Right Panel Tab
  const [rightTab, setRightTab] = useState<'inspector' | 'qlab' | 'elements' | 'cx'>('inspector');
  const [audioRms, setAudioRms] = useState<number>(0);
  const [midiLearnState, setMidiLearnState] = useState<MidiLearnState>(midiDeviceEngine.getLearnState());
  const [midiMappings, setMidiMappings] = useState<MidiMappingRule[]>(midiDeviceEngine.getMappings());
  const [midiActivity, setMidiActivity] = useState(midiDeviceEngine.getLastActivity());

  // Sync with patch engine, QLab engine, audio levels and MIDI
  useEffect(() => {
    const unsub = patchGraphEngine.subscribe(() => {
      setTabs([...patchGraphEngine.getTabs()]);
      setActiveTabId(patchGraphEngine.getActiveTabId());
      setNodes([...patchGraphEngine.getNodes()]);
      setWires([...patchGraphEngine.getWires()]);
      setSelectedNodeId(patchGraphEngine.getSelectedNodeId());
    });
    const unsubQlab = qlabCueEngine.subscribe(() => {
      setActiveShow({ ...qlabCueEngine.getActiveShow() });
      setStandbyCue(qlabCueEngine.getStandbyCue());
      setLastFiredCue(qlabCueEngine.getLastFired());
    });
    const unsubAudio = radioAudioEngine.onLevels((l) => {
      setAudioRms(l.leftPeak);
    });
    const unsubMidi = midiDeviceEngine.subscribe(() => {
      setMidiLearnState(midiDeviceEngine.getLearnState());
      setMidiMappings([...midiDeviceEngine.getMappings()]);
      setMidiActivity(midiDeviceEngine.getLastActivity());
    });
    return () => {
      unsub();
      unsubQlab();
      unsubAudio();
      unsubMidi();
    };
  }, []);

  // Raccourcis Clavier Pro QLab (Espace = GO, Echap = PANIC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        qlabCueEngine.fireGo();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        qlabCueEngine.panic();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // WebGL / 2D Canvas rendering loop for Vibe Preview
  useEffect(() => {
    let animId: number;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const render = () => {
      time += 0.03;
      const w = canvas.width;
      const h = canvas.height;

      // Dark studio background
      ctx.fillStyle = '#090b0d';
      ctx.fillRect(0, 0, w, h);

      // Render Bioluminescent Ocean waves (responsive to audio)
      const oceanNode = nodes.find((n) => n.id === 'node-glsl-ocean');
      const waveSpeed = (oceanNode?.params.speed?.value as number) || 0.65;
      const glow = (oceanNode?.params.glowIntensity?.value as number) || 1.4;

      // Draw grid perspective
      ctx.strokeStyle = '#1d2126';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw bioluminescent waves
      for (let wave = 0; wave < 4; wave++) {
        ctx.beginPath();
        const baseH = h * 0.55 + wave * 22;
        ctx.moveTo(0, baseH);

        for (let x = 0; x < w; x += 8) {
          const y = baseH +
            Math.sin(x * 0.008 + time * waveSpeed + wave) * 24 +
            Math.cos(x * 0.02 - time * 0.8) * 12;
          ctx.lineTo(x, y);
        }

        // Bioluminescent gradient
        const grad = ctx.createLinearGradient(0, baseH - 40, 0, baseH + 60);
        grad.addColorStop(0, `rgba(56, 189, 248, ${0.15 * glow})`);
        grad.addColorStop(0.5, `rgba(16, 185, 129, ${0.45 * glow})`);
        grad.addColorStop(1, 'rgba(9, 11, 13, 0)');

        ctx.strokeStyle = wave === 0 ? `rgba(56, 189, 248, ${0.9 * glow})` : `rgba(16, 185, 129, ${0.7 * glow})`;
        ctx.lineWidth = wave === 0 ? 3 : 1.5;
        ctx.stroke();

        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Draw audio peak indicator in corner
      const vuH = Math.min(60, Math.max(4, audioRms * 60));
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(w - 24, h - 34 - vuH, 12, vuH);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [nodes]);

  // Timeline playback timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimecode((prev) => +(prev + 0.1).toFixed(1));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Handle Dragging Nodes on Canvas
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    patchGraphEngine.setSelectedNodeId(nodeId);
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || !patchCanvasRef.current) return;

    const rect = patchCanvasRef.current.getBoundingClientRect();
    setDraggingNodeId(nodeId);
    setDragOffset({
      x: (e.clientX - rect.left) / zoom - node.x,
      y: (e.clientY - rect.top) / zoom - node.y,
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!patchCanvasRef.current) return;
    const rect = patchCanvasRef.current.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / zoom;
    const currentY = (e.clientY - rect.top) / zoom;

    setMousePos({ x: currentX, y: currentY });

    if (draggingNodeId) {
      patchGraphEngine.moveNode(
        draggingNodeId,
        currentX - dragOffset.x,
        currentY - dragOffset.y
      );
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggingNodeId(null);
    setConnectingStart(null);
  };

  // Wire Connection Start
  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, portId: string, type: PortDataType) => {
    e.stopPropagation();
    setConnectingStart({ nodeId, portId, type });
  };

  // Wire Connection Drop
  const handlePortMouseUp = (e: React.MouseEvent, targetNodeId: string, targetPortId: string) => {
    e.stopPropagation();
    if (connectingStart && connectingStart.nodeId !== targetNodeId) {
      patchGraphEngine.addWire(
        connectingStart.nodeId,
        connectingStart.portId,
        targetNodeId,
        targetPortId
      );
    }
    setConnectingStart(null);
  };

  // Click on Vibe Preview to place mapping calibration point
  const handlePreviewCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1280);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 720);
    setPreviewPoints((prev) => [...prev, { x, y, id: prev.length + 1 }]);
  };

  // Envoyer prompt Vibe
  const handleSendVibePrompt = async () => {
    if (!vibePrompt.trim()) return;
    setIsSynthesizing(true);
    const res = await localAiEngine.interpretCreativePrompt(vibePrompt);
    setVibeResult(res);
    setIsSynthesizing(false);
  };

  const handleApplyVibeResult = (inNewTab = false) => {
    if (!vibeResult) return;
    patchGraphEngine.applyVibeResult(vibeResult, inNewTab);
    if (vibeResult.glslCode) {
      setActiveShaderOverride(vibeResult.glslCode);
    }
    // Enregistrer automatiquement une Cue dans la conduite QLab
    const createdCue = qlabCueEngine.addCue('patch', null);
    qlabCueEngine.renameCue(createdCue.id, `Q${qlabCueEngine.getTotalCuesCount()}`, vibeResult.title);
    setVibeResult(null);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Group library items
  const filteredLibrary = OFFICIAL_LIBRARY_ITEMS.filter((item) => {
    if (!showExperimental && item.isExperimental) return false;
    if (searchQuery.trim() && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const categories = [
    { id: 'audio', label: 'Audio & Broadcast' },
    { id: 'shader', label: 'Shaders & Effets' },
    { id: 'generator', label: 'Générateurs & Vibe' },
    { id: 'control', label: 'Contrôle & Scène' },
    { id: 'mapping', label: 'Tracking & Mapping' },
    { id: 'logic', label: 'Logique & Automation' },
    { id: 'hardware', label: 'Arduino & Capteurs' },
    { id: 'gateway', label: 'Passerelles Pro' },
    { id: 'mobile', label: 'Mobile & Companion' },
    { id: 'ai', label: 'IA Locale & ML' },
    { id: 'output', label: 'Sorties & Diffusion' },
  ];

  return (
    <div className="flex-1 min-h-0 grid grid-cols-[220px_minmax(0,1fr)_280px] gap-2 p-2 bg-[#090b0d] text-zinc-100 overflow-hidden select-none">
      {/* ========================================================= */}
      {/* PANNEAU GAUCHE : LA BIBLIOTHÈQUE NO[CO]DE (LIBRARY)       */}
      {/* ========================================================= */}
      <aside className="bg-[#171a1e] border border-[#2d333b] rounded-lg flex flex-col min-w-0 overflow-hidden shadow-lg">
        {/* En-tête Library */}
        <div className="h-9 px-2.5 border-b border-[#2d333b] flex items-center justify-between bg-[#171a1e]">
          <div className="flex items-center gap-1.5 font-bold text-[11px] text-zinc-200">
            <span>Library</span>
            <span className="text-[9px] text-[#9ba4ae] font-normal">＋ prod · ○ exp</span>
          </div>
          <button
            type="button"
            onClick={() => patchGraphEngine.resetToDefault()}
            className="px-2 py-0.5 rounded bg-[#1d2126] border border-[#2d333b] hover:border-[#d7b86a] text-[10px] text-zinc-300 transition-all"
            title="Recharger l’exemple officiel du spectacle"
          >
            Exemple
          </button>
        </div>

        {/* Barre de Recherche */}
        <div className="p-2 border-b border-[#2d333b]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-[#9ba4ae]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un bloc..."
              className="w-full bg-[#090b0d] border border-[#2d333b] rounded-md pl-7 pr-2 py-1 text-[11px] text-zinc-200 placeholder-[#9ba4ae] focus:outline-none focus:border-[#d7b86a]"
            />
          </div>
          <label className="flex items-center gap-1.5 mt-1.5 text-[10px] text-[#9ba4ae] cursor-pointer">
            <input
              type="checkbox"
              checked={showExperimental}
              onChange={(e) => setShowExperimental(e.target.checked)}
              className="rounded bg-zinc-800 border-[#2d333b] text-[#d7b86a] focus:ring-0"
            />
            <span>Afficher les expérimentaux</span>
          </label>
        </div>

        {/* Liste des sections de la Bibliothèque */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
          {categories.map((cat) => {
            const items = filteredLibrary.filter((i) => i.category === cat.id);
            if (items.length === 0) return null;
            const isCollapsed = !!collapsedSections[cat.id];

            return (
              <div key={cat.id} className="border-b border-[#2d333b]/60 pb-1.5">
                <button
                  type="button"
                  onClick={() => setCollapsedSections({ ...collapsedSections, [cat.id]: !isCollapsed })}
                  className="w-full flex items-center justify-between text-[10px] uppercase font-bold text-[#9ba4ae] hover:text-zinc-200 tracking-wider py-1"
                >
                  <span>{cat.label}</span>
                  {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {!isCollapsed && (
                  <div className="flex flex-col gap-1 mt-1">
                    {items.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => patchGraphEngine.addNodeFromLibrary({ name: item.name, category: item.category })}
                        className="group flex items-start gap-2 p-1.5 rounded-md hover:bg-[#1d2126] border border-transparent hover:border-[#2d333b] text-left transition-all"
                        title={`${item.name} — Cliquer pour ajouter au Patch Canvas`}
                      >
                        <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{
                          backgroundColor: item.category === 'shader' ? '#38bdf8' : item.category === 'audio' ? '#d7b86a' : item.category === 'output' ? '#ef4444' : '#8fa79d'
                        }} />
                        <div className="leading-tight">
                          <div className="text-[11px] font-medium text-zinc-200 group-hover:text-white">
                            {item.name}
                          </div>
                          <div className="text-[9px] text-[#9ba4ae] line-clamp-1">
                            {item.desc}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* ========================================================= */}
      {/* ZONE CENTRALE : PATCH CANVAS + PREVIEW + VIBE + TIMELINE  */}
      {/* ========================================================= */}
      <main className="min-w-0 min-h-0 flex flex-col gap-2 overflow-hidden">
        {/* ÉTAGE SUPÉRIEUR : PATCH CANVAS & PREVIEW (VIBE MONITOR) */}
        <div className="flex-1 min-h-[300px] grid grid-cols-[minmax(340px,1.15fr)_minmax(300px,0.85fr)] gap-2 overflow-hidden">
          {/* ==================== PATCH CANVAS ==================== */}
          <section
            ref={patchCanvasRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className="bg-[#171a1e] border border-[#2d333b] rounded-lg flex flex-col min-w-0 overflow-hidden relative shadow-lg"
          >
            {/* Header Patch Canvas avec Onglets Multiples (Sub-Patches) */}
            <div className="h-9 px-2 border-b border-[#2d333b] flex items-center justify-between bg-[#171a1e] shrink-0 z-20 gap-2">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
                {tabs.map((tab) => (
                  <div
                    key={tab.id}
                    onClick={() => patchGraphEngine.setActiveTab(tab.id)}
                    className={`group px-2.5 py-1 rounded text-[11px] font-semibold border flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-all shrink-0 ${
                      tab.id === activeTabId
                        ? 'bg-[#1d2126] border-[#d7b86a] text-white shadow'
                        : 'bg-[#101214] border-[#2d333b] text-[#9ba4ae] hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: tab.id === activeTabId ? '#d7b86a' : '#454d57' }}
                    />
                    <span className="truncate max-w-[125px]">{tab.title}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        patchGraphEngine.sendTabToTimeline(tab.id);
                      }}
                      className={`text-[9px] px-1 rounded transition-colors ${
                        tab.isTimelineTrack ? 'text-[#8fa79d] font-bold bg-[#8fa79d]/20' : 'text-zinc-600 hover:text-zinc-400'
                      }`}
                      title={tab.isTimelineTrack ? 'Piste active dans la Timeline' : 'Ajouter à la Timeline'}
                    >
                      TL
                    </button>
                    {tabs.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          patchGraphEngine.closeTab(tab.id);
                        }}
                        className="w-3.5 h-3.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-red-300 flex items-center justify-center text-[10px]"
                        title="Fermer l'onglet (le contenu reste archivé)"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => patchGraphEngine.createTab()}
                  className="px-2 py-1 rounded bg-[#101214] border border-[#2d333b] hover:border-[#8fa79d] text-zinc-300 hover:text-white text-xs font-bold shrink-0"
                  title="Nouveau Patch Canvas (+)"
                >
                  +
                </button>
              </div>

              {/* Contrôles de Canvas : Renommer, Dupliquer, Sous-Patch, Zoom */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => patchGraphEngine.duplicateTab(activeTabId)}
                  className="p-1 h-6 rounded bg-[#1d2126] border border-[#2d333b] hover:border-[#d7b86a] text-zinc-300"
                  title="Dupliquer l'onglet actuel"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const active = patchGraphEngine.getActiveTab();
                    const newTitle = prompt('Renommer le Patch Canvas :', active.title);
                    if (newTitle) patchGraphEngine.renameTab(active.id, newTitle);
                  }}
                  className="p-1 h-6 rounded bg-[#1d2126] border border-[#2d333b] hover:border-[#d7b86a] text-zinc-300"
                  title="Renommer l'onglet actuel"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const active = patchGraphEngine.getActiveTab();
                    patchGraphEngine.groupNodesToSubPatch(active.nodes.map(n => n.id), `${active.title} (Sous-Patch)`);
                  }}
                  className="px-1.5 h-6 rounded bg-[#1d2126] border border-[#2d333b] hover:border-[#a855f7] text-[10px] text-zinc-300 font-semibold"
                  title="Regrouper les blocs en sous-patch"
                >
                  Sous-Patch
                </button>
                <div className="h-4 w-px bg-[#2d333b] mx-0.5" />
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(1)))}
                  className="w-6 h-6 rounded bg-[#1d2126] border border-[#2d333b] hover:border-zinc-500 text-zinc-300 flex items-center justify-center text-xs"
                  title="Zoom −"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="px-1.5 h-6 rounded bg-[#1d2126] border border-[#2d333b] text-[10px] text-zinc-300 font-mono"
                  title="Réinitialiser zoom 100%"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.1).toFixed(1)))}
                  className="w-6 h-6 rounded bg-[#1d2126] border border-[#2d333b] hover:border-zinc-500 text-zinc-300 flex items-center justify-center text-xs"
                  title="Zoom +"
                >
                  +
                </button>
              </div>
            </div>

            {/* Espace de Patch (Canvas avec grille et câbles Bézier) */}
            <div
              className="flex-1 relative overflow-hidden bg-[radial-gradient(#2d333b_1px,transparent_1px)] bg-[size:24px_24px] bg-[#0f1115]"
              style={{ transformOrigin: '0 0' }}
            >
              {/* Câbles vectoriels Bézier SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {wires.map((wire) => {
                  const srcNode = nodes.find((n) => n.id === wire.sourceNodeId);
                  const tgtNode = nodes.find((n) => n.id === wire.targetNodeId);
                  if (!srcNode || !tgtNode) return null;

                  // Positions calculées des ports
                  const sx = (srcNode.x + 190) * zoom;
                  const sy = (srcNode.y + 40) * zoom;
                  const tx = tgtNode.x * zoom;
                  const ty = (tgtNode.y + 40) * zoom;

                  const dx = Math.abs(tx - sx) * 0.5;
                  const path = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;

                  return (
                    <g key={wire.id}>
                      {/* Lueur de câble actif */}
                      <path
                        d={path}
                        fill="none"
                        stroke="#d7b86a"
                        strokeWidth="5"
                        strokeOpacity="0.25"
                      />
                      {/* Câble principal animé */}
                      <path
                        d={path}
                        fill="none"
                        stroke={wire.sourceNodeId.includes('radio') ? '#ef4444' : '#8fa79d'}
                        strokeWidth="2.5"
                        strokeDasharray="6 4"
                        className="animate-[dash_1s_linear_infinite]"
                      />
                    </g>
                  );
                })}

                {/* Câble en cours de tracé */}
                {connectingStart && (() => {
                  const srcNode = nodes.find((n) => n.id === connectingStart.nodeId);
                  if (!srcNode) return null;
                  const sx = (srcNode.x + 190) * zoom;
                  const sy = (srcNode.y + 40) * zoom;
                  const tx = mousePos.x * zoom;
                  const ty = mousePos.y * zoom;
                  const dx = Math.abs(tx - sx) * 0.5;
                  const path = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
                  return (
                    <path
                      d={path}
                      fill="none"
                      stroke="#d7b86a"
                      strokeWidth="2.5"
                      strokeDasharray="4 4"
                    />
                  );
                })()}
              </svg>

              {/* Blocs Nœuds (Nodes) */}
              {nodes.map((node) => {
                const isSelected = node.id === selectedNodeId;
                return (
                  <div
                    key={node.id}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    style={{
                      transform: `translate(${node.x * zoom}px, ${node.y * zoom}px) scale(${zoom})`,
                      transformOrigin: '0 0',
                    }}
                    className={`absolute w-48 bg-[#1d2126] border rounded-lg shadow-xl z-20 transition-shadow ${
                      isSelected
                        ? 'border-[#d7b86a] ring-1 ring-[#d7b86a]/40 shadow-[#d7b86a]/10'
                        : 'border-[#2d333b] hover:border-zinc-500'
                    } ${node.isBypassed ? 'opacity-60 border-dashed' : ''}`}
                  >
                    {/* Header du bloc */}
                    <div className="px-2.5 py-1.5 border-b border-[#2d333b] flex items-center justify-between cursor-grab active:cursor-grabbing bg-[#171a1e] rounded-t-lg">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: node.color || '#d7b86a' }} />
                        <span className="text-[11px] font-bold text-zinc-100 truncate">
                          {node.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); patchGraphEngine.toggleBypass(node.id); }}
                          className={`p-0.5 rounded text-[9px] ${node.isBypassed ? 'text-amber-400' : 'text-zinc-400 hover:text-white'}`}
                          title="Bypass / Mute"
                        >
                          {node.isBypassed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {/* Ports In & Out */}
                    <div className="px-2 py-1.5 flex flex-col gap-1 border-b border-[#2d333b]/50">
                      {node.inputs.map((port) => (
                        <div key={port.id} className="flex items-center justify-between text-[9px]">
                          <div className="flex items-center gap-1.5">
                            <span
                              onMouseUp={(e) => handlePortMouseUp(e, node.id, port.id)}
                              className="w-2.5 h-2.5 rounded-full border border-zinc-400 bg-[#090b0d] hover:bg-[#d7b86a] hover:scale-125 transition-all cursor-crosshair"
                              title={`Port Entrée: ${port.name}`}
                            />
                            <span className="text-zinc-400">{port.name}</span>
                          </div>
                        </div>
                      ))}
                      {node.outputs.map((port) => (
                        <div key={port.id} className="flex items-center justify-end text-[9px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-400">{port.name}</span>
                            <span
                              onMouseDown={(e) => handlePortMouseDown(e, node.id, port.id, port.type)}
                              className="w-2.5 h-2.5 rounded-full border border-zinc-400 bg-[#090b0d] hover:bg-[#d7b86a] hover:scale-125 transition-all cursor-crosshair"
                              title={`Port Sortie: ${port.name}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Paramètres rapides sur le bloc */}
                    <div className="p-2 flex flex-col gap-1.5 text-[9px]">
                      {Object.values(node.params).slice(0, 2).map((param) => (
                        <div key={param.key} className="flex flex-col gap-0.5">
                          <div className="flex justify-between text-[#9ba4ae]">
                            <span>{param.label}</span>
                            <span className="font-mono text-zinc-300">{param.value}</span>
                          </div>
                          {param.type === 'slider' && (
                            <input
                              type="range"
                              min={param.min || 0}
                              max={param.max || 1}
                              step={param.step || 0.05}
                              value={param.value as number}
                              onChange={(e) => patchGraphEngine.setParam(node.id, param.key, parseFloat(e.target.value))}
                              className="h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#d7b86a]"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ==================== PREVIEW (VIBE STAGE MONITOR) ==================== */}
          <section className="bg-[#171a1e] border border-[#2d333b] rounded-lg flex flex-col min-w-0 overflow-hidden shadow-lg">
            {/* Header Preview */}
            <div className="h-9 px-2.5 border-b border-[#2d333b] flex items-center justify-between bg-[#171a1e] shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[11px] text-zinc-200">Preview</span>
                <span className="text-[9px] text-[#8fa79d] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8fa79d] animate-pulse"></span>
                  <span>Aperçu Plateau (1280×720)</span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onOpenMappingStudio}
                  className="px-2 py-0.5 rounded bg-[#1d2126] border border-[#2d333b] hover:border-[#8fa79d] text-[10px] text-[#8fa79d] font-semibold flex items-center gap-1"
                  title="Ouvrir le studio d'auto-mapping vidéo 3 secondes"
                >
                  <Layers className="w-3 h-3" />
                  <span>✦ Magic Mapping</span>
                </button>
              </div>
            </div>

            {/* Canvas Rendu Temps Réel */}
            <div className="flex-1 relative bg-[#090b0d] flex items-center justify-center overflow-hidden">
              <canvas
                ref={previewCanvasRef}
                width={1280}
                height={720}
                onClick={handlePreviewCanvasClick}
                className="w-full h-full object-contain cursor-crosshair"
                title="Cliquer pour placer un point d’ancrage de mapping"
              />

              {/* Points de calibration affichés sur l'image */}
              {previewPoints.map((pt) => (
                <div
                  key={pt.id}
                  style={{ left: `${(pt.x / 1280) * 100}%`, top: `${(pt.y / 720) * 100}%` }}
                  className="absolute w-4 h-4 rounded-full border-2 border-white bg-black/60 text-[8px] font-bold text-white flex items-center justify-center -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                >
                  {pt.id}
                </div>
              ))}
            </div>

            {/* Footer Preview */}
            <div className="h-8 px-2.5 border-t border-[#2d333b] flex items-center justify-between bg-[#171a1e] text-[10px] text-[#9ba4ae]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-zinc-300">1280×720 · 60 fps</span>
                <span>GLSL / Raymarching</span>
              </div>
              {previewPoints.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPreviewPoints([])}
                  className="hover:text-red-400 transition-colors"
                >
                  Effacer les points ({previewPoints.length})
                </button>
              )}
            </div>
          </section>
        </div>

        {/* ========================================================= */}
        {/* ÉTAGE INTERMÉDIAIRE : CRÉATEUR (VIBE + CX PROMPT)        */}
        {/* ========================================================= */}
        <section className="bg-[#171a1e] border border-[#2d333b] rounded-lg p-2.5 flex flex-col gap-2 shrink-0 shadow-md">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2 font-bold text-zinc-200">
              <Sparkles className="w-3.5 h-3.5 text-[#d7b86a]" />
              <span>Créateur Vibe + CX</span>
              <span className="text-[9px] text-[#9ba4ae] font-normal font-mono">
                Entrée : Envoyer · Fonctionne 100% Hors-Ligne sans clé API
              </span>
            </div>
            <div className="text-[10px] text-[#8fa79d] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8fa79d]"></span>
              <span>Synthèse Procédurale & Modèles Locaux (Ollama)</span>
            </div>
          </div>

          {/* Suggestions d'intentions scénographiques rapides */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[10px]">
            <span className="text-[#9ba4ae] shrink-0 font-medium">Exemples rapides :</span>
            {[
              "Crée l'ombre d'un pirate qui s'en va au loin parmi une multitude d'ombres fantomatiques.",
              "Crée une mer phosphorescente qui réagit au son.",
              "Créature lumineuse majestueuse ondulant sous l'eau avec bloom.",
              "Bruitage interactif de sabre & détection de chocs acoustiques.",
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setVibePrompt(preset);
                  setIsSynthesizing(true);
                  localAiEngine.interpretCreativePrompt(preset).then((r) => {
                    setVibeResult(r);
                    setIsSynthesizing(false);
                  });
                }}
                className="px-2 py-0.5 rounded bg-[#101214] border border-[#2d333b] hover:border-[#d7b86a] text-zinc-300 hover:text-white shrink-0 whitespace-nowrap transition-colors"
              >
                {idx === 0 ? "Ombres de pirates au loin" : idx === 1 ? "Mer phosphorescente" : idx === 2 ? "Créature bioluminescente" : "Bruitage de sabre"}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <textarea
              rows={2}
              value={vibePrompt}
              onChange={(e) => setVibePrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendVibePrompt();
                }
              }}
              placeholder="Ex. : Crée l'ombre d'un pirate qui s'en va au loin parmi une multitude d'ombres fantomatiques."
              className="flex-1 bg-[#090b0d] border border-[#2d333b] rounded-md p-2 text-xs text-zinc-100 placeholder-[#9ba4ae] resize-none focus:outline-none focus:border-[#d7b86a]"
            />

            <button
              type="button"
              onClick={handleSendVibePrompt}
              disabled={isSynthesizing}
              className="px-4 bg-[#1d2126] border border-[#2d333b] hover:border-[#d7b86a] hover:bg-[#d7b86a] hover:text-black rounded-md font-bold text-xs text-zinc-200 flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSynthesizing ? 'Synthèse...' : 'Envoyer'}</span>
            </button>
          </div>

          {/* Résultat de la synthèse avec confirmation Appliquer / Annuler */}
          {vibeResult && (
            <div className="bg-[#1d2126] border border-[#d7b86a]/60 rounded-md p-2.5 flex flex-col gap-2 text-xs animate-in fade-in">
              <div className="flex items-start justify-between gap-3">
                <div className="leading-tight">
                  <span className="font-bold text-[#d7b86a]">{vibeResult.title} : </span>
                  <span className="text-zinc-200">{vibeResult.explanation}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleApplyVibeResult(false)}
                    className="px-2.5 py-1 bg-[#d7b86a] text-black font-bold rounded text-xs hover:bg-[#e4ca86] transition-all"
                    title="Remplacer ou enrichir le Patch Canvas actuel"
                  >
                    Appliquer à cet Onglet
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyVibeResult(true)}
                    className="px-2.5 py-1 bg-[#101214] border border-[#8fa79d] text-[#8fa79d] hover:bg-[#8fa79d] hover:text-black font-bold rounded text-xs transition-all"
                    title="Créer un nouvel onglet sans toucher aux autres créations"
                  >
                    + Nouvel Onglet
                  </button>
                  <button
                    type="button"
                    onClick={() => setVibeResult(null)}
                    className="px-2 py-1 text-zinc-400 hover:text-white"
                  >
                    Annuler
                  </button>
                </div>
              </div>

              {/* Entrées facultatives (non imposées) */}
              {vibeResult.optionalInputs && vibeResult.optionalInputs.length > 0 && (
                <div className="pt-1.5 border-t border-[#2d333b]/60 flex items-center gap-2 text-[10px] text-[#9ba4ae]">
                  <span className="font-semibold text-zinc-400">Entrées facultatives (non imposées) :</span>
                  <div className="flex items-center gap-1">
                    {vibeResult.optionalInputs.map((opt, oIdx) => (
                      <span key={oIdx} className="px-1.5 py-0.5 rounded bg-[#101214] border border-[#2d333b] text-zinc-300">
                        {opt}
                      </span>
                    ))}
                  </div>
                  <span className="text-emerald-400 font-medium ml-auto">✓ Rendu 100% autonome</span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* ÉTAGE INFÉRIEUR : TIMELINE MULTI-PISTES DE SPECTACLE     */}
        {/* ========================================================= */}
        <section className="h-44 bg-[#171a1e] border border-[#2d333b] rounded-lg flex flex-col min-w-0 overflow-hidden shrink-0 shadow-lg">
          {/* Toolbar Timeline */}
          <div className="h-9 px-2.5 border-b border-[#2d333b] flex items-center justify-between bg-[#171a1e]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-6 h-6 rounded bg-[#1d2126] border border-[#2d333b] hover:border-[#8fa79d] text-zinc-200 flex items-center justify-center text-xs"
                title={isPlaying ? 'Pause' : 'Lecture'}
              >
                {isPlaying ? <Square className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-[#8fa79d]" />}
              </button>
              <button
                type="button"
                onClick={() => { setIsPlaying(false); setTimecode(0); }}
                className="w-6 h-6 rounded bg-[#1d2126] border border-[#2d333b] hover:border-zinc-500 text-zinc-400 flex items-center justify-center text-xs"
                title="Arrêt & Début"
              >
                ■
              </button>
              <span className="font-mono text-xs font-bold text-zinc-200 bg-[#090b0d] px-2 py-0.5 rounded border border-[#2d333b]">
                {Math.floor(timecode / 60).toString().padStart(2, '0')}:
                {(timecode % 60).toFixed(1).padStart(4, '0')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveCueIndex((i) => Math.max(0, i - 1))}
                className="px-2 py-0.5 rounded bg-[#1d2126] border border-[#2d333b] text-[10px] text-zinc-300"
              >
                ◀ Cue
              </button>
              <button
                type="button"
                onClick={() => setActiveCueIndex((i) => i + 1)}
                className="px-3 py-0.5 rounded bg-[#8fa79d] text-black font-bold text-[10px] hover:bg-[#a0b8af]"
              >
                GO (Cue {activeCueIndex + 1})
              </button>
              <button
                type="button"
                onClick={() => setActiveCueIndex((i) => i + 1)}
                className="px-2 py-0.5 rounded bg-[#1d2126] border border-[#2d333b] text-[10px] text-zinc-300"
              >
                Cue ▶
              </button>
              <button
                type="button"
                onClick={() => { setIsPlaying(false); }}
                className="px-2 py-0.5 rounded bg-red-950/80 border border-red-500 text-red-200 text-[10px] font-bold hover:bg-red-900"
              >
                PANIC
              </button>
            </div>
          </div>

          {/* Grille des pistes Timeline */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden bg-[#090b0d] relative">
            {/* Playhead Curseur */}
            <div
              style={{ left: `${80 + timecode * 14}px` }}
              className="absolute top-0 bottom-0 w-0.5 bg-[#d7b86a] z-30 pointer-events-none"
            >
              <div className="w-2.5 h-2.5 bg-[#d7b86a] -translate-x-[4px] -translate-y-0.5 rounded-sm" />
            </div>

            <div className="min-w-[800px] h-full flex flex-col">
              {/* Piste 1 : Vidéo Plateau */}
              <div className="h-7 border-b border-[#2d333b]/60 flex items-center">
                <span className="w-20 px-2 text-[10px] text-[#9ba4ae] border-r border-[#2d333b] truncate">
                  Vidéo Vibe
                </span>
                <div className="flex-1 relative h-full">
                  <div className="absolute left-6 top-1 h-5 w-48 rounded bg-[#1d2126] border border-[#8fa79d]/50 px-2 flex items-center text-[9px] text-zinc-200">
                    Clip 1 · Rendu 1280x720
                  </div>
                </div>
              </div>

              {/* Piste 2 : Mer Phosphorescente (GLSL) */}
              <div className="h-7 border-b border-[#2d333b]/60 flex items-center">
                <span className="w-20 px-2 text-[10px] text-[#9ba4ae] border-r border-[#2d333b] truncate">
                  GLSL Ocean
                </span>
                <div className="flex-1 relative h-full">
                  <div className="absolute left-10 top-1 h-5 w-64 rounded bg-[#1d2126] border border-[#38bdf8]/60 px-2 flex items-center text-[9px] text-[#38bdf8]">
                    Houle Bioluminescente Réactive
                  </div>
                </div>
              </div>

              {/* Piste 3 : Audio In / Bruitage Vivant */}
              <div className="h-7 border-b border-[#2d333b]/60 flex items-center">
                <span className="w-20 px-2 text-[10px] text-[#9ba4ae] border-r border-[#2d333b] truncate">
                  Audio Micro
                </span>
                <div className="flex-1 relative h-full">
                  <div className="absolute left-2 top-1 h-5 w-80 rounded bg-[#1d2126] border border-[#d7b86a]/60 px-2 flex items-center text-[9px] text-[#d7b86a]">
                    Micro Plateau · Détection Crête
                  </div>
                </div>
              </div>

              {/* Piste 4 : Radio On Air (P00) */}
              <div className="h-7 border-b border-[#2d333b]/60 flex items-center">
                <span className="w-20 px-2 text-[10px] text-red-400 border-r border-[#2d333b] truncate">
                  Radio P00
                </span>
                <div className="flex-1 relative h-full">
                  <div className="absolute left-16 top-1 h-5 w-72 rounded bg-red-950/60 border border-red-500/80 px-2 flex items-center text-[9px] text-red-200">
                    Radio Paillettes en grève (/radio-paillettes)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* PANNEAU DROIT : INSPECTEUR & HISTORIQUE CX               */}
      {/* ========================================================= */}
      <aside className="bg-[#171a1e] border border-[#2d333b] rounded-lg flex flex-col min-w-0 overflow-hidden shadow-lg">
        {/* Onglets Inspecteur / Éléments / CX Chat */}
        <div className="h-9 px-2 border-b border-[#2d333b] flex items-center justify-between bg-[#171a1e]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setRightTab('inspector')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                rightTab === 'inspector'
                  ? 'bg-[#1d2126] text-white border border-[#2d333b]'
                  : 'text-[#9ba4ae] hover:text-white'
              }`}
            >
              Inspecteur
            </button>
            <button
              type="button"
              onClick={() => setRightTab('elements')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                rightTab === 'elements'
                  ? 'bg-[#1d2126] text-white border border-[#2d333b]'
                  : 'text-[#9ba4ae] hover:text-white'
              }`}
            >
              Éléments
            </button>
            <button
              type="button"
              onClick={() => setRightTab('cx')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                rightTab === 'cx'
                  ? 'bg-[#1d2126] text-[#d7b86a] border border-[#2d333b]'
                  : 'text-[#9ba4ae] hover:text-white'
              }`}
            >
              Historique CX
            </button>
          </div>
        </div>

        {/* Corps de l'onglet actif */}
        <div className="flex-1 overflow-y-auto p-3 text-xs">
          {rightTab === 'inspector' && (
            <div>
              {selectedNode ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[#2d333b] pb-2">
                    <div>
                      <div className="font-bold text-zinc-100 text-sm">{selectedNode.name}</div>
                      <div className="text-[10px] text-[#9ba4ae] font-mono">{selectedNode.id}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => patchGraphEngine.removeNode(selectedNode.id)}
                      className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-red-950/30"
                      title="Supprimer ce nœud"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Boutons d'accès direct au Studio selon le type de node */}
                  {selectedNode.type === 'radio-broadcast' && (
                    <button
                      type="button"
                      onClick={onOpenRadioStudio}
                      className="w-full py-1.5 px-2 bg-red-950/70 border border-red-500 rounded-md text-red-200 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-red-900 transition-all"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Ouvrir Studio Broadcast Radio (P00)</span>
                    </button>
                  )}

                  {selectedNode.type === 'companion-control' && (
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={onOpenMappingStudio}
                        className="w-full py-1.5 px-2 bg-[#1d2126] border border-[#8fa79d] rounded-md text-[#8fa79d] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#8fa79d] hover:text-black transition-all"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Ouvrir Auto-Mapping 3s</span>
                      </button>
                      <button
                        type="button"
                        onClick={onOpenCompanionModal}
                        className="w-full py-1.5 px-2 bg-[#1d2126] border border-[#2d333b] rounded-md text-zinc-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:border-zinc-500"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Associer Téléphone (QR / PIN)</span>
                      </button>
                    </div>
                  )}

                  {selectedNode.type === 'audio-input' && (
                    <button
                      type="button"
                      onClick={onOpenLiveFoleyModal}
                      className="w-full py-1.5 px-2 bg-[#1d2126] border border-cyan-500 rounded-md text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-cyan-950/40"
                    >
                      <Waves className="w-3.5 h-3.5" />
                      <span>Studio Bruitage Vivant & TOPs</span>
                    </button>
                  )}

                  {(selectedNode.type.includes('surtitre') || selectedNode.type.includes('cue')) && onOpenSurtitrage && (
                    <button
                      type="button"
                      onClick={onOpenSurtitrage}
                      className="w-full py-1.5 px-2 bg-[#1d2126] border border-[#8fa79d] rounded-md text-[#8fa79d] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#8fa79d] hover:text-black transition-all"
                    >
                      <Type className="w-3.5 h-3.5" />
                      <span>Ouvrir Surtitrage & Karaoké Pro</span>
                    </button>
                  )}

                  {(selectedNode.type.includes('midi') || selectedNode.name.includes('MIDI') || selectedNode.type === 'control') && onOpenMidiHub && (
                    <button
                      type="button"
                      onClick={onOpenMidiHub}
                      className="w-full py-1.5 px-2 bg-[#1d2126] border border-[#d7b86a] rounded-md text-[#d7b86a] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#d7b86a] hover:text-black transition-all"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Ouvrir Hub MIDI Plug & Play & Learn</span>
                    </button>
                  )}

                  {/* Paramètres interactifs avec MIDI LEARN */}
                  <div className="flex flex-col gap-2.5 mt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-[#9ba4ae] tracking-wider">
                        Paramètres du Bloc
                      </span>
                      {onOpenMidiHub && (
                        <button
                          type="button"
                          onClick={onOpenMidiHub}
                          className="text-[9px] text-[#d7b86a] hover:underline flex items-center gap-1 font-semibold"
                        >
                          <Sliders className="w-2.5 h-2.5" />
                          <span>Hub MIDI ({midiMappings.length})</span>
                        </button>
                      )}
                    </div>
                    {Object.values(selectedNode.params).map((p) => {
                      const isMapped = midiMappings.find(
                        (m) => m.targetNodeId === selectedNode.id && m.targetParamKey === p.key
                      );
                      const isLearningThis =
                        midiLearnState.isActive &&
                        midiLearnState.targetNodeId === selectedNode.id &&
                        midiLearnState.targetParamKey === p.key;

                      return (
                        <div key={p.key} className="flex flex-col gap-1.5 bg-[#1d2126] p-2.5 rounded-md border border-[#2d333b]">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-zinc-200 font-semibold">{p.label}</span>
                            <span className="text-[#d7b86a] font-mono text-[10px]">{String(p.value)}</span>
                          </div>

                          {p.type === 'slider' && (
                            <input
                              type="range"
                              min={p.min || 0}
                              max={p.max || 1}
                              step={p.step || 0.05}
                              value={p.value as number}
                              onChange={(e) => patchGraphEngine.setParam(selectedNode.id, p.key, parseFloat(e.target.value))}
                              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#d7b86a]"
                            />
                          )}
                          {p.type === 'toggle' && (
                            <button
                              type="button"
                              onClick={() => patchGraphEngine.setParam(selectedNode.id, p.key, !p.value)}
                              className={`py-1 px-2 rounded text-[10px] font-bold ${
                                p.value ? 'bg-[#8fa79d] text-black' : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {p.value ? 'ACTIF' : 'INACTIF'}
                            </button>
                          )}
                          {p.type === 'select' && p.options && (
                            <select
                              value={String(p.value)}
                              onChange={(e) => patchGraphEngine.setParam(selectedNode.id, p.key, e.target.value)}
                              className="bg-[#090b0d] border border-[#2d333b] text-zinc-200 text-[10px] rounded p-1"
                            >
                              {p.options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          )}

                          {/* Contrôle MIDI LEARN 1-Clic par paramètre */}
                          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 text-[10px]">
                            {isLearningThis ? (
                              <div className="flex items-center justify-between w-full bg-amber-950/60 border border-amber-500/80 rounded px-1.5 py-0.5">
                                <span className="text-amber-200 font-bold animate-pulse flex items-center gap-1 text-[9px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                                  Tourne un bouton / touche...
                                </span>
                                <button
                                  type="button"
                                  onClick={() => midiDeviceEngine.cancelMidiLearn()}
                                  className="text-[9px] text-amber-400 hover:text-white underline ml-1"
                                >
                                  Annuler
                                </button>
                              </div>
                            ) : isMapped ? (
                              <div className="flex items-center justify-between w-full bg-emerald-950/50 border border-emerald-500/60 rounded px-1.5 py-0.5">
                                <span className="text-emerald-300 font-mono font-semibold flex items-center gap-1 text-[9px]">
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>{isMapped.messageType.toUpperCase()} {isMapped.number} (Ch {isMapped.channel})</span>
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => midiDeviceEngine.startMidiLearn(selectedNode.id, p.key)}
                                    className="text-[9px] text-zinc-400 hover:text-[#d7b86a]"
                                    title="Réassigner ce paramètre"
                                  >
                                    Re-Learn
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => midiDeviceEngine.removeMapping(isMapped.id)}
                                    className="text-[9px] text-red-400 hover:text-red-300 ml-1"
                                    title="Supprimer l'association MIDI"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between w-full">
                                <span className="text-zinc-500 text-[9px]">Sans MIDI</span>
                                <button
                                  type="button"
                                  onClick={() => midiDeviceEngine.startMidiLearn(selectedNode.id, p.key)}
                                  className="px-1.5 py-0.5 rounded bg-zinc-800/80 hover:bg-[#d7b86a] hover:text-black text-zinc-300 border border-zinc-700 text-[9px] font-bold transition-all flex items-center gap-1"
                                  title="Associer ce paramètre à un contrôleur MIDI"
                                >
                                  <Sliders className="w-2.5 h-2.5" />
                                  <span>MIDI Learn</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-zinc-400 text-center py-8">
                  Sélectionne un bloc dans le Patch Canvas pour modifier ses paramètres.
                </div>
              )}
            </div>
          )}

          {rightTab === 'elements' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold text-[#9ba4ae] tracking-wider mb-1">
                Nœuds Actifs dans le Patch ({nodes.length})
              </span>
              {nodes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => patchGraphEngine.setSelectedNodeId(n.id)}
                  className={`w-full text-left p-2 rounded-md border flex items-center justify-between transition-all ${
                    n.id === selectedNodeId
                      ? 'bg-[#1d2126] border-[#d7b86a] text-white'
                      : 'border-[#2d333b] hover:bg-[#1d2126] text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: n.color || '#d7b86a' }} />
                    <span className="font-semibold">{n.name}</span>
                  </div>
                  <span className="text-[9px] text-[#9ba4ae] font-mono">{n.category}</span>
                </button>
              ))}
            </div>
          )}

          {rightTab === 'cx' && (
            <div className="flex flex-col gap-2.5">
              <div className="bg-[#1d2126] p-2 rounded border border-[#2d333b] text-[11px] leading-relaxed">
                <span className="font-bold text-[#d7b86a]">Contexte Artistique :</span>
                <p className="mt-1 text-zinc-300">
                  Spectacle Pirates Paillettes. Cues de didascalies connectés. L'activation de la Radio bascule automatiquement le voyant ON AIR en régie.
                </p>
              </div>

              <div className="bg-[#1d2126] p-2 rounded border border-[#2d333b] text-[11px]">
                <span className="font-bold text-[#8fa79d]">Moteur Local Actif :</span>
                <div className="mt-1 text-zinc-300">
                  Synthèse procédurale déterministe autonome + Ollama. Zéro appel externe payant.
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
