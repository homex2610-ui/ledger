const fs = require("fs");
const l = fs.readFileSync("src/App.jsx", "utf8").split("\n");
const src = l.join("\n");
const need = [
  "function StatusBubble", "function Card", "const STATUS_LABEL",
  "function colorMap", "function hexToRgba", "function fmtMin",
  "function fmtClock", "function todayStr", "function todayStrKeys",
  "function fmtDateStr", "function loadTodayKey", "STATUS_ORDER",
  "function ThemeProvider", "function Settings", "function Sidebar",
  "function GlobalSwipe", "function AuthGate", "function Workspace",
  "createRoot", "checkForDevTools", "devhooks", "COLORS =",
  "import React", "theme.js", "lucide-react",
];
for (const n of need) console.log((src.includes(n) ? "YES " : "NO  ") + n);
console.log("--- import lines in surviving file:");
console.log(l.filter(x => x.includes("import ")).join("\n") || "(none)");
