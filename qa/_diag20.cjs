const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");

console.log("=== EXAM_SUBJECTS / DEFAULT_SYLLABUS full context ===");
const idx = src.indexOf("EXAM_SUBJECTS[exam]");
console.log(src.slice(idx - 500, idx + 400));
console.log("=== subjects usage in Onboarding ===");
const oi = src.indexOf("function Onboarding");
console.log(src.slice(oi, oi + 2200));
console.log("=== REVISION_INTERVALS context ===");
const ri = src.indexOf("REVISION_INTERVALS.length");
console.log(src.slice(ri - 900, ri + 300));
console.log("=== chipLabel + statusChips region ===");
const cl = src.indexOf("chipLabel = {");
console.log(src.slice(cl - 300, cl + 400));
