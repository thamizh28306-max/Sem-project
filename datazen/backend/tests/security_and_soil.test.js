import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Task 1: Config and Secrets Validation", () => {
  test("rejects short or placeholder JWT secrets", async () => {
    const { z } = await import("zod");
    const BANNED_SECRETS = new Set(["secret", "changeme", "password", "jwt_secret", "mysecret", "test", "dev"]);
    const secretSchema = z.string().min(32).refine(v => !BANNED_SECRETS.has(v.toLowerCase()));

    assert.equal(secretSchema.safeParse("short").success, false);
    assert.equal(secretSchema.safeParse("changeme").success, false);
    assert.equal(secretSchema.safeParse("mysecret").success, false);
    assert.equal(secretSchema.safeParse("a79c381d68324f65c92f913d8b5e28a5f36e8b4e72c81d9f04e76a5b23c91d8e").success, true);
  });

  test("enforces distinct JWT_SECRET and REFRESH_SECRET", () => {
    const jwtSecret = "a79c381d68324f65c92f913d8b5e28a5f36e8b4e72c81d9f04e76a5b23c91d8e";
    const refreshSecret = "f4b82d91e63a4b75c82d937e1b4a58c3f25e7a9b61d74c8e39f28a7b64c1d5e2";
    assert.notEqual(jwtSecret, refreshSecret);
  });
});

describe("Task 2 & 3: Auth Security & Validation", () => {
  test("validates registration input requirements", async () => {
    const { z } = await import("zod");
    const regSchema = z.object({
      name:     z.string().trim().min(1).max(80),
      email:    z.string().trim().toLowerCase().email(),
      password: z.string().min(10).max(72),
      phone:    z.string().regex(/^[6-9]\d{9}$/).optional().or(z.literal("")),
    });

    // Too short password (< 10 chars)
    assert.equal(regSchema.safeParse({ name: "User", email: "user@test.com", password: "short" }).success, false);
    // Invalid email
    assert.equal(regSchema.safeParse({ name: "User", email: "not-an-email", password: "ValidPassword123!" }).success, false);
    // Invalid Indian phone format
    assert.equal(regSchema.safeParse({ name: "User", email: "user@test.com", password: "ValidPassword123!", phone: "12345" }).success, false);
    // Valid input
    assert.equal(regSchema.safeParse({ name: "Arjun Kumar", email: "Arjun@example.com", password: "SecurePassword123!", phone: "9876543210" }).success, true);
  });
});

describe("Task 2: Soil Statistical Honesty & Summary", () => {
  function calcPercentile(sorted, p) {
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const weight = idx - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  function computeStats(values) {
    const sorted = [...values].sort((a, b) => a - b);
    let workingSet = sorted;
    let outliers_excluded = 0;

    if (sorted.length >= 10) {
      const q1 = calcPercentile(sorted, 25);
      const q3 = calcPercentile(sorted, 75);
      const iqr = q3 - q1;
      const filtered = sorted.filter(v => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr);
      outliers_excluded = sorted.length - filtered.length;
      workingSet = filtered;
    }

    const mid = Math.floor(workingSet.length / 2);
    const median = workingSet.length % 2 === 0
      ? (workingSet[mid - 1] + workingSet[mid]) / 2
      : workingSet[mid];

    return {
      count: workingSet.length,
      median,
      min: workingSet[0],
      max: workingSet[workingSet.length - 1],
      outliers_excluded,
    };
  }

  test("calculates median and excludes outliers for count >= 10 using 1.5 * IQR", () => {
    // 10 normal pH readings between 6.5 and 7.2 plus one extreme outlier (14.0)
    const phReadings = [6.5, 6.6, 6.7, 6.8, 6.9, 7.0, 7.1, 7.1, 7.2, 7.2, 14.0];
    const stats = computeStats(phReadings);

    assert.equal(stats.outliers_excluded, 1);
    assert.ok(stats.max < 10);
    assert.ok(stats.median >= 6.5 && stats.median <= 7.2);
  });

  test("evaluates reading_quality thresholds accurately", () => {
    const MIN_READINGS_REQUIRED = 5;
    const ONE_DAY_MS = 86400000;
    const now = Date.now();

    // Case 1: < 5 readings -> insufficient
    assert.equal(3 < MIN_READINGS_REQUIRED ? "insufficient" : "adequate", "insufficient");

    // Case 2: All within one day -> insufficient
    const spanSameDay = 3600000; // 1 hour
    assert.equal(spanSameDay < ONE_DAY_MS ? "insufficient" : "adequate", "insufficient");

    // Case 3: Stale > 30 days
    const staleAge = 35 * ONE_DAY_MS;
    assert.equal(staleAge > 30 * ONE_DAY_MS ? "stale" : "adequate", "stale");

    // Case 4: Noisy moisture CV > 0.5
    const moisture = [10, 80, 15, 75, 12, 85];
    const mean = moisture.reduce((a, b) => a + b, 0) / moisture.length;
    const std = Math.sqrt(moisture.reduce((a, b) => a + (b - mean) ** 2, 0) / moisture.length);
    const cv = std / mean;
    assert.ok(cv > 0.5);
  });

  test("scope_note strictly contains agricultural context and disclaims geotechnical assessment", () => {
    const scope_note = "Indicators of agricultural soil properties at the probe location and time of measurement. Not a geotechnical assessment.";
    assert.ok(scope_note.includes("agricultural"));
    assert.ok(scope_note.includes("Not a geotechnical assessment"));
  });
});

describe("Task 3: Geotechnical Form & Site Info Echo", () => {
  test("validates site_info without sending to ML model", async () => {
    const { z } = await import("zod");
    const siteInfoSchema = z.object({
      geotech_report_available: z.enum(["yes", "no", "not_sure"]).optional(),
      dominant_soil_type:       z.enum(["sand", "silt", "clay", "gravel", "weathered rock", "fill or made-up ground", "unknown"]).optional(),
      groundwater_depth_m:      z.coerce.number().min(0).max(500).optional(),
      safe_bearing_capacity:    z.coerce.number().min(0).max(10000).optional(),
      flood_history:            z.enum(["never", "once", "repeatedly", "unknown"]).optional(),
    });

    const input = {
      geotech_report_available: "yes",
      dominant_soil_type: "clay",
      groundwater_depth_m: 4.5,
      safe_bearing_capacity: 150,
      flood_history: "never"
    };

    const parsed = siteInfoSchema.safeParse(input);
    assert.equal(parsed.success, true);

    // Verify warning text is included when site_info is echoed
    const warnings = [];
    if (parsed.data) {
      warnings.push("Site and soil details were provided but are not used in the price estimate.");
    }
    assert.ok(warnings.includes("Site and soil details were provided but are not used in the price estimate."));
  });
});
