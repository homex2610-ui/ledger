const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
console.log("=== WeakAreas definition in App.jsx ===");
const idx = src.indexOf("function WeakAreas");
if (idx >= 0) console.log(src.slice(idx, idx + 2000).replace(/\n\s*/g, "\n  "));
else console.log("NOT FOUND in App.jsx");

console.log("=== Search for 'weak' tab content ===");
const lines = src.split("\n");
lines.forEach((l, i) => { if (l.includes("weak") && (l.includes("function") || l.includes("=> {") || l.includes("const Weak"))) console.log((i + 1) + ": " + l.trim()); });