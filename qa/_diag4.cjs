const fs = require("fs");
const l = fs.readFileSync("src/App.jsx", "utf8").split("\n");
const src = l.join("\n");

console.log("=== components dir ===");
for (const f of fs.readdirSync("src/components")) console.log("  " + f);
console.log("=== lib dir ===");
for (const f of fs.readdirSync("src/lib")) console.log("  " + f);

console.log("=== functions defined in surviving App.jsx ===");
for (const m of src.matchAll(/^(function|export default function|const) (\w+)\s*[=({]/gm)) {
  const name = m[2];
  if (!/^(function|const)$/.test(m[1])) console.log("  " + m[1] + " " + name);
}
console.log("(regex dump):");
console.log([...src.matchAll(/^function (\w+)/gm)].map(m => "  " + m[1]).join("\n"));

console.log("=== main.jsx ===");
console.log(fs.readFileSync("src/main.jsx", "utf8"));

console.log("=== ThemeProvider usage in src ===");
for (const f of fs.readdirSync("src").concat(fs.readdirSync("src/components").map(x => "components/" + x))) {
  const t = fs.readFileSync("src/" + f, "utf8");
  if (t.includes("ThemeProvider")) console.log("  " + f + ":", (t.match(/ThemeProvider/g) || []).length, "refs");
}
