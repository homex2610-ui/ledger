import { Router, type IRouter, type Response } from "express";
import { and, desc, eq, gte, gt, ilike, inArray, lt, or } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  circleConnectionsTable,
  cohortMembersTable,
  cohortsTable,
  groupMembersTable,
  groupsTable,
  leaderboardExclusionsTable,
  profilesTable,
  pulseAdjustmentsTable,
  studySessionsTable,
  testAttemptsTable,
  topicProgressTable,
  topicsTable,
} from "@workspace/db/schema";
import {
  ConnectByCodeBody,
  ConnectByCodeResponse,
  CreateGroupBody,
  CreateGroupResponse,
  DeleteGroupParams,
  DiscoverGroupsResponse,
  GetCircleFeedResponse,
  GetCirclesResponse,
  GetCohortsFeedResponse,
  GetCohortsLeaderboardResponse,
  GetCohortsLeaderboardSparklineResponse,
  GetCohortsResponse,
  GetGroupActivityParams,
  GetGroupActivityResponse,
  GetGroupLeaderboardParams,
  GetGroupLeaderboardResponse,
  GetGroupLeaderboardSparklineResponse,
  GetGroupParams,
  GetGroupResponse,
  GetLeaderboardResponse,
  JoinGroupByCodeBody,
  JoinGroupByCodeResponse,
  LeaveGroupParams,
  ListGroupsResponse,
  RemoveConnectionParams,
  UpdateGroupBody,
  UpdateGroupParams,
  UpdateGroupResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth.js";
import { COHORT_CAPACITY } from "../lib/cohorts.js";
import { FEATURE_LEADERBOARD_WEEKLY, isFeatureEnabled } from "../lib/feature-flags.js";
import {
  computeBestRank,
  computeGap,
  computeRankDelta,
  computeStreakFromSnapshots,
} from "../lib/leaderboard-meta-core.js";
import { rankHistoryForScope, sparklineRanksForScope } from "../lib/leaderboard-meta.js";
import { ensureOpenPeriod, type PeriodScopeType } from "../lib/periods.js";
import {
  cohortUserIdsFor,
  computeStreak,
  connectionUserIds,
  groupUserIds,
  isGroupMember,
  streaksForUsers,
  toProfileShape,
  userHandlesById,
  weeklyPulseForUsers,
} from "../lib/prep-stats.js";
import { generateInviteCode, isUuid, safeTimeZone, startOfDayIn, startOfWeek, toISODate, weekLabel } from "../lib/utils.js";

const router: IRouter = Router();
router.use(requireAuth);

/** Responds 400 and returns true when the value is not a well-formed UUID. */
function rejectInvalidUuid(res: Response, value: unknown): boolean {
  if (isUuid(value)) return false;
  res.status(400).json({ error: "Invalid id" });
  return true;
}

const CIRCLE_CAPACITY = 25;
const MAX_CONNECTIONS = CIRCLE_CAPACITY - 1;
const LEADERBOARD_TOP_N_DEFAULT = 3;

async function groupSummaryFor(userId: string, group: typeof groupsTable.$inferSelect) {
  const memberRows = await db
    .select()
    .from(groupMembersTable)
    .where(eq(groupMembersTable.groupId, group.id));
  const myRole = group.ownerId === userId ? "owner" : memberRows.some((row) => row.userId === userId) ? "member" : null;
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    examFocus: group.examFocus,
    subjectFocus: group.subjectFocus,
    memberCount: memberRows.length,
    isDiscoverable: group.isDiscoverable,
    inviteCode: group.inviteCode,
    ownerId: group.ownerId,
    myRole,
    createdAt: group.createdAt,
  };
}
async function leaderboardFor(
  userIds: string[],
  currentUserId: string,
  scope?: { scopeType: PeriodScopeType; scopeId: string },
  window?: { from: Date; to: Date },
) {
  const [profile, profileRows, excludedRows, adjustmentRows] = await Promise.all([
    db.select().from(profilesTable).where(eq(profilesTable.userId, currentUserId)).limit(1),
    db.select().from(profilesTable).where(inArray(profilesTable.userId, userIds)),
    db.select().from(leaderboardExclusionsTable).where(inArray(leaderboardExclusionsTable.userId, userIds)),
    db
      .select()
      .from(pulseAdjustmentsTable)
      .where(
        and(
          inArray(pulseAdjustmentsTable.userId, userIds),
          gte(pulseAdjustmentsTable.createdAt, window?.from ?? startOfWeek()),
          lt(pulseAdjustmentsTable.createdAt, window?.to ?? new Date(startOfWeek().getTime() + 7 * 86_400_000)),
        ),
      ),
  ]);
  const myProfile = profile[0];
  const visibilityById = new Map(profileRows.map((row) => [row.userId, row.showOnLeaderboard]));
  const excludedIds = new Set(excludedRows.map((row) => row.userId));
  const adjustmentByUser = new Map<string, number>();
  for (const row of adjustmentRows) adjustmentByUser.set(row.userId, (adjustmentByUser.get(row.userId) ?? 0) + row.amount);
  const { minutesByUser, topicsByUser } = await weeklyPulseForUsers(userIds, window);
  const handles = await userHandlesById(userIds);
  const history = scope && !window ? await rankHistoryForScope(scope.scopeType, scope.scopeId, userIds) : undefined;

  const cohortTopN = scope?.scopeType === "cohort" && !window ? await leaderboardTopNFor(scope.scopeId) : null;
  const topN = cohortTopN ?? LEADERBOARD_TOP_N_DEFAULT;

  const period = scope && !window ? await ensureOpenPeriod(scope.scopeType, scope.scopeId) : undefined;

  const visibleIds = userIds.filter((id) => {
    if (excludedIds.has(id)) return false;
    if (id === currentUserId) return !myProfile?.focusMode;
    return visibilityById.get(id) !== false;
  });

  let lastScore = Number.NaN;
  let lastRank = 0;
  const ranked = visibleIds
    .map((id) => {
      const info = handles.get(id) ?? { handle: "unknown", initials: "??", avatarUrl: null };
      const minutes = minutesByUser.get(id) ?? 0;
      const topics = topicsByUser.get(id) ?? 0;
      return {
        userId: id,
        handle: info.handle,
        initials: info.initials,
        avatarUrl: info.avatarUrl,
        score: Math.round(minutes + (adjustmentByUser.get(id) ?? 0)),
        hours: Math.round((minutes / 60) * 10) / 10,
        topics,
        isCurrentUser: id === currentUserId,
      };
    })
    .sort((a, b) => b.score - a.score || a.handle.localeCompare(b.handle))
    .map((entry, index) => {
      if (index === 0 || entry.score !== lastScore) {
        lastScore = entry.score;
        lastRank = index + 1;
      }
      return { ...entry, rank: lastRank };
    });

  const entries = ranked.map((entry, index) => {
    const { userId, ...publicEntry } = entry;
    if (!scope || !history) return { ...publicEntry, rankDelta: null, streak: 0, pb: null, gapToNext: null, gapState: "empty" };
    const points = history.get(userId)?.points ?? [];
    const above = ranked[index - 1];
    const gap = computeGap(entry.rank, entry.score, index === 0 ? null : above?.score ?? null);
    return {
      ...publicEntry,
      rankDelta: computeRankDelta(entry.rank, points),
      streak: computeStreakFromSnapshots(points, topN),
      pb: computeBestRank(points),
      gapToNext: gap.gapToNext,
      gapState: gap.state,
    };
  });

  return {
    entries,
    focused: Boolean(myProfile?.focusMode),
    weekEnd: period?.weekEnd,
  };
}

async function leaderboardTopNFor(cohortId: string): Promise<number> {
  const rows = await db.select({ leaderboardTopN: cohortsTable.leaderboardTopN }).from(cohortsTable).where(eq(cohortsTable.id, cohortId)).limit(1);
  const topN = rows[0]?.leaderboardTopN;
  return typeof topN === "number" && topN > 0 ? topN : LEADERBOARD_TOP_N_DEFAULT;
}

interface FeedItem {
  userId: string;
  handle: string;
  avatarUrl: string | null;
  type: "session" | "test" | "topic";
  subject: string;
  detail: string;
  date: Date;
}

async function feedForUsers(userIds: string[]): Promise<FeedItem[]> {
  const handles = await userHandlesById(userIds);
  const items: FeedItem[] = [];

  const since = new Date(Date.now() - 7 * 86_400_000);

  const sessions = await db
    .select()
    .from(studySessionsTable)
    .where(and(inArray(studySessionsTable.userId, userIds), gt(studySessionsTable.createdAt, since)))
    .orderBy(desc(studySessionsTable.createdAt))
    .limit(50);
  for (const session of sessions) {
    items.push({
      userId: session.userId,
      handle: handles.get(session.userId)?.handle ?? "unknown",
      avatarUrl: handles.get(session.userId)?.avatarUrl ?? null,
      type: "session",
      subject: session.subject,
      detail: `studied ${session.subject} for ${session.minutes} minutes`,
      date: session.createdAt,
    });
  }

  const tests = await db
    .select()
    .from(testAttemptsTable)
    .where(and(inArray(testAttemptsTable.userId, userIds), gt(testAttemptsTable.date, since)))
    .orderBy(desc(testAttemptsTable.date))
    .limit(30);
  for (const test of tests) {
    items.push({
      userId: test.userId,
      handle: handles.get(test.userId)?.handle ?? "unknown",
      avatarUrl: handles.get(test.userId)?.avatarUrl ?? null,
      type: "test",
      subject: test.subject ?? "Full syllabus",
      detail: `logged ${test.name} at ${test.accuracy}% accuracy`,
      date: test.date,
    });
  }

  const topicUpdates = await db
    .select({ progress: topicProgressTable, topic: topicsTable })
    .from(topicProgressTable)
    .innerJoin(topicsTable, eq(topicProgressTable.topicId, topicsTable.id))
    .where(and(inArray(topicProgressTable.userId, userIds), gt(topicProgressTable.updatedAt, since)))
    .orderBy(desc(topicProgressTable.updatedAt))
    .limit(30);
  for (const { progress, topic } of topicUpdates) {
    items.push({
      userId: progress.userId,
      handle: handles.get(progress.userId)?.handle ?? "unknown",
      avatarUrl: handles.get(progress.userId)?.avatarUrl ?? null,
      type: "topic",
      subject: topic.subject,
      detail: `moved ${topic.name} to ${progress.status.replace("_", " ")}`,
      date: progress.updatedAt,
    });
  }

  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  return items.slice(0, 20);
}

// ---------------------------------------------------------------------------
// Circle leaderboard (weekly pulse over my connections)
// ---------------------------------------------------------------------------

router.get("/leaderboard", async (req, res) => {
  const connectionIds = await connectionUserIds(req.userId);
  const userIds = [...connectionIds, req.userId];
  const { entries, focused } = await leaderboardFor(userIds, req.userId);
  res.json(GetLeaderboardResponse.parse({ weekLabel: weekLabel(), entries, focused }));
});

// ---------------------------------------------------------------------------
// Circles — personal, code-based mutual contacts. No discovery.
// ---------------------------------------------------------------------------

router.get("/circles", async (req, res) => {
  const timeZone = safeTimeZone(req.query.tz);
  const [profile, connectionIds] = await Promise.all([toProfileShape(req.userId), connectionUserIds(req.userId)]);
  const allIds = [...connectionIds, req.userId];
  const { minutesByUser, topicsByUser } = await weeklyPulseForUsers(allIds);
  const handles = await userHandlesById(allIds);
  const streaks = await streaksForUsers(allIds, timeZone);

  const memberShape = async (id: string, isOwner: boolean) => {
    const info = handles.get(id) ?? { handle: "unknown", initials: "??", avatarUrl: null };
    return {
      userId: id,
      handle: info.handle,
      initials: info.initials,
      avatarUrl: info.avatarUrl,
      weeklyMinutes: minutesByUser.get(id) ?? 0,
      weeklyTopics: topicsByUser.get(id) ?? 0,
      streak: streaks.get(id) ?? 0,
      isOwner,
    };
  };

  const self = await memberShape(req.userId, true);
  const connections = await Promise.all(connectionIds.map((id) => memberShape(id, false)));

  res.json(
    GetCirclesResponse.parse({
      profileCode: profile?.profileCode ?? "",
      memberCount: 1 + connections.length,
      capacity: CIRCLE_CAPACITY,
      self,
      connections,
    }),
  );
});

router.post("/circles/connect", async (req, res) => {
  const body = ConnectByCodeBody.parse(req.body);
  const code = body.code.trim().toUpperCase();

  const targets = await db.select().from(profilesTable).where(eq(profilesTable.profileCode, code)).limit(1);
  const target = targets[0];
  if (!target) {
    res.status(404).json({ error: "No PrepPulse member has that code" });
    return;
  }
  if (target.userId === req.userId) {
    res.status(400).json({ error: "That is your own code" });
    return;
  }

  // Atomic two-sided capacity check. Both users' profile rows are locked so
  // concurrent connects involving either user serialize; both circles must
  // have room before the reciprocal pair is inserted. On failure nothing is
  // written and the joining user keeps their own independent circle.
  await db.transaction(async (tx) => {
    await tx
      .select({ id: profilesTable.userId })
      .from(profilesTable)
      .where(inArray(profilesTable.userId, [req.userId, target.userId]))
      .for("update");

    const [mine, theirs] = await Promise.all([
      tx.select().from(circleConnectionsTable).where(eq(circleConnectionsTable.userId, req.userId)),
      tx.select().from(circleConnectionsTable).where(eq(circleConnectionsTable.userId, target.userId)),
    ]);

    const alreadyConnected = mine.some((row) => row.connectionId === target.userId) || theirs.some((row) => row.connectionId === req.userId);
    if (alreadyConnected) return;

    if (mine.length >= MAX_CONNECTIONS || theirs.length >= MAX_CONNECTIONS) {
      res.status(409).json({ error: "Your circle is full — this private circle can have up to 25 members." });
      return;
    }

    await tx
      .insert(circleConnectionsTable)
      .values([
        { userId: req.userId, connectionId: target.userId },
        { userId: target.userId, connectionId: req.userId },
      ])
      .onConflictDoNothing();
  });

  if (res.headersSent) return;

  const handles = await userHandlesById([target.userId]);
  const info = handles.get(target.userId) ?? { handle: "unknown", initials: "??", avatarUrl: null };
  const { minutesByUser, topicsByUser } = await weeklyPulseForUsers([target.userId]);
  res.status(201).json(
    ConnectByCodeResponse.parse({
      userId: target.userId,
      handle: info.handle,
      initials: info.initials,
      avatarUrl: info.avatarUrl,
      weeklyMinutes: minutesByUser.get(target.userId) ?? 0,
      weeklyTopics: topicsByUser.get(target.userId) ?? 0,
      streak: await computeStreak(target.userId),
      isOwner: false,
    }),
  );
});

router.delete("/circles/:userId", async (req, res) => {
  const params = RemoveConnectionParams.parse(req.params);
  if (rejectInvalidUuid(res, params.userId)) return;
  if (params.userId === req.userId) {
    res.status(400).json({ error: "Cannot remove yourself" });
    return;
  }
  const existing = await db
    .select({ userId: circleConnectionsTable.userId })
    .from(circleConnectionsTable)
    .where(and(eq(circleConnectionsTable.userId, req.userId), eq(circleConnectionsTable.connectionId, params.userId)))
    .limit(1);
  if (!existing[0]) {
    res.status(404).json({ error: "Connection not found" });
    return;
  }
  await db
    .delete(circleConnectionsTable)
    .where(
      or(
        and(eq(circleConnectionsTable.userId, req.userId), eq(circleConnectionsTable.connectionId, params.userId)),
        and(eq(circleConnectionsTable.userId, params.userId), eq(circleConnectionsTable.connectionId, req.userId)),
      ),
    );
  res.status(204).end();
});

router.get("/circles/feed", async (req, res) => {
  const connectionIds = await connectionUserIds(req.userId);
  res.json(GetCircleFeedResponse.parse(await feedForUsers(connectionIds)));
});

// ---------------------------------------------------------------------------
// Cohorts — auto-assigned groups of up to 25. No discovery, no search.
// ---------------------------------------------------------------------------

router.get("/cohorts", async (req, res) => {
  const timeZone = safeTimeZone(req.query.tz);
  const membership = await db
    .select({ cohortId: cohortMembersTable.cohortId })
    .from(cohortMembersTable)
    .where(eq(cohortMembersTable.userId, req.userId))
    .limit(1);
  if (!membership[0]) {
    res.status(404).json({ error: "No study cohort assigned yet" });
    return;
  }

  const cohortId = membership[0].cohortId;
  const [cohortRows, memberRows] = await Promise.all([
    db.select().from(cohortsTable).where(eq(cohortsTable.id, cohortId)).limit(1),
    db.select().from(cohortMembersTable).where(eq(cohortMembersTable.cohortId, cohortId)),
  ]);
  const cohort = cohortRows[0];
  const memberIds = memberRows.map((row) => row.userId);
  const { minutesByUser, topicsByUser } = await weeklyPulseForUsers(memberIds);
  const handles = await userHandlesById(memberIds);
  const streaks = await streaksForUsers(memberIds, timeZone);

  const members = await Promise.all(
    [...memberRows]
      .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())
      .map(async (row) => {
        const info = handles.get(row.userId) ?? { handle: "unknown", initials: "??", avatarUrl: null };
        return {
          userId: row.userId,
          handle: info.handle,
          initials: info.initials,
          avatarUrl: info.avatarUrl,
          weeklyMinutes: minutesByUser.get(row.userId) ?? 0,
          weeklyTopics: topicsByUser.get(row.userId) ?? 0,
          streak: streaks.get(row.userId) ?? 0,
        };
      }),
  );

  res.json(GetCohortsResponse.parse({ cohortId, memberCount: members.length, capacity: cohort?.capacity ?? COHORT_CAPACITY, members }));
});

router.get("/cohorts/leaderboard", async (req, res) => {
  if (!(await isFeatureEnabled(FEATURE_LEADERBOARD_WEEKLY))) {
    res.status(403).json({ error: "feature_disabled" });
    return;
  }
  const timeZone = safeTimeZone(req.query.tz);
  const membership = await db
    .select({ cohortId: cohortMembersTable.cohortId })
    .from(cohortMembersTable)
    .where(eq(cohortMembersTable.userId, req.userId))
    .limit(1);
  if (!membership[0]) {
    res.status(404).json({ error: "No study cohort assigned yet" });
    return;
  }
  const memberIds = await cohortUserIdsFor(req.userId);
  const period = req.query.period === "today" ? "today" : "week";
  const window = period === "today" ? { from: startOfDayIn(new Date(), timeZone ?? "UTC"), to: new Date() } : undefined;
  const { entries, focused, weekEnd } = await leaderboardFor(memberIds ?? [], req.userId, {
    scopeType: "cohort",
    scopeId: membership[0].cohortId,
  }, window);
  res.json(
    GetCohortsLeaderboardResponse.parse({
      weekLabel: period === "today" ? "Today" : weekLabel(),
      weekEnd,
      entries,
      focused,
    }),
  );
});

router.get("/cohorts/leaderboard/sparkline", async (req, res) => {
  if (!(await isFeatureEnabled(FEATURE_LEADERBOARD_WEEKLY))) {
    res.status(403).json({ error: "feature_disabled" });
    return;
  }
  const membership = await db
    .select({ cohortId: cohortMembersTable.cohortId })
    .from(cohortMembersTable)
    .where(eq(cohortMembersTable.userId, req.userId))
    .limit(1);
  if (!membership[0]) {
    res.status(404).json({ error: "No study cohort assigned yet" });
    return;
  }
  const memberIds = await cohortUserIdsFor(req.userId);
  const ranksByUser = await sparklineRanksForScope("cohort", membership[0].cohortId, memberIds ?? []);
  res.json(
    GetCohortsLeaderboardSparklineResponse.parse(
      (memberIds ?? []).map((userId) => ({ userId, ranks: ranksByUser.get(userId) ?? [] })),
    ),
  );
});

router.get("/cohorts/feed", async (req, res) => {
  const memberIds = await cohortUserIdsFor(req.userId);
  if (!memberIds) {
    res.status(404).json({ error: "No study cohort assigned yet" });
    return;
  }
  res.json(GetCohortsFeedResponse.parse(await feedForUsers(memberIds)));
});

// ---------------------------------------------------------------------------
// Groups — named room with an owner, join by code, optional discovery
// ---------------------------------------------------------------------------

router.get("/groups", async (req, res) => {
  const memberships = await db
    .select({ groupId: groupMembersTable.groupId })
    .from(groupMembersTable)
    .where(eq(groupMembersTable.userId, req.userId));
  const owned = await db.select().from(groupsTable).where(eq(groupsTable.ownerId, req.userId));
  const memberIds = memberships.map((row) => row.groupId);
  const memberGroups = memberIds.length
    ? await db.select().from(groupsTable).where(inArray(groupsTable.id, memberIds))
    : [];

  const unique = new Map<string, typeof groupsTable.$inferSelect>();
  for (const group of [...owned, ...memberGroups]) unique.set(group.id, group);

  const summaries = await Promise.all(Array.from(unique.values()).map((group) => groupSummaryFor(req.userId, group)));
  res.json(ListGroupsResponse.parse(summaries));
});

router.post("/groups", async (req, res) => {
  const body = CreateGroupBody.parse(req.body);
  const inserted = await db.transaction(async (tx) => {
    const group = (
      await tx
        .insert(groupsTable)
        .values({
          name: body.name,
          description: body.description ?? null,
          examFocus: body.examFocus ?? null,
          subjectFocus: body.subjectFocus ?? [],
          ownerId: req.userId,
          inviteCode: generateInviteCode(),
          isDiscoverable: body.isDiscoverable ?? false,
        })
        .returning()
    )[0];
    await tx.insert(groupMembersTable).values({ groupId: group.id, userId: req.userId, role: "owner" });
    return group;
  });
  res.status(201).json(CreateGroupResponse.parse(await groupSummaryFor(req.userId, inserted)));
});

router.post("/groups/join", async (req, res) => {
  const body = JoinGroupByCodeBody.parse(req.body);
  const code = body.code.trim().toUpperCase();

  const targets = await db.select().from(groupsTable).where(eq(groupsTable.inviteCode, code)).limit(1);
  const group = targets[0];
  if (!group) {
    res.status(404).json({ error: "No group has that code" });
    return;
  }

  if (group.ownerId === req.userId) {
    const summary = await groupSummaryFor(req.userId, group);
    res.json(JoinGroupByCodeResponse.parse(summary));
    return;
  }

  const already = await db
    .select()
    .from(groupMembersTable)
    .where(and(eq(groupMembersTable.groupId, group.id), eq(groupMembersTable.userId, req.userId)))
    .limit(1);
  if (!already[0]) {
    // PK (groupId, userId) makes this insert idempotent even when two join
    // requests race; the conflict is ignored rather than surfacing a 500.
    await db
      .insert(groupMembersTable)
      .values({ groupId: group.id, userId: req.userId, role: "member" })
      .onConflictDoNothing();
  }
  res.json(JoinGroupByCodeResponse.parse(await groupSummaryFor(req.userId, group)));
});

router.get("/groups/discover", async (req, res) => {
  const query = String(req.query.q ?? "").trim().toLowerCase();
  const rows = query
    ? await db.select().from(groupsTable).where(and(eq(groupsTable.isDiscoverable, true), ilike(groupsTable.name, `%${query}%`))).limit(20)
    : await db.select().from(groupsTable).where(eq(groupsTable.isDiscoverable, true)).limit(20);
  const summaries = await Promise.all(rows.map((group) => groupSummaryFor(req.userId, group)));
  res.json(DiscoverGroupsResponse.parse(summaries));
});

router.get("/groups/:groupId", async (req, res) => {
  const params = GetGroupParams.parse(req.params);
  if (rejectInvalidUuid(res, params.groupId)) return;
  const rows = await db.select().from(groupsTable).where(eq(groupsTable.id, params.groupId)).limit(1);
  const group = rows[0];
  if (!group || !(await isGroupMember(group.id, req.userId))) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const memberRows = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, group.id));
  const memberIds = memberRows.map((row) => row.userId);
  const handles = await userHandlesById(memberIds);
  const members = memberRows.map((row) => ({
    userId: row.userId,
    handle: handles.get(row.userId)?.handle ?? "unknown",
    initials: handles.get(row.userId)?.initials ?? "??",
    avatarUrl: handles.get(row.userId)?.avatarUrl ?? null,
    role: row.role,
  }));

  res.json(GetGroupResponse.parse({ group: await groupSummaryFor(req.userId, group), members }));
});

router.patch("/groups/:groupId", async (req, res) => {
  const params = UpdateGroupParams.parse(req.params);
  if (rejectInvalidUuid(res, params.groupId)) return;
  const body = UpdateGroupBody.parse(req.body);

  const rows = await db.select().from(groupsTable).where(eq(groupsTable.id, params.groupId)).limit(1);
  const group = rows[0];
  if (!group || group.ownerId !== req.userId) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const next: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) next.name = body.name;
  if (body.description !== undefined) next.description = body.description;
  if (body.examFocus !== undefined) next.examFocus = body.examFocus;
  if (body.subjectFocus !== undefined) next.subjectFocus = body.subjectFocus;
  if (body.isDiscoverable !== undefined) next.isDiscoverable = body.isDiscoverable;

  const updated = (await db.update(groupsTable).set(next).where(eq(groupsTable.id, params.groupId)).returning())[0];
  res.json(UpdateGroupResponse.parse(await groupSummaryFor(req.userId, updated)));
});

router.delete("/groups/:groupId", async (req, res) => {
  const params = DeleteGroupParams.parse(req.params);
  if (rejectInvalidUuid(res, params.groupId)) return;
  const rows = await db.select().from(groupsTable).where(eq(groupsTable.id, params.groupId)).limit(1);
  const group = rows[0];
  if (!group || group.ownerId !== req.userId) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  await db.delete(groupsTable).where(eq(groupsTable.id, params.groupId));
  res.status(204).end();
});

router.post("/groups/:groupId/leave", async (req, res) => {
  const params = LeaveGroupParams.parse(req.params);
  if (rejectInvalidUuid(res, params.groupId)) return;
  const rows = await db.select().from(groupsTable).where(eq(groupsTable.id, params.groupId)).limit(1);
  const group = rows[0];
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  if (group.ownerId === req.userId) {
    res.status(400).json({ error: "Owners cannot leave; delete the group instead" });
    return;
  }
  const membership = await db
    .select({ userId: groupMembersTable.userId })
    .from(groupMembersTable)
    .where(and(eq(groupMembersTable.groupId, params.groupId), eq(groupMembersTable.userId, req.userId)))
    .limit(1);
  if (!membership[0]) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  await db
    .delete(groupMembersTable)
    .where(and(eq(groupMembersTable.groupId, params.groupId), eq(groupMembersTable.userId, req.userId)));
  res.status(204).end();
});

router.get("/groups/:groupId/leaderboard", async (req, res) => {
  const params = GetGroupLeaderboardParams.parse(req.params);
  if (rejectInvalidUuid(res, params.groupId)) return;
  if (!(await isFeatureEnabled(FEATURE_LEADERBOARD_WEEKLY))) {
    res.status(403).json({ error: "feature_disabled" });
    return;
  }
  const rows = await db.select().from(groupsTable).where(eq(groupsTable.id, params.groupId)).limit(1);
  const group = rows[0];
  if (!group || !(await isGroupMember(group.id, req.userId))) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  const memberIds = await groupUserIds(group.id);
  const { entries, focused, weekEnd } = await leaderboardFor(memberIds, req.userId, {
    scopeType: "group",
    scopeId: group.id,
  });
  res.json(GetGroupLeaderboardResponse.parse({ weekLabel: weekLabel(), weekEnd, entries, focused }));
});

router.get("/groups/:groupId/leaderboard/sparkline", async (req, res) => {
  const params = GetGroupLeaderboardParams.parse(req.params);
  if (rejectInvalidUuid(res, params.groupId)) return;
  if (!(await isFeatureEnabled(FEATURE_LEADERBOARD_WEEKLY))) {
    res.status(403).json({ error: "feature_disabled" });
    return;
  }
  const rows = await db.select().from(groupsTable).where(eq(groupsTable.id, params.groupId)).limit(1);
  const group = rows[0];
  if (!group || !(await isGroupMember(group.id, req.userId))) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  const memberIds = await groupUserIds(group.id);
  const ranksByUser = await sparklineRanksForScope("group", group.id, memberIds);
  res.json(
    GetGroupLeaderboardSparklineResponse.parse(
      memberIds.map((userId) => ({ userId, ranks: ranksByUser.get(userId) ?? [] })),
    ),
  );
});

router.get("/groups/:groupId/activity", async (req, res) => {
  const params = GetGroupActivityParams.parse(req.params);
  if (rejectInvalidUuid(res, params.groupId)) return;
  const timeZone = safeTimeZone(req.query.tz);
  const rows = await db.select().from(groupsTable).where(eq(groupsTable.id, params.groupId)).limit(1);
  const group = rows[0];
  if (!group || !(await isGroupMember(group.id, req.userId))) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const memberIds = await groupUserIds(group.id);
  const handles = await userHandlesById(memberIds);
  const since = startOfDayIn(new Date(), timeZone ?? "UTC");
  since.setDate(since.getDate() - 6);

  const sessionRows = await db
    .select({ userId: studySessionsTable.userId, minutes: studySessionsTable.minutes, createdAt: studySessionsTable.createdAt })
    .from(studySessionsTable)
    .where(and(inArray(studySessionsTable.userId, memberIds), gte(studySessionsTable.createdAt, since)))
    .orderBy(desc(studySessionsTable.createdAt));

  const byUserDay = new Map<string, number>();
  for (const session of sessionRows) {
    const key = `${session.userId}|${toISODate(session.createdAt)}`;
    byUserDay.set(key, (byUserDay.get(key) ?? 0) + session.minutes);
  }

  const items: Array<{ userId: string; handle: string; day: Date; minutes: number }> = [];
  for (const [key, minutes] of byUserDay) {
    const [userId, dayStr] = key.split("|");
    const [y, m, d] = dayStr.split("-").map(Number);
    items.push({
      userId,
      handle: handles.get(userId)?.handle ?? "unknown",
      day: new Date(y, m - 1, d),
      minutes,
    });
  }
  items.sort((a, b) => (a.day.getTime() - b.day.getTime()) || a.handle.localeCompare(b.handle));
  res.json(GetGroupActivityResponse.parse(items));
});

export default router;