const fs = require("fs");
const th = fs.readFileSync("src/lib/theme.js", "utf8");
console.log("=== verdigris theme preset ===");
const m = th.match(/verdigris: \{[\s\S]{0,800}?\}/);
console.log(m ? m[0].replace(/\s+/g, " ").slice(0, 1000) : "(none)");