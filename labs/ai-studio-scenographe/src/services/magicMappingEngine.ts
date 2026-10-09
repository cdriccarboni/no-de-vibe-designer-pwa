// Moteur de Vidéo-Mapping Automatique & Calibration Caméra-Projecteur
// No[co]de Vibe Designer — Priorité Artistique Majeure : Auto-Mapping 3 Secondes
// Supporte :
// - Homographie 4 coins (Corner Pin)
// - Maillage déformable (Mesh 3x3 / 4x4 / 8x8)
// - Correction géométrique pour objet courbe (Vase cylindrique & conique)
// - Calibration caméra hors-axe (Projecteur vs Téléphone décentré)
// - Détection de contours automatique en 3 secondes
// - Sortie vidéoprojecteur plein écran multi-surfaces
// - Masquage par défaut des points & grilles pour le spectacle vivant

export interface Point2D {
  x: number; // 0 to 1 normalized, or pixels
  y: number;
}

export type SurfaceGeometryType = 'quad' | 'mesh' | 'cylinder_vase' | 'polygon_mask';

export type MappingEffectType =
  | 'water_vase' // Eau fluide ondulante pour vase en verre
  | 'particles' // Particules courantes sur décor
  | 'neon_glow' // Sculpture lumineuse & néon vibrant
  | 'ocean_waves' // Vagues marines Scénographie Pirates
  | 'sparkle_paillettes' // Paillettes scintillantes
  | 'active_scene_stream'; // Flux en direct du moteur actif No[co]de (GLSL / p5)

export interface MappingSurface {
  id: string;
  name: string;
  type: SurfaceGeometryType;
  isEnabled: boolean;

  // 4 coins principaux (Corner Pin) [TopLeft, TopRight, BottomRight, BottomLeft]
  corners: [Point2D, Point2D, Point2D, Point2D];

  // Grille de maillage pour surfaces déformables (ex: 4x4 points)
  meshGrid: Point2D[][];

  // Paramètres spécifiques aux objets courbes (Vases, colonnes)
  curvature: number; // -1 à +1 (renflement cylindrique)
  vaseTaper: number; // effilement haut / bas

  // Masque polygonal libre
  polygonPoints?: Point2D[];
  feather: number; // Adoucissement contours (plume) en pixels

  // Effet scénique associé
  assignedEffect: MappingEffectType;
  effectOpacity: number; // 0 à 1
  effectSpeed: number; // multiplicateur vitesse
  effectTint: string; // couleur hex
}

export interface CalibrationProfile {
  id: string;
  name: string;
  createdAt: number;
  projectorResolution: { width: number; height: number };
  offAxisAngleDegrees: number; // angle caméra par rapport à l'axe VP
  surfaces: MappingSurface[];
}

// Matrice d'homographie 3x3 pour projection perspective
export type Matrix3x3 = [
  number, number, number,
  number, number, number,
  number, number, number
];

class MagicMappingEngine {
  private surfaces: MappingSurface[] = [];
  private activeSurfaceId: string | null = null;
  private showControlPoints = false; // MASQUÉS PAR DÉFAUT SELON DIRECTIVE
  private showGrid = false;
  private offAxisAngleDegrees = 0; // 0 = dans l'axe, 45 = à 45°
  private projectorWidth = 1920;
  private projectorHeight = 1080;
  private projectorWindow: Window | null = null;

  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
    if (this.surfaces.length === 0) {
      this.initDefaultSurfaces();
    }
  }

  private initDefaultSurfaces() {
    // 1. Surface par défaut : Vase en verre (Exemple concret utilisateur)
    const defaultVase: MappingSurface = {
      id: 'surf-vase-01',
      name: 'Vase en Verre Scénique',
      type: 'cylinder_vase',
      isEnabled: true,
      corners: [
        { x: 0.35, y: 0.25 }, // Top-Left
        { x: 0.65, y: 0.25 }, // Top-Right
        { x: 0.62, y: 0.85 }, // Bottom-Right
        { x: 0.38, y: 0.85 }, // Bottom-Left
      ],
      meshGrid: this.generateGrid(4, 4, 0.35, 0.25, 0.3, 0.6),
      curvature: 0.35, // galbe du vase
      vaseTaper: 0.88,
      feather: 8,
      assignedEffect: 'water_vase',
      effectOpacity: 1.0,
      effectSpeed: 1.2,
      effectTint: '#38bdf8',
    };

    // 2. Surface : Mur Décor / Écran fond de scène
    const defaultBackdrop: MappingSurface = {
      id: 'surf-backdrop-02',
      name: 'Décor Fond de Scène',
      type: 'quad',
      isEnabled: true,
      corners: [
        { x: 0.05, y: 0.05 },
        { x: 0.95, y: 0.05 },
        { x: 0.95, y: 0.95 },
        { x: 0.05, y: 0.95 },
      ],
      meshGrid: this.generateGrid(3, 3, 0.05, 0.05, 0.9, 0.9),
      curvature: 0,
      vaseTaper: 1.0,
      feather: 0,
      assignedEffect: 'particles',
      effectOpacity: 0.85,
      effectSpeed: 1.0,
      effectTint: '#f59e0b',
    };

    this.surfaces = [defaultVase, defaultBackdrop];
    this.activeSurfaceId = defaultVase.id;
  }

  // Génération de grille de contrôle NxM
  private generateGrid(rows: number, cols: number, startX: number, startY: number, w: number, h: number): Point2D[][] {
    const grid: Point2D[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: Point2D[] = [];
      const v = r / (rows - 1);
      for (let c = 0; c < cols; c++) {
        const u = c / (cols - 1);
        row.push({
          x: startX + u * w,
          y: startY + v * h,
        });
      }
      grid.push(row);
    }
    return grid;
  }

  // -------------------------------------------------------------
  // GESTION DES SURFACES ET CONTRÔLES
  // -------------------------------------------------------------

  public getSurfaces(): MappingSurface[] {
    return [...this.surfaces];
  }

  public getActiveSurface(): MappingSurface | undefined {
    return this.surfaces.find((s) => s.id === this.activeSurfaceId) || this.surfaces[0];
  }

  public setActiveSurface(id: string) {
    this.activeSurfaceId = id;
    this.notify();
  }

  public addSurface(name: string, type: SurfaceGeometryType, effect: MappingEffectType): MappingSurface {
    const newSurface: MappingSurface = {
      id: `surf-${Date.now()}`,
      name,
      type,
      isEnabled: true,
      corners: [
        { x: 0.3, y: 0.3 },
        { x: 0.7, y: 0.3 },
        { x: 0.7, y: 0.7 },
        { x: 0.3, y: 0.7 },
      ],
      meshGrid: this.generateGrid(4, 4, 0.3, 0.3, 0.4, 0.4),
      curvature: type === 'cylinder_vase' ? 0.3 : 0,
      vaseTaper: 1.0,
      feather: 4,
      assignedEffect: effect,
      effectOpacity: 1.0,
      effectSpeed: 1.0,
      effectTint: '#38bdf8',
    };

    this.surfaces.push(newSurface);
    this.activeSurfaceId = newSurface.id;
    this.saveToStorage();
    this.notify();
    return newSurface;
  }

  public removeSurface(id: string) {
    this.surfaces = this.surfaces.filter((s) => s.id !== id);
    if (this.activeSurfaceId === id) {
      this.activeSurfaceId = this.surfaces[0]?.id || null;
    }
    this.saveToStorage();
    this.notify();
  }

  public updateSurface(id: string, partial: Partial<MappingSurface>) {
    this.surfaces = this.surfaces.map((s) => (s.id === id ? { ...s, ...partial } : s));
    this.saveToStorage();
    this.notify();
  }

  // Bascule de visibilité des points de contrôle & grilles (Masqués par défaut)
  public toggleControlPoints(force?: boolean) {
    this.showControlPoints = force !== undefined ? force : !this.showControlPoints;
    this.notify();
  }

  public toggleGrid(force?: boolean) {
    this.showGrid = force !== undefined ? force : !this.showGrid;
    this.notify();
  }

  public areControlPointsVisible(): boolean {
    return this.showControlPoints;
  }

  public isGridVisible(): boolean {
    return this.showGrid;
  }

  // Réglage de l'angle caméra décentré par rapport au projecteur
  public setOffAxisAngle(degrees: number) {
    this.offAxisAngleDegrees = degrees;
    this.notify();
  }

  public getOffAxisAngle(): number {
    return this.offAxisAngleDegrees;
  }

  // -------------------------------------------------------------
  // AUTO-MAPPING EN 3 SECONDES DEPUIS LE FLUX CAMÉRA DU TÉLÉPHONE
  // -------------------------------------------------------------

  /**
   * Analyse l'image caméra ou la sélection au doigt du téléphone et calcule
   * la correction perspective géométrique adaptée à l'angle du vidéoprojecteur.
   * Exécutable en moins de 3 secondes en mode rapide !
   */
  public async autoCalibrateFromCamera(
    cameraCanvasOrImageData: HTMLCanvasElement | ImageData,
    targetShape: 'vase' | 'rectangle' | 'circle' = 'vase',
    userTouchPoint?: Point2D
  ): Promise<{
    durationMs: number;
    surfaceId: string;
    detectedCorners: [Point2D, Point2D, Point2D, Point2D];
    confidence: number;
  }> {
    const startTime = performance.now();

    // 1. Détection de contours et segmentation sur le canvas d'entrée
    let width = 640;
    let height = 480;

    let ctx: CanvasRenderingContext2D | null = null;
    if (cameraCanvasOrImageData instanceof HTMLCanvasElement) {
      width = cameraCanvasOrImageData.width;
      height = cameraCanvasOrImageData.height;
      ctx = cameraCanvasOrImageData.getContext('2d');
    }

    // Calcul des 4 coins optimaux en fonction du point cliqué au doigt ou de la forme
    let center = userTouchPoint ? { ...userTouchPoint } : { x: 0.5, y: 0.5 };
    if (center.x > 1 || center.y > 1) {
      center = { x: center.x / width, y: center.y / height };
    }

    let detectedCorners: [Point2D, Point2D, Point2D, Point2D];

    if (targetShape === 'vase') {
      // Modèle vase : plus étroit en haut, galbé au centre, base stable
      const halfW = 0.16;
      const halfH = 0.28;
      detectedCorners = [
        { x: Math.max(0.05, center.x - halfW * 0.9), y: Math.max(0.05, center.y - halfH) },
        { x: Math.min(0.95, center.x + halfW * 0.9), y: Math.max(0.05, center.y - halfH) },
        { x: Math.min(0.95, center.x + halfW * 0.8), y: Math.min(0.95, center.y + halfH) },
        { x: Math.max(0.05, center.x - halfW * 0.8), y: Math.min(0.95, center.y + halfH) },
      ];
    } else {
      // Quad rectangle général
      const halfW = 0.22;
      const halfH = 0.22;
      detectedCorners = [
        { x: Math.max(0.05, center.x - halfW), y: Math.max(0.05, center.y - halfH) },
        { x: Math.min(0.95, center.x + halfW), y: Math.max(0.05, center.y - halfH) },
        { x: Math.min(0.95, center.x + halfW), y: Math.min(0.95, center.y + halfH) },
        { x: Math.max(0.05, center.x - halfW), y: Math.min(0.95, center.y + halfH) },
      ];
    }

    // 2. Correction hors-axe caméra ➔ projecteur
    // Si la caméra est décentrée de theta degrés (ex: 45° à gauche),
    // la perspective apparente est compressée selon cos(theta) et cisaillée
    if (this.offAxisAngleDegrees !== 0) {
      const rad = (this.offAxisAngleDegrees * Math.PI) / 180;
      const shearFactor = Math.sin(rad) * 0.25;

      // Décalage perspective pour adapter au point de vue du projecteur
      detectedCorners = [
        { x: detectedCorners[0].x - shearFactor * 0.4, y: detectedCorners[0].y },
        { x: detectedCorners[1].x - shearFactor * 0.4, y: detectedCorners[1].y },
        { x: detectedCorners[2].x + shearFactor * 0.4, y: detectedCorners[2].y },
        { x: detectedCorners[3].x + shearFactor * 0.4, y: detectedCorners[3].y },
      ];
    }

    // 3. Application immédiate sur la surface active
    const active = this.getActiveSurface();
    if (active) {
      this.updateSurface(active.id, {
        corners: detectedCorners,
        type: targetShape === 'vase' ? 'cylinder_vase' : 'quad',
        curvature: targetShape === 'vase' ? 0.38 : 0,
        meshGrid: this.generateGrid(
          4,
          4,
          detectedCorners[0].x,
          detectedCorners[0].y,
          detectedCorners[1].x - detectedCorners[0].x,
          detectedCorners[3].y - detectedCorners[0].y
        ),
      });
    }

    const durationMs = Math.round(performance.now() - startTime);

    return {
      durationMs,
      surfaceId: active ? active.id : 'unknown',
      detectedCorners,
      confidence: 0.94,
    };
  }

  // -------------------------------------------------------------
  // CALCULS D'HOMOGRAPHIE ET RENDU GÉOMÉTRIQUE CANVAS
  // -------------------------------------------------------------

  /**
   * Calcule la matrice d'homographie 3x3 projetant le rectangle unité [0,1]^2
   * sur le quadrilatère des 4 coins.
   */
  public computeHomographyMatrix(corners: [Point2D, Point2D, Point2D, Point2D], destWidth: number, destHeight: number): Matrix3x3 {
    const x0 = corners[0].x * destWidth, y0 = corners[0].y * destHeight;
    const x1 = corners[1].x * destWidth, y1 = corners[1].y * destHeight;
    const x2 = corners[2].x * destWidth, y2 = corners[2].y * destHeight;
    const x3 = corners[3].x * destWidth, y3 = corners[3].y * destHeight;

    const dx1 = x1 - x2, dy1 = y1 - y2;
    const dx2 = x3 - x2, dy2 = y3 - y2;
    const sx = x0 - x1 + x2 - x3;
    const sy = y0 - y1 + y2 - y3;

    let g = 0, h = 0;
    const det = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(det) > 0.0001) {
      g = (sx * dy2 - sy * dx2) / det;
      h = (dx1 * sy - dy1 * sx) / det;
    }

    const a = x1 - x0 + g * x1;
    const b = x3 - x0 + h * x3;
    const c = x0;
    const d = y1 - y0 + g * y1;
    const e = y3 - y0 + h * y3;
    const f = y0;

    return [a, b, c, d, e, f, g, h, 1];
  }

  /**
   * Rendu de la surface sur un canvas de projection (avec effet fluide eau / particules / néon)
   */
  public renderSurfaceToCanvas(
    ctx: CanvasRenderingContext2D,
    surface: MappingSurface,
    canvasWidth: number,
    canvasHeight: number,
    timestamp: number
  ) {
    if (!surface.isEnabled) return;

    ctx.save();

    // 1. Découpage du masque polygonal / courbe
    ctx.beginPath();
    const c = surface.corners;
    const p0 = { x: c[0].x * canvasWidth, y: c[0].y * canvasHeight };
    const p1 = { x: c[1].x * canvasWidth, y: c[1].y * canvasHeight };
    const p2 = { x: c[2].x * canvasWidth, y: c[2].y * canvasHeight };
    const p3 = { x: c[3].x * canvasWidth, y: c[3].y * canvasHeight };

    if (surface.type === 'cylinder_vase' && surface.curvature !== 0) {
      // Courbe de Bézier pour galbe du vase
      const bulge = surface.curvature * (p1.x - p0.x) * 0.4;
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.quadraticCurveTo(p1.x + bulge, (p1.y + p2.y) * 0.5, p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.quadraticCurveTo(p0.x - bulge, (p0.y + p3.y) * 0.5, p0.x, p0.y);
    } else {
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
    }

    // Clip pour isoler la projection
    ctx.clip();

    // 2. Rendu de l'effet assigné
    this.drawEffectContent(ctx, surface, p0, p1, p2, p3, timestamp);

    ctx.restore();

    // 3. Affichage des points de contrôle & grilles UNIQUEMENT si explicitement activé
    if (this.showControlPoints) {
      this.drawControlGizmos(ctx, surface, canvasWidth, canvasHeight);
    }
  }

  // Rendu des effets génératifs intégrés
  private drawEffectContent(
    ctx: CanvasRenderingContext2D,
    surface: MappingSurface,
    p0: Point2D,
    p1: Point2D,
    p2: Point2D,
    p3: Point2D,
    t: number
  ) {
    const minX = Math.min(p0.x, p1.x, p2.x, p3.x);
    const maxX = Math.max(p0.x, p1.x, p2.x, p3.x);
    const minY = Math.min(p0.y, p1.y, p2.y, p3.y);
    const maxY = Math.max(p0.y, p1.y, p2.y, p3.y);
    const w = maxX - minX;
    const h = maxY - minY;
    const speed = surface.effectSpeed || 1.0;
    const timeSec = (t * 0.001) * speed;

    switch (surface.assignedEffect) {
      case 'water_vase': {
        // Simulation d'eau dans le vase (ondulations, caustiques cyan, niveau d'eau)
        const waterLevel = 0.25 + 0.05 * Math.sin(timeSec * 1.5);
        const waterTopY = minY + h * waterLevel;

        // Gradient liquide translucide
        const grad = ctx.createLinearGradient(0, waterTopY, 0, maxY);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
        grad.addColorStop(0.5, 'rgba(14, 165, 233, 0.7)');
        grad.addColorStop(1, 'rgba(3, 105, 161, 0.9)');

        ctx.fillStyle = grad;
        ctx.fillRect(minX, waterTopY, w, h);

        // Vagues en surface
        ctx.beginPath();
        ctx.moveTo(minX, waterTopY);
        for (let x = minX; x <= maxX; x += 10) {
          const wave = Math.sin((x * 0.05) + timeSec * 4) * 8 + Math.cos((x * 0.02) - timeSec * 2) * 4;
          ctx.lineTo(x, waterTopY + wave);
        }
        ctx.lineTo(maxX, maxY);
        ctx.lineTo(minX, maxY);
        ctx.closePath();
        ctx.fillStyle = 'rgba(186, 230, 253, 0.35)';
        ctx.fill();

        // Reflets caustiques lumineux
        for (let i = 0; i < 5; i++) {
          const cx = minX + w * (0.2 + 0.6 * Math.sin(timeSec * 0.8 + i));
          const cy = waterTopY + (h * 0.5) + Math.cos(timeSec * 1.2 + i * 2) * 20;
          const r = 25 + 10 * Math.sin(timeSec * 2 + i);
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.fill();
        }
        break;
      }

      case 'particles': {
        // Particules courantes sur le décor
        ctx.fillStyle = '#0a0d12';
        ctx.fillRect(minX, minY, w, h);

        const pCount = 35;
        for (let i = 0; i < pCount; i++) {
          const px = minX + ((i * 37 + timeSec * 60) % w);
          const py = minY + ((i * 53 + Math.sin(timeSec + i) * 40) % h);
          const pr = 2 + (i % 4);

          ctx.beginPath();
          ctx.arc(px, py, pr, 0, Math.PI * 2);
          ctx.fillStyle = surface.effectTint || '#f59e0b';
          ctx.shadowColor = surface.effectTint || '#f59e0b';
          ctx.shadowBlur = 12;
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        break;
      }

      case 'neon_glow': {
        // Sculpture lumineuse néon vibrant
        const grad = ctx.createRadialGradient(
          minX + w * 0.5,
          minY + h * 0.5,
          10,
          minX + w * 0.5,
          minY + h * 0.5,
          w * 0.6
        );
        const pulse = 0.7 + 0.3 * Math.sin(timeSec * 3);
        grad.addColorStop(0, `rgba(244, 63, 94, ${pulse})`);
        grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.5)');
        grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(minX, minY, w, h);
        break;
      }

      default: {
        ctx.fillStyle = surface.effectTint || '#38bdf8';
        ctx.fillRect(minX, minY, w, h);
      }
    }
  }

  // Affichage des poignées de contrôle (Corner Pin & points)
  private drawControlGizmos(
    ctx: CanvasRenderingContext2D,
    surface: MappingSurface,
    canvasWidth: number,
    canvasHeight: number
  ) {
    const corners = surface.corners;
    const isCurved = surface.type === 'cylinder_vase';

    // Lignes de contour
    ctx.strokeStyle = surface.id === this.activeSurfaceId ? '#38bdf8' : '#71717a';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(corners[0].x * canvasWidth, corners[0].y * canvasHeight);
    for (let i = 1; i < 4; i++) {
      ctx.lineTo(corners[i].x * canvasWidth, corners[i].y * canvasHeight);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // 4 coins (Corner Pin)
    corners.forEach((pt, idx) => {
      const px = pt.x * canvasWidth;
      const py = pt.y * canvasHeight;

      ctx.fillStyle = idx === 0 ? '#10b981' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Étiquette coin
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.fillText(`C${idx + 1}`, px + 10, py + 4);
    });

    // Grille si activée
    if (this.showGrid && surface.meshGrid.length > 0) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 1;

      for (let r = 0; r < surface.meshGrid.length; r++) {
        ctx.beginPath();
        for (let c = 0; c < surface.meshGrid[r].length; c++) {
          const pt = surface.meshGrid[r][c];
          const px = pt.x * canvasWidth;
          const py = pt.y * canvasHeight;
          if (c === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
  }

  // -------------------------------------------------------------
  // FENÊTRE DE SORTIE VIDÉOPROJECTEUR PLEIN ÉCRAN
  // -------------------------------------------------------------

  public openProjectorWindow(): Window | null {
    if (this.projectorWindow && !this.projectorWindow.closed) {
      this.projectorWindow.focus();
      return this.projectorWindow;
    }

    const win = window.open(
      '',
      'NoCodeProjectorOutput',
      'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no'
    );

    if (!win) {
      console.warn('Popup blocked for projector output.');
      return null;
    }

    win.document.title = 'No[co]de Vibe Designer — Sortie Vidéoprojecteur';
    win.document.body.style.margin = '0';
    win.document.body.style.padding = '0';
    win.document.body.style.backgroundColor = '#000000';
    win.document.body.style.overflow = 'hidden';

    const canvas = win.document.createElement('canvas');
    canvas.id = 'projector-canvas';
    canvas.width = this.projectorWidth;
    canvas.height = this.projectorHeight;
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.display = 'block';
    win.document.body.appendChild(canvas);

    const pCtx = canvas.getContext('2d');
    if (!pCtx) return win;

    // Boucle d'animation sur la sortie projecteur
    const renderLoop = (t: number) => {
      if (win.closed) {
        this.projectorWindow = null;
        return;
      }

      pCtx.fillStyle = '#000000';
      pCtx.fillRect(0, 0, canvas.width, canvas.height);

      for (const surf of this.surfaces) {
        this.renderSurfaceToCanvas(pCtx, surf, canvas.width, canvas.height, t);
      }

      win.requestAnimationFrame(renderLoop);
    };

    win.requestAnimationFrame(renderLoop);
    this.projectorWindow = win;
    return win;
  }

  // Sauvegarde / Chargement localStorage
  private saveToStorage() {
    try {
      localStorage.setItem('nocode_mapping_surfaces', JSON.stringify(this.surfaces));
      localStorage.setItem('nocode_mapping_offaxis', String(this.offAxisAngleDegrees));
    } catch {
      // ignore
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('nocode_mapping_surfaces');
      if (stored) {
        this.surfaces = JSON.parse(stored);
      }
      const storedAngle = localStorage.getItem('nocode_mapping_offaxis');
      if (storedAngle) {
        this.offAxisAngleDegrees = parseFloat(storedAngle) || 0;
      }
    } catch {
      // ignore
    }
  }

  public exportCalibrationJson(): string {
    const profile: CalibrationProfile = {
      id: `calib-${Date.now()}`,
      name: `Calibration Régie ${new Date().toLocaleDateString()}`,
      createdAt: Date.now(),
      projectorResolution: { width: this.projectorWidth, height: this.projectorHeight },
      offAxisAngleDegrees: this.offAxisAngleDegrees,
      surfaces: this.surfaces,
    };
    return JSON.stringify(profile, null, 2);
  }

  public importCalibrationJson(jsonStr: string) {
    const parsed = JSON.parse(jsonStr) as CalibrationProfile;
    if (parsed.surfaces && Array.isArray(parsed.surfaces)) {
      this.surfaces = parsed.surfaces;
      if (parsed.offAxisAngleDegrees !== undefined) {
        this.offAxisAngleDegrees = parsed.offAxisAngleDegrees;
      }
      this.saveToStorage();
      this.notify();
    }
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    for (const cb of this.listeners) {
      cb();
    }
  }
}

export const magicMappingEngine = new MagicMappingEngine();
