CREATE TABLE "cohort_members" (
	"cohort_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cohort_members_cohort_id_user_id_pk" PRIMARY KEY("cohort_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "cohorts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cohort_members" ADD CONSTRAINT "cohort_members_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohort_members" ADD CONSTRAINT "cohort_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cohort_members_user_idx" ON "cohort_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cohort_members_cohort_idx" ON "cohort_members" USING btree ("cohort_id");
--> statement-breakpoint
-- Backfill: place every existing user into the first cohort (16 users < 25-cap, so one cohort).
INSERT INTO "cohorts" ("created_at") VALUES (now());
--> statement-breakpoint
INSERT INTO "cohort_members" ("cohort_id", "user_id")
SELECT (SELECT "id" FROM "cohorts" ORDER BY "created_at" ASC LIMIT 1), "id" FROM "users";
--> statement-breakpoint
-- Cleanup: drop the abandoned "study circles" experiment tables (empty, unreferenced by code).
DROP TABLE IF EXISTS "circle_members";
--> statement-breakpoint
DROP TABLE IF EXISTS "study_circles";