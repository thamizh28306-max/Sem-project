import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { config } from "./config";
import { globalLimiter } from "./middlewares/rateLimiter";

import authRouter from "./routes/auth";
import listingsRouter from "./routes/listings";
import placesRouter from "./routes/places";
import predictRouter from "./routes/predict";
import soilRouter from "./routes/soil";

const app = express();

// ── Trust proxy configuration ──────────────────────────────────────────────
if (config.TRUST_PROXY) {
  app.set("trust proxy", 1);
}

// ── Security headers ────────────────────────────────────────────────────────
app.use(helmet());
app.disable("x-powered-by");

// ── Hardened CORS ───────────────────────────────────────────────────────────
const allowedOrigins = new Set(
  config.ALLOWED_ORIGINS.split(",").map(o => o.trim()).filter(Boolean)
);

app.use(cors({
  origin: (origin, callback) => {
    // If no origin (e.g. non-browser tool/testing in dev), allow only in non-production
    if (!origin) {
      if (config.NODE_ENV === "production") {
        return callback(new Error("Origin header required in production"), false);
      }
      return callback(null, true);
    }
    // Strictly reject "null" string origin and unlisted origins
    if (origin !== "null" && allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin not permitted by CORS policy"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Device-Id", "X-Device-Key"],
}));

// ── Body parsing & Cookies ──────────────────────────────────────────────────
app.use(cookieParser());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// ── Global rate limiter ──────────────────────────────────────────────────────
app.use(globalLimiter);

// ── Health Check ────────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "DataZen Backend"
  });
});

// ── API Routes ──────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/listings", listingsRouter);
app.use("/api/places", placesRouter);
app.use("/api/predict", predictRouter);
app.use("/api/soil-data", soilRouter);

// ── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Endpoint not found", code: "NOT_FOUND" });
});

// ── Central Error Handler ───────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[DataZen Backend Error]:", err);
  const status = err.status || err.statusCode || 500;
  if (status === 400 && err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request payload too large (max 100kb)", code: "PAYLOAD_TOO_LARGE" });
  }
  res.status(status >= 400 && status < 600 ? status : 500).json({
    error: "An internal server error occurred",
    code: "INTERNAL_ERROR",
  });
});

// ── Server Listen ───────────────────────────────────────────────────────────
app.listen(config.PORT, () => {
  console.log(`[DataZen] Backend service running on http://localhost:${config.PORT} [${config.NODE_ENV}]`);
});

export default app;
