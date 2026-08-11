import React from "react";
import { Users, ShieldCheck, KeyRound, Trash2 } from "lucide-react";
import { fmtMin } from "../../lib/utils";
import { lgComButton } from "./CommunityButtons";

export function GroupRow({ group, roster, onSelect, onLeave, onToggle }) {
  const rows = roster?.rows || [];
  const activePeople = rows.filter(row => row.minutes > 0).length;
  const total = rows.reduce((sum, row) => sum + (row.minutes || 0), 0);
  const owner = group.owner_id === group.currentUserId;
  
  return (
    <article className="lg-group-row">
      <div className="lg-group-row-main">
        <div className="lg-community-label">{group.is_discoverable ? "PUBLIC GROUP" : "PRIVATE GROUP"}</div>
        <h3>{group.name}</h3>
        <div className="lg-group-meta">
          <span><Users size={13} /> {roster?.memberCodes?.length || 0} members</span>
          <span><span className="lg-community-status-dot" /> {activePeople} active today</span>
        </div>
      </div>
      <div className="lg-group-row-stat">
        <div className="lg-community-label">TODAY</div>
        <strong>{fmtMin(total)}</strong>
        <span>published focus</span>
      </div>
      <div className="lg-group-row-actions">
        <lgComButton variant="secondary" onClick={() => onSelect(group.code)}>
          View group
        </lgComButton>
        {owner && (
          <button
            className="lg-community-icon-button"
            aria-label={`Toggle visibility for ${group.name}`}
            onClick={() => onToggle(group.id, { is_discoverable: !group.is_discoverable })}
          >
            {group.is_discoverable ? <ShieldCheck size={15} /> : <KeyRound size={15} />}
          </button>
        )}
        <button
          className="lg-community-icon-button"
          aria-label={`Leave ${group.name}`}
          onClick={() => onLeave(group.code)}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  );
}