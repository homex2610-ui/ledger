// src/components/ui/Badge.jsx
import React from "react";

/**
 * Badge – small pill component for status tags.
 * Props:
 *   variant: "primary" | "secondary" | "success" | "warning" | "danger" | "info"
 *   children: ReactNode – badge label/content
 *   className?: string – extra classes
 */
export default function Badge({ variant = "primary", children, className = "" }) {
  const colors = {
    primary: { bg: "var(--color-primary, #3b82f6)", text: "#ffffff" },
    secondary: { bg: "var(--color-secondary, #6b7280)", text: "#ffffff" },
    success: { bg: "var(--color-success, #10b981)", text: "#ffffff" },
    warning: { bg: "var(--color-warning, #f59e0b)", text: "#ffffff" },
    danger: { bg: "var(--color-danger, #ef4444)", text: "#ffffff" },
    info: { bg: "var(--color-info, #3b82f6)", text: "#ffffff" },
  }[variant] || { bg: "var(--color-primary)", text: "#ffffff" };

  const style = {
    backgroundColor: colors.bg,
    color: colors.text,
    borderRadius: "var(--radius-sm)",
    padding: "0 var(--space-2)",
    fontSize: "0.75rem",
    fontWeight: 500,
    display: "inline-block",
    lineHeight: 1.5,
  };

  return (
    <span className={`badge ${className}`} style={style}>
      {children}
    </span>
  );
}
