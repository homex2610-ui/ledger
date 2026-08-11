const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const idx = src.indexOf("function Workspace");
const seg = src.slice(idx, idx + 1000);
console.log(seg.replace(/\n\s*/g, "\n  "));