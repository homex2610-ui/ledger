const fs = require("fs");
const th = fs.readFileSync("src/lib/theme.js", "utf8");
const idx = th.indexOf("verdigris");
if (idx >= 0) console.log(th.slice(idx, idx + 800).replace(/\s+/g, " "));