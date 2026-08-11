const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const keys = ["settings.accent", "settings.autoAccent", "settings.wallpaper", "settings.wallpaperAccent", "settings.wallpaperSwatches", "settings.sound", "settings.sound.ringPulse"];
for (const k of keys) {
  const matches = src.match(new RegExp(k.replace(/\./g, "\\."), "g"));
  if (matches) {
    console.log(k.padEnd(35) + matches.length);
    matches.slice(0, 3).forEach(m => {
      const idx = src.indexOf(m);
      console.log("  " + src.slice(Math.max(0, idx - 50), idx + 50).replace(/\n/g, " "));
    });
  }
}