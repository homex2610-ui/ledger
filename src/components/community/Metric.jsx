import React from "react";

export function Metric({ label, value, detail, accent }) {
  return (
    <div className="lg-community-metric">
      <div className="lg-community-label">{label}</div>
      <div className={`lg-community-metric-value${accent ? " is-accent" : ""}`}>{value}</div>
      {detail && <div className="lg-community-metric-detail">{detail}</div>}
    </div>
  );
}