import dotenv from "dotenv";
dotenv.config();
import { z } from "zod";

const BANNED_SECRETS = new Set(["secret", "changeme", "password", "jwt_secret", "mysecret", "test", "dev"]);

const envSchema = z.object({
  DATABASE_URL:       z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET:         z.string().min(32, "JWT_SECRET must be at least 32 characters").refine(
    v => !BANNED_SECRETS.has(v.toLowerCase()), "JWT_SECRET is a known placeholder — generate a real secret"
  ),
  REFRESH_SECRET:     z.string().min(32, "REFRESH_SECRET must be at least 32 characters").refine(
    v => !BANNED_SECRETS.has(v.toLowerCase()), "REFRESH_SECRET is a known placeholder — generate a real secret"
  ),
  ALLOWED_ORIGINS:    z.string().default("http://localhost:5173,http://localhost:5500,http://127.0.0.1:5500,http://127.0.0.1:5173"),
  DEVICE_KEYS:        z.string().default(""),
  ML_SERVICE_URL:     z.string().url().default("http://localhost:8000"),
  ML_INTERNAL_KEY:    z.string().min(16, "ML_INTERNAL_KEY must be at least 16 chars").optional(),
  NODE_ENV:           z.enum(["development", "production", "test"]).default("development"),
  PORT:               z.coerce.number().int().min(1).max(65535).default(3000),
  TRUST_PROXY:        z.string().optional(),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map(i => `  • ${i.path.join(".")}: ${i.message}`);
    console.error("\n[DataZen] FATAL: Environment configuration invalid:\n" + issues.join("\n") + "\n");
    process.exit(1);
  }
  const cfg = result.data;
  if (cfg.JWT_SECRET === cfg.REFRESH_SECRET) {
    console.error("\n[DataZen] FATAL: JWT_SECRET and REFRESH_SECRET must be different values.\n");
    process.exit(1);
  }
  return cfg;
}

export const config = loadConfig();
export type Config = typeof config;
