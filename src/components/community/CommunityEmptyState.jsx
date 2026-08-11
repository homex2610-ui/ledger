import React from "react";
import { Plus, Search } from "lucide-react";
import { lgComButton } from "./CommunityButtons";

export function CommunityEmptyState({ kind, onAction }) {
  const circle = kind === "circle";
  return (
    <div className="lg-community-empty-state">
      <div className="lg-community-label">{circle ? "NO CIRCLE MEMBERS YET" : "NO GROUPS YET"}</div>
      <h2>{circle ? "Keep your study circle intentional." : "Find the room for your next study block."}</h2>
      <p>{circle ? "Add people you actually study with. Their published focus and streaks will appear here." : "Discover public groups by exam, goal or name, then join when the room fits."}</p>
      <button className="lg-community-button is-primary" onClick={onAction}>
        {circle ? <><Plus size={14} /> Add someone</> : <><Search size={14} /> Discover groups</>}
      </button>
    </div>
  );
}