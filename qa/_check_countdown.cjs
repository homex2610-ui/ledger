const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
console.log("=== check COLORS.countdown usage ===");
const lines = src.split("\n");
lines.forEach((l, i) => {
  if (l.includes("COLORS.countdown")) console.log((i + 1) + ": " + l.trim());
});