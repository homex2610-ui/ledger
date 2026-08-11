const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const spec = fs.readFileSync("qa/ledger.spec.js", "utf8");

console.log("=== subjects in spec ===");
const subs = new Set();
for (const m of spec.matchAll(/["'](Physics|Chemistry|Mathematics|Maths|Biology|Botany|Zoology)["']/g)) subs.add(m[1]);
console.log([...subs].join(", "));
console.log("=== 'Syllabus' test sections ===");
for (const m of spec.matchAll(/test\("([^"]*syllabus[^"]*)"[\s\S]{0,700}/gi)) console.log("--- " + m[1] + "\n" + m[2].slice(0, 700));
console.log("=== settings.dashboard toggle labels in Settings tab ===");
const st = src.indexOf("function Settings");
console.log(src.slice(st, st + 3000).split("\n").filter(l => /dashboard|clock|countdown|studied|now|week|year|subjects|workspaces|status|Toggle|flag/i.test(l)).slice(0, 40).join("\n"));
