import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  circleConnectionsTable,
  cohortMembersTable,
  groupMembersTable,
  groupsTable,
  profilesTable,
  studySessionsTable,
  testAttemptsTable,
  topicProgressTable,
  topicsTable,
  usersTable,
} from "@workspace/db/schema";
import { startOfDay, startOfWeek, dayKeyIn, startOfDayIn } from "./utils.js";
import type { TopicStatus } from "@workspace/exam-config";

export const STATUS_WEIGHT: Record<string, number> = {
  not_started: 0,
  learning: 1,
  practiced: 2,
  revised: 3,
  mastered: 4,
};

export const WEIGHTAGE_VALUE: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export async function listSyllabusTopics(userId: string) {
  const [profileRows, progressRows] = await Promise.all([
    db.select({ examTrack: profilesTable.examTrack }).from(profilesTable).where(eq(profilesTable.userId, userId)).limit(1),
    db.select().from(topicProgressTable).where(eq(topicProgressTable.userId, userId)),
  ]);
  const track = profileRows[0]?.examTrack ?? "jee_main";
  const progressByTopic = new Map(progressRows.map((row) => [row.topicId, row]));

  const catalog = await db
    .select()
    .from(topicsTable)
    .where(eq(topicsTable.examTrack, track))
    .orderBy(asc(topicsTable.sortOrder));

  return catalog.map((topic) => {
    const progress = progressByTopic.get(topic.id);
    return {
      id: topic.id,
      subject: topic.subject,
      chapter: topic.chapter,
      name: topic.name,
      status: (progress?.status ?? "not_started") as TopicStatus,
      weightage: topic.weightage as "high" | "medium" | "low",
      accuracy: progress?.accuracy ?? 0,
      questionCount: progress?.questionCount ?? 0,
      prerequisites: topic.prerequisites,
      locked: false,
    };
  });
}

export async function coverageForUser(userId: string) {
  const topics = await listSyllabusTopics(userId);
  const bySubject = new Map<string, { subject: string; total: number; mastered: number; weightageSum: number; weightageDone: number }>();
  let masteredTopics = 0;
  let inProgressTopics = 0;
  let totalTopics = topics.length;

  for (const topic of topics) {
    const entry = bySubject.get(topic.subject) ?? {
      subject: topic.subject,
      total: 0,
      mastered: 0,
      weightageSum: 0,
      weightageDone: 0,
    };
    entry.total += 1;
    entry.weightageSum += WEIGHTAGE_VALUE[topic.weightage] ?? 1;
    if (topic.status === "mastered") {
      entry.mastered += 1;
      entry.weightageDone += WEIGHTAGE_VALUE[topic.weightage] ?? 1;
      masteredTopics += 1;
    } else if (topic.status !== "not_started" && topic.status !== "revised") {
      inProgressTopics += 1;
    }
    bySubject.set(topic.subject, entry);
  }

  const subjectProgress = Array.from(bySubject.values()).map((entry) => ({
    subject: entry.subject,
    total: entry.total,
    mastered: entry.mastered,
    percent: entry.total ? Math.round((entry.mastered / entry.total) * 100) : 0,
    weightagePercent: entry.weightageSum ? Math.round((entry.weightageDone / entry.weightageSum) * 100) : 0,
  }));

  const totalWeightageSum = subjectProgress.reduce((sum, entry) => sum + (bySubject.get(entry.subject)?.weightageSum ?? 0), 0);
  const totalWeightageDone = subjectProgress.reduce((sum, entry) => sum + (bySubject.get(entry.subject)?.weightageDone ?? 0), 0);

  return {
    totalTopics,
    masteredTopics,
    inProgressTopics,
    syllabusPercent: totalTopics ? Math.round((masteredTopics / totalTopics) * 100) : 0,
    weightagePercent: totalWeightageSum ? Math.round((totalWeightageDone / totalWeightageSum) * 100) : 0,
    bySubject: subjectProgress,
  };
}

export async function recentStudySessions(userId: string, limit = 6) {
  return db
    .select()
    .from(studySessionsTable)
    .where(eq(studySessionsTable.userId, userId))
    .orderBy(desc(studySessionsTable.createdAt))
    .limit(limit);
}

export async function studyMinutesBetween(userId: string, from: Date, to: Date): Promise<number> {
  const rows = await db
    .select({ minutes: studySessionsTable.minutes })
    .from(studySessionsTable)
    .where(
      and(
        eq(studySessionsTable.userId, userId),
        gte(studySessionsTable.createdAt, from),
        lt(studySessionsTable.createdAt, to),
      ),
    );
  return rows.reduce((sum, row) => sum + row.minutes, 0);
}

export async function dailyMinutes(userId: string, day: Date, timeZone?: string): Promise<number> {
  const from = timeZone ? startOfDayIn(day, timeZone) : startOfDay(day);
  const to = new Date(from);
  to.setDate(from.getDate() + 1);
  return studyMinutesBetween(userId, from, to);
}

export async function activityForDays(userId: string, days: number, timeZone?: string) {
  const out: Array<{ day: string; minutes: number }> = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    out.push({ day: dayKeyIn(day, timeZone), minutes: await dailyMinutes(userId, day, timeZone) });
  }
  return out;
}

export async function computeStreak(userId: string, timeZone?: string): Promise<number> {
  const rows = await db
    .select({ createdAt: studySessionsTable.createdAt })
    .from(studySessionsTable)
    .where(eq(studySessionsTable.userId, userId))
    .orderBy(desc(studySessionsTable.createdAt));
  const days = new Set(rows.map((row) => dayKeyIn(row.createdAt, timeZone)));
  if (days.size === 0) return 0;
  const today = dayKeyIn(new Date(), timeZone);
  if (!days.has(today)) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (!days.has(dayKeyIn(yesterday, timeZone))) return 0;
  }
  let streak = 0;
  const cursor = new Date();
  while (days.has(dayKeyIn(cursor, timeZone))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function weeklyTopics(userId: string): Promise<number> {
  const weekStart = startOfWeek();
  const rows = await db
    .select({ updatedAt: topicProgressTable.updatedAt })
    .from(topicProgressTable)
    .where(and(eq(topicProgressTable.userId, userId), gte(topicProgressTable.updatedAt, weekStart)));
  return rows.length;
}

export async function getProfileRow(userId: string) {
  const [user, profile] = await Promise.all([
    db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1),
    db.select().from(profilesTable).where(eq(profilesTable.userId, userId)).limit(1),
  ]);
  if (!user[0] || !profile[0]) return null;
  return { user: user[0], profile: profile[0] };
}

export async function toProfileShape(userId: string) {
  const row = await getProfileRow(userId);
  if (!row) return null;
  const { user, profile } = row;
  return {
    handle: user.handle,
    email: user.email,
    avatarUrl: user.avatarUrl,
    examTrack: profile.examTrack as "jee_main" | "neet",
    stage: profile.stage as "class_11" | "class_12" | "dropper",
    targetYear: profile.targetYear,
    examDate: profile.examDate,
    dailyGoalMinutes: profile.dailyGoalMinutes,
    weeklyGoalMinutes: profile.weeklyGoalMinutes,
    focusMode: profile.focusMode,
    showOnLeaderboard: profile.showOnLeaderboard,
    isAdmin: profile.isAdmin,
    profileCode: profile.profileCode,
  };
}

// ---------------------------------------------------------------------------
// Circle + group pulse helpers (minutes + topics moved over the current week)
// ---------------------------------------------------------------------------

export async function weeklyPulseForUsers(
  userIds: string[],
  window?: { from: Date; to: Date },
) {
  const weekStart = window?.from ?? startOfWeek();
  const weekEnd = window?.to ?? new Date(weekStart.getTime() + 7 * 86_400_000);

  const sessionRows = await db
    .select({
      userId: studySessionsTable.userId,
      minutes: studySessionsTable.minutes,
    })
    .from(studySessionsTable)
    .where(and(inArray(studySessionsTable.userId, userIds), gte(studySessionsTable.createdAt, weekStart), lt(studySessionsTable.createdAt, weekEnd)));

  const topicRows = await db
    .select({ userId: topicProgressTable.userId })
    .from(topicProgressTable)
    .where(and(inArray(topicProgressTable.userId, userIds), gte(topicProgressTable.updatedAt, weekStart)));

  const minutesByUser = new Map<string, number>();
  const topicsByUser = new Map<string, number>();
  for (const row of sessionRows) minutesByUser.set(row.userId, (minutesByUser.get(row.userId) ?? 0) + row.minutes);
  for (const row of topicRows) topicsByUser.set(row.userId, (topicsByUser.get(row.userId) ?? 0) + 1);

  return { minutesByUser, topicsByUser };
}

export async function connectionUserIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ connectionId: circleConnectionsTable.connectionId })
    .from(circleConnectionsTable)
    .where(eq(circleConnectionsTable.userId, userId));
  return rows.map((row) => row.connectionId);
}

export async function groupUserIds(groupId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: groupMembersTable.userId })
    .from(groupMembersTable)
    .where(eq(groupMembersTable.groupId, groupId));
  return rows.map((row) => row.userId);
}

export async function cohortUserIdsFor(userId: string): Promise<string[] | null> {
  const membership = await db
    .select({ cohortId: cohortMembersTable.cohortId })
    .from(cohortMembersTable)
    .where(eq(cohortMembersTable.userId, userId))
    .limit(1);
  if (!membership[0]) return null;
  const rows = await db
    .select({ userId: cohortMembersTable.userId })
    .from(cohortMembersTable)
    .where(eq(cohortMembersTable.cohortId, membership[0].cohortId));
  return rows.map((row) => row.userId);
}

export async function isGroupMember(groupId: string, userId: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(groupMembersTable)
    .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

export async function myGroupRole(groupId: string, userId: string): Promise<"owner" | "member" | null> {
  const groupRows = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
  const group = groupRows[0];
  if (!group) return null;
  if (group.ownerId === userId) return "owner";
  const membership = await db
    .select()
    .from(groupMembersTable)
    .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)))
    .limit(1);
  return membership[0] ? "member" : null;
}

export async function userHandlesById(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, { handle: string; initials: string; avatarUrl: string | null }>();
  const rows = await db
    .select({ id: usersTable.id, handle: usersTable.handle, avatarUrl: usersTable.avatarUrl })
    .from(usersTable)
    .where(inArray(usersTable.id, userIds));
  return new Map(
    rows.map((row) => [
      row.id,
      {
        handle: row.handle,
        avatarUrl: row.avatarUrl,
        initials: row.handle
          .split(/[^a-zA-Z0-9]+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0].toUpperCase())
          .join("") || "??",
      },
    ]),
  );
}

export async function recentTestsForUser(userId: string, limit: number) {
  return db
    .select()
    .from(testAttemptsTable)
    .where(eq(testAttemptsTable.userId, userId))
    .orderBy(desc(testAttemptsTable.date))
    .limit(limit);
}