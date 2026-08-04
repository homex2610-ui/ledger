import { Users, UserPlus, Medal } from "lucide-react";
import { COLORS, FONTS, RANK_COLORS, hexToRgba, darken } from "./lib/theme";

// Assumed shapes — adjust to match your real state if different:
// peer:  { id, name, initials, weeklyMinutes, weeklyGoalMinutes, streakDays }
// group: { id, name, description, memberInitials: string[], memberCount, joined }
//
// Sorting is the caller's responsibility — this component renders `peers` in
// the order given, so rank badges reflect array position (index 0 = #1).

function initialsAvatar(initials, isSelf) {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 9,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONTS.display,
        fontWeight: 600,
        fontSize: 14,
        color: COLORS.bg,
        background: isSelf
          ? `linear-gradient(150deg, ${COLORS.ink}, ${darken(COLORS.ink, 22)})`
          : `linear-gradient(150deg, ${COLORS.faint}, ${darken(COLORS.faint, 20)})`,
      }}
    >
      {initials}
    </div>
  );
}

function RankStamp({ rank }) {
  const isTop3 = rank <= 3;
  const medalColor = isTop3 ? RANK_COLORS[rank - 1] : COLORS.faint;
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: isTop3 ? FONTS.display : FONTS.mono,
        fontWeight: isTop3 ? 700 : 500,
        fontSize: isTop3 ? 14 : 12,
        color: medalColor,
        border: `1.5px solid ${isTop3 ? medalColor : COLORS.border}`,
        boxShadow: isTop3 ? `0 0 0 3px ${hexToRgba(medalColor, 0.12)}` : "none",
      }}
    >
      {rank}
    </div>
  );
}

function PeerRow({ peer, rank, isSelf }) {
  const pct = Math.min(
    100,
    Math.round((peer.weeklyMinutes / Math.max(1, peer.weeklyGoalMinutes)) * 100)
  );
  return (
    <div
      className="lg-row"
      style={{
        display: "grid",
        gridTemplateColumns: "44px 1fr auto 90px",
        alignItems: "center",
        gap: 16,
        padding: "14px 18px",
        borderBottom: `1px solid ${COLORS.border}`,
        position: "relative",
        background: isSelf ? hexToRgba(COLORS.ink, 0.08) : "transparent",
      }}
    >
      {isSelf && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: COLORS.ink,
          }}
        />
      )}
      <RankStamp rank={rank} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {initialsAvatar(peer.initials, isSelf)}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 14.5,
              color: COLORS.text,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {isSelf ? "You" : peer.name}
          </div>
          {peer.streakDays > 0 && (
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 11,
                color: COLORS.faint,
                marginTop: 2,
              }}
            >
              {peer.streakDays} day streak
            </div>
          )}
        </div>
      </div>
      <div style={{ width: 140 }}>
        <div
          style={{
            height: 5,
            background: COLORS.border,
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${darken(COLORS.ink, 30)}, ${COLORS.ink})`,
              borderRadius: 3,
            }}
          />
        </div>
        <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.faint, marginTop: 4 }}>
          {pct}% of weekly goal
        </div>
      </div>
      <div style={{ fontFamily: FONTS.mono, fontSize: 15, fontWeight: 600, color: COLORS.text, textAlign: "right" }}>
        {peer.weeklyMinutes}
        <span style={{ fontSize: 10, color: COLORS.faint, fontWeight: 400, display: "block", marginTop: 2 }}>
          MIN
        </span>
      </div>
    </div>
  );
}

function GroupCard({ group, onJoin, onLeave }) {
  const visible = group.memberInitials.slice(0, 3);
  const extra = Math.max(0, group.memberCount - visible.length);
  return (
    <div
      className="lg-card lg-card-interactive"
      style={{
        borderRadius: 10,
        padding: 16,
        border: `1px solid ${COLORS.border}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: 16, color: COLORS.text }}>
          {group.name}
        </div>
        {group.joined && (
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 10,
              color: COLORS.done,
              background: hexToRgba(COLORS.done, 0.12),
              border: `1px solid ${hexToRgba(COLORS.done, 0.3)}`,
              padding: "3px 7px",
              borderRadius: 5,
            }}
          >
            JOINED
          </div>
        )}
      </div>
      <div style={{ fontSize: 12.5, color: COLORS.dim, lineHeight: 1.5, marginBottom: 14 }}>
        {group.description}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex" }}>
          {visible.map((initials, i) => (
            <div
              key={i}
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                fontSize: 10,
                fontFamily: FONTS.display,
                fontWeight: 600,
                color: COLORS.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid ${COLORS.panel}`,
                marginLeft: i === 0 ? 0 : -8,
                background: `linear-gradient(150deg, ${COLORS.ink}, ${darken(COLORS.ink, 22)})`,
              }}
            >
              {initials}
            </div>
          ))}
          {extra > 0 && (
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                border: `2px solid ${COLORS.panel}`,
                marginLeft: -8,
                background: COLORS.border,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONTS.mono,
                fontSize: 9,
                color: COLORS.faint,
              }}
            >
              +{extra}
            </div>
          )}
        </div>
        <button
          className={`lg-btn ${group.joined ? "lg-btn-ghost" : "lg-btn-ink"}`}
          onClick={() => (group.joined ? onLeave(group.id) : onJoin(group.id))}
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: "7px 14px",
            borderRadius: 7,
            border: group.joined ? `1px solid ${COLORS.border}` : "none",
            color: group.joined ? COLORS.dim : COLORS.bg,
            cursor: "pointer",
          }}
        >
          {group.joined ? "Leave" : "Join"}
        </button>
      </div>
    </div>
  );
}

export default function Peers({ peers = [], groups = [], currentUserId, onJoinGroup, onLeaveGroup, onInvite }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "36px 0 14px" }}>
        <Medal size={16} color={COLORS.ink} />
        <h2 style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: 18, margin: 0, color: COLORS.text }}>
          Leaderboard
        </h2>
        <div style={{ flex: 1, height: 1, background: COLORS.border }} />
        <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.faint }}>THIS WEEK</div>
      </div>

      <div className="lg-card" style={{ borderRadius: 10, overflow: "hidden" }}>
        {peers.map((peer, i) => (
          <PeerRow key={peer.id} peer={peer} rank={i + 1} isSelf={peer.id === currentUserId} />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "36px 0 14px" }}>
        <Users size={16} color={COLORS.ink} />
        <h2 style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: 18, margin: 0, color: COLORS.text }}>
          Study Groups
        </h2>
        <div style={{ flex: 1, height: 1, background: COLORS.border }} />
        <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.faint }}>{groups.length}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px,1fr))", gap: 14 }}>
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} onJoin={onJoinGroup} onLeave={onLeaveGroup} />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "36px 0 14px" }}>
        <h2 style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: 18, margin: 0, color: COLORS.text }}>
          Add Peers
        </h2>
        <div style={{ flex: 1, height: 1, background: COLORS.border }} />
      </div>

      <div
        style={{
          border: `1.5px dashed ${COLORS.border}`,
          borderRadius: 10,
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              border: `1.5px dashed ${COLORS.faint}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: COLORS.faint,
            }}
          >
            <UserPlus size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.text }}>
              Invite by username or share link
            </div>
            <div style={{ fontSize: 12, color: COLORS.faint, marginTop: 1 }}>
              Peers see your streak and weekly minutes only
            </div>
          </div>
        </div>
        <button
          className="lg-btn lg-btn-ghost"
          onClick={onInvite}
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: COLORS.text,
            background: "transparent",
            border: `1px solid ${COLORS.border}`,
            padding: "8px 16px",
            borderRadius: 7,
            cursor: "pointer",
          }}
        >
          Share invite
        </button>
      </div>
    </div>
  );
}
