const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");

console.log("=== STATUS_LABEL exact fragment ===");
const si = src.indexOf('"In progress", done: "Done", mastered: "Mastered"');
console.log(si >= 0 ? src.slice(si - 120, si + 120) : "(not found)");
console.log("=== status labels around STATUS_LABEL ===");
const sl = src.indexOf("STATUS_LABEL");
console.log(sl >= 0 ? src.slice(sl - 200, sl + 200) : "(no STATUS_LABEL ref in body)");
console.log("=== colorMap fragment ===");
const cm = src.indexOf("colorMap[");
console.log(cm >= 0 ? src.slice(cm - 200, cm + 60) : "(none)");
console.log("=== dateFormat options in Settings ===");
for (const m of src.matchAll(/.{0,40}dateFormat.{0,120}/g)) {
  const t = m[0].replace(/\s+/g, " ");
  if (/option|label|Select|v:|format|compact|long|short/.test(t)) console.log("  " + t.slice(0, 160));
}
console.log("=== sound defaults / floatingTimer / landingPage defaults ===");
for (const m of src.matchAll(/.{0,50}(sound:\s*\{|floatingTimer:\s*|landingPage:\s*|clockStyle:\s*["']|dateFormat:\s*["']|density:\s*["']|theme:\s*["']|goalMin:\s*\d|reducedMotion:\s*|clock24h:\s*|defaultFocusMin:\s*\d|autoStartBreaks:\s*|newPerDay:\s*\d|defaultView:\s*["']|accent:\s*["']|wallpaperMode:\s*["']).{0,90}/g)) console.log("  " + m[0].replace(/\s+/g, " ").slice(0, 150));
console.log("=== settings keys referenced with defaults in code (setSettings spreads) ===");
const ss = new Set();
for (const m of src.matchAll(/setSettings\(s => \(\{ \.\.\.s, (\w+)[:}]/g)) ss.add(m[1]);
console.log([...ss].sort().join(", "));
console.log("=== dashboard toggle labels in Settings (section) ===");
for (const m of src.matchAll(/dashboard\.(\w+)|"Dashboard"|"Show .*"/g)) {
  const t = m[0];
  if (!/dashboard\./.test(t) && /"/.test(t)) console.log("  " + t);
}
