const fs = require("fs");
const app = fs.readFileSync("src/App.jsx", "utf8");
console.log("=== fmtDateStr usages ===");
for (const m of app.matchAll(/[\s\S]{0,80}fmtDateStr\([\s\S]{0,100}/g)) console.log("  " + m[0].replace(/\s+/g, " ").slice(0, 180));
console.log("=== pip / ring / audio usage in App ===");
for (const n of ["pipSupported", "closePipWindow", "fmtTotal", "computeRingSegments", "unlockAudio", "playTick", "playReward", "focusCss", "lgRingBurst", "SEGMENTS", "SEG_COLORS", "WEEK", "rings"]) {
  const cnt = (app.match(new RegExp("\\b" + n + "\\b", "g")) || []).length;
  if (cnt) console.log("  " + n + ": " + cnt);
}
console.log("=== useNow definition ===");
const u = app.match(/function useNow[\s\S]{0,400}/);
console.log(u ? u[0].replace(/\n\s*/g, "\n  ").slice(0, 450) : "(none)");
console.log("=== focusCss / ringSegments import target? check pipTimer.js content head ===");
const p = fs.readFileSync("src/lib/pipTimer.js", "utf8");
console.log(p.slice(0, 500));
console.log("=== check ledger.spec.js data-seed & expectations of chapter names ===");
const spec = fs.readFileSync("qa/ledger.spec.js", "utf8");
const m2 = spec.match(/Physics[\s\S]{0,200}/g);
if (m2) for (const x of m2.slice(0, 6)) console.log("  " + x.replace(/\s+/g, " ").slice(0, 220));
