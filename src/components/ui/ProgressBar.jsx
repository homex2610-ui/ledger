// src/components/ui/ProgressBar.jsx
import React from "react";

/**
 * ProgressBar – generic horizontal progress indicator.
 * Props:
 *   value: number – current progress value
 *   max: number – maximum value (default 100)
 *   label?: string – optional label displayed above the bar
 *   variant?: "primary" | "secondary" | "success" | "danger" – optional style variant
 */
export default function ProgressBar({ value, max = 100, label, variant = "primary" }) {
  const percent = Math.min(100, (value / max) * 100);
  const barColor = {
    primary: "var(--color-primary, #3b82f6)",
    secondary: "var(--color-secondary, #6b7280)",
    success: "var(--color-success, #10b981)",
    danger: "var(--color-danger, #ef4444)",
  }[variant];

  return (
    <div className="progress-bar" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {label && <div className="progress-label" style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>{label}</div>}
      <div style={{ background: "var(--color-border, #e5e7eb)", borderRadius: "var(--radius-sm)", height: "0.5rem", overflow: "hidden" }}>
        <div
          style={{
            width: `${percent}%`,
            background: barColor,
            height: "100%",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
