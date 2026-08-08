import React from "react";
import {
  Target, Timer as TimerIcon, BookOpen, ClipboardList, AlertTriangle, Users,
  Settings as SettingsIcon, CalendarDays, Layers, TrendingUp, BookMarked, LogOut
} from "lucide-react";
import { COLORS, FONTS } from "../../lib/theme";
import { daysBetween } from "../../lib/utils";

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

export default function Sidebar({ tab, setTab, profile = {}, onSignOut }) {
  const days = daysBetween(new Date(), profile?.targetDate || new Date());

  return (
    <nav className="sidebar lg-sidebar" aria-label="Primary">
      {/* Brand */}
      <div className="lg-sidebar-brand" style={{ padding: "8px 10px 22px", borderBottom: `1px solid ${COLORS.border || "#2d2d2d"}`, marginBottom: 16 }}>
        <div className="lg-brand-plate" style={{ width: 28, height: 28 }}>
          <BookMarked size={14} color="#fff" />
        </div>
        <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 17, color: COLORS.text }}>Ledger</div>
        <div className="lg-sidebar-meta" style={{ marginLeft: "auto", fontSize: 10, color: COLORS.faint, fontFamily: FONTS.mono }}>
          {days}D
        </div>
      </div>

      {/* Navigation */}
      <div className="lg-sidebar-nav" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, padding: "0 10px" }}>
        {NAV.map(n => {
          const Icon = n.icon;
          const active = tab === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`lg-nav-item${active ? " active" : ""}`}
              style={{ border: "none", width: "100%", textAlign: "left" }}
            >
              <Icon size={15} style={{ color: active ? COLORS.ink || "#d97706" : COLORS.dim, flexShrink: 0 }} />
              <span>{n.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="lg-sidebar-foot" style={{ marginTop: "auto", padding: "16px 10px 0", borderTop: `1px solid ${COLORS.border || "#2d2d2d"}` }}>
        <div style={{ marginBottom: 8, fontSize: 12, color: COLORS.dim, fontFamily: FONTS.body }}>
          Your code: <span style={{ fontFamily: FONTS.mono, color: COLORS.text, fontWeight: 600 }}>{profile?.code || "QANFT6"}</span>
        </div>
        <button
          onClick={onSignOut}
          className="lg-nav-item"
          style={{ border: "none", width: "100%", textAlign: "left", fontSize: 12, color: COLORS.faint, transition: "color 0.15s ease" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.danger || "#ef4444")}
          onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.faint || "#888")}
        >
          <LogOut size={13} />
          <span>Sign out</span>
        </button>
      </div>

      {/* Mobile-only sign out */}
      <button
        onClick={onSignOut}
        className="lg-signout-mobile"
        aria-label="Sign out"
        title="Sign out"
        style={{ border: `1px solid ${COLORS.border}`, background: COLORS.panel2, color: COLORS.faint, borderRadius: 7, padding: "6px 8px", cursor: "pointer", display: "none", flexShrink: 0 }}
      >
        <LogOut size={14} />
      </button>
    </nav>
  );
}