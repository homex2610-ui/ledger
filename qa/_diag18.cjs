const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");

console.log("=== sub-object settings usage (settings.X.Y) ===");
const pairs = new Set();
for (const m of src.matchAll(/settings\.(coverage|recall|tests|mistakes|progress|reminders|sound|wallpaper)\.(\w+)/g)) pairs.add(m[1] + "." + m[2]);
console.log([...pairs].sort().join("\n"));
console.log("=== clockStyle seg options ===");
for (const m of src.matchAll(/.{0,80}clockStyle.{0,150}/g)) console.log("  " + m[0].replace(/\s+/g, " ").slice(0, 170));
console.log("=== defaultFocusMin/autoStartBreaks/newPerDay usage ===");
for (const m of src.matchAll(/.{0,60}(defaultFocusMin|autoStartBreaks|newPerDay|defaultView|landingPage|reminders|wallpaperSwatches).{0,80}/g)) console.log("  " + m[0].replace(/\s+/g, " ").slice(0, 150));
console.log("=== EXAM_SUBJECTS / DEFAULT_SYLLABUS context ===");
for (const m of src.matchAll(/.{0,100}(EXAM_SUBJECTS|DEFAULT_SYLLABUS).{0,140}/g)) console.log("  " + m[0].replace(/\s+/g, " ").slice(0, 200));
console.log("=== subject names seen ===");
const subs = new Set();
for (const m of src.matchAll(/["'](Physics|Chemistry|Mathematics|Maths|Biology|Botany|Zoology)["']/g)) subs.add(m[1]);
console.log([...subs].join(", "));
console.log("=== profile.subjects usage ===");
for (const m of src.matchAll(/.{0,60}profile\.subjects.{0,90}/g)) console.log("  " + m[0].replace(/\s+/g, " ").slice(0, 160));
