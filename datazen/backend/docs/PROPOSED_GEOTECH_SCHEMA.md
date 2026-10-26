# Proposed Geotechnical Data Schema — DataZen

> **Status:** Proposed Schema Extension (Future Migration).  
> In accordance with the system constraints, no database migrations or schema alterations have been executed on the production PostgreSQL database. Geotechnical details are currently handled as an optional, transient `site_info` object in the prediction pipeline.

---

## 1. Rationale

To support genuine construction and structural suitability assessments for plots and independent buildings, DataZen proposes introducing a dedicated `GeotechnicalReport` entity linked to property listings.

---

## 2. Proposed Prisma Model Definition

```prisma
model GeotechnicalReport {
  id                    String    @id @default(cuid())
  listingId             String    @unique
  listing               Listing   @relation(fields: [listingId], references: [id], onDelete: Cascade)
  
  hasFormalReport       Boolean   @default(false)
  reportDate            DateTime?
  issuingAgency         String?   // e.g. "Anna University Soil Mechanics Lab"
  
  dominantSoilType      SoilType?
  groundwaterDepthM     Float?    // Depth in meters to water table
  groundwaterDate       DateTime?
  
  safeBearingCapacity   Float?    // SBC in kN/m2
  sptNValue             Int?      // Standard Penetration Test N-value
  
  floodHistory          FloodHistory @default(UNKNOWN)
  previousWaterBody     Boolean   @default(false) // e.g. former eri/kulam lakebed
  
  notes                 String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}

enum SoilType {
  SAND
  SILT
  CLAY
  GRAVEL
  WEATHERED_ROCK
  HARD_ROCK
  FILL_OR_MADE_UP
  UNKNOWN
}

enum FloodHistory {
  NEVER
  ONCE
  REPEATEDLY
  UNKNOWN
}
```

---

## 3. Current Ephemeral Support (`site_info`)

The active API routes (`POST /api/predict`) accept the ephemeral `site_info` payload mirroring these parameters:
- `dominant_soil_type`
- `groundwater_depth_m`
- `safe_bearing_capacity`
- `spt_n_value`
- `flood_history`
- `prev_water_body`

The data is echoed back in the prediction response under `site_info` with the warning:
> *"Site and soil details were provided but are not used in the price estimate."*
