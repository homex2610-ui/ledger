// src/components/ui/EmptyState.jsx
import React from "react";

/**
 * EmptyState – displays a fallback UI when no data is available.
 * Props:
 *   title: string (optional)
 *   description: string (optional)
 *   icon: ReactNode (optional)
 *   action: ReactNode (optional CTA button)
 */
export default function EmptyState({
  title = "No data available",
  description = "There are no items to display at this time.",
  icon = null,
  action = null,
}) {
  return (
    <div
      className="empty-state"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6, 2rem)",
        textAlign: "center",
        color: "var(--color-muted, #666)",
      }}
    >
      {icon && <div style={{ marginBottom: "var(--space-2, 0.5rem)" }}>{icon}</div>}
      <h4 style={{ margin: "0 0 var(--space-1, 0.25rem) 0", color: "var(--color-text, #333)" }}>{title}</h4>
      {description && <p style={{ margin: "0 0 var(--space-4, 1rem) 0", fontSize: "0.9rem" }}>{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
