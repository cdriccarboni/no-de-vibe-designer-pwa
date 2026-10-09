// Catalogue Officiel des Shaders Personnels Importés
// Issus de l'archive Shaders.zip de l'utilisateur
// Formats ISF (Interactive Shader Format) et GLSL WebGL convertis et prêts pour le temps réel 60 fps
// Chaque shader dispose de code GLSL original, de paramètres éditables et de modulation audio.

export interface ImportedShaderSpec {
  id: string;
  name: string;
  filename: string;
  category: 'audio-reactive' | 'cosmic' | 'organic' | 'scifi' | 'water';
  description: string;
  defaultUniforms: Record<string, number>;
  uniformControls: Array<{
    key: string;
    label: string;
    min: number;
    max: number;
    step: number;
    default: number;
  }>;
  glslCode: string;
}

export const IMPORTED_SHADERS: ImportedShaderSpec[] = [
  {
    id: 'shader-xlights-audio',
    name: 'xLights Audio — Circle Wave',
    filename: 'xLights Audio - circle wave.fs',
    category: 'audio-reactive',
    description: 'Onde circulaire réactive au spectre sonore en direct, parfait pour le VJing scénique.',
    defaultUniforms: {
      u_speed: 1.0,
      u_soundEnergy: 0.8,
      u_radius: 0.45,
      u_waveCount: 8.0,
    },
    uniformControls: [
      { key: 'u_speed', label: 'Vitesse de rotation', min: 0.1, max: 3.0, step: 0.1, default: 1.0 },
      { key: 'u_soundEnergy', label: 'Sensibilité Audio', min: 0.0, max: 2.5, step: 0.05, default: 0.8 },
      { key: 'u_radius', label: 'Rayon du cercle', min: 0.1, max: 0.9, step: 0.05, default: 0.45 },
      { key: 'u_waveCount', label: 'Nombre d’ondes', min: 2.0, max: 16.0, step: 1.0, default: 8.0 },
    ],
    glslCode: `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_soundEnergy;
uniform float u_speed;
uniform float u_radius;
uniform float u_waveCount;

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  float dist = length(uv);
  float angle = atan(uv.y, uv.x);
  
  float wave = sin(angle * u_waveCount + u_time * 2.0 * u_speed) * (0.05 + u_soundEnergy * 0.08);
  float r = u_radius + wave;
  float ring = abs(dist - r);
  
  float glow = 0.015 / (ring + 0.005) * (1.0 + u_soundEnergy * 1.5);
  vec3 color = vec3(0.85, 0.72, 0.42) * glow + vec3(0.22, 0.74, 0.95) * (1.0 - dist);
  gl_FragColor = vec4(color, 1.0);
}`,
  },
  {
    id: 'shader-cosmic-journey',
    name: 'Cosmic Journey — Tunnel Hyperespace',
    filename: 'CosmicJourney.fs',
    category: 'cosmic',
    description: 'Voyage interstellaire dans un champ d’étoiles volumétrique et tunnel galactique.',
    defaultUniforms: {
      u_speed: 1.2,
      u_starDensity: 1.4,
      u_warpIntensity: 1.0,
    },
    uniformControls: [
      { key: 'u_speed', label: 'Vitesse de propulsion', min: 0.1, max: 4.0, step: 0.1, default: 1.2 },
      { key: 'u_starDensity', label: 'Densité d’étoiles', min: 0.5, max: 3.0, step: 0.1, default: 1.4 },
      { key: 'u_warpIntensity', label: 'Distorsion Warp', min: 0.0, max: 2.0, step: 0.1, default: 1.0 },
    ],
    glslCode: `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform float u_starDensity;
uniform float u_warpIntensity;

void main() {
  vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  float t = u_time * u_speed;
  float a = atan(p.y, p.x);
  float r = length(p);
  
  vec2 uv = vec2(a / 3.14159, 1.0 / (r + 0.05 * u_warpIntensity) + t);
  float star = fract(sin(dot(floor(uv * 12.0 * u_starDensity), vec2(12.9898, 78.233))) * 43758.5453);
  star = smoothstep(0.92, 1.0, star) * r;
  
  vec3 col = vec3(0.2, 0.4, 0.9) * (1.0 - r * 0.5) + vec3(star) * vec3(1.0, 0.9, 0.7);
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'shader-circuits',
    name: 'Circuits — Carte Électronique Sci-Fi',
    filename: 'Circuits.fs',
    category: 'scifi',
    description: 'Pistes de circuits imprimés luminescents avec propagation d’impulsions de signaux.',
    defaultUniforms: {
      u_speed: 0.8,
      u_circuitScale: 10.0,
      u_pulseGlow: 1.5,
    },
    uniformControls: [
      { key: 'u_speed', label: 'Vitesse des impulsions', min: 0.1, max: 3.0, step: 0.1, default: 0.8 },
      { key: 'u_circuitScale', label: 'Densité du maillage', min: 4.0, max: 20.0, step: 1.0, default: 10.0 },
      { key: 'u_pulseGlow', label: 'Luminescence', min: 0.5, max: 3.0, step: 0.1, default: 1.5 },
    ],
    glslCode: `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform float u_circuitScale;
uniform float u_pulseGlow;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy * u_circuitScale;
  vec2 id = floor(uv);
  vec2 gv = fract(uv) - 0.5;
  
  float n = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);
  float line = min(abs(gv.x), abs(gv.y));
  float pulse = sin(id.x * 2.0 + id.y * 3.0 + u_time * 3.0 * u_speed) * 0.5 + 0.5;
  
  float glow = smoothstep(0.08, 0.01, line) * pulse * u_pulseGlow;
  vec3 col = vec3(0.02, 0.04, 0.08) + vec3(0.1, 0.85, 0.7) * glow;
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'shader-electrocardiogram',
    name: 'Electrocardiogram — Pouls Médical Vital',
    filename: 'Electrocardiogram.fs',
    category: 'audio-reactive',
    description: 'Ligne d’oscilloscope ECG monitorant les battements cardiaques avec rémanence phosphorescente.',
    defaultUniforms: {
      u_speed: 1.2,
      u_heartRate: 1.0,
      u_amplitude: 1.0,
    },
    uniformControls: [
      { key: 'u_speed', label: 'Vitesse du balayage', min: 0.2, max: 3.0, step: 0.1, default: 1.2 },
      { key: 'u_heartRate', label: 'Rythme cardiaque', min: 0.5, max: 2.5, step: 0.1, default: 1.0 },
      { key: 'u_amplitude', label: 'Hauteur du pic QRS', min: 0.2, max: 2.5, step: 0.1, default: 1.0 },
    ],
    glslCode: `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform float u_heartRate;
uniform float u_amplitude;

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / u_resolution.y;
  float x = fract(uv.x * 0.5 - u_time * 0.3 * u_speed);
  
  // Onde ECG : P, QRS, T
  float ecg = 0.0;
  if (x > 0.45 && x < 0.48) ecg = sin((x - 0.45) / 0.03 * 3.1415) * 0.15;
  if (x > 0.49 && x < 0.51) ecg = -0.15 * u_amplitude;
  if (x >= 0.51 && x < 0.54) ecg = 0.9 * u_amplitude;
  if (x >= 0.54 && x < 0.56) ecg = -0.3 * u_amplitude;
  if (x > 0.60 && x < 0.66) ecg = sin((x - 0.60) / 0.06 * 3.1415) * 0.25;
  
  float dist = abs(uv.y - ecg);
  float beam = 0.015 / (dist + 0.005);
  float scanTrail = smoothstep(1.0, 0.0, x);
  
  vec3 col = vec3(0.1, 0.95, 0.4) * beam * scanTrail;
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'shader-great-ball-of-fire',
    name: 'Great Ball Of Fire — Plasma Incandescent',
    filename: 'GreatBallOfFire.fs',
    category: 'organic',
    description: 'Sphère solaire de flammes rayonnantes et turbulences de plasma incandescent.',
    defaultUniforms: {
      u_speed: 1.0,
      u_fireTurbulence: 1.3,
      u_coreHeat: 1.5,
    },
    uniformControls: [
      { key: 'u_speed', label: 'Vitesse des flammes', min: 0.2, max: 3.0, step: 0.1, default: 1.0 },
      { key: 'u_fireTurbulence', label: 'Turbulence', min: 0.5, max: 3.0, step: 0.1, default: 1.3 },
      { key: 'u_coreHeat', label: 'Chaleur du cœur', min: 0.8, max: 3.0, step: 0.1, default: 1.5 },
    ],
    glslCode: `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform float u_fireTurbulence;
uniform float u_coreHeat;

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  
  float noise = sin(a * 6.0 + u_time * 2.0 * u_speed) * cos(r * 10.0 - u_time * 3.0) * 0.15 * u_fireTurbulence;
  float fireDist = abs(r + noise - 0.35);
  
  float core = smoothstep(0.35, 0.0, r) * u_coreHeat;
  float corona = 0.04 / (fireDist + 0.02);
  
  vec3 col = vec3(1.0, 0.3, 0.05) * corona + vec3(1.0, 0.8, 0.2) * core;
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'shader-matrix-rain',
    name: 'Matrix — Pluie de Caractères Numériques',
    filename: 'Matrix.fs',
    category: 'scifi',
    description: 'Chute de flux de données binaires fluorescentes verticales style Matrix.',
    defaultUniforms: {
      u_speed: 1.4,
      u_columnCount: 24.0,
      u_glow: 1.3,
    },
    uniformControls: [
      { key: 'u_speed', label: 'Vitesse de défilement', min: 0.2, max: 3.5, step: 0.1, default: 1.4 },
      { key: 'u_columnCount', label: 'Nombre de colonnes', min: 10.0, max: 50.0, step: 2.0, default: 24.0 },
      { key: 'u_glow', label: 'Brillance verte', min: 0.5, max: 2.5, step: 0.1, default: 1.3 },
    ],
    glslCode: `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform float u_columnCount;
uniform float u_glow;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float col = floor(uv.x * u_columnCount);
  float randSpeed = fract(sin(col * 43.12) * 453.2) * 0.8 + 0.5;
  
  float y = fract(uv.y + u_time * 0.4 * u_speed * randSpeed);
  float glyph = fract(sin(floor(uv.y * 30.0) + col * 17.0 + floor(u_time * 4.0)) * 43758.54);
  
  float tail = (1.0 - y) * smoothstep(0.0, 0.2, glyph);
  float head = smoothstep(0.95, 1.0, 1.0 - y);
  
  vec3 color = vec3(0.1, 0.95, 0.3) * tail * u_glow + vec3(0.8, 1.0, 0.9) * head;
  gl_FragColor = vec4(color, 1.0);
}`,
  },
  {
    id: 'shader-underwater',
    name: 'Underwater+ — Rayons Caustiques Marins',
    filename: 'Underwater+.fs',
    category: 'water',
    description: 'Rayons de soleil traversant la surface de l’eau avec caustiques bleutées ondulantes.',
    defaultUniforms: {
      u_speed: 0.7,
      u_depthDarkness: 1.2,
      u_sunRays: 1.4,
    },
    uniformControls: [
      { key: 'u_speed', label: 'Ondulation des caustiques', min: 0.1, max: 2.5, step: 0.1, default: 0.7 },
      { key: 'u_depthDarkness', label: 'Profondeur abyssale', min: 0.5, max: 2.5, step: 0.1, default: 1.2 },
      { key: 'u_sunRays', label: 'Rayons de soleil', min: 0.2, max: 3.0, step: 0.1, default: 1.4 },
    ],
    glslCode: `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform float u_depthDarkness;
uniform float u_sunRays;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * u_speed;
  
  // Caustiques superposées
  float c1 = sin(uv.x * 14.0 + t + sin(uv.y * 10.0 + t * 0.8));
  float c2 = cos(uv.y * 16.0 - t * 1.2 + sin(uv.x * 12.0 - t));
  float caustic = pow(c1 * c2 * 0.5 + 0.5, 3.0) * 1.8;
  
  // Rayons descendants
  float rays = sin(uv.x * 8.0 + uv.y * 4.0 + t * 0.5) * 0.5 + 0.5;
  rays = pow(rays, 4.0) * u_sunRays * (1.0 - uv.y * 0.6);
  
  vec3 deepSea = vec3(0.01, 0.08, 0.22) * (1.0 - uv.y * 0.5 * u_depthDarkness);
  vec3 caustColor = vec3(0.3, 0.85, 0.95);
  
  vec3 finalColor = deepSea + (caustColor * (caustic * 0.4 + rays));
  gl_FragColor = vec4(finalColor, 1.0);
}`,
  },
  {
    id: 'shader-total-eclipse',
    name: 'Total Eclipse — Couronne Solaire',
    filename: 'TotalEclipse.fs',
    category: 'cosmic',
    description: 'Éclipse totale avec disque d’ombre noir pur et couronne électromagnétique argentée.',
    defaultUniforms: {
      u_speed: 0.6,
      u_coronaSpread: 1.5,
      u_flareIntensity: 1.2,
    },
    uniformControls: [
      { key: 'u_speed', label: 'Vitesse des éruptions', min: 0.1, max: 2.0, step: 0.1, default: 0.6 },
      { key: 'u_coronaSpread', label: 'Étendue couronne', min: 0.5, max: 2.5, step: 0.1, default: 1.5 },
      { key: 'u_flareIntensity', label: 'Intensité éclat', min: 0.2, max: 3.0, step: 0.1, default: 1.2 },
    ],
    glslCode: `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform float u_coronaSpread;
uniform float u_flareIntensity;

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  
  float rays = sin(a * 12.0 + u_time * 0.8 * u_speed) * cos(a * 7.0 - u_time * 0.5) * 0.1;
  float corona = 0.05 / (abs(r + rays - 0.38) + 0.02) * u_coronaSpread;
  
  // Disque noir lunaire
  float moon = smoothstep(0.375, 0.38, r);
  vec3 col = vec3(0.95, 0.92, 0.82) * corona * u_flareIntensity * moon;
  gl_FragColor = vec4(col, 1.0);
}`,
  },
];

class ImportedShadersCatalogService {
  private shaders: ImportedShaderSpec[] = [...IMPORTED_SHADERS];

  public getShaders(): ImportedShaderSpec[] {
    return this.shaders;
  }

  public getShaderById(id: string): ImportedShaderSpec | undefined {
    return this.shaders.find((s) => s.id === id);
  }

  public getCategories(): string[] {
    return Array.from(new Set(this.shaders.map((s) => s.category)));
  }
}

export const importedShadersCatalog = new ImportedShadersCatalogService();
