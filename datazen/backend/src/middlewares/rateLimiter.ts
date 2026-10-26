import rateLimit from "express-rate-limit";

// Global limiter: 300 requests per 15 min per IP
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later.", code: "RATE_LIMITED" },
});

// Login: 5 attempts per 15 min per IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again after 15 minutes.", code: "RATE_LIMITED" },
  skipSuccessfulRequests: true,
});

// Register: 10 per hour per IP
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many registration attempts. Try again after an hour.", code: "RATE_LIMITED" },
});

// Predict: 60 per 15 min per IP
export const predictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many prediction requests. Please slow down.", code: "RATE_LIMITED" },
});

// Soil ingest: 120 per 15 min per IP
export const soilIngestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many soil data uploads. Please slow down.", code: "RATE_LIMITED" },
});
