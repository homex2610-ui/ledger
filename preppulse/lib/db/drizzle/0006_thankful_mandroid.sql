CREATE TABLE "weekly_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_type" text NOT NULL,
	"scope_id" uuid NOT NULL,
	"week_start" timestamp with time zone NOT NULL,
	"week_end" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_rank_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"scope_type" text NOT NULL,
	"scope_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start" timestamp with time zone NOT NULL,
	"rank" integer NOT NULL,
	"pulse" integer NOT NULL,
	"minutes" integer NOT NULL,
	"topics_moved" integer NOT NULL,
	"excluded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "weekly_rank_snapshots" ADD CONSTRAINT "weekly_rank_snapshots_period_id_weekly_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."weekly_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_rank_snapshots" ADD CONSTRAINT "weekly_rank_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_periods_scope_week_unique" ON "weekly_periods" USING btree ("scope_type","scope_id","week_start");--> statement-breakpoint
CREATE INDEX "weekly_periods_scope_status_idx" ON "weekly_periods" USING btree ("scope_type","scope_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_rank_snapshots_period_user_unique" ON "weekly_rank_snapshots" USING btree ("period_id","user_id");--> statement-breakpoint
CREATE INDEX "weekly_rank_snapshots_scope_week_rank_idx" ON "weekly_rank_snapshots" USING btree ("scope_id","week_start","rank");--> statement-breakpoint
CREATE INDEX "weekly_rank_snapshots_user_week_idx" ON "weekly_rank_snapshots" USING btree ("user_id","week_start");