import { Router, type IRouter } from "express";
import { FEATURE_LEADERBOARD_WEEKLY, isFeatureEnabled } from "../lib/feature-flags.js";
import { allLeaderboardScopeIds, closeWeeklyPeriod, duePeriods, ensureOpenPeriod } from "../lib/periods.js";

const router: IRouter = Router();

function isAuthorized(req: { headers: Record<string, string | string[] | undefined> }): boolean {
  if (req.headers["x-vercel-cron"] === "1") return true;
  const secret = process.env["CRON_SECRET"];
  if (secret) {
    const header = req.headers["authorization"];
    return typeof header === "string" && header === `Bearer ${secret}`;
  }
  return false;
}

/**
 * Weekly leaderboard reset. Vercel cron invokes this every Monday 00:00 UTC.
 * It ensures a period exists for every leaderboard scope, then closes every
 * due period. Also safe to call manually (admin button calls closeWeeklyPeriod
 * directly; this route is the scheduled path only).
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

  const scopes = await allLeaderboardScopeIds();
  for (const { scopeType, scopeId } of scopes) {
    await ensureOpenPeriod(scopeType, scopeId);
  }

  const periods = await duePeriods();
  const results = [];
  for (const period of periods) {
    try {
      const result = await closeWeeklyPeriod(period.id);
      results.push({ periodId: period.id, scopeType: period.scopeType, result: result.status });
    } catch (error) {
      console.error(`[cron] weekly reset failed for period ${period.id}`, error);
      results.push({ periodId: period.id, scopeType: period.scopeType, result: "error" });
    }
  }

  res.status(200).json({ scopesChecked: scopes.length, closed: results.filter((r) => r.result === "closed").length, results });
});

export default router;