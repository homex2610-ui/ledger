// src/components/ui/LoadingSkeleton.jsx
import React from "react";

/**
 * LoadingSkeleton – generic placeholder while data is loading.
 * Renders a set of gray blocks that mimic the shape of content.
 * Accepts optional `rows` prop to control height.
 */
export default function LoadingSkeleton({ rows = 3 }) {
  return (
    <div className="loading-skeleton" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: "1rem",
            background: "var(--color-skeleton, #e0e0e0)",
            borderRadius: "var(--radius-sm)",
          }}
        />
      ))}
    </div>
  );
}
