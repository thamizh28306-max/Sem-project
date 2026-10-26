import { Router, Request, Response } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { config } from "../config";
import { soilIngestLimiter } from "../middlewares/rateLimiter";

const router = Router();
const prisma = new PrismaClient();

// ── Quality & Statistical Thresholds (Constants) ──────────────────────────
export const MIN_READINGS_REQUIRED = 5;
export const STALE_DAYS = 30;
export const NOISY_CV_THRESHOLD = 0.5; // Coefficient of variation of moisture
export const ONE_DAY_MS = 86_400_000;

// ── Interpretation Ranges (Agricultural Guidelines, Constants) ─────────────
export const PH_LOW_LIMIT = 5.5;
export const PH_HIGH_LIMIT = 8.5;

// Parse device keys from config
const configuredDeviceKeys = new Map<string, string>();
if (config.DEVICE_KEYS) {
  config.DEVICE_KEYS.split(",").forEach(entry => {
    const [devId, devKey] = entry.split(":").map(s => s.trim());
    if (devId && devKey) {
      configuredDeviceKeys.set(devId, devKey);
    }
  });
}

// Device authentication helper
function verifyDeviceAuth(req: Request, res: Response): boolean {
  const deviceId = req.headers["x-device-id"] as string | undefined;
  const deviceKey = req.headers["x-device-key"] as string | undefined;

  if (!deviceId || !deviceKey) {
    res.status(401).json({
      error: "Device authentication required. Provide X-Device-Id and X-Device-Key headers.",
      code: "DEVICE_UNAUTHORIZED"
    });
    return false;
  }

  // If devices are configured in env, strictly match credentials
  if (configuredDeviceKeys.size > 0) {
    const expectedKey = configuredDeviceKeys.get(deviceId);
    if (!expectedKey || expectedKey !== deviceKey) {
      res.status(401).json({
        error: "Invalid device credentials.",
        code: "DEVICE_UNAUTHORIZED"
      });
      return false;
    }
  } else if (config.NODE_ENV === "production") {
    // In production, reject if no device keys configured
    res.status(503).json({
      error: "Device ingestion is not configured on this server.",
      code: "DEVICE_NOT_CONFIGURED"
    });
    return false;
  }

  return true;
}

// Ingestion validation schema
const soilIngestSchema = z.object({
  propertyId:  z.string().min(1, "propertyId is required"),
  moisture:    z.coerce.number().min(0).max(100).optional().nullable(),
  ph:          z.coerce.number().min(0).max(14).optional().nullable(),
  nitrogen:    z.coerce.number().min(0).max(10000).optional().nullable(),
  phosphorus:  z.coerce.number().min(0).max(10000).optional().nullable(),
  potassium:   z.coerce.number().min(0).max(10000).optional().nullable(),
  temperature: z.coerce.number().min(-40).max(85).optional().nullable(),
});

// Statistical helper functions
function calcMedian(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function calcPercentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  const weight = idx - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function computeMetricStats(values: number[]) {
  if (values.length === 0) return null;

  const sortedAll = [...values].sort((a, b) => a - b);
  let workingSet = sortedAll;
  let outliers_excluded = 0;

  // Apply 1.5 * IQR outlier exclusion only when count >= 10
  if (sortedAll.length >= 10) {
    const q1 = calcPercentile(sortedAll, 25);
    const q3 = calcPercentile(sortedAll, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const filtered = sortedAll.filter(v => v >= lowerBound && v <= upperBound);
    outliers_excluded = sortedAll.length - filtered.length;
    if (filtered.length > 0) {
      workingSet = filtered;
    }
  }

  const count = workingSet.length;
  const stats: any = {
    count,
    median: Math.round(calcMedian(workingSet) * 100) / 100,
    min: Math.round(workingSet[0] * 100) / 100,
    max: Math.round(workingSet[workingSet.length - 1] * 100) / 100,
    outliers_excluded,
  };

  if (count >= 10) {
    stats.p10 = Math.round(calcPercentile(workingSet, 10) * 100) / 100;
    stats.p90 = Math.round(calcPercentile(workingSet, 90) * 100) / 100;
  }

  return stats;
}

// POST /api/soil-data — Ingest sensor readings from ESP32
router.post("/", soilIngestLimiter, async (req: Request, res: Response): Promise<void> => {
  if (!verifyDeviceAuth(req, res)) return;

  const parsed = soilIngestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid sensor payload", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { propertyId, moisture, ph, nitrogen, phosphorus, potassium, temperature } = parsed.data;

  try {
    const listing = await prisma.listing.findUnique({
      where: { id: propertyId },
      select: { id: true },
    });

    if (!listing) {
      res.status(404).json({ error: "Listing not found for given propertyId", code: "NOT_FOUND" });
      return;
    }

    const reading = await prisma.soilReading.create({
      data: {
        propertyId,
        moisture:    moisture != null ? moisture : null,
        ph:          ph != null ? ph : null,
        nitrogen:    nitrogen != null ? nitrogen : null,
        phosphorus:  phosphorus != null ? phosphorus : null,
        potassium:   potassium != null ? potassium : null,
        temperature: temperature != null ? temperature : null,
      },
    });

    res.status(201).json({
      message: "Soil reading saved successfully",
      id: reading.id,
    });
  } catch (err) {
    console.error("[soil] POST ingest error:", err);
    res.status(500).json({ error: "Failed to store soil reading", code: "INTERNAL_ERROR" });
  }
});

// GET /api/soil-data/:propertyId — Get latest reading
router.get("/:propertyId", async (req: Request, res: Response): Promise<void> => {
  try {
    const reading = await prisma.soilReading.findFirst({
      where: { propertyId: req.params.propertyId },
      orderBy: { createdAt: "desc" },
    });

    if (!reading) {
      res.status(404).json({ error: "No soil readings found for this property", code: "NOT_FOUND" });
      return;
    }

    res.json(reading);
  } catch (err) {
    console.error("[soil] GET latest error:", err);
    res.status(500).json({ error: "Could not retrieve reading", code: "INTERNAL_ERROR" });
  }
});

// GET /api/soil-data/:propertyId/history — Get last 20 readings
router.get("/:propertyId/history", async (req: Request, res: Response): Promise<void> => {
  try {
    const readings = await prisma.soilReading.findMany({
      where: { propertyId: req.params.propertyId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json(readings);
  } catch (err) {
    console.error("[soil] GET history error:", err);
    res.status(500).json({ error: "Could not retrieve history", code: "INTERNAL_ERROR" });
  }
});

// GET /api/soil-data/listing/:listingId/summary — Statistically honest summary
router.get("/listing/:listingId/summary", async (req: Request, res: Response): Promise<void> => {
  const listingId = req.params.listingId;

  try {
    const readings = await prisma.soilReading.findMany({
      where: { propertyId: listingId },
      orderBy: { createdAt: "asc" },
    });

    if (readings.length === 0) {
      res.status(404).json({
        error: "No soil readings found for this listing",
        code: "NOT_FOUND",
      });
      return;
    }

    const newestReading = readings[readings.length - 1];
    const oldestReading = readings[0];
    const lastReadingAt = newestReading.createdAt;
    const now = Date.now();

    const metricKeys = ["ph", "moisture", "nitrogen", "phosphorus", "potassium", "temperature"] as const;
    const metrics: Record<string, any> = {};

    for (const key of metricKeys) {
      const vals = readings
        .map(r => r[key])
        .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

      const stats = computeMetricStats(vals);
      if (stats) {
        stats.last_reading_at = lastReadingAt;
      }
      metrics[key] = stats;
    }

    // Determine reading_quality
    const quality_reasons: string[] = [];
    let reading_quality: "insufficient" | "stale" | "noisy" | "adequate" = "adequate";

    const totalReadings = readings.length;
    const timeSpanMs = newestReading.createdAt.getTime() - oldestReading.createdAt.getTime();

    if (totalReadings < MIN_READINGS_REQUIRED) {
      reading_quality = "insufficient";
      quality_reasons.push(`Fewer than ${MIN_READINGS_REQUIRED} readings recorded (${totalReadings} total).`);
    } else if (timeSpanMs < ONE_DAY_MS) {
      reading_quality = "insufficient";
      quality_reasons.push("All readings were recorded within a single 24-hour period; diurnal or seasonal variation cannot be established.");
    } else if (now - newestReading.createdAt.getTime() > STALE_DAYS * ONE_DAY_MS) {
      reading_quality = "stale";
      quality_reasons.push(`The latest reading is older than ${STALE_DAYS} days and may not represent current soil condition.`);
    } else {
      // Check moisture CV (coefficient of variation = std_dev / mean)
      const moistureVals = readings
        .map(r => r.moisture)
        .filter((v): v is number => v !== null && !isNaN(v));

      if (moistureVals.length >= 2) {
        const mean = moistureVals.reduce((a, b) => a + b, 0) / moistureVals.length;
        const variance = moistureVals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / moistureVals.length;
        const stdDev = Math.sqrt(variance);
        const cv = mean > 0 ? stdDev / mean : 0;

        if (cv > NOISY_CV_THRESHOLD) {
          reading_quality = "noisy";
          quality_reasons.push(`Moisture readings exhibit high dispersion (coefficient of variation: ${(cv * 100).toFixed(1)}% > ${(NOISY_CV_THRESHOLD * 100)}%). Sensor readings may be erratic or weather-spiked.`);
        }
      }
    }

    if (quality_reasons.length === 0) {
      quality_reasons.push("Sufficient readings available across time with acceptable variance for agricultural observations.");
    }

    // Static scope note
    const scope_note = "Indicators of agricultural soil properties at the probe location and time of measurement. Not a geotechnical assessment.";

    // Interpretation array: cautious, generic, non-construction guidelines
    const interpretation: Array<{ metric: string; note: string; source: string }> = [];

    const phMedian = metrics.ph?.median;
    if (phMedian !== undefined && phMedian !== null) {
      if (phMedian < PH_LOW_LIMIT) {
        interpretation.push({
          metric: "ph",
          note: `Soil pH (${phMedian}) is acidic (< ${PH_LOW_LIMIT}). This may limit the growth of common local crops and vegetables. Consult an agricultural extension officer.`,
          source: "general guideline",
        });
      } else if (phMedian > PH_HIGH_LIMIT) {
        interpretation.push({
          metric: "ph",
          note: `Soil pH (${phMedian}) is alkaline (> ${PH_HIGH_LIMIT}). Certain plant micronutrients may have reduced availability.`,
          source: "general guideline",
        });
      } else {
        interpretation.push({
          metric: "ph",
          note: `Soil pH (${phMedian}) falls within the normal neutral range (${PH_LOW_LIMIT} - ${PH_HIGH_LIMIT}) for general vegetation and landscaping.`,
          source: "general guideline",
        });
      }
    }

    interpretation.push({
      metric: "moisture",
      note: "Moisture is a point-in-time value that changes with recent rainfall, irrigation, and season. It reflects shallow topsoil dampness only.",
      source: "general guideline",
    });

    interpretation.push({
      metric: "general",
      note: "High moisture readings shortly after rain say nothing about groundwater depth, liquefaction, or the seasonal water table.",
      source: "general guideline",
    });

    res.json({
      listing_id: listingId,
      total_readings: totalReadings,
      scope_note,
      reading_quality,
      quality_reasons,
      metrics,
      interpretation,
    });
  } catch (err) {
    console.error("[soil] GET summary error:", err);
    res.status(500).json({ error: "Could not compute soil summary", code: "INTERNAL_ERROR" });
  }
});

export default router;
