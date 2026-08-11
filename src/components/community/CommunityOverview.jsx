import React from "react";
import { COLORS } from "../../lib/theme";
import { MiniStat } from "../ui/Panels";

export function CommunityOverview({ circleCount, groupCount, focusMinutes, streak, activePeople, fmtMin }) {
  return (
    <section className="lg-community-overview" aria-label="Community overview">
      <MiniStat k="CIRCLE" v={`${circleCount} ${circleCount === 1 ? "person" : "people"}`} sub={circleCount ? `${activePeople} active today` : "No connections yet"} />
      <MiniStat k="GROUPS" v={`${groupCount} ${groupCount === 1 ? "group" : "groups"}`} sub={groupCount ? `${activePeople} people active today` : "Join a study room"} />
      <MiniStat k="FOCUS" v={fmtMin(focusMinutes)} sub="your focus today" tint={COLORS.accentFocus} />
      <MiniStat k="STREAK" v={`${streak} ${streak === 1 ? "day" : "days"}`} sub="consecutive study days" />
    </section>
  );
}
