const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const lines = src.split("\n");
console.log("=== FIRST 12 LINES of surviving file ===");
for (let i = 0; i < 12; i++) console.log((i + 1) + ": " + lines[i]);
console.log("=== file line count:", lines.length);
console.log("=== import lines present in surviving file ===");
lines.forEach((l, i) => { if (l.includes("import ")) console.log((i + 1) + ": " + l); });
