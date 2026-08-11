import React, { useState, useMemo } from "react";
import { initials, todayStr, fmtMin } from "../../lib/utils";
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
  
  const streak = useMemo(() => {
    const dates = new Set(
      sessions.filter(session => session.minutes > 0).map(session => session.date)
    );
    let count = 0;
    const date = new Date();
    while (dates.has(date.toISOString().slice(0, 10))) {
      count += 1;
      date.setDate(date.getDate() - 1);
    }
    return count;
  }, [sessions]);
  
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
          <div className="lg-community-aside-rule" />
          <div className="lg-community-label">TODAY'S ACTIVITY</div>
          <div className="lg-community-aside-number">{activePeople}</div>
          <p>people with published focus</p>
          <div className="lg-community-aside-total">{fmtMin(activeMinutes)} logged today</div>
          <ActivityTimeline activity={activity} />
        </aside>
      </div>
    </main>
  );
}