import { date, doublePrecision, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const cardsTable = pgTable(
  "cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    subject: text("subject").notNull().default("General"),
    front: text("front").notNull(),
    back: text("back").notNull(),
    ease: doublePrecision("ease").notNull().default(2.5),
    interval: integer("interval").notNull().default(0),
    reps: integer("reps").notNull().default(0),
    due: date("due").notNull(),
    lastReviewed: date("last_reviewed"),
    missed: integer("missed").notNull().default(0),
    log: jsonb("log").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("cards_user_due_idx").on(table.userId, table.due)],
);

export type Card = typeof cardsTable.$inferSelect;
export type NewCard = typeof cardsTable.$inferInsert;