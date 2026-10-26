# Soil Feature Overclaiming Audit Report — DataZen

**Date:** 2026-10-26  
**Auditor:** DataZen Geotechnical & Soil Feature Review  
**Application:** DataZen Chennai Smart Property Intelligence Platform  
**Scope:** Frontend UI (`frontend/index.html`), Backend Routes (`backend/src/routes/soil.ts`, `predict.ts`), ML Models (`ml-service/`), Documentation (`PROJECT_REPORT.txt`, `README.md`)

---

## Executive Summary

The ESP32 microcontroller with standard probe hardware measures pH, moisture, NPK (nitrogen, phosphorus, potassium), and temperature at shallow insertion depths (0–30 cm). These are **strictly agricultural topsoil parameters**.

Civil and geotechnical foundation suitability depends on deep soil stratigraphy, bearing capacity (SBC in kN/m²), Standard Penetration Test (SPT) N-values, groundwater table depth, soil plasticity (Atterberg limits), shrink-swell behavior, and whether a site sits on historic lake beds or uncompacted fill. A single topsoil probe cannot measure any of these.

The previous codebase overclaimed these capabilities (e.g. presenting "Good for Construction" badges and claiming foundation insights). This audit identifies and documents the remediation of all such claims across the codebase.

---

## 1. Audit Findings & Remediations

| # | File & Location | Original Claim / Implementation | Issue | Remediation Status |
|---|-----------------|---------------------------------|-------|-------------------|
| 1 | `frontend/index.html` (lines 3187–3193) | `getConstructionBadge()`: evaluated pH (5.5–8.0) and moisture (15–75%) to output `✅ Good for Construction` or `⚠️ Poor for Construction` badge | Grossly misleading: agricultural pH and moisture do not determine foundation capability | ✅ **Deleted**: Function completely removed. No building suitability verdict is rendered. |
| 2 | `frontend/index.html` (lines 3880–3883) | Label: `🌱 Soil Sensor Suitability Note:` with text `"Good foundation stability"` | pH 6.0–7.5 framed as indicative of foundation stability | ✅ **Replaced**: Renamed to `"🌱 Land & Soil Indicators (agricultural)"` with explicit disclaimer `"(agricultural indicators only — not a construction assessment)"`. |
| 3 | `frontend/index.html` (lines 3171–3185) | `getSoilMetric()`: returned green `#16a34a` badge labeled `"Good"` for pH, moisture, and NPK | Green "Good" styling easily misconstrued as suitability for construction | ✅ **Fixed**: Switched to neutral styling (cool blue `#0369a1` with label `"Typical range"`, amber `#d97706` for outside typical). Green color eliminated from soil UI. |
| 4 | `PROJECT_REPORT.txt` (line 24) | Description: "...offering land developers insight into foundation suitability" | Unsubstantiated marketing claim in technical documentation | ✅ **Documented**: Corrected in project documentation to "agricultural indicators for landscaping and gardening". |
| 5 | `backend/src/routes/soil.ts` (lines 38–53) | `GET /api/soil-data/:propertyId` returned only the single latest reading as the headline | A single spot reading does not represent soil behavior and conceals temporal variance | ✅ **Fixed**: Implemented `GET /api/soil-data/listing/:listingId/summary` calculating median, min, max, p10, p90, reading_quality, IQR outlier filtering, and static non-construction scope notes. |
| 6 | `backend/src/routes/predict.ts` & `frontend/index.html` | No mechanism to capture actual geotechnical factors (boreholes, bearing capacity, groundwater) | Users had no place to record legitimate structural parameters | ✅ **Added**: Added optional collapsible section `"Site & soil information (from a geotechnical report or owner records)"` for Plot and House forms, echoed informally in `site_info` with clear disclaimers that they are not used in pricing. |

---

## 2. Verification of ML Model Features

- **`ml-service/train.py` (lines 201–207)**: Verified feature list `FEATURES`. Features are strictly:
  `property_type_enc, locality_enc, lat, lng, area_sqft, built_up_sqft, bhk, bathrooms, age_years, floor, total_floors, parking, furnished, lift, power_backup, gated, facing_enc, road_width_ft, corner, flood_prone, approved_enc, frontage_ft, commercial_subtype_enc, school_dist_km, hospital_dist_km, bus_dist_km, metro_dist_km, supermarket_dist_km, park_dist_km, amenity_score`.
  **No soil sensor readings (pH, moisture, NPK) are used in model training.**
- **`ml-service/main.py` (lines 209–249)**: Verified `PropertyInput` schema. **No soil parameters exist in model inference inputs.**
- **`backend/src/routes/predict.ts`**: Verified `payload`. Geotechnical and soil sensor fields are **strictly stripped** before forwarding to ML service.
