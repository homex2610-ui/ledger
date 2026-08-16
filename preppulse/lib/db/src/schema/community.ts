import { sql } from "drizzle-orm";
import { boolean, check, index, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const circleConnectionsTable = pgTable(
  "circle_connections",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.connectionId] }),
    check("circle_connections_self_check", sql`${table.userId} <> ${table.connectionId}`),
  ],
);

export const groupsTable = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    examFocus: text("exam_focus"),
    subjectFocus: text("subject_focus").array().notNull().default([]),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    inviteCode: text("invite_code").notNull(),
    isDiscoverable: boolean("is_discoverable").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("groups_invite_code_unique").on(table.inviteCode)],
);

export const cohortsTable = pgTable("cohorts", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cohortMembersTable = pgTable(
  "cohort_members",
  {
    cohortId: uuid("cohort_id")
      .notNull()
      .references(() => cohortsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.cohortId, table.userId] }),
    index("cohort_members_user_idx").on(table.userId),
    index("cohort_members_cohort_idx").on(table.cohortId),
  ],
);

export const groupMembersTable = pgTable(
  "group_members",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groupsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.userId] }),
    index("group_members_user_idx").on(table.userId),
    index("group_members_group_idx").on(table.groupId),
  ],
);

export type CircleConnection = typeof circleConnectionsTable.$inferSelect;
export type NewCircleConnection = typeof circleConnectionsTable.$inferInsert;
export type Cohort = typeof cohortsTable.$inferSelect;
export type NewCohort = typeof cohortsTable.$inferInsert;
export type CohortMember = typeof cohortMembersTable.$inferSelect;
export type NewCohortMember = typeof cohortMembersTable.$inferInsert;
export type Group = typeof groupsTable.$inferSelect;
export type NewGroup = typeof groupsTable.$inferInsert;
export type GroupMember = typeof groupMembersTable.$inferSelect;
export type NewGroupMember = typeof groupMembersTable.$inferInsert;