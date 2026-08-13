import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const studySessionsTable = pgTable(
  "study_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    minutes: integer("minutes").notNull(),
    source: text("source").notNull().default("timer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("study_sessions_user_created_idx").on(table.userId, table.createdAt)],
);

export const tasksTable = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    subject: text("subject").notNull().default("Mixed revision"),
    status: text("status").notNull().default("todo"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("tasks_user_idx").on(table.userId)],
);

export const focusSessionsTable = pgTable(
  "focus_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    plannedMinutes: integer("planned_minutes").notNull().default(25),
    actualMinutes: integer("actual_minutes").notNull().default(0),
    status: text("status").notNull().default("active"),
    taskId: uuid("task_id").references(() => tasksTable.id, { onDelete: "set null" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [index("focus_sessions_user_started_idx").on(table.userId, table.startedAt)],
);

export type StudySession = typeof studySessionsTable.$inferSelect;
export type NewStudySession = typeof studySessionsTable.$inferInsert;
export type Task = typeof tasksTable.$inferSelect;
export type NewTask = typeof tasksTable.$inferInsert;
export type FocusSession = typeof focusSessionsTable.$inferSelect;
export type NewFocusSession = typeof focusSessionsTable.$inferInsert;
