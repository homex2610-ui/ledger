const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const idx = src.indexOf("function AuthScreen");
const seg = src.slice(idx, idx + 6000);
console.log("=== demo button in AuthScreen ===");
for (const m of seg.matchAll(/onDemo|demo mode|Continue as Guest|demo-user/gi)) {
  const pos = m.index;
  console.log("  pos:", pos, "context:", seg.slice(Math.max(0, pos - 100), pos + 200).replace(/\n/g, " "));
}