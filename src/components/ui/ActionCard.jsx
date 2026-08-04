// src/components/ui/ActionCard.jsx
import React from "react";
import Surface from "./Surface";

/**
 * ActionCard – a simple container for a primary call‑to‑action.
 * Props:
 *   children – usually a button or link
 *   className – optional extra classes
 *   elevation – optional elevation level (defaults to 1)
 */
export default function ActionCard({ children, className = "", elevation = 1 }) {
  return (
    <Surface elevation={elevation} padding="md" className={className}>
      {children}
    </Surface>
  );
}
