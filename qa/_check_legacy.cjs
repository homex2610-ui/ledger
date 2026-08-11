const fs = require("fs");
const th = fs.readFileSync("src/lib/theme.js", "utf8");
console.log("=== LEGACY_THEME ===");
const m = th.match(/LEGACY_THEME = \{[\s\S]{0,800}/);
console.log(m ? m[0].replace(/\s+/g, " ").slice(0, 900) : "(none)");