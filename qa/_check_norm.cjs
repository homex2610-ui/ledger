const fs = require("fs");
const th = fs.readFileSync("src/lib/theme.js", "utf8");
console.log("=== normalizeTheme ===");
const m = th.match(/function normalizeTheme[\s\S]{0,400}/);
console.log(m ? m[0].replace(/\s+/g, " ").slice(0, 500) : "(none)");