const fs = require("fs");

console.log("=== files in src/lib ===");
for (const f of fs.readdirSync("src/lib")) console.log("  " + f);
console.log("=== Panels.jsx exports ===");
const p = fs.readFileSync("src/components/ui/Panels.jsx", "utf8");
console.log([...new Set(p.match(/^export (?:const|function) (\w+)/gm))].join("\n"));
console.log("=== Badge in Panels? ===");
console.log((p.match(/function Badge[\s\S]{0,200}/) || ["(none)"])[0].replace(/\s+/g, " ").slice(0, 300));
console.log("=== App references to demo/stored/flash — check for a demo module ===");
console.log("src has demo.js? ", fs.existsSync("src/lib/demo.js"));
console.log("=== utils.js exports ===");
const u = fs.readFileSync("src/lib/utils.js", "utf8");
console.log([...new Set(u.match(/^export (?:const|function) (\w+)/gm))].join("\n"));
console.log("=== theme.js exports ===");
const t = fs.readFileSync("src/lib/theme.js", "utf8");
console.log([...new Set(t.match(/^export (?:const|function) (\w+)/gm))].join("\n"));
console.log("=== supabaseClient exports ===");
const s = fs.readFileSync("src/lib/supabaseClient.js", "utf8");
console.log([...new Set(s.match(/^export (?:const|function) (\w+)/gm))].join("\n"));
console.log("=== wallpaper.js exports ===");
const w = fs.readFileSync("src/lib/wallpaper.js", "utf8");
console.log([...new Set(w.match(/^export (?:const|function) (\w+)/gm))].join("\n"));
console.log("=== lucide icon usages in App ===");
const app = fs.readFileSync("src/App.jsx", "utf8");
const lucideKnown = ["ChevronDown", "Check", "ChevronRight", "Flame", "Search", "ArrowUp", "ArrowDown", "Trash2", "Star", "NotebookPen", "Plus", "CheckCircle2", "Circle", "Pencil", "Play", "Pause", "Square", "PictureInPicture2", "Maximize2", "Layers", "X", "Download", "KeyRound", "Users", "Copy", "RefreshCw", "Crown", "LogIn", "LogOut", "Timer", "ChevronUp", "Upload", "ClipboardList", "BookOpen", "TrendingUp", "AlertTriangle", "LineChart", "PieChart", "BarChart2"];
const found = new Set();
for (const n of lucideKnown) {
  if (new RegExp("<" + n + "\\b|" + n + " size=|icon: " + n).test(app)) found.add(n);
}
console.log([...found].join(", "));
console.log("=== recharts usages ===");
for (const n of ["ResponsiveContainer", "BarChart", "XAxis", "YAxis", "Tooltip", "Bar", "Cell", "LineChart", "Line", "Pie", "PieChart"]) {
  const c = (app.match(new RegExp("<" + n + "\\b|" + n + ">", "g")) || []).length;
  if (c) console.log("  " + n + ": " + c);
}
console.log("=== React import style: does App use `React.` ? ===");
console.log("React. usages:", (app.match(/React\./g) || []).length);
console.log("=== createPortal usage ===");
console.log("createPortal:", (app.match(/createPortal/g) || []).length);
