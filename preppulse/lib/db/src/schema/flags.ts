import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const featureFlagsTable = pgTable("feature_flags", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  description: text("description"),
  updatedBy: uuid("updated_by").references(() => usersTable.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type FeatureFlag = typeof featureFlagsTable.$inferSelect;
export type NewFeatureFlag = typeof featureFlagsTable.$inferInsert;