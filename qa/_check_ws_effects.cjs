const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const idx = src.indexOf("function Workspace");
const seg = src.slice(idx, idx + 3000);
console.log("=== Workspace useEffect calls ===");
const matches = seg.matchAll(/useEffect\(/g);
for (const m of matches) {
  const pos = m.index;
  console.log("  at pos", pos, ":", seg.slice(pos, pos + 150).replace(/\n\s*/g, " "));
}