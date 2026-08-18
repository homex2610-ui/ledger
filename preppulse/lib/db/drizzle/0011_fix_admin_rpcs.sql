-- Admin RPC hardening:
--  1. admin_move_cohort_member now respects the cohort's admin-adjustable
--     capacity instead of a hardcoded 25.
--  2. admin_set_admin locks every admin profile row before counting, closing
--     the TOCTOU race where two concurrent demotions could both pass the
--     last-admin check and leave zero admins.
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
    PERFORM 1 FROM profiles WHERE is_admin ORDER BY user_id FOR UPDATE;
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
  v_to_capacity integer;
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
  SELECT capacity INTO v_to_capacity FROM cohorts WHERE id = p_to_cohort_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'cohort_not_found';
  END IF;
  SELECT count(*) INTO v_to_count FROM cohort_members WHERE cohort_id = p_to_cohort_id;
  IF v_to_count >= v_to_capacity THEN
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