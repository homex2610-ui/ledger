import React, { useState } from "react";
import { Plus, Search, Users } from "lucide-react";
import { genCode } from "../../lib/utils";
import { Card } from "../ui/Panels";
import { CommunityEmptyState } from "./CommunityEmptyState";
import { GroupRow } from "./GroupRow";
import { GroupDetail } from "./GroupDetail";

export function GroupWorkspace({ circles, groupRoster, currentCode, userId, onSelect, onCreate, onJoin, onLeave, onUpdate, onRegenerate, onRemoveMember, onSearch }) {
  const [mode, setMode] = useState("mine");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [discoverable, setDiscoverable] = useState(false);
  const [notice, setNotice] = useState("");
  
  const current = circles.find(group => group.code === currentCode);
  
  const create = async () => {
    if (!name.trim()) return;
    const group = await onCreate(genCode(), name.trim(), discoverable);
    if (group) {
      setName("");
      onSelect(group.code);
    }
  };
  
  const join = async () => {
    if (!joinCode.trim()) return;
    const group = await onJoin(joinCode.trim());
    if (group) {
      setJoinCode("");
      onSelect(group.code);
    } else {
      setNotice("No group found with that invite code.");
    }
  };
  
  const search = async () => {
    setResults(await onSearch(query));
  };
  
  return (
    <section className="lg-community-workspace" aria-label="Groups workspace">
      <Card
        n="01"
        title="Groups"
        right={
          <button
            className="lg-community-button is-primary"
            onClick={() => document.querySelector('[aria-label="New group name"]')?.focus()}
          >
            <Plus size={14} /> Create group
          </button>
        }
      >
        <div className="lg-group-toolbar">
        <div className="lg-community-segmented">
          <button className={mode === "mine" ? "is-active" : ""} onClick={() => setMode("mine")}>MY GROUPS</button>
          <button className={mode === "discover" ? "is-active" : ""} onClick={() => setMode("discover")}>DISCOVER</button>
        </div>
        {mode === "discover" && (
          <div className="lg-community-form-inline">
            <input
              aria-label="Search public groups"
              placeholder="Search groups"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
            />
            <button
              className="lg-community-button is-secondary"
              onClick={search}
              disabled={!query.trim()}
            >
              <Search size={14} /> Search
            </button>
          </div>
        )}
      </div>
      
      {mode === "mine" && (
        <div className="lg-group-create-strip">
          <div>
            <strong>CREATE A GROUP</strong>
            <span>Name a room for a shared goal.</span>
          </div>
          <div className="lg-community-form-inline">
            <input
              aria-label="New group name"
              placeholder="Group name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <label>
              <input type="checkbox" checked={discoverable} onChange={e => setDiscoverable(e.target.checked)} />
              Public
            </label>
            <button
              className="lg-community-button is-secondary"
              onClick={create}
              disabled={!name.trim()}
            >
              Create
            </button>
          </div>
          <div className="lg-community-form-inline">
            <input
              aria-label="Group invite code"
              placeholder="Invite code"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button
              className="lg-community-button is-quiet"
              onClick={join}
              disabled={!joinCode.trim()}
            >
              Join
            </button>
          </div>
          {notice && <div className="lg-community-form-message" role="status">{notice}</div>}
        </div>
      )}
      
      {mode === "discover" ? (
        <div className="lg-group-list">
          {results.length === 0 ? (
            <CommunityEmptyState kind="groups" onAction={() => document.querySelector('[aria-label="Search public groups"]')?.focus()} />
          ) : (
            results.map(group => (
              <article className="lg-group-row" key={group.id}>
                <div className="lg-group-row-main">
                  <div className="lg-community-label">PUBLIC GROUP</div>
                  <h3>{group.name}</h3>
                  <div className="lg-group-meta">
                    <span><Users size={13} /> {group.member_count || 0} members</span>
                    <span>Search result</span>
                  </div>
                </div>
                <div className="lg-group-row-actions">
                  <button
                    className="lg-community-button is-primary"
                    onClick={() => onJoin(group.invite_code)}
                  >
                    Join group
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      ) : (
        <div className="lg-group-list">
          {circles.length === 0 ? (
            <CommunityEmptyState kind="groups" onAction={() => setMode("discover")} />
          ) : (
            circles.map(group => (
              <GroupRow
                key={group.code}
                group={{ ...group, currentUserId: userId }}
                roster={groupRoster?.[group.code]}
                onSelect={onSelect}
                onLeave={onLeave}
                onToggle={onUpdate}
              />
            ))
          )}
        </div>
      )}
      
      {current && (
        <GroupDetail
          group={current}
          roster={groupRoster?.[current.code]}
          userId={userId}
          onUpdate={onUpdate}
          onRegenerate={onRegenerate}
          onRemoveMember={onRemoveMember}
        />
      )}
      </Card>
    </section>
  );
}