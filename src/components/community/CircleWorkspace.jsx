import React, { useState } from "react";
import { initials } from "../../lib/utils";
import { CodeField } from "./CodeField";
import { CircleMemberRow } from "./CircleMemberRow";
import { CommunityEmptyState } from "./CommunityEmptyState";

export function CircleWorkspace({ profile, rows, onConnect, onCopy }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const total = rows.reduce((sum, person) => sum + (person.minutes || 0), 0);
  
  const connect = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setMessage("");
    const person = await onConnect(code.trim());
    setBusy(false);
    if (person) {
      setCode("");
      setMessage(`${person.display_name || "Member"} added to your Circle.`);
    } else {
      setMessage("No member found with that code.");
    }
  };
  
  return (
    <section className="lg-community-workspace" aria-label="Circle workspace">
      <div className="lg-workspace-heading">
        <div>
          <div className="lg-community-label">YOUR CIRCLE</div>
          <h2>{rows.length} {rows.length === 1 ? "person" : "people"}</h2>
        </div>
        <span className="lg-workspace-note">PUBLISHED FOCUS ONLY</span>
      </div>
      <div className="lg-circle-add-row">
        <div>
          <strong>ADD TO CIRCLE</strong>
          <span>Enter their personal code</span>
        </div>
        <div className="lg-community-form-inline">
          <input
            aria-label="Add Circle code"
            placeholder="PBCEL3"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <button
            className="lg-community-button is-primary"
            onClick={connect}
            disabled={!code.trim() || busy}
          >
            {busy ? "Adding" : "Add"}
          </button>
        </div>
        {message && <div className="lg-community-form-message" role="status">{message}</div>}
      </div>
      {rows.length === 0 ? (
        <CommunityEmptyState kind="circle" onAction={() => document.querySelector('[aria-label="Add Circle code"]')?.focus()} />
      ) : (
        <div className="lg-circle-member-list">
          {rows.map((person, index) => (
            <CircleMemberRow key={person.user_id || person.code || index} person={person} index={index} total={total} />
          ))}
        </div>
      )}
      <div className="lg-community-workspace-footer">
        <CodeField label="SHARE YOUR CODE" code={profile.code} onCopy={onCopy} />
        <span>People only see the focus you publish.</span>
      </div>
    </section>
  );
}