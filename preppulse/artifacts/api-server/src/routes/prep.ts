import { Router, type IRouter } from "express";
import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  cardsTable,
  circleConnectionsTable,
  focusSessionsTable,
  groupMembersTable,
  groupsTable,
  profilesTable,
  studySessionsTable,
  tasksTable,
  testAttemptsTable,
  topicProgressTable,
  topicsTable,
  usersTable,
} from "@workspace/db/schema";
import {
  AnalyzeTestAttemptsResponse,
  CreateTestAttemptBody,
  CreateTestAttemptResponse,
  CreateStudySessionBody,
  CreateStudySessionResponse,
  ExportMyDataResponse,
  GetDashboardResponse,
  GetProfileResponse,
  GetSyllabusSummaryResponse,
  ListStudySessionsResponse,
  ListTestAttemptsResponse,
  ListTopicsResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
  UpdateTopicProgressBody,
  UpdateTopicProgressParams,
  UpdateTopicProgressResponse,
} from "@workspace/api-zod";
import { clearSessionCookie, requireAuth } from "../lib/auth";
import {
  activityForDays,
  computeStreak,
  coverageForUser,
  dailyMinutes,
  listSyllabusTopics,
  recentStudySessions,
  recentTestsForUser,
  toProfileShape,
  userHandlesById,
} from "../lib/prep-stats";
import { addDays, safeTimeZone, startOfDay, startOfWeek } from "../lib/utils";

const router: IRouter = Router();
router.use(requireAuth);

function greetingFor(handle: string): string {
  const hour = new Date().getHours();
  const part = hour < 5 ? "Late night" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return `${part}, ${handle}`;
}

router.get("/dashboard", async (req, res) => {
  const userId = req.userId;
  const timeZone = safeTimeZone(req.query.tz);

  const [userRows, profileRows, coverage, recentSessions, activity, streak, todayMinutes, weekStart, weekEnd] =
    await Promise.all([
      db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1),
      db.select().from(profilesTable).where(eq(profilesTable.userId, userId)).limit(1),
      coverageForUser(userId),
      recentStudySessions(userId, 6),
      activityForDays(userId, 7, timeZone),
      computeStreak(userId, timeZone),
      dailyMinutes(userId, new Date(), timeZone),
      Promise.resolve(startOfWeek()),
      Promise.resolve(addDays(startOfWeek(), 7)),
    ]);

  const user = userRows[0];
  const profile = profileRows[0];
  if (!user || !profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const weekMinutesRows = await db
    .select({ minutes: studySessionsTable.minutes })
    .from(studySessionsTable)
    .where(and(eq(studySessionsTable.userId, userId), gte(studySessionsTable.createdAt, weekStart), lt(studySessionsTable.createdAt, weekEnd)));
  const weeklyMinutes = weekMinutesRows.reduce((sum, row) => sum + row.minutes, 0);

  const testRows = await recentTestsForUser(userId, 8);
  const testTrend = testRows.slice().reverse().map((test) => test.accuracy);

  const weakTopics = (await listSyllabusTopics(userId))
    .filter((topic) => topic.accuracy > 0 && topic.accuracy < 60)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 4)
    .map((topic) => topic.name);

  const examDate = profile.examDate ?? new Date(profile.targetYear, 0, 24);
  const today = startOfDay(new Date());
  const examStart = startOfDay(examDate);
  const daysLeft = Math.max(0, Math.round((examStart.getTime() - today.getTime()) / 86_400_000));

  res.json(
    GetDashboardResponse.parse({
      greeting: greetingFor(user.handle),
      examLabel: profile.examTrack === "jee_main" ? "JEE Main" : "NEET",
      targetYear: profile.targetYear,
      daysLeft,
      streak,
      todayMinutes,
      todayGoalMinutes: profile.dailyGoalMinutes,
      weeklyMinutes,
      weeklyGoalMinutes: profile.weeklyGoalMinutes,
      syllabusPercent: coverage.syllabusPercent,
      masteredTopics: coverage.masteredTopics,
      totalTopics: coverage.totalTopics,
      weakTopics,
      recentSessions: recentSessions.map((session) => ({
        id: session.id,
        subject: session.subject,
        minutes: session.minutes,
        source: session.source as "manual" | "timer",
        createdAt: session.createdAt,
      })),
      testTrend,
      subjectProgress: coverage.bySubject,
      activity7d: activity,
    }),
  );
});

router.get("/topics", async (req, res) => {
  const topics = await listSyllabusTopics(req.userId);
  res.json(ListTopicsResponse.parse(topics));
});

router.patch("/topics/:topicId/progress", async (req, res) => {
  const params = UpdateTopicProgressParams.parse(req.params);
  const body = UpdateTopicProgressBody.parse(req.body);

  const topicRows = await db.select().from(topicsTable).where(eq(topicsTable.id, params.topicId)).limit(1);
  const topic = topicRows[0];
  if (!topic) {
    res.status(404).json({ error: "Topic not found" });
    return;
  }

  const topics = await listSyllabusTopics(req.userId);
  const current = topics.find((entry) => entry.id === params.topicId);
  if (current?.locked && body.status !== "not_started") {
    res.status(400).json({ error: `"${topic.name}" is locked until its prerequisites are practiced` });
    return;
  }

  const existing = await db
    .select()
    .from(topicProgressTable)
    .where(and(eq(topicProgressTable.userId, req.userId), eq(topicProgressTable.topicId, params.topicId)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(topicProgressTable)
      .set({ status: body.status, updatedAt: new Date() })
      .where(and(eq(topicProgressTable.userId, req.userId), eq(topicProgressTable.topicId, params.topicId)));
  } else {
    await db
      .insert(topicProgressTable)
      .values({ userId: req.userId, topicId: params.topicId, status: body.status });
  }

  const updated = (await listSyllabusTopics(req.userId)).find((entry) => entry.id === params.topicId);
  if (!updated) {
    res.status(404).json({ error: "Topic not found" });
    return;
  }
  res.json(UpdateTopicProgressResponse.parse(updated));
});

router.get("/syllabus/summary", async (req, res) => {
  const coverage = await coverageForUser(req.userId);
  res.json(GetSyllabusSummaryResponse.parse(coverage));
});

router.get("/tests", async (req, res) => {
  const rows = await db
    .select()
    .from(testAttemptsTable)
    .where(eq(testAttemptsTable.userId, req.userId))
    .orderBy(desc(testAttemptsTable.date));
  res.json(
    ListTestAttemptsResponse.parse(
      rows.map((test) => ({
        id: test.id,
        name: test.name,
        exam: test.exam as "jee_main" | "neet",
        subject: test.subject,
        date: test.date,
        score: test.score,
        maxScore: test.maxScore,
        accuracy: test.accuracy,
        attempted: test.attempted,
        totalQuestions: test.totalQuestions,
        timeMinutes: test.timeMinutes,
        negativeMarksLost: test.negativeMarksLost,
        weakAreas: test.weakAreas,
      })),
    ),
  );
});

router.post("/tests", async (req, res) => {
  const body = CreateTestAttemptBody.parse(req.body);
  const accuracy = body.maxScore > 0 ? Math.min(100, Math.round((body.score / body.maxScore) * 100)) : 0;

  const topicRows = await listSyllabusTopics(req.userId);
  const weakAreas = topicRows
    .filter((topic) => topic.accuracy > 0 && topic.accuracy < 60)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 2)
    .map((topic) => topic.name);

  const inserted = (
    await db
      .insert(testAttemptsTable)
      .values({
        userId: req.userId,
        name: body.name,
        exam: body.exam,
        subject: body.subject ?? null,
        score: body.score,
        maxScore: body.maxScore,
        accuracy,
        attempted: body.attempted,
        totalQuestions: body.totalQuestions,
        timeMinutes: body.timeMinutes,
        negativeMarksLost: body.negativeMarksLost,
        weakAreas,
      })
      .returning()
  )[0];

  res.status(201).json(
    CreateTestAttemptResponse.parse({
      id: inserted.id,
      name: inserted.name,
      exam: inserted.exam as "jee_main" | "neet",
      subject: inserted.subject,
      date: inserted.date,
      score: inserted.score,
      maxScore: inserted.maxScore,
      accuracy: inserted.accuracy,
      attempted: inserted.attempted,
      totalQuestions: inserted.totalQuestions,
      timeMinutes: inserted.timeMinutes,
      negativeMarksLost: inserted.negativeMarksLost,
      weakAreas: inserted.weakAreas,
    }),
  );
});

router.get("/tests/analyze", async (req, res) => {
  const rows = await db
    .select()
    .from(testAttemptsTable)
    .where(eq(testAttemptsTable.userId, req.userId))
    .orderBy(desc(testAttemptsTable.date));

  const trend = rows.slice().reverse().map((test) => ({ date: test.date, name: test.name, accuracy: test.accuracy }));

  const subjectMap = new Map<string, { sum: number; count: number }>();
  for (const test of rows) {
    const key = test.subject ?? "Full syllabus";
    const entry = subjectMap.get(key) ?? { sum: 0, count: 0 };
    entry.sum += test.accuracy;
    entry.count += 1;
    subjectMap.set(key, entry);
  }
  const subjectAverages = Array.from(subjectMap.entries()).map(([subject, entry]) => ({
    subject,
    averageAccuracy: Math.round(entry.sum / entry.count),
    attempts: entry.count,
  }));

  const weakMap = new Map<string, number>();
  for (const test of rows) {
    for (const area of test.weakAreas) weakMap.set(area, (weakMap.get(area) ?? 0) + 1);
  }
  const weakAreas = Array.from(weakMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  res.json(
    AnalyzeTestAttemptsResponse.parse({
      totalAttempts: rows.length,
      averageAccuracy: rows.length ? Math.round(rows.reduce((sum, test) => sum + test.accuracy, 0) / rows.length) : 0,
      bestAccuracy: rows.length ? Math.max(...rows.map((test) => test.accuracy)) : 0,
      trend,
      subjectAverages,
      weakAreas,
    }),
  );
});

router.get("/study-sessions", async (req, res) => {
  const rows = await db
    .select()
    .from(studySessionsTable)
    .where(eq(studySessionsTable.userId, req.userId))
    .orderBy(desc(studySessionsTable.createdAt))
    .limit(100);
  res.json(
    ListStudySessionsResponse.parse(
      rows.map((session) => ({
        id: session.id,
        subject: session.subject,
        minutes: session.minutes,
        source: session.source as "manual" | "timer",
        createdAt: session.createdAt,
      })),
    ),
  );
});

router.post("/study-sessions", async (req, res) => {
  const body = CreateStudySessionBody.parse(req.body);
  const inserted = (
    await db
      .insert(studySessionsTable)
      .values({ userId: req.userId, subject: body.subject, minutes: body.minutes, source: body.source })
      .returning()
  )[0];
  res.status(201).json(
    CreateStudySessionResponse.parse({
      id: inserted.id,
      subject: inserted.subject,
      minutes: inserted.minutes,
      source: inserted.source as "manual" | "timer",
      createdAt: inserted.createdAt,
    }),
  );
});

router.get("/profile", async (req, res) => {
  const profile = await toProfileShape(req.userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(GetProfileResponse.parse(profile));
});

router.patch("/profile", async (req, res) => {
  const body = UpdateProfileBody.parse(req.body);

  const current = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, req.userId))
    .limit(1);
  if (!current[0]) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.handle !== undefined) {
    await db.update(usersTable).set({ handle: body.handle }).where(eq(usersTable.id, req.userId));
  }
  if (body.examTrack !== undefined) updates.examTrack = body.examTrack;
  if (body.stage !== undefined) updates.stage = body.stage;
  if (body.targetYear !== undefined) updates.targetYear = body.targetYear;
  if (body.examDate !== undefined) updates.examDate = body.examDate;
  if (body.dailyGoalMinutes !== undefined) updates.dailyGoalMinutes = body.dailyGoalMinutes;
  if (body.weeklyGoalMinutes !== undefined) updates.weeklyGoalMinutes = body.weeklyGoalMinutes;
  if (body.focusMode !== undefined) updates.focusMode = body.focusMode;
  if (body.showOnLeaderboard !== undefined) updates.showOnLeaderboard = body.showOnLeaderboard;
  if (body.guardianConsentStatus !== undefined) updates.guardianConsentStatus = body.guardianConsentStatus;

  await db.update(profilesTable).set(updates).where(eq(profilesTable.userId, req.userId));

  const profile = await toProfileShape(req.userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(UpdateProfileResponse.parse(profile));
});

// ---------------------------------------------------------------------------
// Account data portability and deletion (authenticated user only)
// ---------------------------------------------------------------------------

router.get("/me/export", async (req, res) => {
  const userId = req.userId;
  const profile = await toProfileShape(userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const [topics, cards, studySessions, focusSessions, testAttempts, tasks, ownedGroups, memberships, connections] =
    await Promise.all([
      listSyllabusTopics(userId),
      db.select().from(cardsTable).where(eq(cardsTable.userId, userId)),
      db.select().from(studySessionsTable).where(eq(studySessionsTable.userId, userId)),
      db.select().from(focusSessionsTable).where(eq(focusSessionsTable.userId, userId)),
      db.select().from(testAttemptsTable).where(eq(testAttemptsTable.userId, userId)),
      db.select().from(tasksTable).where(eq(tasksTable.userId, userId)),
      db.select().from(groupsTable).where(eq(groupsTable.ownerId, userId)),
      db.select().from(groupMembersTable).where(eq(groupMembersTable.userId, userId)),
      db.select().from(circleConnectionsTable).where(eq(circleConnectionsTable.userId, userId)),
    ]);

  const memberRowsByGroup = await Promise.all(
    ownedGroups.map((group) => db.select({ id: groupMembersTable.userId }).from(groupMembersTable).where(eq(groupMembersTable.groupId, group.id))),
  );

  const groupNames = new Map(
    (await db.select({ id: groupsTable.id, name: groupsTable.name }).from(groupsTable).where(inArray(groupsTable.id, memberships.map((row) => row.groupId))))
      .map((row) => [row.id, row.name]),
  );
  const handleById = await userHandlesById(connections.map((row) => row.connectionId));

  res.json(
    ExportMyDataResponse.parse({
      exportedAt: new Date(),
      profile,
      topics,
      cards: cards.map((card) => ({
        id: card.id,
        front: card.front,
        back: card.back,
        subject: card.subject,
        interval: card.interval,
        ease: card.ease,
        reps: card.reps,
        due: card.due,
        lastReviewed: card.lastReviewed,
        createdAt: card.createdAt,
      })),
      studySessions: studySessions.map((session) => ({
        id: session.id,
        subject: session.subject,
        minutes: session.minutes,
        source: session.source as "manual" | "timer",
        createdAt: session.createdAt,
      })),
      focusSessions: focusSessions.map((session) => ({
        id: session.id,
        subject: session.subject,
        plannedMinutes: session.plannedMinutes,
        actualMinutes: session.actualMinutes,
        status: session.status as "active" | "completed",
        startedAt: session.startedAt,
        endedAt: session.endedAt,
      })),
      testAttempts: testAttempts.map((test) => ({
        id: test.id,
        name: test.name,
        exam: test.exam as "jee_main" | "neet",
        subject: test.subject,
        score: test.score,
        maxScore: test.maxScore,
        attempted: test.attempted,
        totalQuestions: test.totalQuestions,
        timeMinutes: test.timeMinutes,
        negativeMarksLost: test.negativeMarksLost,
        accuracy: test.accuracy,
        date: test.date,
      })),
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        subject: task.subject,
        status: task.status as "todo" | "in_progress" | "done",
        createdAt: task.createdAt,
        completedAt: task.completedAt,
      })),
      ownedGroups: ownedGroups.map((group, index) => ({
        id: group.id,
        name: group.name,
        inviteCode: group.inviteCode,
        isDiscoverable: group.isDiscoverable,
        memberCount: memberRowsByGroup[index].length,
        createdAt: group.createdAt,
      })),
      groupMemberships: memberships.map((row) => ({
        groupId: row.groupId,
        groupName: groupNames.get(row.groupId) ?? "unknown",
        role: row.role,
        joinedAt: row.joinedAt,
      })),
      connections: connections.map((row) => ({
        userId: row.connectionId,
        handle: handleById.get(row.connectionId)?.handle ?? "unknown",
        connectedAt: row.createdAt,
      })),
    }),
  );
});

router.delete("/me", async (req, res) => {
  await db.transaction(async (tx) => {
    await tx.delete(usersTable).where(eq(usersTable.id, req.userId));
  });
  clearSessionCookie(res);
  res.status(204).end();
});

export default router;