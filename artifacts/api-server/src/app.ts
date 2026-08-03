import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Reflecting any origin while allowing credentials lets any site issue
// authenticated cross-origin requests. In production set CORS_ORIGINS to a
// comma-separated allow-list; when unset the previous permissive behaviour is
// kept so local development is unaffected.
const allowedOrigins = (process.env["CORS_ORIGINS"] ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true,
}));
app.use(cookieParser());

// Capture raw body for Stripe webhook signature verification before JSON parsing
app.use((req: Request & { rawBody?: Buffer }, res: Response, next: NextFunction) => {
  if (req.path === '/api/payments/stripe/webhook') {
    let chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      req.rawBody = Buffer.concat(chunks);
      next();
    });
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);

// Unmatched API routes: answer in JSON rather than Express's default HTML page.
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Safety net for anything a route handler did not catch itself. Every existing
// route still handles its own errors, so this changes no current response; it
// only prevents an unhandled rejection from hanging the connection, and keeps
// internal details out of the response body.
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  req.log?.error({ err }, "Unhandled error");
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error" });
});

export default app;
