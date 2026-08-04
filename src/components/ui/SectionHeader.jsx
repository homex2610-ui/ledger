// src/components/ui/SectionHeader.jsx
import React from "react";

/**
 * SectionHeader – consistent header for dashboard sections.
 * Props:
 *   title: string – main heading
 *   subtitle?: string – optional sub‑heading
 *   actions?: ReactNode – optional action elements (e.g., buttons)
 *   className?: string – extra class names
 */
export default function SectionHeader({ title, subtitle, actions, className = "" }) {
  return (
    <header className={`section-header ${className}`} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          {title}
        </h2>
        {actions && <div className="section-actions">{actions}</div>}
      </div>
      {subtitle && <p className="section-subtitle" style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-muted)" }}>{subtitle}</p>}
    </header>
  );
}
