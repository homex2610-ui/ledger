const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const l = src.split("\n");

const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(d + "/" + e.name) : [d + "/" + e.name]);
const files = walk("src/components").filter(f => f.endsWith(".jsx"));
console.log("=== component files ===");
console.log(files.join("\n"));

console.log("=== component usage in App.jsx (tags that could be imports) ===");
const comps = files.map(f => f.split("/").pop().replace(".jsx", ""));
for (const c of comps) {
  if (new RegExp("\\b" + c + "\\b").test(src)) console.log("  USED: " + c + " (" + (src.match(new RegExp("\\b" + c + "\\b", "g")).length) + "x)");
}

console.log("=== lib imports used ===");
for (const f of ["pipTimer.js", "ringSegments.js", "sounds.js", "supabaseClient.js", "utils.js", "wallpaper.js"]) {
  const base = f.replace(".js", "");
  const r = new RegExp("\\b" + base + "\\b");
  console.log((r.test(src) ? "USED " : "     ") + f);
}

console.log("=== icons used (candidate lucide) ===");
const tags = [...new Set([...src.matchAll(/<(\w+)\s/g)].map(m => m[1]))];
const lucideCandidates = tags.filter(t => /^[A-Z]/.test(t));
console.log(lucideCandidates.join(", "));

console.log("=== helpers referenced but maybe not defined (spot check) ===");
for (const h of ["fmtMin", "todayStr", "todayStrKeys", "fmtDateStr", "loadTodayKey", "hexToRgba", "colorMap", "STATUS_LABEL", "useNow", "computeStreak"]) {
  console.log((new RegExp("\\b" + h + "\\b").test(src) ? "  ref:" : "  ---") + " " + h);
}
console.log("=== does surviving code reference COLORS/FONTS/RADIUS/SPACE? ===");
for (const k of ["COLORS", "FONTS", "RADIUS", "SPACE"]) {
  const c = (src.match(new RegExp("\\b" + k + "\\b", "g")) || []).length;
  console.log("  " + k + ": " + c + " refs");
}
console.log("=== theme.js exports ===");
const th = fs.readFileSync("src/lib/theme.js", "utf8");
console.log(th.match(/export\s+(?:const|function)\s+\w+/g) ? [...new Set(th.match(/export\s+(?:const|function)\s+\w+/g))].join("\n") : "(none)");
console.log("=== utils.js exports ===");
const ut = fs.readFileSync("src/lib/utils.js", "utf8");
console.log(ut.match(/export\s+(?:const|function|default)\s+\w+/g) ? [...new Set(ut.match(/export\s+(?:const|function|default)\s+\w+/g))].join("\n") : "(none)");
