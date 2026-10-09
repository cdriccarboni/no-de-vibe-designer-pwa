/**
 * Photo -> Controller
 * Lightweight local-only visual segmentation for Companion Studio.
 * It intentionally does not upload images or claim OCR/semantic recognition.
 */

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function rgbHex(r, g, b) {
  return "#" + [r,g,b].map(v => clamp(Math.round(v),0,255).toString(16).padStart(2,"0")).join("");
}

function cellStats(data, width, height, x0, y0, x1, y1) {
  let edge = 0, count = 0, r = 0, g = 0, b = 0;
  const sx = Math.max(1, Math.floor((x1 - x0) / 30));
  const sy = Math.max(1, Math.floor((y1 - y0) / 30));
  for (let y = y0; y < y1 - 1; y += sy) {
    for (let x = x0; x < x1 - 1; x += sx) {
      const i = (y * width + x) * 4;
      const ir = (y * width + Math.min(width - 1, x + sx)) * 4;
      const id = (Math.min(height - 1, y + sy) * width + x) * 4;
      const lum = data[i] * .299 + data[i+1] * .587 + data[i+2] * .114;
      const lumR = data[ir] * .299 + data[ir+1] * .587 + data[ir+2] * .114;
      const lumD = data[id] * .299 + data[id+1] * .587 + data[id+2] * .114;
      edge += Math.abs(lum - lumR) + Math.abs(lum - lumD);
      r += data[i]; g += data[i+1]; b += data[i+2]; count++;
    }
  }
  const meanEdge = count ? edge / count : 0;
  return {
    score: meanEdge,
    color: rgbHex(count ? r/count : 35, count ? g/count : 39, count ? b/count : 44)
  };
}

export function detectControllerRegions(imageData, width, height, { cols = 4, rows = 6, max = 16 } = {}) {
  const candidates = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x0 = Math.floor(col * width / cols);
      const x1 = Math.floor((col + 1) * width / cols);
      const y0 = Math.floor(row * height / rows);
      const y1 = Math.floor((row + 1) * height / rows);
      const stats = cellStats(imageData.data || imageData, width, height, x0, y0, x1, y1);
      candidates.push({ col, row, w:1, h:1, ...stats });
    }
  }
  const sorted = [...candidates].sort((a,b) => b.score - a.score);
  const median = sorted[Math.floor(sorted.length * .55)]?.score || 0;
  let selected = sorted.filter(c => c.score >= Math.max(12, median)).slice(0, max);
  if (selected.length < 6) selected = sorted.slice(0, Math.min(8, sorted.length));
  return selected.sort((a,b) => a.row - b.row || a.col - b.col);
}

/**
 * Turn detected zones into an editable, intentionally unbound Companion page.
 * A photo is only stored in the local document when the user explicitly keeps it.
 */
export function buildPhotoControllerRecord(regions = [], { keepBackground = false, backgroundDataUrl = null, opacity = .35 } = {}) {
  const keepsLocalBackground = keepBackground === true && typeof backgroundDataUrl === "string" && backgroundDataUrl.startsWith("data:image/");
  return {
    widgets: (Array.isArray(regions) ? regions : []).map((region, index) => ({
      type: "button",
      presentation: {
        label: `B${index + 1}`,
        secondary: "",
        x: Number(region.col) || 0,
        y: Number(region.row) || 0,
        w: Math.max(1, Number(region.w) || 1),
        h: Math.max(1, Number(region.h) || 1),
        color: region.color || "#d7b86a",
        textColor: "#ffffff",
        fontFamily: "inherit",
        fontSize: 15,
        layer: index
      },
      binding: { kind:"unassigned", action:"" }
    })),
    photoController: {
      source: "photo",
      keepBackground: keepBackground === true,
      backgroundDataUrl: keepsLocalBackground ? backgroundDataUrl : null,
      opacity: clamp(Number(opacity) || .35, 0, .85)
    }
  };
}

export async function imageFileToControllerTemplate(file, { maxSide = 640 } = {}) {
  if (!file) throw new Error("Photo absente");
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  await img.decode();
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently:true });
  ctx.drawImage(img, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height);
  let backgroundDataUrl = null;
  try { backgroundDataUrl = canvas.toDataURL("image/jpeg", .75); } catch { /* background remains a session preview only */ }
  return { url, backgroundDataUrl, width, height, regions:detectControllerRegions(pixels, width, height) };
}
