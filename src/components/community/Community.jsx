import React, { useState, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { initials, todayStr, fmtMin, computeStreak } from "../../lib/utils";
import { COLORS, RADIUS, SPACE } from "../../lib/theme";
import { Card } from "../ui/Panels";
import { DiscordIcon } from "../ui/DiscordIcon";
import { discordInviteUrl, hasDiscordInvite, DISCORD_CTA_LABEL } from "../../lib/discord";
import { CommunityHeader } from "./CommunityHeader";
import { CommunityOverview } from "./CommunityOverview";
import { CircleWorkspace } from "./CircleWorkspace";
import { GroupWorkspace } from "./GroupWorkspace";
import { ActivityTimeline } from "./ActivityTimeline";

export default function Community({
  profile,
  userId,
  sessions,
  circleRows = [],
  onConnectCircle,
  onSearchGroups,
  groupDefs,
  groupRoster,
  onCreateGroup,
  onJoinGroup,
  onLeaveGroup,
  onUpdateCircle,
  onRegenerateCircle,
  onRemoveMember,
}) {
  const circles = Object.values(groupDefs || {});
  const [section, setSection] = useState("circle");
  const [selected, setSelected] = useState(circles[0]?.code || "");
  const currentCode = circles.some(group => group.code === selected) ? selected : circles[0]?.code || "";
  const today = todayStr();
  
  const focusMinutes = sessions
    .filter(session => session.date === today)
    .reduce((sum, session) => sum + (session.minutes || 0), 0);
  
  const streak = useMemo(() => computeStreak(sessions), [sessions]);
  
  const activeRows = section === "circle"
    ? circleRows
    : (groupRoster?.[currentCode]?.rows || []);
  
  const activePeople = activeRows.filter(row => (row.minutes || 0) > 0).length;
  const activeMinutes = activeRows.reduce((sum, row) => sum + (row.minutes || 0), 0);
  const activity = groupRoster?.[currentCode]?.activity || [];
  
  const copy = text => {
    navigator.clipboard?.writeText(text);
  };
  
  const chooseSection = value => {
    setSection(value);
    if (value === "groups" && circles.length) setSelected(currentCode);
  };
  
  return (
    <main className="lg-community" aria-label="Community">
      <CommunityHeader
        section={section}
        onSectionChange={chooseSection}
        profile={profile}
        onCopy={copy}
        focusMinutes={focusMinutes}
      />
      <CommunityOverview
        circleCount={circleRows.length}
        groupCount={circles.length}
        focusMinutes={focusMinutes}
        streak={streak}
        activePeople={activePeople}
        activeMinutes={activeMinutes}
        fmtMin={fmtMin}
      />
      <div className="lg-community-layout">
        {section === "circle" ? (
          <CircleWorkspace
            profile={profile}
            rows={circleRows}
            onConnect={onConnectCircle}
            onCopy={copy}
          />
        ) : (
          <GroupWorkspace
            circles={circles}
            groupRoster={groupRoster}
            currentCode={currentCode}
            userId={userId}
            onSelect={setSelected}
            onCreate={onCreateGroup}
            onJoin={onJoinGroup}
            onLeave={onLeaveGroup}
            onUpdate={onUpdateCircle}
            onRegenerate={onRegenerateCircle}
            onRemoveMember={onRemoveMember}
            onSearch={onSearchGroups}
          />
        )}
        <aside className="lg-community-aside">
          <Card n="02" title="Today's activity">
            <div className="lg-community-aside-number">{activePeople}</div>
            <p>people with published focus</p>
            <div className="lg-community-aside-total">{fmtMin(activeMinutes)} logged today</div>
            <ActivityTimeline activity={activity} />
          </Card>
        </aside>
      </div>
      {hasDiscordInvite && (
        <div style={{ marginTop: SPACE.lg, paddingTop: SPACE.md, borderTop: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13, flex: "1 1 320px", minWidth: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: RADIUS.control, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.glassFill2, border: `1px solid ${COLORS.border}` }}>
              <DiscordIcon size={19} color={COLORS.text} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="sys" style={{ fontSize: 9.5, letterSpacing: "0.26em", color: COLORS.dim }}>LEDGER DISCORD</div>
              <p style={{ margin: "5px 0 0", fontSize: 12, color: COLORS.dim, lineHeight: 1.6, maxWidth: 540 }}>Study together beyond Ledger. Join the official Ledger community to find study partners, share progress, and talk with other students.</p>
            </div>
          </div>
          <a
            href={discordInviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={DISCORD_CTA_LABEL}
            className="lg-btn lg-btn-ink lg-focus-ring"
            style={{ textDecoration: "none", color: "#fff", flexShrink: 0 }}
          >
            Join Ledger Discord <ExternalLink size={13} />
          </a>
        </div>
      )}
    </main>
  );
}