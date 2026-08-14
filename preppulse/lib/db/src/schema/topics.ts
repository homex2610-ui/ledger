import { integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const topicsTable = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examTrack: text("exam_track").notNull().default("jee_main"),
    subject: text("subject").notNull(),
    chapter: text("chapter").notNull(),
    name: text("name").notNull(),
    weightage: text("weightage").notNull().default("medium"),
    sortOrder: integer("sort_order").notNull().default(0),
    prerequisites: text("prerequisites").array().notNull().default([]),
  },
  (table) => [
    uniqueIndex("topics_subject_chapter_name_unique").on(table.examTrack, table.subject, table.chapter, table.name),
  ],
);

export const topicProgressTable = pgTable(
  "topic_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topicsTable.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("not_started"),
    accuracy: integer("accuracy").notNull().default(0),
    questionCount: integer("question_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.topicId] })],
);

export type Topic = typeof topicsTable.$inferSelect;
export type NewTopic = typeof topicsTable.$inferInsert;
export type TopicProgress = typeof topicProgressTable.$inferSelect;
export type NewTopicProgress = typeof topicProgressTable.$inferInsert;
