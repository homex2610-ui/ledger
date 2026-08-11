import React from "react";
import { COLORS, FONTS } from "../../lib/theme";

// Shared panel primitives — the "Home language" used by every workspace
// panel so each one reads as part of the same instrument. Extracted from
// App.jsx so feature components (WeakAreas, etc.) can reuse them without a
// circular import back into App.jsx.

// Workspace hero — an eyebrow, a giant typographic title, a lead line, and
// a signature numeral (the exam-countdown idiom) carrying the one number
// that matters on this screen.
export function PageHead({ title, eyebrow, lead, right, num, numLabel, numTint, numSub }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "30px 44px", flexWrap: "wrap", marginBottom: "clamp(24px, 3.5vh, 38px)" }}>
      <div style={{ minWidth: 0 }}>
        <div className="sys" style={{ fontSize: 9.5, letterSpacing: "0.32em", color: COLORS.accentFocus, marginBottom: 10 }}>{(eyebrow || title || "").toUpperCase()}</div>
        <div style={{ fontFamily: FONTS.body, fontSize: "clamp(30px, 4.2vw, 46px)", fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.04, color: COLORS.text }}>{title}</div>
        {lead && <div style={{ fontSize: 13, color: COLORS.dim, marginTop: 12, maxWidth: 620, lineHeight: 1.65, fontFamily: FONTS.body }}>{lead}</div>}
      </div>
      {num !== undefined ? (
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div className="sys" style={{ fontSize: 9.5, letterSpacing: "0.26em", color: COLORS.faint }}>{numLabel || ""}</div>
          <div className="num" style={{ fontSize: "clamp(46px, 6.5vw, 80px)", fontWeight: 800, lineHeight: 0.85, letterSpacing: "-0.05em", fontVariantNumeric: "tabular-nums", color: numTint || COLORS.text, marginTop: 10 }}>{num}</div>
          {numSub && <div className="sys" style={{ fontSize: 9, letterSpacing: "0.3em", color: COLORS.faint, marginTop: 12 }}>{numSub}</div>}
        </div>
      ) : right}
    </div>
  );
}

// Compact stat cell for page summary strips — same system language as Stat,
// smaller footprint so a strip of four reads as one instrument.
export function MiniStat({ k, v, sub, pct, tint }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: COLORS.faint, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k}</div>
        {sub && <span style={{ marginLeft: "auto", fontSize: 9.5, color: COLORS.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</span>}
      </div>
      <div className="num" style={{ fontSize: 30, fontWeight: 800, color: tint || COLORS.text, marginTop: 5, letterSpacing: "-0.03em", lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>{v}</div>
      {typeof pct === "number" && (
        <div className="lg-progress" style={{ height: 3, marginTop: 10, borderRadius: 2 }}>
          <div className="lg-progress-fill" style={{ width: `${pct}%`, "--lg-w": `${pct}%`, height: "100%", borderRadius: 2 }} />
        </div>
      )}
    </div>
  );
}

// Hairline-separated strip — the Home stats-band idiom, reusable on any panel.
export function StatStrip({ children, style }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 26px", marginBottom: "clamp(22px, 3vh, 32px)", ...style }}>
      {React.Children.map(children, (c, i) => (
        <div key={i} style={{ flex: "1 1 150px", minWidth: 150, paddingTop: 14, borderTop: `1px solid ${COLORS.border}` }}>{c}</div>
      ))}
    </div>
  );
}

// Section label — sys mono + hairline rule, the Home section idiom.
export function PanLabel({ children, right, style }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, ...style }}>
      <span className="sys" style={{ fontSize: 9.5, letterSpacing: "0.24em", color: COLORS.dim }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: COLORS.border }} />
      {right}
    </div>
  );
}
