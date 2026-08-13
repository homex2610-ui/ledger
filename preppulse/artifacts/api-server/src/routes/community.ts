import { Router, type IRouter } from "express";
import { and, desc, eq, gte, gt, ilike, inArray, or } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  circleConnectionsTable,
  groupMembersTable,
  groupsTable,
  profilesTable,
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
  GetGroupActivityParams,
  GetGroupActivityResponse,
  GetGroupLeaderboardParams,
  GetGroupLeaderboardResponse,
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
import { requireAuth } from "../lib/auth";
import {
  computeStreak,
  connectionUserIds,
  groupUserIds,
  isGroupMember,
  toProfileShape,
  userHandlesById,
  weeklyPulseForUsers,
} from "../lib/prep-stats";
import { generateInviteCode, safeTimeZone, startOfDay, toISODate, weekLabel } from "../lib/utils";

const router: IRouter = Router();
router.use(requireAuth);

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

async function leaderboardFor(userIds: string[], currentUserId: string) {
  const [profile, profileRows] = await Promise.all([
    db.select().from(profilesTable).where(eq(profilesTable.userId, currentUserId)).limit(1),
    db.select().from(profilesTable).where(inArray(profilesTable.userId, userIds)),
  ]);
  const myProfile = profile[0];
  const visibilityById = new Map(profileRows.map((row) => [row.userId, row.showOnLeaderboard]));
  const { minutesByUser, topicsByUser } = await weeklyPulseForUsers(userIds);
  const handles = await userHandlesById(userIds);

  const visibleIds = userIds.filter((id) => {
    if (id === currentUserId) return !myProfile?.focusMode;
    return visibilityById.get(id) !== false;
  });

  const entries = visibleIds
    .map((id) => {
      const info = handles.get(id) ?? { handle: "unknown", initials: "??" };
      const minutes = minutesByUser.get(id) ?? 0;
      const topics = topicsByUser.get(id) ?? 0;
      return {
        handle: info.handle,
        initials: info.initials,
        score: Math.round(minutes + topics * 30),
        hours: Math.round((minutes / 60) * 10) / 10,
        topics,
        isCurrentUser: id === currentUserId,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return { entries, focused: Boolean(myProfile?.focusMode) };
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
  const { minutesByUser, topicsByUser } = await weeklyPulseForUsers(connectionIds);
  const handles = await userHandlesById(connectionIds);

  const connections = await Promise.all(
    connectionIds.map(async (id) => {
      const info = handles.get(id) ?? { handle: "unknown", initials: "??" };
      return {
        userId: id,
        handle: info.handle,
        initials: info.initials,
        weeklyMinutes: minutesByUser.get(id) ?? 0,
        weeklyTopics: topicsByUser.get(id) ?? 0,
        streak: await computeStreak(id, timeZone),
      };
    }),
  );

  res.json(GetCirclesResponse.parse({ profileCode: profile?.profileCode ?? "", connections }));
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

  const already = await db
    .select()
    .from(circleConnectionsTable)
    .where(and(eq(circleConnectionsTable.userId, req.userId), eq(circleConnectionsTable.connectionId, target.userId)))
    .limit(1);

  if (!already[0]) {
    await db
      .insert(circleConnectionsTable)
      .values([
        { userId: req.userId, connectionId: target.userId },
        { userId: target.userId, connectionId: req.userId },
      ])
      .onConflictDoNothing();
  }

  const handles = await userHandlesById([target.userId]);
  const info = handles.get(target.userId) ?? { handle: "unknown", initials: "??" };
  const { minutesByUser, topicsByUser } = await weeklyPulseForUsers([target.userId]);
  res.status(201).json(
    ConnectByCodeResponse.parse({
      userId: target.userId,
      handle: info.handle,
      initials: info.initials,
      weeklyMinutes: minutesByUser.get(target.userId) ?? 0,
      weeklyTopics: topicsByUser.get(target.userId) ?? 0,
      streak: await computeStreak(target.userId),
    }),
  );
});

router.delete("/circles/:userId", async (req, res) => {
  const params = RemoveConnectionParams.parse(req.params);
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
  const handles = await userHandlesById(connectionIds);
  const items: Array<{ userId: string; handle: string; type: "session" | "test" | "topic"; subject: string; detail: string; date: Date }> = [];

  const since = new Date(Date.now() - 7 * 86_400_000);

  const sessions = await db
    .select()
    .from(studySessionsTable)
    .where(and(inArray(studySessionsTable.userId, connectionIds), gt(studySessionsTable.createdAt, since)))
    .orderBy(desc(studySessionsTable.createdAt))
    .limit(50);
  for (const session of sessions) {
    items.push({
      userId: session.userId,
      handle: handles.get(session.userId)?.handle ?? "unknown",
      type: "session",
      subject: session.subject,
      detail: `studied ${session.subject} for ${session.minutes} minutes`,
      date: session.createdAt,
    });
  }

  const tests = await db
    .select()
    .from(testAttemptsTable)
    .where(and(inArray(testAttemptsTable.userId, connectionIds), gt(testAttemptsTable.date, since)))
    .orderBy(desc(testAttemptsTable.date))
    .limit(30);
  for (const test of tests) {
    items.push({
      userId: test.userId,
      handle: handles.get(test.userId)?.handle ?? "unknown",
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
    .where(and(inArray(topicProgressTable.userId, connectionIds), gt(topicProgressTable.updatedAt, since)))
    .orderBy(desc(topicProgressTable.updatedAt))
    .limit(30);
  for (const { progress, topic } of topicUpdates) {
    items.push({
      userId: progress.userId,
      handle: handles.get(progress.userId)?.handle ?? "unknown",
      type: "topic",
      subject: topic.subject,
      detail: `moved ${topic.name} to ${progress.status.replace("_", " ")}`,
      date: progress.updatedAt,
    });
  }

  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  res.json(GetCircleFeedResponse.parse(items.slice(0, 20)));
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
  const inserted = (
    await db
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
  await db.insert(groupMembersTable).values({ groupId: inserted.id, userId: req.userId, role: "owner" });
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
    await db.insert(groupMembersTable).values({ groupId: group.id, userId: req.userId, role: "member" });
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
    role: row.role,
  }));

  res.json(GetGroupResponse.parse({ group: await groupSummaryFor(req.userId, group), members }));
});

router.patch("/groups/:groupId", async (req, res) => {
  const params = UpdateGroupParams.parse(req.params);
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
  const rows = await db.select().from(groupsTable).where(eq(groupsTable.id, params.groupId)).limit(1);
  const group = rows[0];
  if (!group || !(await isGroupMember(group.id, req.userId))) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  const memberIds = await groupUserIds(group.id);
  const { entries, focused } = await leaderboardFor(memberIds, req.userId);
  res.json(GetGroupLeaderboardResponse.parse({ weekLabel: weekLabel(), entries, focused }));
});

router.get("/groups/:groupId/activity", async (req, res) => {
  const params = GetGroupActivityParams.parse(req.params);
  const rows = await db.select().from(groupsTable).where(eq(groupsTable.id, params.groupId)).limit(1);
  const group = rows[0];
  if (!group || !(await isGroupMember(group.id, req.userId))) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const memberIds = await groupUserIds(group.id);
  const handles = await userHandlesById(memberIds);
  const since = startOfDay(new Date());
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