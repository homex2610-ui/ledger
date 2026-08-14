import { Router, type IRouter } from "express";
import authRouter from "./auth.js";
import oauthRouter from "./oauth.js";
import healthRouter from "./health.js";
import prepRouter from "./prep.js";
import studyRouter from "./study.js";
import recallRouter from "./recall.js";
import communityRouter from "./community.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/auth", oauthRouter);
router.use(prepRouter);
router.use(studyRouter);
router.use(recallRouter);
router.use(communityRouter);

export default router;
