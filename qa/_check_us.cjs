const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
console.log("=== useStorage hook ===");
const idx = src.indexOf("function useStorage");
if (idx >= 0) console.log(src.slice(idx, idx + 1500).replace(/\n\s*/g, "\n  "));
else console.log("NOT FOUND");