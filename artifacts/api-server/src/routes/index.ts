import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import seedRouter from "./seed";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(seedRouter);

export default router;
