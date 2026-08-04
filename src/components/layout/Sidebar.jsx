import React from "react";
import {
  Target, Timer as TimerIcon, BookOpen, ClipboardList, AlertTriangle, Users,
  Settings as SettingsIcon, CalendarDays, Layers, TrendingUp, X, BookMarked,
} from "lucide-react";
import { COLORS, FONTS } from "../../lib/theme";
import { daysBetween } from "../../lib/utils";

// Moved here verbatim from App.jsx (same NAV array, same JSX, same styles).
// This is the single place both App.jsx and Sidebar.jsx used to share — now
// Sidebar owns it since it's the only consumer.
const NAV = [
  { id: "dashboard", label: "Overview", icon: Target },
  { id: "calendar", label: "Month View", icon: CalendarDays },
  { id: "syllabus", label: "Coverage Map", icon: BookOpen },
  { id: "weak", label: "Weak Zones", icon: AlertTriangle },
  { id: "cards", label: "Recall Deck", icon: Layers },
  { id: "timer", label: "Deep Work", icon: TimerIcon },
  { id: "tasks", label: "Daily Targets", icon: ClipboardList },
  { id: "mocks", label: "Test Trends", icon: TrendingUp },
  { id: "errors", label: "Mistake Ledger", icon: AlertTriangle },
  { id: "peers", label: "Community", icon: Users },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export default function Sidebar({ tab, setTab, profile, onSignOut }) {
  const days = daysBetween(new Date(), profile.targetDate);
  return (
    <div className="lg-sidebar" style={{ width: 232, flexShrink: 0, background: COLORS.panel, borderRight: `1px solid ${COLORS.border}`, padding: "20px 14px", display: "flex", flexDirection: "column" }}>
      <div className="lg-sidebar-brand" style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px 18px", borderBottom: `1px solid ${COLORS.border}`, marginBottom: 14 }}>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: COLORS.ink, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <BookMarked size={14} color="#fff" />
        </div>
        <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 15 }}>Ledger</div>
      </div>
      <div className="lg-sidebar-meta" style={{ padding: "0 8px 16px" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.08em", color: COLORS.faint, textTransform: "uppercase" }}>{profile.exam} · {days >= 0 ? "D-" + days : "Exam day"}</div>
        <div style={{ fontSize: 13, color: COLORS.dim, marginTop: 2 }}>{profile.name}</div>
      </div>
      <div className="lg-sidebar-nav" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map(n => {
          const Icon = n.icon;
          const active = tab === n.id;
          return (
            <div key={n.id} className={`lg-nav-item${active ? " active" : ""}`} onClick={() => setTab(n.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 5, cursor: "pointer",
              background: active ? COLORS.panel2 : "transparent", color: active ? COLORS.text : COLORS.dim,
              border: active ? `1px solid ${COLORS.border}` : "1px solid transparent",
              borderLeft: active ? `3px solid ${COLORS.ink}` : "3px solid transparent",
              fontSize: 13, fontWeight: active ? 600 : 400,
            }}>
              <Icon size={15} />
              <span>{n.label}</span>
            </div>
          );
        })}
      </div>
      <button className="lg-signout-mobile" onClick={onSignOut} title="Sign out" style={{
        display: "none", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8,
        background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.faint, cursor: "pointer", flexShrink: 0,
      }}><X size={14} /></button>
      <div className="lg-sidebar-foot" style={{ marginTop: "auto", padding: "12px 8px 0", borderTop: `1px solid ${COLORS.border}`, fontSize: 10, color: COLORS.faint }}>
        <div style={{ marginBottom: 8 }}>Your code: <span style={{ fontFamily: FONTS.mono, color: COLORS.dim }}>{profile.code}</span></div>
        <div onClick={onSignOut} style={{ cursor: "pointer", color: COLORS.faint }}>Sign out</div>
      </div>
    </div>
  );
}
