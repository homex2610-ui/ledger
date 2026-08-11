const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const idx = src.indexOf("function Onboarding");
const seg = src.slice(idx, idx + 5000);
console.log("=== onDone call ===");
const matches = seg.matchAll(/onDone\([\s\S]{0,300}/g);
for (const m of matches) console.log(m[0].replace(/\n\s*/g, "\n  "));