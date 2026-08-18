import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { recordHealthz } from "../lib/health-stats.js";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  recordHealthz();
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;