const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
console.log("=== AuthScreen onDemo handling ===");
const idx = src.indexOf("function AuthScreen");
const seg = src.slice(idx, idx + 4000);
console.log(seg.slice(0, 500).replace(/\n\s*/g, "\n  "));
console.log("---");
console.log(seg.match(/onDemo[\s\S]{0,200}/)[0].replace(/\n\s*/g, "\n  "));