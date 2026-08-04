// src/components/ui/Surface.jsx
import React from "react";

/**
 * Surface – base container that provides background, border, radius, elevation and padding.
 * Props:
 *   elevation: number (0‑3) – controls shadow depth
 *   padding: "sm" | "md" | "lg" – internal spacing
 *   className?: string – additional class names
 *   style?: object – extra inline styles (merged with defaults)
 */
export default function Surface({ elevation = 1, padding = "md", className = "", style = {}, children }) {
  const elevationMap = {
    0: "none",
    1: "var(--elevation-1, 0 1px 3px rgba(0,0,0,0.12))",
    2: "var(--elevation-2, 0 4px 6px rgba(0,0,0,0.15))",
    3: "var(--elevation-3, 0 10px 20px rgba(0,0,0,0.2))",
  };
  const paddingMap = {
    sm: "var(--space-2)",
    md: "var(--space-4)",
    lg: "var(--space-6)",
  };

  const defaultStyle = {
    background: "var(--color-panel)",
    border: "var(--border-width) solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    boxShadow: elevationMap[elevation] || elevationMap[1],
    padding: paddingMap[padding] || paddingMap[md],
    transition: "box-shadow 0.2s ease, transform 0.2s ease",
  };

  return (
    <div className={`surface ${className}`} style={{ ...defaultStyle, ...style }}>
      {children}
    </div>
  );
}
