// src/components/ui/MetricCard.jsx
import React from "react";

/**
 * MetricCard – displays an icon, a title, a numeric/value and optional trend.
 * Props:
 *   icon: ReactNode – illustration or icon component
 *   title: string – label for the metric
 *   value: string | number – main metric value
 *   trend?: "up" | "down" – optional trend direction (adds a colored arrow)
 *   color?: string – optional CSS color name or variable for the value text
 */
export default function MetricCard({ icon, title, value, trend, color }) {
  const trendSymbol = trend === "up" ? "▲" : trend === "down" ? "▼" : null;
  const trendColor = trend === "up" ? "var(--color-success)" : trend === "down" ? "var(--color-danger)" : undefined;
  return (
    <div className="card metric-card" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
      {icon && <div className="metric-icon" style={{ fontSize: "1.5rem" }}>{icon}</div>}
      <div className="metric-content" style={{ flex: 1 }}>
        <div className="metric-title" style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>{title}</div>
        <div className="metric-value" style={{ fontSize: "1.25rem", fontWeight: 600, color: color || "inherit" }}>{value}</div>
      </div>
      {trend && (
        <div className="metric-trend" style={{ color: trendColor, fontSize: "0.875rem" }}>{trendSymbol}</div>
      )}
    </div>
  );
}
