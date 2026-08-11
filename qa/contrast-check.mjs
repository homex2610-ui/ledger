import { THEME_PRESETS, normalizeTheme } from "../src/lib/theme.js";

function lum(hex) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const L1 = lum(a), L2 = lum(b);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}
const hexOf = c => (c.startsWith("rgba") || c.startsWith("rgb")) ? c : c;
const over = (fg, bgHex, a = 1) => {
  if (a >= 1) return fg;
  const [fr, fg2, fb] = [1, 3, 5].map(i => parseInt(fg.replace("#", "").slice(i, i + 2), 16));
  const [br, bg2, bb] = [1, 3, 5].map(i => parseInt(bgHex.replace("#", "").slice(i, i + 2), 16));
  const mix = (f, b) => Math.round(f * a + b * (1 - a));
  return "#" + [mix(fr, br), mix(fg2, bg2), mix(fb, bb)].map(v => v.toString(16).padStart(2, "0")).join("");
};
const textOver = (fgHex, bgHex) => over(fgHex, bgHex, 1);

const fails = [];
for (const [id, p] of Object.entries(THEME_PRESETS)) {
  const c = {
    t1: contrast(p.text1, p.canvas),
    t1s1: contrast(p.text1, p.surface1),
    t1s2: contrast(p.text1, p.surface2),
    t2: contrast(p.text2, p.canvas),
    t2s1: contrast(p.text2, p.surface1),
    t3: contrast(p.text3, p.canvas),
    t3s1: contrast(p.text3, p.surface1),
    btn: contrast(p.onAccent, p.accent),
    hov: contrast(p.text2, p.surface3),
    success: contrast(p.success, p.surface1),
    warning: contrast(p.warning, p.surface1),
    danger: contrast(p.danger, p.surface1),
  };
  const checks = [
    ["text1/canvas ≥ 7", c.t1, 7],
    ["text1/surface1 ≥ 7", c.t1s1, 7],
    ["text1/surface2 ≥ 7", c.t1s2, 7],
    ["text2/canvas ≥ 4.5", c.t2, 4.5],
    ["text2/surface1 ≥ 4.5", c.t2s1, 4.5],
    ["text3/canvas ≥ 3", c.t3, 3],
    ["text3/surface1 ≥ 3", c.t3s1, 3],
    ["onAccent/accent ≥ 3.5", c.btn, 3.5],
    ["text2/surface3 ≥ 3", c.hov, 3],
    ["success/s1 ≥ 3", c.success, 3],
    ["warning/s1 ≥ 3", c.warning, 3],
    ["danger/s1 ≥ 3", c.danger, 3],
  ];
  const line = checks.map(([n, v]) => v.toFixed(2).padStart(5));
  console.log(`${id.padEnd(10)} ${checks.map(([n]) => n.split(" ")[0]).join(" ")}`);
  console.log(`${" ".repeat(10)} ${line.join(" ")}`);
  checks.forEach(([n, v, min]) => { if (v < min) fails.push(`${id}: ${n} = ${v.toFixed(2)} < ${min}`); });
}
console.log("\nFAILS:");
console.log(fails.length ? fails.join("\n") : "none");
