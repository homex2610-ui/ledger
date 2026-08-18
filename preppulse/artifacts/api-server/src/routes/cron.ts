import { Router, type IRouter } from "express";
import { FEATURE_LEADERBOARD_WEEKLY, isFeatureEnabled } from "../lib/feature-flags.js";
import { runWeeklyReset } from "../lib/periods.js";

const router: IRouter = Router();

/**
 * Vercel Cron auth: when CRON_SECRET is set, Vercel automatically sends it as
 * `Authorization: Bearer <secret>` on every cron invocation. The check fails
 * closed when the secret is missing. The user-agent / x-vercel-cron-schedule
 * headers are NOT used as proof of identity — they are plain request headers
 * and can be spoofed by any caller.
 */
function isAuthorized(req: { headers: Record<string, string | string[] | undefined> }): boolean {
  const secret = process.env["CRON_SECRET"];
  if (!secret) return false;
  const header = req.headers["authorization"];
  return typeof header === "string" && header === `Bearer ${secret}`;
}

/**
 * Weekly leaderboard reset. Vercel cron invokes this every Monday 00:00 UTC.
 * This route is the scheduled path only; the admin button calls the same
 * runWeeklyReset helper directly.
 */
router.post("/cron/weekly-reset", async (req, res) => {
  if (!isAuthorized(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!(await isFeatureEnabled(FEATURE_LEADERBOARD_WEEKLY))) {
    res.status(200).json({ scopesChecked: 0, closed: 0, results: [], featureDisabled: true });
    return;
  }

  const result = await runWeeklyReset();
  res.status(200).json(result);
});

export default router;