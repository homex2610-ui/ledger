import { Router, type IRouter } from "express";
import { GetStatsResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth.js";
import { computeStats } from "../lib/stats.js";
import { safeTimeZone } from "../lib/utils.js";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/stats", async (req, res) => {
  const timeZone = safeTimeZone(req.query.tz);
  const weekStart =
    typeof req.query.weekStart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.weekStart) ? req.query.weekStart : undefined;
  const month =
    typeof req.query.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(req.query.month) ? req.query.month : undefined;
  const subjectsPeriod = req.query.subjectsPeriod === "all" ? "all" : "week";
  const stats = await computeStats(req.userId, { timeZone, weekStart, month, subjectsPeriod });
  res.json(GetStatsResponse.parse(stats));
});

export default router;