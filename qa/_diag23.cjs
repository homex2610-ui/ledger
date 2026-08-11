const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const th = fs.readFileSync("src/lib/theme.js", "utf8");

console.log("=== theme.js: countdownAccent, accent, initial COLORS source ===");
console.log("countdownAccent:", th.includes("countdownAccent"));
const ex = th.match(/export const LEGACY_THEME = \{[\s\S]{0,900}/);
console.log("LEGACY_THEME head:", ex ? ex[0].replace(/\s+/g, " ").slice(0, 950) : "(none)");
console.log("=== theme test expectations ===");
const spec = fs.readFileSync("qa/ledger.spec.js", "utf8");
const tt = spec.indexOf("theme system:");
console.log(spec.slice(tt, tt + 900));
