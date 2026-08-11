// Wallpaper pipeline — validate, downscale, persist and color-extract.
// Pure functions where possible so the palette logic is unit-testable
// without a browser (run via page.evaluate in the QA harness).

export const WALLPAPER_KEY = "ledger.wallpaper.img";
const MAX_DIM = 1280;          // longest edge of the persisted image
const JPEG_Q = 0.82;           // JPEG quality for the persisted data URL
const MAX_BYTES = 8 * 1024 * 1024;
const VALID_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateUpload(file) {
  if (!file || !VALID_TYPES.includes(file.type)) return "Only JPG, PNG or WebP images are supported.";
  if (file.size > MAX_BYTES) return "That image is larger than 8 MB — try a smaller one.";
  return null;
}

// Downscale a File to a JPEG data URL (keeps localStorage well under quota)
// before anything else touches it. Rejects on decode failure.
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_DIM / Math.max(1, img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        const cx = cv.getContext("2d");
        cx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(cv.toDataURL("image/jpeg", JPEG_Q));
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read that image.")); };
    img.src = url;
  });
}

export function loadWallpaperImage() {
  try { return localStorage.getItem(WALLPAPER_KEY); } catch (e) { return null; }
}
export function saveWallpaperImage(dataUrl) {
  try { localStorage.setItem(WALLPAPER_KEY, dataUrl); return true; }
  catch (e) { return false; } // quota — caller surfaces the message
}
export function clearWallpaperImage() {
  try { localStorage.removeItem(WALLPAPER_KEY); } catch (e) { /* noop */ }
}

// ---- color math (pure, no DOM) ----

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s, l];
}

export function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) { r = c; g = x; } else if (hp < 2) { r = x; g = c; } else if (hp < 3) { g = c; b = x; }
  else if (hp < 4) { g = x; b = c; } else if (hp < 5) { r = x; b = c; } else { r = c; b = x; }
  const m = l - c / 2;
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

// Legibility floor: an accent must stay readable against dark panels —
// lightness clamped into ~42-62% and a minimum saturation. Returns the
// clamped hex, or null when the color can't hold enough saturation to be
// an accent (monochrome/near-gray) — callers fall back to the theme accent.
export function clampAccentHex(hex) {
  const h = String(hex || "").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  const [hu, s, l] = rgbToHsl(r, g, b);
  if (s < 0.28) return null; // too gray to be an accent
  const lc = Math.min(0.62, Math.max(0.42, l));
  const sc = Math.max(s, 0.45);
  return hslToHex(hu, sc, lc);
}

// Dominant palette from an image: bucket sampled pixels by hue, score the
// bins by count × saturation (bright-ish weights), return up to three
// legibility-clamped hexes. Returns [] when the image is monochrome or too
// low-variance to trust (caller keeps the current accent).
export function extractPalette(dataUrl, sampleSize = 56) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const cv = document.createElement("canvas");
        cv.width = sampleSize; cv.height = sampleSize;
        const cx = cv.getContext("2d", { willReadFrequently: true });
        cx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const { data } = cx.getImageData(0, 0, sampleSize, sampleSize);
        resolve(paletteFromPixels(data));
      } catch (e) { resolve([]); }
    };
    img.onerror = () => resolve([]);
    img.src = dataUrl;
  });
}

export function paletteFromPixels(pixels) {
  const bins = new Map();
  let total = 0, satSum = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3];
    if (a < 128) continue; // skip transparent
    const [hu, s, l] = rgbToHsl(pixels[i], pixels[i + 1], pixels[i + 2]);
    if (s < 0.12 && l < 0.14) continue; // skip near-black noise
    const bin = Math.floor(hu / 30) % 12;
    const hit = bins.get(bin) || { r: 0, g: 0, b: 0, n: 0, s: 0 };
    hit.r += pixels[i]; hit.g += pixels[i + 1]; hit.b += pixels[i + 2];
    hit.s += s; hit.n++;
    bins.set(bin, hit);
    total++; satSum += s;
  }
  if (total < sampleSizeMin()) return [];
  const avgSat = satSum / total;
  if (avgSat < 0.08) return []; // monochrome image — no trustworthy accent

  const ranked = [...bins.entries()]
    .map(([hue, b]) => {
      const sc = b.s / b.n;
      return {
        hue,
        hex: hslToHex(hue * 30 + 15, sc, 0.5),
        score: b.n * (0.25 + sc) * (1 + sc),
      };
    })
    .sort((x, y) => y.score - x.score);

  const out = [];
  const seen = new Set();
  for (const c of ranked) {
    if (seen.has(c.hue)) continue;
    const clamped = clampAccentHex(c.hex);
    if (!clamped) continue;
    seen.add(c.hue);
    out.push(clamped);
    if (out.length >= 3) break;
  }
  return out;
}

function sampleSizeMin() {
  // ~2.5% of the sampled grid must be colored — a mostly-empty or
  // microscopic image yields nothing trustworthy.
  return 56 * 56 * 0.025;
}

// ---- test hooks (dev server only) ----
// Same elimination contract as sounds.js: referenced only inside the
// `if (!import.meta.env.DEV)` block in App.jsx, so these drop out of the
// production bundle entirely. Grep dist/assets after each build to confirm.
export function __ledgerWallpaperHooks() {
  return { extractPalette, clampAccentHex, paletteFromPixels, rgbToHsl, hslToHex };
}
