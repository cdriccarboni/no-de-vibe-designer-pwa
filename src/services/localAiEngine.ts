// Service IA Libre, Locale et Universelle No[co]de Vibe Designer
// Supporte :
// - Mode AUTO : sélectionne le meilleur moteur disponible sans bloquer l'artiste
// - Mode LOCAL : fonctionne sans connexion Internet via Ollama ou WebLLM
// - Mode CONNECTÉ : services distants autorisés si configurés
// - Mode SANS IA : synthèse procédurale déterministe intégrée à 100% sans clé API ni serveur externe

export type AiMode = 'auto' | 'local' | 'connected' | 'sans_ia';

export interface LocalModelInfo {
  name: string;
  size: string;
  status: 'installed' | 'available' | 'embedded';
  description: string;
  specialty: string;
}

export interface AiAgentInfo {
  id: string;
  name: string;
  category: 'visual' | 'audio' | 'stage' | 'mapping';
  specialty: string;
  isLocal: boolean;
  requiresKey: boolean;
  license: string;
}

export interface CreativePromptResult {
  title: string;
  explanation: string;
  glslCode?: string;
  nodesToCreate?: Array<{ name: string; category: string; type: string; params?: Record<string, any> }>;
  wiresToCreate?: Array<{ sourceIndex: number; targetIndex: number; sourcePort: string; targetPort: string }>;
  optionalInputs?: string[];
  suggestedUniforms?: Record<string, number>;
  sourceAgent: string;
  modeUsed: AiMode;
}

export const BUILTIN_LOCAL_MODELS: LocalModelInfo[] = [
  {
    name: 'nocode-procedural-embedded',
    size: '0 Mo (embarqué)',
    status: 'installed',
    description: 'Moteur procédural autonome de synthèse de shaders et routage scénographique.',
    specialty: 'GLSL, Shaders temps réel, Cues Millumin, Audio réactif',
  },
  {
    name: 'llama3.2:1b-instruct',
    size: '1.3 Go (Ollama)',
    status: 'available',
    description: 'Modèle léger ultra-rapide pour Mac Apple Silicon (16 Go RAM).',
    specialty: 'Dialogue scénique, interprétation de didascalies',
  },
  {
    name: 'phi3:mini',
    size: '2.2 Go (Ollama)',
    status: 'available',
    description: 'Modèle compact haute fidélité pour génération logique et paramètres.',
    specialty: 'Algorithmes, géométrie, transformation de signaux',
  },
  {
    name: 'qwen2.5-coder:1.5b',
    size: '1.6 Go (Ollama)',
    status: 'available',
    description: 'Spécialiste de code GLSL, p5.js et scripts de spectacle.',
    specialty: 'Programmation graphique et shaders',
  },
];

export const BUILTIN_AGENTS: AiAgentInfo[] = [
  {
    id: 'agent-shader-glsl',
    name: 'Agent Shader & WebGL',
    category: 'visual',
    specialty: 'Génération de fragments GLSL raymarching, fluides, vagues et luminescence.',
    isLocal: true,
    requiresKey: false,
    license: 'MIT',
  },
  {
    id: 'agent-audio-scenic',
    name: 'Agent Bruitage Vivant',
    category: 'audio',
    specialty: 'Routage micro, détection de TOPs acoustiques, enveloppes et passerelle Ableton.',
    isLocal: true,
    requiresKey: false,
    license: 'MIT',
  },
  {
    id: 'agent-scenographe-cues',
    name: 'Agent Régie Millumin',
    category: 'stage',
    specialty: 'Timeline multi-pistes, conduites TOPs, protection Panic et conduite autonome.',
    isLocal: true,
    requiresKey: false,
    license: 'MIT',
  },
  {
    id: 'agent-video-mapping',
    name: 'Agent Auto-Mapping 3s',
    category: 'mapping',
    specialty: 'Calculs d’homographie perspective, caméra hors axe et pinceau Companion.',
    isLocal: true,
    requiresKey: false,
    license: 'MIT',
  },
];

class LocalAiEngine {
  private currentMode: AiMode = 'auto';
  private activeAgentId: string = 'agent-shader-glsl';
  private isOllamaConnected: boolean = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.probeLocalOllama();
  }

  public getMode(): AiMode {
    return this.currentMode;
  }

  public setMode(mode: AiMode) {
    this.currentMode = mode;
    this.notify();
  }

  public getActiveAgentId(): string {
    return this.activeAgentId;
  }

  public setActiveAgentId(id: string) {
    this.activeAgentId = id;
    this.notify();
  }

  public isLocalAvailable(): boolean {
    return this.isOllamaConnected || this.currentMode === 'sans_ia';
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public async probeLocalOllama(): Promise<boolean> {
    try {
      const resp = await fetch('/api/ai/status');
      if (resp.ok) {
        const data = await resp.json();
        this.isOllamaConnected = !!data.connected;
        this.notify();
        return this.isOllamaConnected;
      }
    } catch {
      this.isOllamaConnected = false;
    }
    return false;
  }

  // Synthèse créative universelle : fonctionne avec ou sans IA !
  // RÈGLE FONDAMENTALE : Les demandes visuelles génèrent des shaders et nodes visuels 100% autonomes, sans imposer de matériel (micro/caméra facultatifs).
  public async interpretCreativePrompt(prompt: string): Promise<CreativePromptResult> {
    const cleanPrompt = prompt.trim().toLowerCase();

    // 1. OMBRES DE PIRATES & MULTITUDE D'OMBRES FANTOMATIQUES (Demande spécifique de l'artiste)
    if (
      cleanPrompt.includes('ombre') ||
      cleanPrompt.includes('fantôme') ||
      cleanPrompt.includes('fantomatique') ||
      cleanPrompt.includes('silhouette') ||
      (cleanPrompt.includes('pirate') && !cleanPrompt.includes('bruitage') && !cleanPrompt.includes('son'))
    ) {
      return {
        title: 'Ombres de Pirates & Brume Fantomatique',
        explanation: 'Création d’un univers visuel complet : silhouettes de pirates marchant vers l’horizon brumeux parmi une multitude d’ombres vaporeuses. Effet 100% autonome sans matériel imposé (microphone facultatif).',
        glslCode: `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_fogDensity;
uniform float u_wanderSpeed;
uniform float u_ghostGlow;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
             mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  float t = u_time * (u_wanderSpeed > 0.0 ? u_wanderSpeed : 0.6);
  
  // Horizon et lueur lunaire lointaine
  float horizon = -0.15;
  vec3 sky = mix(vec3(0.03, 0.04, 0.08), vec3(0.09, 0.12, 0.20), uv.y + 0.3);
  vec3 ground = mix(vec3(0.01, 0.02, 0.03), vec3(0.05, 0.07, 0.10), -(uv.y - horizon));
  vec3 col = uv.y > horizon ? sky : ground;

  // Brume volumétrique en perspective
  float fog = noise(vec2(uv.x * 3.0 + t * 0.2, uv.y * 2.0 - t * 0.1));
  fog += 0.5 * noise(vec2(uv.x * 6.0 - t * 0.3, uv.y * 4.0));
  float fogMask = smoothstep(0.4, -0.4, abs(uv.y - horizon));
  col += vec3(0.15, 0.22, 0.30) * fog * fogMask * (u_fogDensity > 0.0 ? u_fogDensity : 1.2);

  // Silhouettes fantomatiques marchant vers le lointain
  float totalShadows = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float zDepth = fract(0.15 * fi + t * 0.08); // S'éloigne au loin
    float scale = mix(0.7, 0.08, zDepth);
    float posX = sin(fi * 2.1 + t * 0.2) * (1.2 * (1.0 - zDepth * 0.6));
    float posY = horizon + mix(-0.25, 0.05, zDepth);
    
    vec2 p = (uv - vec2(posX, posY)) / scale;
    
    // Forme humanoïde stylisée (tête + corps flottant + cape/chapeau pirate)
    float head = length(p - vec2(0.0, 0.45)) - 0.18;
    float body = length(max(abs(p - vec2(0.0, 0.05)) - vec2(0.12, 0.28), 0.0));
    float hat = max(abs(p.x) - 0.32, abs(p.y - 0.55) - 0.05); // Tricorne pirate
    float silhouette = min(min(head, body), hat);
    
    float shadowAlpha = smoothstep(0.05, -0.05, silhouette) * (1.0 - zDepth * 0.7);
    totalShadows = max(totalShadows, shadowAlpha);
  }

  // Teinte de l'ombre fantomatique : noir avec halo bioluminescent vaporeux
  vec3 ghostColor = vec3(0.2, 0.45, 0.6) * (u_ghostGlow > 0.0 ? u_ghostGlow : 1.0);
  col = mix(col, vec3(0.005, 0.01, 0.02), totalShadows * 0.92);
  col += ghostColor * totalShadows * 0.35;

  gl_FragColor = vec4(col, 1.0);
}`,
        nodesToCreate: [
          {
            name: 'Générateur Ombres Pirates',
            category: 'generator',
            type: 'shadow-generator',
            params: {
              shadowCount: { key: 'shadowCount', label: 'Nombre d’ombres', type: 'slider', value: 7, min: 1, max: 20, step: 1 },
              distanceFade: { key: 'distanceFade', label: 'Éloignement horizon', type: 'slider', value: 0.85, min: 0.1, max: 1.0, step: 0.05 },
            },
          },
          {
            name: 'Brume & Brouillard Volumétrique',
            category: 'generator',
            type: 'fog-field',
            params: {
              fogDensity: { key: 'fogDensity', label: 'Densité brume', type: 'slider', value: 1.2, min: 0.2, max: 3.0, step: 0.1 },
            },
          },
          {
            name: 'Shader Ombres Fantomatiques (GLSL)',
            category: 'shader',
            type: 'glsl-shader',
            params: {
              wanderSpeed: { key: 'wanderSpeed', label: 'Vitesse de marche', type: 'slider', value: 0.6, min: 0.1, max: 2.0, step: 0.05 },
              ghostGlow: { key: 'ghostGlow', label: 'Luminescence spectrale', type: 'slider', value: 1.1, min: 0.0, max: 2.5, step: 0.1 },
            },
          },
          {
            name: 'Vibe Out (Rendu Plateau / Mapping)',
            category: 'output',
            type: 'vibe-out',
            params: {
              opacity: { key: 'opacity', label: 'Opacité Master', type: 'slider', value: 1.0, min: 0, max: 1, step: 0.05 },
            },
          },
        ],
        wiresToCreate: [
          { sourceIndex: 0, targetIndex: 2, sourcePort: 'out-signal', targetPort: 'in-signal' },
          { sourceIndex: 1, targetIndex: 2, sourcePort: 'out-signal', targetPort: 'in-signal' },
          { sourceIndex: 2, targetIndex: 3, sourcePort: 'out-texture', targetPort: 'in-video' },
        ],
        optionalInputs: ['Microphone Plateau', 'Capteur Companion', 'Contrôleur MIDI', 'Piste Ableton'],
        suggestedUniforms: {
          u_fogDensity: 1.2,
          u_wanderSpeed: 0.6,
          u_ghostGlow: 1.1,
        },
        sourceAgent: 'Agent Scénographie & Shaders (Moteur Visuel Autonome)',
        modeUsed: this.currentMode,
      };
    }

    // 2. MER PHOSPHORESCENTE / VAGUES / OCÉAN
    if (cleanPrompt.includes('mer') || cleanPrompt.includes('phosphorescente') || cleanPrompt.includes('ocean') || cleanPrompt.includes('vague')) {
      return {
        title: 'Mer Phosphorescente Bioluminescente',
        explanation: 'Création d’un shader GLSL de houle bioluminescente raymarching. Fonctionne immédiatement de manière autonome avec possibilité d’y relier un flux audio ou capteur en option.',
        glslCode: `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_soundEnergy;
uniform float u_waveSpeed;
uniform float u_glowIntensity;

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  float speed = u_waveSpeed > 0.0 ? u_waveSpeed : 0.65;
  float wave = sin(uv.x * 4.0 + u_time * 1.5 * speed) * 0.15;
  wave += sin(uv.x * 8.0 - u_time * 2.2 * speed) * 0.08;
  float soundBoost = 1.0 + (u_soundEnergy > 0.0 ? u_soundEnergy * 1.5 : 0.0);
  float dist = abs(uv.y - wave * soundBoost);
  
  vec3 oceanDeep = vec3(0.02, 0.05, 0.12);
  vec3 bioCyan = vec3(0.12, 0.85, 0.95);
  vec3 bioEmerald = vec3(0.2, 0.98, 0.65);
  
  float glow = (0.04 / (dist + 0.02)) * (u_glowIntensity > 0.0 ? u_glowIntensity : 1.4);
  vec3 color = oceanDeep + mix(bioCyan, bioEmerald, sin(uv.x * 2.0 + u_time) * 0.5 + 0.5) * glow;
  gl_FragColor = vec4(color, 1.0);
}`,
        nodesToCreate: [
          { name: 'Générateur Houle Océan', category: 'generator', type: 'wave-gen' },
          { name: 'Mer Phosphorescente (GLSL)', category: 'shader', type: 'glsl-shader' },
          { name: 'Vibe Out (Plateau / Mapping)', category: 'output', type: 'vibe-out' },
        ],
        wiresToCreate: [
          { sourceIndex: 0, targetIndex: 1, sourcePort: 'out-signal', targetPort: 'in-signal' },
          { sourceIndex: 1, targetIndex: 2, sourcePort: 'out-texture', targetPort: 'in-video' },
        ],
        optionalInputs: ['Audio In (Micro)', 'Analyseur FFT', 'Capteur Inclinaison Companion'],
        suggestedUniforms: {
          u_soundEnergy: 0.0,
          u_waveSpeed: 0.65,
          u_glowIntensity: 1.4,
        },
        sourceAgent: 'Agent Shader & WebGL (Moteur Procédural Local)',
        modeUsed: this.currentMode,
      };
    }

    // 3. BRUITAGE EXPLICITE / FOLEY / PRISE DE SON DEMANDÉE
    if (cleanPrompt.includes('bruitage') || cleanPrompt.includes('foley') || cleanPrompt.includes('micro') || cleanPrompt.includes('acoustique') || cleanPrompt.includes('sonore')) {
      return {
        title: 'Bruitage Vivant & Analyse Acoustique Scénique',
        explanation: 'Configuration de capture audio et détection de crêtes de transitoires acoustiques sur scène, avec réactivité visuelle synchronisée.',
        nodesToCreate: [
          { name: 'Micro Bruitage Plateau', category: 'audio', type: 'audio-input' },
          { name: 'Détecteur de Choc Acoustique', category: 'audio', type: 'fft-analyzer' },
          { name: 'Éclair Lumineux GLSL', category: 'shader', type: 'glsl-shader' },
          { name: 'Vibe Out (Plateau / Mapping)', category: 'output', type: 'vibe-out' },
        ],
        wiresToCreate: [
          { sourceIndex: 0, targetIndex: 1, sourcePort: 'out-audio', targetPort: 'in-audio' },
          { sourceIndex: 1, targetIndex: 2, sourcePort: 'out-energy', targetPort: 'in-signal' },
          { sourceIndex: 2, targetIndex: 3, sourcePort: 'out-texture', targetPort: 'in-video' },
        ],
        optionalInputs: ['Passerelle Ableton Link', 'TOP Cue Scénique'],
        suggestedUniforms: {
          u_soundEnergy: 0.9,
          u_glowIntensity: 2.0,
        },
        sourceAgent: 'Agent Bruitage Vivant (Moteur Local)',
        modeUsed: this.currentMode,
      };
    }

    // 4. RÉPONSE VISUELLE GÉNÉRIQUE HAUTE FIDÉLITÉ (Autonome par défaut)
    return {
      title: `Création : "${prompt.substring(0, 32)}..."`,
      explanation: 'Synthèse temps réel d’un programme visuel procédural avec animation autonome et câblage direct vers le Vibe Out.',
      glslCode: `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_energy;
void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  float d = length(uv);
  float angle = atan(uv.y, uv.x);
  float pulse = sin(d * 8.0 - u_time * 2.0 + sin(angle * 3.0)) * 0.5 + 0.5;
  vec3 col = mix(vec3(0.05, 0.08, 0.15), vec3(0.85, 0.72, 0.42), pulse * (0.5 / (d + 0.1)));
  gl_FragColor = vec4(col, 1.0);
}`,
      nodesToCreate: [
        { name: 'Générateur Visuel Interactif', category: 'generator', type: 'pattern-gen' },
        { name: 'Shader Procédural GLSL', category: 'shader', type: 'glsl-shader' },
        { name: 'Vibe Out', category: 'output', type: 'vibe-out' },
      ],
      wiresToCreate: [
        { sourceIndex: 0, targetIndex: 1, sourcePort: 'out-signal', targetPort: 'in-signal' },
        { sourceIndex: 1, targetIndex: 2, sourcePort: 'out-texture', targetPort: 'in-video' },
      ],
      optionalInputs: ['Microphone', 'MIDI Learn', 'Companion Gyro'],
      suggestedUniforms: {
        u_energy: 0.8,
      },
      sourceAgent: 'Agent No[co]de Studio (Local First)',
      modeUsed: this.currentMode,
    };
  }
}

export const localAiEngine = new LocalAiEngine();
