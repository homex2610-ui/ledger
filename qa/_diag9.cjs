const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");

console.log("=== lucide icon usages (component tags) ===");
const lucideKnown = ["ChevronDown", "ChevronUp", "ChevronLeft", "ChevronRight", "Check", "CheckCircle2", "Circle", "Flame", "Search", "ArrowUp", "ArrowDown", "Trash2", "Star", "NotebookPen", "Plus", "Pencil", "Play", "Pause", "Square", "PictureInPicture2", "Maximize2", "X", "Download", "KeyRound", "Users", "Copy", "RefreshCw", "Crown", "LogIn", "LogOut", "Timer", "Upload", "ClipboardList", "Layers", "BookOpen", "BookMarked", "BarChart2", "Clock", "Target", "Award", "Lock", "Moon", "Sun", "Zap", "RotateCcw", "Settings", "Shield", "Smartphone", "Eye", "Volume2", "VolumeX", "Bell", "Calendar", "Home", "ListChecks", "Braces", "GitBranch", "Kanban", "LineChart", "PieChart", "ScrollText", "Wand2", "Droplets", "Ruler", "Palette", "Type", "CircleDot", "Command", "Keyboard", "Mouse", "Touch", "Laptop", "Database", "Globe", "Link", "SlidersHorizontal", "ToggleRight", "PackageOpen"];
const tags = new Set([...src.matchAll(/<(\w+)/g)].map(m => m[1]));
const used = [...tags].filter(t => lucideKnown.includes(t));
console.log(used.join(", "));
console.log("=== recharts usages ===");
for (const r of ["ResponsiveContainer", "BarChart", "XAxis", "YAxis", "Tooltip", "Bar", "Cell", "LineChart", "Line", "Pie"]) {
  const c = (src.match(new RegExp("\\b" + r + "\\b", "g")) || []).length;
  if (c) console.log("  " + r + " " + c + "x");
}
console.log("=== supabaseClient.js exports ===");
console.log(fs.readFileSync("src/lib/supabaseClient.js", "utf8").split("\n").filter(x => /export|supabase|url|key|const/i.test(x)).slice(0, 12).join("\n"));
console.log("=== wallpaper.js exports ===");
console.log(fs.readFileSync("src/lib/wallpaper.js", "utf8").split("\n").filter(x => /^export/.test(x)).join("\n") || "(none)");
console.log("=== status strings used in data ===");
console.log([...new Set(src.match(/status[:=]\s*["'](\w+)["']/g))].join(", "));
console.log([...new Set(src.match(/["'](todo|doing|mastered|done|skipped)["']/g))].join(", "));
console.log("=== Bubble usage full ===");
for (const m of src.matchAll(/.{0,100}<Bubble.{0,160}/g)) console.log("  " + m[0].replace(/\s+/g, " "));
console.log("=== MiniStat usage full ===");
for (const m of src.matchAll(/.{0,40}<MiniStat.{0,140}/g)) console.log("  " + m[0].replace(/\s+/g, " "));
console.log("=== PageHead usage full ===");
for (const m of src.matchAll(/.{0,40}<PageHead.{0,140}/g)) console.log("  " + m[0].replace(/\s+/g, " "));
console.log("=== TimerIcon usage full ===");
for (const m of src.matchAll(/.{0,60}TimerIcon.{0,60}/g)) console.log("  " + m[0].replace(/\s+/g, " "));
console.log("=== Icon local def ===");
const i = src.indexOf("const Icon = ");
if (i >= 0) console.log(src.slice(i, i + 320));
