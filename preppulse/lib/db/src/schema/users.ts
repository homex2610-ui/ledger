import { boolean, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    handle: text("handle").notNull(),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const profilesTable = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    examTrack: text("exam_track").notNull().default("jee_main"),
    stage: text("stage").notNull().default("class_12"),
    targetYear: integer("target_year").notNull().default(2027),
    examDate: timestamp("exam_date", { withTimezone: true }),
    dailyGoalMinutes: integer("daily_goal_minutes").notNull().default(180),
    weeklyGoalMinutes: integer("weekly_goal_minutes").notNull().default(1200),
    focusMode: boolean("focus_mode").notNull().default(false),
    showOnLeaderboard: boolean("show_on_leaderboard").notNull().default(true),
    isAdmin: boolean("is_admin").notNull().default(false),
    profileCode: text("profile_code").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("profiles_user_id_unique").on(table.userId),
    uniqueIndex("profiles_profile_code_unique").on(table.profileCode),
  ],
);

export const authSessionsTable = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex("auth_sessions_token_hash_unique").on(table.tokenHash)],
);

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Profile = typeof profilesTable.$inferSelect;
export type NewProfile = typeof profilesTable.$inferInsert;
export type AuthSession = typeof authSessionsTable.$inferSelect;
export type NewAuthSession = typeof authSessionsTable.$inferInsert;
