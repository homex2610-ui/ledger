const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
console.log("=== Workspace function start ===");
const idx = src.indexOf("function Workspace");
const seg = src.slice(idx, idx + 200);
console.log(seg.replace(/\n\s*/g, "\n  "));