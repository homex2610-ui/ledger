const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const lines = src.split("\n");
console.log("=== find sessions state ===");
lines.forEach((l, i) => { if (l.includes("sessions") && (l.includes("useState") || l.includes("useStorage") || l.includes("load("))) console.log((i + 1) + ": " + l.trim()); });