-- Baseline share-eligibility numbers — run against PRODUCTION before 1.5.0 rollout.
-- Decides whether the variant experiment (A vs B) is sequential (B after A clears)
-- or concurrent (both live at once): if eligible_unique_28d >= 200, run concurrent.
-- Assumes 0005_hot_the_renegades.sql has been applied first (timestamps are UTC).

-- 1) Daily eligible users (>= 25 focused minutes in a UTC day) — last 28 days
SELECT date_trunc('day', "created_at")::date                AS day_utc,
       count(DISTINCT "user_id")                            AS eligible_users,
       count(*) FILTER (WHERE "minutes" >= 25)              AS eligible_sessions
FROM study_sessions
WHERE "created_at" >= now() - interval '28 days'
GROUP BY 1
ORDER BY 1;

-- 2) Unique eligible users — last 7 days and last 28 days (go/no-go for concurrent variants)
SELECT
  count(DISTINCT "user_id") FILTER (WHERE "created_at" >= now() - interval '7 days')  AS eligible_unique_7d,
  count(DISTINCT "user_id") FILTER (WHERE "created_at" >= now() - interval '28 days') AS eligible_unique_28d
FROM study_sessions
WHERE "minutes" >= 25;