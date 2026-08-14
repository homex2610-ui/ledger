import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const testAttemptsTable = pgTable(
  "test_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    exam: text("exam").notNull().default("jee_main"),
    subject: text("subject"),
    subjectScores: jsonb("subject_scores").$type<Record<string, number> | null>(),
    date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
    score: integer("score").notNull(),
    maxScore: integer("maxScore").notNull(),
    accuracy: integer("accuracy").notNull(),
    attempted: integer("attempted").notNull(),
    totalQuestions: integer("total_questions").notNull(),
    timeMinutes: integer("time_minutes").notNull(),
    negativeMarksLost: integer("negative_marks_lost").notNull().default(0),
    weakAreas: text("weak_areas").array().notNull().default([]),
  },
  (table) => [index("test_attempts_user_date_idx").on(table.userId, table.date)],
);

export type TestAttempt = typeof testAttemptsTable.$inferSelect;
export type NewTestAttempt = typeof testAttemptsTable.$inferInsert;
