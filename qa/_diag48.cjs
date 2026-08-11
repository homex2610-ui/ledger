const fs = require("fs");
const spec = fs.readFileSync("qa/ledger.spec.js", "utf8");
const lines = spec.split("\n");
console.log("=== spec lines 60-120 (mini chapter test) ===");
for (let i = 59; i < 120 && i < lines.length; i++) console.log((i + 1) + ": " + lines[i]);
console.log("=== spec lines 440-480 (onboarding) ===");
for (let i = 439; i < 485 && i < lines.length; i++) console.log((i + 1) + ": " + lines[i]);
