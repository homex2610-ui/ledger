const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const st = src.indexOf("function SettingsTab");
const seg = src.slice(st, st + 200000);

console.log("=== all o.v / o.label seg blocks in SettingsTab ===");
for (const mm of seg.matchAll(/<Row>[\s\S]{0,120}?seg-item[\s\S]{0,900}?<\/Row>/g)) {
  const t = mm[0].replace(/\s+/g, " ");
  if (t.length < 1000) console.log("  --- " + t.slice(0, 950));
}
