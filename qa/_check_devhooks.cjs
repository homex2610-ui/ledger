const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
console.log("=== dev-mode hooks useEffect ===");
const idx = src.indexOf("Dev-mode hooks");
if (idx >= 0) console.log(src.slice(idx - 100, idx + 500).replace(/\n\s*/g, "\n  "));
else console.log("NOT FOUND");