import React from "react";
import { MoreHorizontal } from "lucide-react";
import { initials, fmtMin } from "../../lib/utils";

export function CircleMemberRow({ person, index, total }) {
  const share = total ? Math.round(((person.minutes || 0) / total) * 100) : 0;
  return (
    <article className="lg-circle-member-row">
      <div className="lg-circle-avatar" aria-hidden="true">{initials(person.display_name || person.name)}</div>
      <div className="lg-circle-member-main">
        <div className="lg-circle-member-heading">
          <strong>{person.display_name || person.name || "Ledger member"}</strong>
          {person.me && <span className="lg-community-tag">YOU</span>}
        </div>
        <div className="lg-circle-member-meta">{fmtMin(person.minutes || 0)} focus · {person.streak || 0} day streak</div>
        <div className="lg-community-progress" aria-label={`${share}% of published focus`}>
          <span style={{ width: `${share}%` }} />
        </div>
      </div>
      <div className="lg-circle-member-stat">
        <span>{fmtMin(person.minutes || 0)}</span>
        <small>TODAY</small>
      </div>
      <button className="lg-community-icon-button" aria-label={`More options for ${person.display_name || person.name || "member"}`}>
        <MoreHorizontal size={16} />
      </button>
    </article>
  );
}