import React, { useState } from "react";
import { Settings2, RefreshCw, Trash2 } from "lucide-react";
import { fmtMin } from "../../lib/utils";
import { ActivityTimeline } from "./ActivityTimeline";

export function GroupDetail({ group, roster, userId, onUpdate, onRegenerate, onRemoveMember }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const rows = roster?.rows || [];
  const activity = roster?.activity || [];
  const activePeople = rows.filter(row => row.minutes > 0).length;
  const total = rows.reduce((sum, row) => sum + (row.minutes || 0), 0);
  const owner = group.owner_id === userId;
  
  const save = async () => {
    if (!name.trim() || name.trim() === group.name) {
      setEditing(false);
      return;
    }
    if (await onUpdate(group.id, { name: name.trim() })) {
      setEditing(false);
    }
  };
  
  return (
    <div className="lg-group-detail">
      <div>
        <div className="lg-community-label">SELECTED GROUP</div>
        {editing ? (
          <div className="lg-community-form-inline" style={{ marginTop: 7 }}>
            <input aria-label="Circle name" value={name} onChange={e => setName(e.target.value)} />
            <button className="lg-community-button is-primary" onClick={save}>Save</button>
          </div>
        ) : (
          <h3>{group.name}</h3>
        )}
        <p>{roster?.memberCodes?.length || 0} members · {activePeople} active today · {fmtMin(total)} published focus</p>
        {owner && (
          <div className="lg-group-detail-actions">
            <button
              className="lg-community-button is-quiet"
              onClick={() => { setName(group.name); setEditing(true); }}
            >
              <Settings2 size={13} /> Rename
            </button>
            <button
              className="lg-community-button is-quiet"
              onClick={() => onUpdate(group.id, { is_discoverable: !group.is_discoverable })}
            >
              {group.is_discoverable ? "Make private" : "Make public"}
            </button>
            <button
              className="lg-community-button is-quiet"
              onClick={() => onRegenerate(group.id)}
            >
              <RefreshCw size={13} /> New code
            </button>
          </div>
        )}
        {owner && rows.filter(row => !row.me).length > 0 && (
          <div className="lg-group-members-admin">
            <div className="lg-community-label">MEMBERS</div>
            {rows.filter(row => !row.me).map(row => (
              <div className="lg-group-admin-row" key={row.user_id}>
                <span>{row.name || "Member"}</span>
                <button
                  className="lg-community-icon-button"
                  aria-label={`Remove ${row.name || "member"}`}
                  onClick={() => onRemoveMember(group.id, row.user_id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <ActivityTimeline activity={activity} title="GROUP ACTIVITY" />
    </div>
  );
}