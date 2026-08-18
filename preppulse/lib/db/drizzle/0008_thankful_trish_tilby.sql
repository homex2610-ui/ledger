CREATE TABLE "leaderboard_exclusions" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"reason" text,
	"admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pulse_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reason" text,
	"admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "capacity" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "leaderboard_top_n" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "audience_type" text DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "audience_id" uuid;--> statement-breakpoint
ALTER TABLE "leaderboard_exclusions" ADD CONSTRAINT "leaderboard_exclusions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_exclusions" ADD CONSTRAINT "leaderboard_exclusions_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pulse_adjustments" ADD CONSTRAINT "pulse_adjustments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pulse_adjustments" ADD CONSTRAINT "pulse_adjustments_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pulse_adjustments_user_idx" ON "pulse_adjustments" USING btree ("user_id");