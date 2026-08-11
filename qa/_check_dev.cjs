const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
console.log("=== search for import.meta.env.DEV ===");
const lines = src.split("\n");
lines.forEach((l, i) => { if (l.includes("import.meta.env.DEV") || l.includes("__ledger")) console.log((i + 1) + ": " + l.trim()); });