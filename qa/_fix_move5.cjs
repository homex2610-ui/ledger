const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const lines = src.split("\n");

console.log("=== search for 'carousel' in file ===");
lines.forEach((l, i) => { if (l.toLowerCase().includes("carousel")) console.log((i + 1) + ": " + l.trim()); });

console.log("=== search for 'Panel' or 'WeekZone' or 'MonthView' ===");
lines.forEach((l, i) => { if (l.includes("WeekZone") || l.includes("MonthView") || l.includes("Carousel")) console.log((i + 1) + ": " + l.trim()); });

console.log("=== search for unused imports at top ===");
for (let i = 0; i < 50; i++) console.log((i + 1) + ": " + lines[i].trim());