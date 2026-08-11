const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const idx = src.indexOf("function Onboarding");
const seg = src.slice(idx, idx + 5000);
console.log(seg.slice(0, 1000).replace(/\n\s*/g, "\n  "));