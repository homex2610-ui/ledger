import { Router, type IRouter } from "express";
import authRouter from "./auth";
import oauthRouter from "./oauth";
import healthRouter from "./health";
import prepRouter from "./prep";
import studyRouter from "./study";
import recallRouter from "./recall";
import communityRouter from "./community";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/auth", oauthRouter);
router.use(prepRouter);
router.use(studyRouter);
router.use(recallRouter);
router.use(communityRouter);

export default router;
