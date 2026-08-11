const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const lines = src.split("\n");

console.log("=== find MonthView function ===");
lines.forEach((l, i) => { if (l.includes("function MonthView")) console.log((i + 1) + ": " + l.trim()); });