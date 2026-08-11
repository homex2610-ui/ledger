const fs = require("fs");
const l = fs.readFileSync("src/App.jsx", "utf8").split("\n");
const src = l.join("\n");
const icons = [...new Set([...src.matchAll(/<(\w+)\s/g)].map(m => m[1])
  .concat([...src.matchAll(/[ <](\w+) size=\{/g)].map(m => m[1])))];
console.log("JSX tags used:", icons.join(", "));
console.log("--- component refs:");
for (const c of ["Sidebar", "Workspace", "GlobalSwipe", "ThemeProvider", "Settings", "AuthGate", "PracticeCard", "Timer", "Syllabus", "StatusBubble", "SettingsPanel", "Ring", "FocusRing"])
  console.log((src.includes(c) ? "YES " : "NO  ") + c);
console.log("--- StatusBubble usage:");
const m = src.match(/<StatusBubble[^>]*\/?>/g);
console.log(m ? m.slice(0, 4).join("\n") : "(no usage)");
console.log("--- end of file:");
console.log(l.slice(-8).join("\n"));
console.log("--- devhooks reference in src:");
const fsx = require("fs");
for (const f of fsx.readdirSync("src")) {
  const t = fsx.readFileSync("src/" + f, "utf8");
  if (/devhooks|dev-tools|checkDevTools|devTools/i.test(t)) console.log(f + " -> " + t.match(/[^;\n]*(devhooks|devTools)[^;\n]*/gi).slice(0, 2).join(" | "));
}
console.log("--- what theme.js exports:");
const th = fsx.readFileSync("src/theme.js", "utf8");
const exp = th.match(/export\s+(const|function)\s+\w+/g);
console.log(exp ? exp.join(", ") : "(none)");
console.log("--- root render / createRoot in surviving file:", src.includes("root.render"), src.includes("document.getElementById"));
