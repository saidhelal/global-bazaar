import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import seedRouter from "./seed";
import storageRouter from "./storage";
import productsRouter from "./products";
import ordersRouter from "./orders";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(seedRouter);
router.use(storageRouter);
router.use("/products", productsRouter);
router.use("/orders", ordersRouter);

export default router;
