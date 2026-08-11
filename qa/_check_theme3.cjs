const fs = require("fs");
const th = fs.readFileSync("src/lib/theme.js", "utf8");
console.log("=== verdigris danger and countdown ===");
const idx = th.indexOf("verdigris");
if (idx >= 0) console.log(th.slice(idx, idx + 400).replace(/\s+/g, " "));