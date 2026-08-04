import React from "react";
import { COLORS, FONTS } from "../../lib/theme";

export default function Header() {
  return (
    <header className="app-header" style={{ fontFamily: FONTS.display, fontSize: "1.25rem", color: COLORS.text }}>
      <h1 style={{ margin: 0, fontFamily: FONTS.display, fontSize: "1.25rem", color: COLORS.text }}>
        Ledger
      </h1>
    </header>
  );
}
