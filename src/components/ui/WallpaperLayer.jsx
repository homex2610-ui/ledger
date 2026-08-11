import React, { useEffect, useRef, useState } from "react";
import { COLORS } from "../../lib/theme";

// Full-page background layer. Nebula = transparent (the body's starfield
// shows through), Black = near-solid ink, Custom = uploaded image + the same
// dark vignette the body gradient uses. Mode changes cross-fade: the new
// layer fades in over the old one, which is pruned after the transition.
export default function WallpaperLayer({ mode = "nebula", image = null }) {
  const [stack, setStack] = useState(() => [{ key: 0, mode, image }]);
  const nextKey = useRef(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const top = stack[stack.length - 1];
    if (top && top.mode === mode && top.image === image) return;
    setStack(s => [...s, { key: nextKey.current++, mode, image }]);
    const t = setTimeout(() => setStack(s => s.slice(-1)), 420);
    return () => clearTimeout(t);
  }, [mode, image]); // eslint-disable-line react-hooks/exhaustive-deps

  const bg = (m, img) =>
    m === "custom" && img ? `url("${img}")` : m === "black" ? "none" : "none";
  const bgColor = (m) => m === "black" ? "rgba(4,5,10,0.92)" : "transparent";

  return (
    <div aria-hidden="true">
      {stack.map((item, i) => (
        <div
          key={item.key}
          data-wallpaper={item.mode}
          data-testid="wallpaper-layer"
          className={`lg-wall${i === stack.length - 1 ? " lg-wall-in" : ""}`}
          style={{
            backgroundImage: bg(item.mode, item.image),
            backgroundColor: bgColor(item.mode),
            zIndex: 0,
            opacity: i === stack.length - 1 ? 1 : 0,
            transition: "opacity 0.32s ease-out",
          }}
        />
      ))}
    </div>
  );
}
