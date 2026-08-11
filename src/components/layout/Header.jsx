import React from "react";
import { Flame } from "lucide-react";
import { COLORS, FONTS, hexToRgba } from "../../lib/theme";
import { todayStr, fmtMin, computeStreak } from "../../lib/utils";
import { DAILY_GOAL_MIN } from "./Sidebar";

// The status bar — one quiet line of system metadata across the top:
//   LEDGER · WED 09 AUG │ FOCUS 06:45 · JEE MAIN · 127 DAYS · ●
// No greeting, no hero. It reads like an OS status strip.
export default function Header({ profile = {}, sessions = [], tasks = [] }) {
  const streak = computeStreak(sessions);
  const today = sessions.filter(s => s.date === todayStr()).reduce((a, s) => a + s.minutes, 0);
  const doneToday = tasks.filter(t => t.date === todayStr() && t.done).length;
  const todayTasks = tasks.filter(t => t.date === todayStr());
  const now = new Date();
  const dateLine = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }).toUpperCase();

  const cell = (children, opts = {}) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, ...opts }}>
      {children}
    </span>
  );
  const sep = <span style={{ width: 1, height: 12, background: COLORS.border, flexShrink: 0 }} />;

  const teleCell = (label, children) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px", borderRadius: 7, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="sys" style={{ fontSize: 9, letterSpacing: "0.18em", color: COLORS.faint }}>{label}</span>
      {children}
    </span>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0 15px", borderBottom: `1px solid ${COLORS.border}`, marginBottom: 26, flexWrap: "wrap" }}>
      <span className="sys" style={{ fontSize: 11, letterSpacing: "0.24em", color: COLORS.accentFocus, fontWeight: 700 }}>Ledger</span>
      {sep}
      <span className="sys" style={{ fontSize: 10.5, letterSpacing: "0.18em", color: COLORS.dim }}>{dateLine}</span>

      <span style={{ flex: 1, minWidth: 24 }} />

      {teleCell("Focus", <span className="num" style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, fontVariantNumeric: "tabular-nums" }}>{Math.round(today / 60 * 10) / 10}h</span>)}
      {teleCell("Streak",
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: FONTS.mono, fontWeight: 700, color: streak > 0 ? COLORS.accentWarm : COLORS.faint, fontVariantNumeric: "tabular-nums" }}><Flame size={12} strokeWidth={2} /> {streak}d</span>
      )}
      {teleCell("Sync",
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span className="lg-statusdot" style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.done, boxShadow: `0 0 0 3px ${hexToRgba(COLORS.done, 0.12)}` }} />
          <span className="sys" style={{ fontSize: 9, letterSpacing: "0.18em", color: COLORS.faint }}>SYNCED</span>
        </span>
      )}

      {doneToday < todayTasks.length && todayTasks.length > 0 && (
        <>
          {sep}
          {cell(<span className="sys" style={{ fontSize: 10 }}>Today</span>)}
          {cell(<span className="num" style={{ fontSize: 12, fontWeight: 600, color: COLORS.dim }}>{doneToday}/{todayTasks.length}</span>)}
        </>
      )}
    </div>
  );
}