const fs = require("fs");
const th = fs.readFileSync("src/lib/theme.js", "utf8");
console.log("=== applyTheme function ===");
const idx = th.indexOf("export function applyTheme");
if (idx >= 0) console.log(th.slice(idx, idx + 2000).replace(/\n\s*/g, "\n  "));
else console.log("NOT FOUND");