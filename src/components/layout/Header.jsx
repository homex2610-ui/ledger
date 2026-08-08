import React from "react";
import { COLORS, FONTS } from "../../lib/theme";

// Slim breadcrumb-style header — quiet on purpose: the sidebar owns the
// brand wordmark, this just orients which area you're in without shouting.
export default function Header() {
  return (
    <header style={{ fontFamily: FONTS.body, marginBottom: 22, display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.ink, boxShadow: `0 0 8px ${COLORS.inkGlow}` }} />
      <h1 style={{ margin: 0, fontFamily: FONTS.body, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.dim }}>
        Ledger
      </h1>
    </header>
  );
}