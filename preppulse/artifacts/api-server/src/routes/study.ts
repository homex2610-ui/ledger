import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { focusSessionsTable, profilesTable, studySessionsTable, tasksTable } from "@workspace/db/schema";
import {
  CreateFocusSessionBody,
  CreateFocusSessionResponse,
  CreateTaskBody,
  CreateTaskResponse,
  DeleteTaskParams,
  ListFocusSessionsResponse,
  ListTasksResponse,
  UpdateFocusSessionBody,
  UpdateFocusSessionParams,
  UpdateFocusSessionResponse,
  UpdateTaskBody,
  UpdateTaskParams,
  UpdateTaskResponse,
} from "@workspace/api-zod";
import { subjectAllowedForTrack } from "@workspace/exam-config";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();
router.use(requireAuth);

function toFocusShape(session: typeof focusSessionsTable.$inferSelect) {
  return {
    id: session.id,
    subject: session.subject,
    plannedMinutes: session.plannedMinutes,
    actualMinutes: session.actualMinutes,
    status: session.status as "active" | "completed" | "abandoned",
    taskId: session.taskId,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
  };
}

function toTaskShape(task: typeof tasksTable.$inferSelect) {
  return {
    id: task.id,
    title: task.title,
    subject: task.subject,
    status: task.status as "todo" | "in_progress" | "done",
    createdAt: task.createdAt,
    completedAt: task.completedAt,
  };
}

router.get("/focus-sessions", async (req, res) => {
  const rows = await db
    .select()
    .from(focusSessionsTable)
    .where(eq(focusSessionsTable.userId, req.userId))
    .orderBy(desc(focusSessionsTable.startedAt))
    .limit(100);
  res.json(ListFocusSessionsResponse.parse(rows.map(toFocusShape)));
});

router.post("/focus-sessions", async (req, res) => {
  const body = CreateFocusSessionBody.parse(req.body);

  if (body.taskId) {
    const owned = await db
      .select({ id: tasksTable.id })
      .from(tasksTable)
      .where(and(eq(tasksTable.id, body.taskId), eq(tasksTable.userId, req.userId)))
      .limit(1);
    if (!owned[0]) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    await db.update(tasksTable).set({ status: "in_progress" }).where(eq(tasksTable.id, body.taskId));
  }

  const inserted = (
    await db
      .insert(focusSessionsTable)
      .values({ userId: req.userId, subject: body.subject, plannedMinutes: body.plannedMinutes, taskId: body.taskId ?? null })
      .returning()
  )[0];

  res.status(201).json(CreateFocusSessionResponse.parse(toFocusShape(inserted)));
});

router.patch("/focus-sessions/:focusSessionId", async (req, res) => {
  const params = UpdateFocusSessionParams.parse(req.params);

  const existing = await db
    .select()
    .from(focusSessionsTable)
    .where(and(eq(focusSessionsTable.id, params.focusSessionId), eq(focusSessionsTable.userId, req.userId)))
    .limit(1);
  if (!existing[0]) {
    res.status(404).json({ error: "Focus session not found" });
    return;
  }

  const body = UpdateFocusSessionBody.parse(req.body);

  if (existing[0].status !== "active") {
    res.status(400).json({ error: "This focus session is already finished" });
    return;
  }

  const updated = (
    await db
      .update(focusSessionsTable)
      .set({ status: body.status, actualMinutes: body.actualMinutes, endedAt: new Date() })
      .where(and(eq(focusSessionsTable.id, params.focusSessionId), eq(focusSessionsTable.userId, req.userId)))
      .returning()
  )[0];

  if (updated.taskId && body.status === "completed") {
    await db.update(tasksTable).set({ status: "done", completedAt: new Date() }).where(eq(tasksTable.id, updated.taskId));
  }

  if (body.status === "completed") {
    await db.insert(studySessionsTable).values({
      userId: req.userId,
      subject: updated.subject,
      minutes: updated.actualMinutes ?? updated.plannedMinutes,
      source: "timer",
    });
  }

  res.json(UpdateFocusSessionResponse.parse(toFocusShape(updated)));
});

router.get("/tasks", async (req, res) => {
  const rows = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.userId, req.userId))
    .orderBy(desc(tasksTable.createdAt));
  res.json(ListTasksResponse.parse(rows.map(toTaskShape)));
});

router.post("/tasks", async (req, res) => {
  const body = CreateTaskBody.parse(req.body);
  const profileRows = await db.select({ examTrack: profilesTable.examTrack }).from(profilesTable).where(eq(profilesTable.userId, req.userId)).limit(1);
  if (!subjectAllowedForTrack(profileRows[0]?.examTrack, body.subject ?? "Mixed revision", ["Mixed revision"])) {
    res.status(400).json({ error: "This subject is not part of your prep track", code: "subject_not_in_track" });
    return;
  }
  const inserted = (
    await db
      .insert(tasksTable)
      .values({ userId: req.userId, title: body.title, subject: body.subject ?? "Mixed revision" })
      .returning()
  )[0];
  res.status(201).json(CreateTaskResponse.parse(toTaskShape(inserted)));
});

router.patch("/tasks/:taskId", async (req, res) => {
  const params = UpdateTaskParams.parse(req.params);
  const body = UpdateTaskBody.parse(req.body);

  const existing = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, params.taskId), eq(tasksTable.userId, req.userId)))
    .limit(1);
  if (!existing[0]) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const next: Record<string, unknown> = {};
  if (body.title !== undefined) next.title = body.title;
  if (body.subject !== undefined) {
    const profileRows = await db.select({ examTrack: profilesTable.examTrack }).from(profilesTable).where(eq(profilesTable.userId, req.userId)).limit(1);
    if (!subjectAllowedForTrack(profileRows[0]?.examTrack, body.subject, ["Mixed revision"])) {
      res.status(400).json({ error: "This subject is not part of your prep track", code: "subject_not_in_track" });
      return;
    }
    next.subject = body.subject;
  }
  if (body.status !== undefined) {
    next.status = body.status;
    next.completedAt = body.status === "done" ? new Date() : null;
  }

  const updated = (
    await db.update(tasksTable).set(next).where(and(eq(tasksTable.id, params.taskId), eq(tasksTable.userId, req.userId))).returning()
  )[0];
  res.json(UpdateTaskResponse.parse(toTaskShape(updated)));
});

router.delete("/tasks/:taskId", async (req, res) => {
  const params = DeleteTaskParams.parse(req.params);
  const existing = await db
    .select({ id: tasksTable.id })
    .from(tasksTable)
    .where(and(eq(tasksTable.id, params.taskId), eq(tasksTable.userId, req.userId)))
    .limit(1);
  if (!existing[0]) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  await db.delete(tasksTable).where(and(eq(tasksTable.id, params.taskId), eq(tasksTable.userId, req.userId)));
  res.status(204).end();
});

export default router;