const fs = require("fs");
const app = fs.readFileSync("src/App.jsx", "utf8");

console.log("=== stored / demo / flash usages ===");
for (const n of ["stored", "demo", "flash"]) {
  for (const m of app.matchAll(new RegExp(".{0,60}\\b" + n + "\\b.{0,60}", "g"))) console.log("  [" + n + "] " + m[0].replace(/\s+/g, " ").slice(0, 140));
}
console.log("=== BookOpen / AlertTriangle / ChevronRight / ChevronUp / ClipboardList / Crown usages ===");
for (const n of ["BookOpen", "AlertTriangle", "ChevronRight", "ChevronUp", "ClipboardList", "Crown", "Flame", "NotebookPen", "PictureInPicture2", "Maximize2", "Search", "Star", "ArrowUp", "ArrowDown", "RefreshCw", "KeyRound", "Users", "Copy", "Download", "Upload", "TrendingUp", "Play", "Pause", "Square", "CheckCircle2", "Circle", "Pencil", "Plus", "Trash2", "X", "LogIn", "LogOut", "Timer"]) {
  const cnt = (app.match(new RegExp("\\b" + n + "\\b", "g")) || []).length;
  if (cnt) {
    const first = app.match(new RegExp(".{0,70}\\b" + n + "\\b.{0,70}"));
    console.log("  " + n + ": " + cnt + "x  | " + first[0].replace(/\s+/g, " ").slice(0, 150));
  }
}
console.log("=== Badge usage ===");
console.log((app.match(/Badge[\s\S]{0,120}/) || ["(none)"])[0].replace(/\s+/g, " ").slice(0, 160));
console.log("=== recharts line/pie/area usage check — LineChart from recharts, not lucide ===");
console.log("=== components used: Sidebar/Header/GlobalSwipe/ProgressRing/WallpaperLayer ===");
for (const n of ["Sidebar", "Header", "GlobalSwipe", "ProgressRing", "WallpaperLayer", "FloatingTimer", "ImmersiveTimer", "FocusTimer", "RecallDeck", "Syllabus", "ConceptMap", "Mocks", "ErrorLog", "Community", "SettingsTab", "AuthScreen", "AuthGate", "Workspace", "Dashboard", "Onboarding"]) {
  console.log("  " + n + ": " + (app.match(new RegExp("\\b" + n + "\\b", "g")) || []).length);
}
console.log("=== Icon definition ===");
console.log((app.match(/const Icon = [\s\S]{0,160}/) || ["(none)"])[0].replace(/\s+/g, " ").slice(0, 200));
