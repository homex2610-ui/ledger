CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"before_state" jsonb,
	"after_state" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcement_dismissals" (
	"user_id" uuid NOT NULL,
	"announcement_id" uuid NOT NULL,
	"dismissed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcement_dismissals_user_id_announcement_id_pk" PRIMARY KEY("user_id","announcement_id")
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text,
	"icon" text DEFAULT 'megaphone' NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_dismissals" ADD CONSTRAINT "announcement_dismissals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_dismissals" ADD CONSTRAINT "announcement_dismissals_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_log_created_idx" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_announcement" ON "announcements" USING btree ((true)) WHERE is_enabled = true;
--> statement-breakpoint
-- Admin RPC functions: DB-level enforcement for admin mutations. Each verifies
-- the acting user's is_admin inside Postgres, so a buggy or compromised app
-- layer cannot bypass the checks. Audit rows are written in the same
-- transaction as the mutation.
CREATE OR REPLACE FUNCTION admin_toggle_announcement(p_admin_id uuid, p_announcement_id uuid, p_enabled boolean)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = p_admin_id AND is_admin) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;
  SELECT to_jsonb(a) INTO v_before FROM announcements a WHERE a.id = p_announcement_id;
  IF v_before IS NULL THEN
    RAISE EXCEPTION 'announcement_not_found';
  END IF;
  IF p_enabled THEN
    UPDATE announcements SET is_enabled = false, updated_at = now() WHERE is_enabled = true AND id <> p_announcement_id;
  END IF;
  UPDATE announcements SET is_enabled = p_enabled, updated_at = now() WHERE id = p_announcement_id;
  SELECT to_jsonb(a) INTO v_after FROM announcements a WHERE a.id = p_announcement_id;
  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, before_state, after_state)
  VALUES (p_admin_id, CASE WHEN p_enabled THEN 'announcement_enable' ELSE 'announcement_disable' END, 'announcement', p_announcement_id::text, v_before, v_after);
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION admin_set_admin(p_admin_id uuid, p_target_user_id uuid, p_is_admin boolean)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
  v_admin_count integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = p_admin_id AND is_admin) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;
  IF NOT p_is_admin THEN
    SELECT count(*) INTO v_admin_count FROM profiles WHERE is_admin;
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'last_admin';
    END IF;
  END IF;
  SELECT to_jsonb(p) INTO v_before FROM profiles p WHERE p.user_id = p_target_user_id;
  IF v_before IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;
  UPDATE profiles SET is_admin = p_is_admin, updated_at = now() WHERE user_id = p_target_user_id;
  SELECT to_jsonb(p) INTO v_after FROM profiles p WHERE p.user_id = p_target_user_id;
  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, before_state, after_state)
  VALUES (p_admin_id, CASE WHEN p_is_admin THEN 'promote_admin' ELSE 'demote_admin' END, 'user', p_target_user_id::text, v_before, v_after);
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION admin_move_cohort_member(p_admin_id uuid, p_user_id uuid, p_to_cohort_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_from_cohort uuid;
  v_to_count integer;
  v_moved_at timestamp with time zone;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = p_admin_id AND is_admin) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;
  SELECT cohort_id INTO v_from_cohort FROM cohort_members WHERE user_id = p_user_id LIMIT 1;
  IF v_from_cohort IS NULL THEN
    RAISE EXCEPTION 'user_not_in_cohort';
  END IF;
  IF v_from_cohort = p_to_cohort_id THEN
    RAISE EXCEPTION 'already_in_cohort';
  END IF;
  PERFORM 1 FROM cohorts WHERE id = p_to_cohort_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'cohort_not_found';
  END IF;
  SELECT count(*) INTO v_to_count FROM cohort_members WHERE cohort_id = p_to_cohort_id;
  IF v_to_count >= 25 THEN
    RAISE EXCEPTION 'cohort_full';
  END IF;
  SELECT joined_at INTO v_moved_at FROM cohort_members WHERE user_id = p_user_id AND cohort_id = v_from_cohort;
  DELETE FROM cohort_members WHERE user_id = p_user_id AND cohort_id = v_from_cohort;
  INSERT INTO cohort_members (cohort_id, user_id, joined_at) VALUES (p_to_cohort_id, p_user_id, COALESCE(v_moved_at, now()));
  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, before_state, after_state)
  VALUES (p_admin_id, 'move_cohort', 'user', p_user_id::text,
          jsonb_build_object('cohort_id', v_from_cohort::text),
          jsonb_build_object('cohort_id', p_to_cohort_id::text));
END;
$$;