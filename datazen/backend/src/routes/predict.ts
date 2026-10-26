import { Router, Request, Response } from "express";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { config } from "../config";
import { predictLimiter } from "../middlewares/rateLimiter";

const router = Router();
const ML_URL = config.ML_SERVICE_URL || "http://localhost:8000";
const ML_INTERNAL_KEY = config.ML_INTERNAL_KEY || "";

interface LocalityConfig {
  name: string;
  aliases: string[];
  centroid: { lat: number; lng: number };
  base_rate_per_sqft: number;
  status: string;
}

// Fallback configuration
let LOCALITIES_CONFIG: LocalityConfig[] = [
  { name: "Adyar", aliases: ["Adyar", "Gandhi Nagar", "Kasturba Nagar", "Besant Nagar"], centroid: { lat: 13.0067, lng: 80.2570 }, base_rate_per_sqft: 9500, status: "trained" },
  { name: "T Nagar", aliases: ["T Nagar", "T. Nagar", "Thyagaraya Nagar", "Pondy Bazaar"], centroid: { lat: 13.0418, lng: 80.2341 }, base_rate_per_sqft: 8800, status: "trained" },
  { name: "Anna Nagar", aliases: ["Anna Nagar", "Anna Nagar East", "Anna Nagar West"], centroid: { lat: 13.0850, lng: 80.2101 }, base_rate_per_sqft: 8500, status: "trained" },
  { name: "Velachery", aliases: ["Velachery", "Vijaya Nagar"], centroid: { lat: 12.9815, lng: 80.2180 }, base_rate_per_sqft: 7200, status: "trained" },
  { name: "OMR", aliases: ["OMR", "Old Mahabalipuram Road", "Rajiv Gandhi Salai"], centroid: { lat: 12.9010, lng: 80.2279 }, base_rate_per_sqft: 6800, status: "trained" },
  { name: "Porur", aliases: ["Porur", "Mugalivakkam", "Ramapuram"], centroid: { lat: 13.0382, lng: 80.1565 }, base_rate_per_sqft: 6000, status: "trained" },
  { name: "Chrompet", aliases: ["Chrompet", "Radha Nagar"], centroid: { lat: 12.9516, lng: 80.1462 }, base_rate_per_sqft: 5500, status: "trained" },
  { name: "Tambaram", aliases: ["Tambaram", "Tambaram West", "Tambaram East"], centroid: { lat: 12.9249, lng: 80.1000 }, base_rate_per_sqft: 5200, status: "trained" },
  { name: "Guindy", aliases: ["Guindy", "Kathipara", "Ekkattuthangal"], centroid: { lat: 13.0067, lng: 80.2020 }, base_rate_per_sqft: 8200, status: "assumed" },
  { name: "Perungudi", aliases: ["Perungudi", "Kandhanchavadi"], centroid: { lat: 12.9654, lng: 80.2461 }, base_rate_per_sqft: 7200, status: "assumed" },
  { name: "Sholinganallur", aliases: ["Sholinganallur", "Semmancheri"], centroid: { lat: 12.8980, lng: 80.2280 }, base_rate_per_sqft: 6500, status: "assumed" },
  { name: "Medavakkam", aliases: ["Medavakkam"], centroid: { lat: 12.9185, lng: 80.1915 }, base_rate_per_sqft: 5500, status: "assumed" },
  { name: "Pallavaram", aliases: ["Pallavaram"], centroid: { lat: 12.9675, lng: 80.1491 }, base_rate_per_sqft: 5800, status: "assumed" },
  { name: "Mylapore", aliases: ["Mylapore", "Luz", "Mandaveli"], centroid: { lat: 13.0368, lng: 80.2676 }, base_rate_per_sqft: 11000, status: "assumed" },
  { name: "Kilpauk", aliases: ["Kilpauk", "Kellys"], centroid: { lat: 13.0784, lng: 80.2412 }, base_rate_per_sqft: 9500, status: "assumed" },
  { name: "Nungambakkam", aliases: ["Nungambakkam", "Sterling Road"], centroid: { lat: 13.0569, lng: 80.2425 }, base_rate_per_sqft: 11500, status: "assumed" },
  { name: "Perambur", aliases: ["Perambur"], centroid: { lat: 13.1075, lng: 80.2337 }, base_rate_per_sqft: 6200, status: "assumed" },
  { name: "Ambattur", aliases: ["Ambattur", "Ambattur OT"], centroid: { lat: 13.1143, lng: 80.1548 }, base_rate_per_sqft: 5000, status: "assumed" },
  { name: "Thoraipakkam", aliases: ["Thoraipakkam", "200 Feet Radial Road"], centroid: { lat: 12.9382, lng: 80.2337 }, base_rate_per_sqft: 7000, status: "assumed" },
  { name: "Madipakkam", aliases: ["Madipakkam"], centroid: { lat: 12.9623, lng: 80.1986 }, base_rate_per_sqft: 6200, status: "assumed" }
];

// Load from localities.json if available
const localitiesJsonPath = path.join(__dirname, "../../../ml-service/localities.json");
if (fs.existsSync(localitiesJsonPath)) {
  try {
    const raw = JSON.parse(fs.readFileSync(localitiesJsonPath, "utf-8"));
    if (raw.localities && Array.isArray(raw.localities)) {
      LOCALITIES_CONFIG = raw.localities;
    }
  } catch (e) {
    console.warn("Could not load localities.json in predict.ts:", e);
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/predict/coverage
router.get("/coverage", async (_req: Request, res: Response) => {
  try {
    const headers: Record<string, string> = {};
    if (ML_INTERNAL_KEY) {
      headers["X-Internal-Key"] = ML_INTERNAL_KEY;
    }
    const mlRes = await fetch(`${ML_URL}/coverage`, { headers });
    if (mlRes.ok) {
      const data = await mlRes.json();
      res.json(data);
      return;
    }
  } catch {}

  res.json({
    status: "ok",
    bounds: { lat_min: 12.7, lat_max: 13.3, lng_min: 79.9, lng_max: 80.4, description: "Chennai Metropolitan Area Bounding Box" },
    localities: LOCALITIES_CONFIG
  });
});

// Fallback heuristic estimation when ML service is offline
function computeHeuristicEstimate(body: any) {
  let resolvedLocality = String(body.locality || "Anna Nagar");
  let resolutionDistance = 0.0;
  let coverageStatus = "exact";
  let wideningFactor = 1.0;
  let baseRate = 7000;

  if (body.lat !== undefined && body.lat !== null && body.lng !== undefined && body.lng !== null) {
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      if (lat < 12.7 || lat > 13.3 || lng < 79.9 || lng > 80.4) {
        return {
          out_of_coverage: true,
          message: `Coordinates (${lat}, ${lng}) are outside the Chennai metro coverage area (lat 12.7-13.3, lng 79.9-80.4).`
        };
      }

      let nearest = LOCALITIES_CONFIG[0];
      let minDist = Infinity;
      for (const loc of LOCALITIES_CONFIG) {
        const d = haversineKm(lat, lng, loc.centroid.lat, loc.centroid.lng);
        if (d < minDist) {
          minDist = d;
          nearest = loc;
        }
      }

      if (minDist > 8.0) {
        return {
          out_of_coverage: true,
          message: `Location (${lat}, ${lng}) is ${minDist.toFixed(1)} km from the nearest supported locality '${nearest.name}' (max 8 km). Outside coverage.`
        };
      }

      resolvedLocality = nearest.name;
      resolutionDistance = minDist;
      baseRate = nearest.base_rate_per_sqft;

      const isAssumed = (nearest.status === "assumed");
      if (minDist <= 3.0) {
        coverageStatus = isAssumed ? "assumed-rate" : "exact";
        wideningFactor = 1.0;
      } else {
        coverageStatus = isAssumed ? "assumed-rate" : "extrapolated";
        wideningFactor = 1.5;
      }
    }
  } else {
    const clean = resolvedLocality.trim().toLowerCase();
    const found = LOCALITIES_CONFIG.find(l =>
      l.name.toLowerCase() === clean || l.aliases.some(a => a.toLowerCase() === clean)
    );
    if (found) {
      resolvedLocality = found.name;
      baseRate = found.base_rate_per_sqft;
      coverageStatus = found.status === "assumed" ? "assumed-rate" : "exact";
    }
  }

  const pType = String(body.property_type || "Apartment/Flat");

  let typeMult = 1.0;
  if (pType.includes("Commercial")) typeMult = 1.45;
  else if (pType.includes("Villa") || pType.includes("House")) typeMult = 1.25;
  else if (pType.includes("Plot")) typeMult = 0.95;
  else if (pType.includes("Apartment") || pType.includes("Flat")) typeMult = 1.0;
  else typeMult = 0.85;

  const approved = String(body.approved || "CMDA/DTCP approved");
  let approvalMult = 1.0;
  if (approved === "Panchayat") approvalMult = 0.90;
  else if (approved === "Unapproved") approvalMult = 0.80;
  else if (approved === "Not sure") approvalMult = 0.88;

  const cornerMult = Number(body.corner) === 1 ? 1.04 : 1.0;
  const floodMult = Number(body.flood_prone) === 1 ? 0.91 : 1.0;
  const metroDist = Number(body.metro_dist_km ?? 2.0);
  const metroMult = metroDist <= 1.0 ? 1.06 : (metroDist <= 2.5 ? 1.03 : 1.0);
  const roadWidth = Number(body.road_width_ft ?? 30);
  const roadMult = 1.0 + (roadWidth - 20) * 0.0015;
  const ageYears = Number(body.age_years ?? 0);
  const ageMult = Math.max(0.70, 1.0 - (ageYears * 0.007));
  const lift = Number(body.lift ?? 0);
  const powerBackup = Number(body.power_backup ?? 0);
  const gated = Number(body.gated ?? 0);
  const amenityMult = 1.0 + (lift * 0.02) + (powerBackup * 0.02) + (gated * 0.03);

  const areaSqft = Number(body.area_sqft || 1000);
  const builtUp = Number(body.built_up_sqft || 0);
  const effectiveArea = builtUp > 0 ? builtUp : areaSqft;

  let price = effectiveArea * (baseRate * typeMult) * approvalMult * cornerMult * floodMult * metroMult * roadMult * ageMult * amenityMult;
  price += (
    (Number(body.bhk) || 0) * 45000 +
    (Number(body.parking) || 0) * 35000 +
    (Number(body.furnished) || 0) * 40000 +
    (Number(body.frontage_ft || 0) * 8000) -
    (Number(body.school_dist_km ?? 1.0) * 8000)
  );

  const finalPrice = Math.max(Math.round(price), 400000);
  const perSqft = Math.round(finalPrice / areaSqft);

  const lowPct = -0.20 * wideningFactor;
  const highPct = 0.20 * wideningFactor;

  const factors = [
    { label: `Location: ${resolvedLocality} (₹${baseRate.toLocaleString('en-IN')}/sqft base)`, impact_pct: baseRate >= 8000 ? '+High' : '+Standard', type: 'positive' },
    approvalMult < 1.0
      ? { label: `${approved} (-${Math.round((1 - approvalMult) * 100)}% valuation)`, impact_pct: `-${Math.round((1 - approvalMult) * 100)}%`, type: 'negative' }
      : { label: 'CMDA/DTCP Approved Layout', impact_pct: '+Full Market Value', type: 'positive' },
    metroDist <= 1.0
      ? { label: `Metro within ${metroDist} km`, impact_pct: '+6%', type: 'positive' }
      : (metroDist > 4.0 ? { label: `Metro ${metroDist} km away`, impact_pct: '-4%', type: 'negative' } : null),
    Number(body.flood_prone) === 1 ? { label: 'Flood-prone area risk', impact_pct: '-9%', type: 'negative' } : null,
    Number(body.corner) === 1 ? { label: 'Corner property advantage', impact_pct: '+4%', type: 'positive' } : null,
  ].filter(Boolean);

  const warnings = ["Approximate estimate. The ML service is unavailable."];
  if (coverageStatus === "assumed-rate") {
    warnings.push(`Base rate for ${resolvedLocality} is a placeholder (assumed rate).`);
  } else if (coverageStatus === "extrapolated") {
    warnings.push(`Location is ${resolutionDistance.toFixed(1)} km from ${resolvedLocality} centroid (extrapolated).`);
  }

  return {
    predicted_price: finalPrice,
    price_per_sqft: perSqft,
    range_low: Math.max(0, Math.round(finalPrice * (1.0 + lowPct))),
    range_high: Math.round(finalPrice * (1.0 + highPct)),
    confidence: null,
    data_source: "heuristic-fallback",
    model_version: "heuristic-fallback",
    interval_coverage: 0.8,
    validation_mape: null,
    warning: "Approximate estimate. The ML service is unavailable.",
    warnings,
    locality: resolvedLocality,
    resolved_locality: resolvedLocality,
    resolution_distance_km: Math.round(resolutionDistance * 100) / 100,
    coverage: coverageStatus,
    quality: "medium",
    imputed_fields: [],
    clamped_fields: [],
    interval_widening_factor: wideningFactor,
    property_type: pType,
    factors,
    is_fallback: true,
    disclaimer: "Approximate estimate based on heuristic fallback for guidance only."
  };
}

// Zod validation for optional geotechnical site information (Task 3)
const siteInfoSchema = z.object({
  geotech_report_available: z.enum(["yes", "no", "not_sure"]).optional().nullable(),
  report_date:              z.string().trim().max(100).optional().nullable(),
  report_agency:            z.string().trim().max(200).optional().nullable(),
  dominant_soil_type:       z.enum(["sand", "silt", "clay", "gravel", "weathered rock", "fill or made-up ground", "unknown"]).optional().nullable(),
  groundwater_depth_m:      z.coerce.number().min(0).max(500).optional().nullable(),
  groundwater_date:         z.string().trim().max(100).optional().nullable(),
  safe_bearing_capacity:    z.coerce.number().min(0).max(10000).optional().nullable(),
  spt_n_value:              z.coerce.number().int().min(0).max(300).optional().nullable(),
  flood_history:            z.enum(["never", "once", "repeatedly", "unknown"]).optional().nullable(),
  prev_water_body:          z.enum(["yes", "no", "unknown"]).optional().nullable(),
}).optional().nullable();

// POST /api/predict
router.post("/", predictLimiter, async (req: Request, res: Response): Promise<void> => {
  const { locality, area_sqft, lat, lng, site_info: rawSiteInfo } = req.body;

  // Validate site_info if provided
  let site_info: Record<string, any> | undefined = undefined;
  if (rawSiteInfo && typeof rawSiteInfo === "object") {
    const siteInfoParsed = siteInfoSchema.safeParse(rawSiteInfo);
    if (siteInfoParsed.success && siteInfoParsed.data) {
      site_info = siteInfoParsed.data;
    }
  }

  // Build clean ML payload: site_info is strictly excluded
  const payload: any = {
    property_type:          req.body.property_type || "Apartment/Flat",
    locality:               locality ? String(locality) : undefined,
    lat:                    lat !== undefined && lat !== null ? Number(lat) : undefined,
    lng:                    lng !== undefined && lng !== null ? Number(lng) : undefined,
    area_sqft:              Number(area_sqft),
    built_up_sqft:          Number(req.body.built_up_sqft || 0),
    road_width_ft:          Number(req.body.road_width_ft || 30),
    approved:               req.body.approved || "CMDA/DTCP approved",
    corner:                 Number(req.body.corner || 0),
    flood_prone:            Number(req.body.flood_prone || 0),

    bhk:                    Number(req.body.bhk ?? 2),
    bathrooms:              Number(req.body.bathrooms ?? 2),
    age_years:              Number(req.body.age_years ?? 0),
    floor:                  Number(req.body.floor ?? 0),
    total_floors:           Number(req.body.total_floors ?? 1),
    parking:                Number(req.body.parking === "yes" ? 1 : (req.body.parking === "no" ? 0 : (req.body.parking ?? 1))),
    furnished:              Number(req.body.furnished ?? 0),
    lift:                   Number(req.body.lift ?? 0),
    power_backup:           Number(req.body.power_backup ?? 0),
    gated:                  Number(req.body.gated ?? 0),
    facing:                 req.body.facing || "North",

    commercial_subtype:     req.body.commercial_subtype || "none",
    frontage_ft:            Number(req.body.frontage_ft || 0),

    school_dist_km:         req.body.school_dist_km !== undefined && req.body.school_dist_km !== null ? Number(req.body.school_dist_km) : null,
    hospital_dist_km:       req.body.hospital_dist_km !== undefined && req.body.hospital_dist_km !== null ? Number(req.body.hospital_dist_km) : null,
    bus_dist_km:            req.body.bus_dist_km !== undefined && req.body.bus_dist_km !== null ? Number(req.body.bus_dist_km) : null,
    metro_dist_km:          req.body.metro_dist_km !== undefined && req.body.metro_dist_km !== null ? Number(req.body.metro_dist_km) : null,
    supermarket_dist_km:    req.body.supermarket_dist_km !== undefined && req.body.supermarket_dist_km !== null ? Number(req.body.supermarket_dist_km) : null,
    park_dist_km:           req.body.park_dist_km !== undefined && req.body.park_dist_km !== null ? Number(req.body.park_dist_km) : null,
    amenity_score:          Number(req.body.amenity_score ?? 75.0),
    notes:                  String(req.body.notes || "")
  };

  const attachSiteInfoNotice = (result: any) => {
    if (site_info) {
      result.site_info = site_info;
      if (!Array.isArray(result.warnings)) {
        result.warnings = result.warning ? [result.warning] : [];
      }
      result.warnings.push("Site and soil details were provided but are not used in the price estimate.");
    }
    return result;
  };

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (ML_INTERNAL_KEY) {
      headers["X-Internal-Key"] = ML_INTERNAL_KEY;
    }

    const mlRes = await fetch(`${ML_URL}/predict`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (mlRes.status === 422) {
      const err = await mlRes.json().catch(() => ({ error: "Validation or coverage error" })) as any;
      res.status(422).json(err.detail || err);
      return;
    }

    if (!mlRes.ok) {
      const err = await mlRes.json().catch(() => ({})) as { detail?: any };
      console.warn("ML service non-422 error response:", err);
      const fallback = computeHeuristicEstimate(payload) as any;
      if (fallback.out_of_coverage) {
        res.status(422).json({ code: "OUT_OF_COVERAGE", message: fallback.message });
        return;
      }
      res.json(attachSiteInfoNotice(fallback));
      return;
    }

    const data = await mlRes.json();
    res.json(attachSiteInfoNotice(data));
  } catch (err: any) {
    console.warn("ML Service unavailable, using heuristic fallback:", err.message);
    const fallback = computeHeuristicEstimate(payload) as any;
    if (fallback.out_of_coverage) {
      res.status(422).json({ code: "OUT_OF_COVERAGE", message: fallback.message });
      return;
    }
    res.json(attachSiteInfoNotice(fallback));
  }
});

export default router;
