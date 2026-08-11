import React from "react";
import { COLORS, FONTS } from "../../lib/theme";

// Donut-style progress ring — one instrument for every "how far along"
// readout: the dashboard coverage ring, the Coverage subject donut and the
// per-chapter mini rings. Fill transitions smoothly; pulse via className.
export default function ProgressRing({ size = 92, stroke = 5, pct = 0, color, track, centerLabel, className, style }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, Number(pct) || 0)) / 100);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0, ...style }} className={className}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track || (COLORS.isLight ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.07)")} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color || COLORS.ink} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.5s cubic-bezier(0.2,0.8,0.2,1)" }}
        />
      </svg>
      {centerLabel !== undefined && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          {typeof centerLabel === "string"
            ? <span className="num" style={{ fontSize: Math.max(11, size * 0.22), fontWeight: 800, color: COLORS.text, fontFamily: FONTS.mono }}>{centerLabel}</span>
            : centerLabel}
        </div>
      )}
    </div>
  );
}
