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
    <div className="sidebar">
      {/* Brand Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 18px", borderBottom: `1px solid ${COLORS.border || "#2d2d2d"}`, marginBottom: 16 }}>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: COLORS.ink || "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BookMarked size={14} color="#fff" />
        </div>
        <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 17, color: COLORS.text }}>Ledger</div>
      </div>

      {/* Navigation */}
      <div className="sidebar-nav" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV.map(n => {
          const Icon = n.icon;
          const active = tab === n.id;
          return (
            <div
              key={n.id}
              onClick={() => setTab(n.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 7,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: FONTS.body,
                fontWeight: active ? 600 : 400,
                color: active ? COLORS.text : COLORS.dim,
                background: active ? (COLORS.panel2 || "rgba(255,255,255,0.06)") : "transparent",
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={15} style={{ color: active ? COLORS.ink || "#d97706" : COLORS.dim }} />
              <span>{n.label}</span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="sidebar-foot" style={{ marginTop: "auto", paddingTop: 14, borderTop: `1px solid ${COLORS.border || "#2d2d2d"}` }}>
        <div style={{ marginBottom: 8, fontSize: 12, color: COLORS.dim, fontFamily: FONTS.body }}>
          Your code: <span style={{ fontFamily: FONTS.mono, color: COLORS.text, fontWeight: 600 }}>{profile?.code || "QANFT6"}</span>
        </div>
        <div
          onClick={onSignOut}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            color: COLORS.faint || "#888",
            fontSize: 12,
            fontFamily: FONTS.body,
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.danger || "#ef4444")}
          onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.faint || "#888")}
        >
          <LogOut size={13} />
          <span>Sign out</span>
        </div>
      </div>
    </div>
  );
}
