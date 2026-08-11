const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const st = src.indexOf("function SettingsTab");
const seg = src.slice(st, st + 120000);
const keys = ["settings.accent", "settings.autoAccent", "settings.wallpaper", "settings.wallpaperAccent", "settings.wallpaperSwatches", "settings.sound", "settings.sound.ringPulse", "settings.reminders.study", "settings.reminders.review", "settings.reminders.targets", "settings.reminders.time"];
for (const k of keys) {
  const cnt = (seg.match(new RegExp(k.replace(/\./g, "\\."), "g")) || []).length;
  if (cnt) console.log(k.padEnd(35) + cnt);
}