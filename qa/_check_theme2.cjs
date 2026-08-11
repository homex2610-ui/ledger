const fs = require("fs");
const th = fs.readFileSync("src/lib/theme.js", "utf8");
console.log("=== verdigris danger and countdown ===");
const m = th.match(/verdigris: \{[\s\S]{0,300}/);
console.log(m ? m[0].replace(/\s+/g, " ").slice(0, 500) : "(none)");