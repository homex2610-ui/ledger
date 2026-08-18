import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const weeklyPeriodsTable = pgTable(
  "weekly_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scopeType: text("scope_type").notNull(),
    scopeId: uuid("scope_id").notNull(),
    weekStart: timestamp("week_start", { withTimezone: true }).notNull(),
    weekEnd: timestamp("week_end", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("open"),
    timezone: text("timezone").notNull().default("UTC"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("weekly_periods_scope_week_unique").on(table.scopeType, table.scopeId, table.weekStart),
    index("weekly_periods_scope_status_idx").on(table.scopeType, table.scopeId, table.status),
  ],
);

export const weeklyRankSnapshotsTable = pgTable(
  "weekly_rank_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    periodId: uuid("period_id")
      .notNull()
      .references(() => weeklyPeriodsTable.id, { onDelete: "cascade" }),
    scopeType: text("scope_type").notNull(),
    scopeId: uuid("scope_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    weekStart: timestamp("week_start", { withTimezone: true }).notNull(),
    rank: integer("rank").notNull(),
    pulse: integer("pulse").notNull(),
    minutes: integer("minutes").notNull(),
    topicsMoved: integer("topics_moved").notNull(),
    excluded: boolean("excluded").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("weekly_rank_snapshots_period_user_unique").on(table.periodId, table.userId),
    index("weekly_rank_snapshots_scope_week_rank_idx").on(table.scopeId, table.weekStart, table.rank),
    index("weekly_rank_snapshots_user_week_idx").on(table.userId, table.weekStart),
  ],
);

export type WeeklyPeriod = typeof weeklyPeriodsTable.$inferSelect;
export type NewWeeklyPeriod = typeof weeklyPeriodsTable.$inferInsert;
export type WeeklyRankSnapshot = typeof weeklyRankSnapshotsTable.$inferSelect;
export type NewWeeklyRankSnapshot = typeof weeklyRankSnapshotsTable.$inferInsert;