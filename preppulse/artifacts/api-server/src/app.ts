import path from "node:path";
import { existsSync } from "node:fs";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { ZodError } from "zod";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

// Vercel terminates TLS and forwards the original scheme via x-forwarded-proto;
// without this req.protocol reports "http" and OAuth redirect URIs break.
app.set("trust proxy", 1);

const allowedOrigins = (process.env["CORS_ORIGIN"] ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : false,
    credentials: true,
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

declare const __FRONTEND_DIST__: string | undefined;

function findFrontendDist(): string | null {
  let dir = (globalThis as { __dirname?: string }).__dirname ?? process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "prep-pulse", "dist", "public");
    if (existsSync(path.join(candidate, "index.html"))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

const frontendDist =
  typeof __FRONTEND_DIST__ === "string" && existsSync(path.join(__FRONTEND_DIST__, "index.html"))
    ? __FRONTEND_DIST__
    : findFrontendDist();
if (frontendDist) {
  app.use(express.static(frontendDist));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" || req.path === "/api" || req.path.startsWith("/api/")) {
      next();
      return;
    }
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  logger.warn("Frontend build not found; serving API only");
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    // Sanitized issue summary: paths and messages only — never echo the raw
    // submitted values (they can include emails, passwords, or schema internals).
    res.status(400).json({
      error: "Invalid request",
      issues: err.issues.map((issue) => ({ path: issue.path, message: issue.message })),
    });
    return;
  }
  if (
    err instanceof SyntaxError &&
    "status" in err &&
    (err as { status?: number }).status === 400 &&
    "body" in err
  ) {
    res.status(400).json({ error: "Request body is not valid JSON" });
    return;
  }
  if (err instanceof Error && (err as { type?: string }).type === "entity.too.large") {
    res.status(413).json({ error: "Request body is too large" });
    return;
  }
  logger.error(err instanceof Error ? err.message : String(err));
  res.status(500).json({ error: "Something went wrong", code: "internal_error" });
});

export default app;
