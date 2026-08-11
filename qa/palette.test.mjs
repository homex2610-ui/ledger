// Unit tests for the pure color/wallpaper math in src/lib/wallpaper.js.
// Runs under `node --test` with no browser — only the pure exports are
// imported; DOM-dependent functions (extractPalette, fileToDataUrl) are
// exercised end-to-end in the Playwright suite instead.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateUpload,
  clampAccentHex,
  rgbToHsl,
  hslToHex,
  paletteFromPixels,
} from "../src/lib/wallpaper.js";

const HEX = /^#[0-9A-F]{6}$/;

test("rgbToHsl / hslToHex are exact inverses at the primaries", () => {
  assert.equal(hslToHex(120, 1, 0.5), "#00FF00");
  assert.equal(hslToHex(0, 1, 0.5), "#FF0000");
  assert.equal(hslToHex(240, 1, 0.5), "#0000FF");
  const [h, s, l] = rgbToHsl(255, 0, 0);
  assert.deepEqual([Math.round(h), s, l], [0, 1, 0.5]);
});

test("clampAccentHex keeps the hue and lands lightness in the legibility band", () => {
  const out = clampAccentHex("#3EC9A7");
  assert.match(out, HEX);
  const [h, s, l] = rgbToHsl(
    parseInt(out.slice(1, 3), 16),
    parseInt(out.slice(3, 5), 16),
    parseInt(out.slice(5, 7), 16)
  );
  assert.ok(l >= 0.42 && l <= 0.62, `lightness ${l} outside 0.42-0.62`);
  assert.ok(s >= 0.28, "saturation must survive clamping");
  // Same hue family as the input (teal/green side).
  assert.ok(h >= 140 && h <= 190, `hue ${h} drifted from teal`);
});

test("clampAccentHex rejects non-accent colors", () => {
  assert.equal(clampAccentHex("#888888"), null); // gray
  assert.equal(clampAccentHex("#000000"), null); // black
  assert.equal(clampAccentHex("#FFFFFF"), null); // white
  assert.equal(clampAccentHex("nope"), null);     // malformed
  assert.equal(clampAccentHex(null), null);
});

test("clampAccentHex darkens an overly-bright accent into the band", () => {
  const out = clampAccentHex("#FFFF66"); // l > 0.62
  assert.match(out, HEX);
  const [, , l] = rgbToHsl(
    parseInt(out.slice(1, 3), 16),
    parseInt(out.slice(3, 5), 16),
    parseInt(out.slice(5, 7), 16)
  );
  assert.ok(l <= 0.62, `expected clamp below 0.62, got ${l}`);
});

function solidBuffer(hex, w = 56, h = 56) {
  const buf = new Uint8ClampedArray(w * h * 4);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  for (let i = 0; i < w * h; i++) {
    buf[i * 4] = r; buf[i * 4 + 1] = g; buf[i * 4 + 2] = b; buf[i * 4 + 3] = 255;
  }
  return buf;
}

test("paletteFromPixels extracts one clamped hex from a solid image", () => {
  const out = paletteFromPixels(solidBuffer("#3EC9A7"));
  assert.equal(out.length, 1);
  assert.match(out[0], HEX);
});

test("paletteFromPixels splits a two-color image and ranks the majority color first", () => {
  const buf = solidBuffer("#3EC9A7");
  // Bottom 25% = coral pink.
  for (let y = 42; y < 56; y++) {
    for (let x = 0; x < 56; x++) {
      const i = (y * 56 + x) * 4;
      buf[i] = 255; buf[i + 1] = 107; buf[i + 2] = 157;
    }
  }
  const out = paletteFromPixels(buf);
  assert.equal(out.length, 2);
  assert.match(out[0], HEX);
  assert.match(out[1], HEX);
  // Majority (teal) ranks first: green channel dominates.
  const [r, g] = [parseInt(out[0].slice(1, 3), 16), parseInt(out[0].slice(3, 5), 16)];
  assert.ok(g >= r, `expected teal first, got ${out[0]}`);
});

test("paletteFromPixels returns [] for monochrome or empty images", () => {
  assert.deepEqual(paletteFromPixels(solidBuffer("#808080")), []);
  assert.deepEqual(paletteFromPixels(solidBuffer("#000000")), []);
  assert.deepEqual(paletteFromPixels(new Uint8ClampedArray(56 * 56 * 4)), []);
});

test("validateUpload rejects bad types and oversize files", () => {
  assert.equal(validateUpload({ type: "image/png", size: 1000 }), null);
  assert.equal(validateUpload({ type: "image/jpeg", size: 1000 }), null);
  assert.equal(validateUpload({ type: "image/webp", size: 1000 }), null);
  assert.ok(validateUpload({ type: "image/gif", size: 1000 }));
  assert.ok(validateUpload({ type: "image/png", size: 9 * 1024 * 1024 }));
  assert.ok(validateUpload(null));
});
