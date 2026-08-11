const fs = require("fs");
const app = fs.readFileSync("src/App.jsx", "utf8");
console.log("=== pip / sound / ring segments / daemon / notify usage ===");
for (const n of ["pipTimer", "sounds", "ringSegments", "daemon", "notify", "PipTimer", "Sound", "RingSegment", "playPop", "playChime", "SEG", "Stat", "StatStrip"]) {
  const cnt = (app.match(new RegExp("\\b" + n + "\\b", "g")) || []).length;
  if (cnt) console.log(n.padEnd(14) + cnt);
}
console.log("=== Stat usage ===");
for (const m of app.matchAll(/<Stat [\s\S]{0,120}/g)) console.log("  " + m[0].replace(/\s+/g, " ").slice(0, 140));
console.log("=== React.forwardRef / React.memo context ===");
for (const m of app.matchAll(/[\s\S]{0,140}React\.(forwardRef|memo)[\s\S]{0,60}/g)) console.log("  " + m[0].replace(/\s+/g, " ").slice(0, 200));
console.log("=== sounds.js exports ===");
const s = fs.readFileSync("src/lib/sounds.js", "utf8");
console.log([...new Set(s.match(/^export (?:const|function) (\w+)/gm))].join("\n"));
console.log("=== ringSegments.js exports ===");
const r = fs.readFileSync("src/lib/ringSegments.js", "utf8");
console.log([...new Set(r.match(/^export (?:const|function) (\w+)/gm))].join("\n"));
console.log("=== pipTimer.js exports ===");
const p = fs.readFileSync("src/lib/pipTimer.js", "utf8");
console.log([...new Set(p.match(/^export (?:const|function) (\w+)/gm))].join("\n"));
console.log("=== components dir listing ===");
function walk(d, pre) { for (const f of fs.readdirSync(d)) { const full = d + "\\" + f; if (fs.statSync(full).isDirectory()) walk(full, pre + f + "/"); else console.log("  " + pre + f); } }
walk("src/components", "");
