import React from "react";
import { Copy } from "lucide-react";

export function CodeField({ label, code, onCopy, compact = false }) {
  return (
    <div className={`lg-community-code${compact ? " is-compact" : ""}`}>
      <div className="lg-community-label">{label}</div>
      <div className="lg-community-code-line">
        <code>{code || "—"}</code>
        {code && (
          <button aria-label={`Copy ${label.toLowerCase()}`} onClick={() => onCopy(code)}>
            <Copy size={13} />
          </button>
        )}
      </div>
    </div>
  );
}