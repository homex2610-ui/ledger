import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const shareArtifactsTable = pgTable(
  "share_artifacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("daily_focus"),
    variant: text("variant").notNull().default("A"),
    visibility: text("visibility").notNull().default("public"),
    payload: jsonb("payload").notNull(),
    appVersion: text("app_version").notNull(),
    shareSchemaVersion: text("share_schema_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [index("share_artifacts_owner_created_idx").on(table.ownerId, table.createdAt)],
);

export const shareEventsTable = pgTable(
  "share_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    artifactId: uuid("artifact_id").references(() => shareArtifactsTable.id, { onDelete: "set null" }),
    ownerId: uuid("owner_id").references(() => usersTable.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => usersTable.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    meta: jsonb("meta"),
  },
  (table) => [index("share_events_type_created_idx").on(table.eventType, table.createdAt)],
);

export const referralAttributionsTable = pgTable(
  "referral_attributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inviterId: uuid("inviter_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    inviteeId: uuid("invitee_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    artifactId: uuid("artifact_id").references(() => shareArtifactsTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    d7At: timestamp("d7_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("referral_attributions_invitee_unique").on(table.inviteeId)],
);

export type ShareArtifact = typeof shareArtifactsTable.$inferSelect;
export type NewShareArtifact = typeof shareArtifactsTable.$inferInsert;
export type ShareEvent = typeof shareEventsTable.$inferSelect;
export type NewShareEvent = typeof shareEventsTable.$inferInsert;
export type ReferralAttribution = typeof referralAttributionsTable.$inferSelect;
export type NewReferralAttribution = typeof referralAttributionsTable.$inferInsert;