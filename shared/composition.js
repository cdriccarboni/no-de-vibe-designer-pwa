/**
 * Composition légère : calques, texte raster, masque rectangle, fausse émission.
 * Les pixels sont calculés en JavaScript, sans nouveau runtime.
 */
import { newProject, addNode, addTimelineClip, exportProject, openProject } from "./ir.js";
import { setKeyframe, applyCurves } from "./show-session.js";

const FONT = {
  " ": ["00000","00000","00000","00000","00000","00000","00000"],
  A: ["01110","10001","10001","11111","10001","10001","10001"],
  B: ["11110","10001","10001","11110","10001","10001","11110"],
  C: ["01111","10000","10000","10000","10000","10000","01111"],
  D: ["11110","10001","10001","10001","10001","10001","11110"],
  E: ["11111","10000","10000","11110","10000","10000","11111"],
  I: ["11111","00100","00100","00100","00100","00100","11111"],
  N: ["10001","11001","10101","10011","10001","10001","10001"],
  R: ["11110","10001","10001","11110","10100","10010","10001"],
  T: ["11111","00100","00100","00100","00100","00100","00100"],
  U: ["10001","10001","10001","10001","10001","10001","01110"]
};

function parseColor(hex) {
  const raw = String(hex || "#f4f1e8").replace("#", "");
  const full = raw.length === 3 ? raw.split("").map(ch => ch + ch).join("") : raw.padEnd(6, "0");
  return [parseInt(full.slice(0, 2), 16) || 0, parseInt(full.slice(2, 4), 16) || 0, parseInt(full.slice(4, 6), 16) || 0];
}

export function renderTextPlate({
  text = "",
  size = 2,
  bold = false,
  color = "#f4f1e8",
  opacity = 1,
  x = 8,
  y = 8,
  width = 320,
  height = 180
} = {}) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const scale = Math.max(1, Math.min(8, Number(size) || 1));
  const alpha = Math.max(0, Math.min(1, Number(opacity) ?? 1));
  const [red, green, blue] = parseColor(color);
  const content = String(text || "").toUpperCase();
  let cursor = Math.round(x);
  const top = Math.round(y);
  let drawn = 0;
  for (const char of content) {
    const glyph = FONT[char] || FONT[" "];
    for (let row = 0; row < glyph.length; row += 1) {
      for (let col = 0; col < glyph[row].length; col += 1) {
        if (glyph[row][col] !== "1") continue;
        for (let sy = 0; sy < scale; sy += 1) {
          for (let sx = 0; sx < scale; sx += 1) {
            const px = cursor + col * scale + sx;
            const py = top + row * scale + sy;
            if (px < 0 || py < 0 || px >= width || py >= height) continue;
            const index = (py * width + px) * 4;
            pixels[index] = red;
            pixels[index + 1] = green;
            pixels[index + 2] = blue;
            pixels[index + 3] = Math.round(255 * alpha);
            drawn += 1;
            if (bold && px + 1 < width) {
              const next = index + 4;
              pixels[next] = red;
              pixels[next + 1] = green;
              pixels[next + 2] = blue;
              pixels[next + 3] = Math.round(255 * alpha);
              drawn += 1;
            }
          }
        }
      }
    }
    cursor += (5 * scale) + scale;
  }
  return { width, height, pixels, drawn, text: content };
}

export function rectMask(frame, { x = 0, y = 0, w = 10, h = 10 } = {}) {
  const pixels = new Uint8ClampedArray(frame.pixels);
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(frame.width, Math.ceil(x + w));
  const y1 = Math.min(frame.height, Math.ceil(y + h));
  for (let py = 0; py < frame.height; py += 1) {
    for (let px = 0; px < frame.width; px += 1) {
      if (px >= x0 && px < x1 && py >= y0 && py < y1) continue;
      pixels[(py * frame.width + px) * 4 + 3] = 0;
    }
  }
  return { ...frame, pixels, mask: "rectangle" };
}

const DEFAULT_NAMES = ["Vidéo", "Effets", "Shader", "Ombre", "Cues", "Liaisons"];

function makeLayer(name, order) {
  return { id: `L${order}`, name, order, hidden: false, locked: false };
}

export function ensureLayers(project) {
  if (!Array.isArray(project.layers) || project.layers.length === 0) {
    project.layers = DEFAULT_NAMES.map((name, order) => makeLayer(name, order));
  }
  const known = new Set(project.layers.map(layer => layer.id));
  for (const clip of project.timeline || []) {
    if (!clip.layerId || known.has(clip.layerId)) continue;
    const recovered = {
      id: `Lorphan${project.layers.length}`,
      name: "Calque retrouvé",
      order: project.layers.length,
      hidden: false,
      locked: false
    };
    project.layers.push(recovered);
    known.add(recovered.id);
    clip.layerId = recovered.id;
    clip.track = recovered.order;
  }
  return project.layers;
}

export function addLayer(project, name = "Calque") {
  const layers = ensureLayers(project);
  const layer = {
    id: `L${layers.length}-${Math.round(Math.random() * 1000)}`,
    name: String(name || "Calque"),
    order: layers.length,
    hidden: false,
    locked: false
  };
  layers.push(layer);
  return layer;
}

export function renameLayer(project, id, name) {
  const layer = ensureLayers(project).find(item => item.id === id);
  if (!layer) return null;
  layer.name = String(name || layer.name);
  return layer;
}

export function reorderLayers(project, ids) {
  const layers = ensureLayers(project);
  const map = new Map(layers.map(layer => [layer.id, layer]));
  const next = ids.map(id => map.get(id)).filter(Boolean);
  for (const layer of layers) if (!next.includes(layer)) next.push(layer);
  next.forEach((layer, index) => { layer.order = index; });
  project.layers = next;
  for (const clip of project.timeline || []) {
    const layer = next.find(item => item.id === clip.layerId);
    if (layer) clip.track = layer.order;
  }
  return project.layers;
}

export function setLayerHidden(project, id, hidden) {
  const layer = ensureLayers(project).find(item => item.id === id);
  if (layer) layer.hidden = hidden === true;
  return layer;
}

export function setLayerLocked(project, id, locked) {
  const layer = ensureLayers(project).find(item => item.id === id);
  if (layer) layer.locked = locked === true;
  return layer;
}

export function moveClip(project, clipId, { start, layerId } = {}) {
  ensureLayers(project);
  const clip = (project.timeline || []).find(item => item.id === clipId);
  if (!clip) return null;
  const current = project.layers.find(layer => layer.id === clip.layerId) || project.layers[clip.track] || project.layers[0];
  if (current?.locked) return { ...clip, refused: "verrouillé" };
  if (start != null) clip.start = Math.max(0, Number(start) || 0);
  if (layerId) {
    const layer = project.layers.find(item => item.id === layerId);
    if (layer?.locked) return { ...clip, refused: "verrouillé" };
    if (layer) {
      clip.layerId = layer.id;
      clip.track = layer.order;
    }
  } else if (current && !clip.layerId) {
    clip.layerId = current.id;
  }
  return clip;
}

export function createBroadcastScene() {
  const project = newProject();
  project.name = "Fausse émission";
  project.output.background = "#101820";
  ensureLayers(project);
  const title = addNode(project, "text", "Titre", 80, 40, {
    text: "DIRECT", size: 3, bold: true, color: "#f4f1e8", opacity: 0, x: 16, y: 24
  });
  const banner = addNode(project, "text", "Bandeau", 80, 120, {
    text: "BANDEAU", size: 2, bold: false, color: "#d7b86a", opacity: 1, x: 16, y: 110
  });
  const titleLayer = project.layers[0];
  const bannerLayer = project.layers[1];
  const titleClip = addTimelineClip(project, { track: titleLayer.order, layerId: titleLayer.id, start: 0, duration: 4, label: "Titre", kind: "effect" });
  addTimelineClip(project, { track: bannerLayer.order, layerId: bannerLayer.id, start: 0.5, duration: 3.5, label: "Bandeau", kind: "effect" });
  setKeyframe(project, title.id, "opacity", 0, 0, "linear");
  setKeyframe(project, title.id, "opacity", 1, 1, "linear");
  setKeyframe(project, title.id, "opacity", 3, 1, "linear");
  setKeyframe(project, title.id, "opacity", 4, 0, "linear");
  project.cues = [{
    id: "cue-direct",
    number: "1",
    label: "DIRECT",
    time: 1,
    armed: true,
    actions: [{ type: "set-param", nodeId: title.id, key: "opacity", value: 1 }]
  }];
  return { project, title, banner, titleClip };
}

export function broadcastFrame(project, time) {
  applyCurves({ project }, time);
  const title = project.nodes.find(node => node.title === "Titre");
  const plate = renderTextPlate({ ...title.params, opacity: title.params.opacity });
  return { opacity: title.params.opacity, drawn: plate.drawn, plate };
}

export function sceneRoundTrip(project) {
  const opened = openProject(JSON.parse(exportProject(project)));
  return opened.project;
}
