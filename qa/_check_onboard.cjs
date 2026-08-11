const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const idx = src.indexOf("function Onboarding");
const seg = src.slice(idx, idx + 3000);
console.log("=== Onboarding completion - syllabus seeding ===");
const m = seg.match(/onDone\([\s\S]{0,500}/);
console.log(m ? m[0].replace(/\n\s*/g, "\n  ") : "(none)");