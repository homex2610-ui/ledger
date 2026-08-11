const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const lines = src.split("\n");

console.log("=== Dashboard function - before return (1400-1658) ===");
for (let i = 1400; i < 1658; i++) {
  const l = lines[i];
  if (l.includes("coverage") || l.includes("week") || l.includes("recall") || l.includes("today") || l.includes("subjects") || l.includes("workspaces") || l.includes("status")) {
    console.log((i + 1) + ": " + l.trim().slice(0, 150));
  }
}
console.log("=== find 'flags.week' or 'flags.year' usage BEFORE return ===");
for (let i = 1538; i < 1658; i++) console.log((i + 1) + ": " + lines[i].trim().slice(0, 180));