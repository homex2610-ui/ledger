import React from "react";
import { Metric } from "./Metric";

export function CommunityOverview({ circleCount, groupCount, focusMinutes, streak, activePeople, activeMinutes, fmtMin }) {
  return (
    <section className="lg-community-overview" aria-label="Community overview">
      <Metric label="CIRCLE" value={`${circleCount} ${circleCount === 1 ? "person" : "people"}`} detail={circleCount ? `${activePeople} active today` : "No connections yet"} />
      <Metric label="GROUPS" value={`${groupCount} ${groupCount === 1 ? "group" : "groups"}`} detail={groupCount ? `${activePeople} people active today` : "Join a study room"} />
      <Metric label="FOCUS" value={fmtMin(focusMinutes)} detail="your focus today" accent />
      <Metric label="STREAK" value={`${streak} ${streak === 1 ? "day" : "days"}`} detail="consecutive study days" />
      <div className="lg-community-activity-summary">
        <div className="lg-community-label">TODAY'S ACTIVITY</div>
        <div><span className="lg-community-status-dot" /> {activePeople} {activePeople === 1 ? "person" : "people"} logged focus</div>
        <span>{fmtMin(activeMinutes)} published focus</span>
      </div>
    </section>
  );
}