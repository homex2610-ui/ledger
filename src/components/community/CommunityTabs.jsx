import React from "react";

export function CommunityTabs({ section, onChange }) {
  return (
    <div className="lg-community-tabs" role="tablist" aria-label="Community sections">
      <button role="tab" aria-selected={section === "circle"} className={section === "circle" ? "is-active" : ""} onClick={() => onChange("circle")}>CIRCLE</button>
      <button role="tab" aria-selected={section === "groups"} className={section === "groups" ? "is-active" : ""} onClick={() => onChange("groups")}>GROUPS</button>
    </div>
  );
}