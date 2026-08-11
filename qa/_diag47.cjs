const fs = require("fs");
const spec = fs.readFileSync("qa/ledger.spec.js", "utf8");
console.log("=== spec subject/chapter expectations ===");
const lines = spec.split("\n");
lines.forEach((l, i) => {
  if (/subject|syllabus|chapter|Maths|Math|Physics|Chemistry|Biology|exam|JEE|NEET/i.test(l)) console.log((i + 1) + ": " + l.slice(0, 180));
});
