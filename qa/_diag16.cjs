const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");

console.log("=== settings. key access ===");
const keys = new Set();
for (const m of src.matchAll(/settings\.(\w+)/g)) keys.add(m[1]);
console.log([...keys].sort().join(", "));
console.log("=== settings.dashboard keys ===");
const dk = new Set();
for (const m of src.matchAll(/settings\.dashboard\.(\w+)/g)) dk.add(m[1]);
for (const m of src.matchAll(/dashboard\[["'](\w+)["']\]/g)) dk.add(m[1]);
console.log([...dk].sort().join(", "));
console.log("=== flags. keys ===");
const fk = new Set();
for (const m of src.matchAll(/\bflags\.(\w+)/g)) fk.add(m[1]);
console.log([...fk].sort().join(", "));
console.log("=== dashboard settings prop shapes ===");
for (const m of src.matchAll(/.{0,60}dashboardSettings\b.{0,120}/g)) console.log("  " + m[0].replace(/\s+/g, " "));
console.log("=== date format options (Settings) ===");
for (const m of src.matchAll(/.{0,80}(dateFormat|DATE_FORMAT|date format|Date format).{0,100}/gi)) {
  const t = m[0].replace(/\s+/g, " ");
  if (/compact|dd|MMM|yyyy|month|format|option|Select|"|'/.test(t)) console.log("  " + t);
}
console.log("=== EXAM_SUBJECTS keys used ===");
for (const m of src.matchAll(/EXAM_SUBJECTS\[["']?(\w+ [\w+]*)?["']?\]/g)) console.log("  " + m[0]);
console.log("=== syllabus: DEFAULT_SYLLABUS shape hints ===");
for (const m of src.matchAll(/.{0,80}(DEFAULT_SYLLABUS|initSyll).{0,120}/g)) console.log("  " + m[0].replace(/\s+/g, " "));
console.log("=== profile keys ===");
const pk = new Set();
for (const m of src.matchAll(/profile\.(\w+)/g)) pk.add(m[1]);
console.log([...pk].sort().join(", "));
console.log("=== the default goalMin / soundEnabled / etc defaults ===");
for (const m of src.matchAll(/.{0,50}\b(soundEnabled|goalMin|reduceMotion|density|fontScale|accent|wallpaperMode|clockStyle|pomoPhase)\b.{0,80}/g)) {
  const t = m[0].replace(/\s+/g, " ");
  if (/[=:]/.test(t)) console.log("  " + t.slice(0, 140));
}
