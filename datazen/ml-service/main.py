from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import numpy as np
import joblib
import json
import math
import os

# IMPORTANT NOTE ON METRICS:
# These metrics measure how well the model fits our synthetic generator, NOT real-market accuracy.
# Predictions and intervals are for demonstration and benchmark guidance only.

app = FastAPI(title="DataZen ML Service", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")
METADATA_PATH = os.path.join(os.path.dirname(__file__), "model_metadata.json")
LOCALITIES_PATH = os.path.join(os.path.dirname(__file__), "localities.json")

# Load localities config
LOCALITIES_CONFIG = []
CHENNAI_BOUNDS = {
    "lat_min": 12.7,
    "lat_max": 13.3,
    "lng_min": 79.9,
    "lng_max": 80.4,
    "description": "Chennai Metropolitan Area Bounding Box"
}

if os.path.exists(LOCALITIES_PATH):
    try:
        with open(LOCALITIES_PATH, "r", encoding="utf-8") as f:
            cfg = json.load(f)
            LOCALITIES_CONFIG = cfg.get("localities", [])
            if "chennai_bounds" in cfg:
                CHENNAI_BOUNDS = cfg["chennai_bounds"]
    except Exception as e:
        print(f"Warning loading localities.json: {e}")

bundle = None
model = None
encoders = {}
metadata = {}
feature_ranges = {}
locality_status = {}
KNOWN_LOCALITIES = [l["name"] for l in LOCALITIES_CONFIG]
KNOWN_TYPES = ["Residential Plot", "Independent House/Villa", "Apartment/Flat", "Commercial", "Other"]
BASE_RATES = {l["name"]: l.get("base_rate_per_sqft", 7000) for l in LOCALITIES_CONFIG}

# Load metadata
if os.path.exists(METADATA_PATH):
    try:
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            metadata = json.load(f)
            feature_ranges = metadata.get("feature_ranges", {})
            locality_status = metadata.get("locality_status", {})
    except Exception as e:
        print(f"Warning loading model_metadata.json: {e}")

# Load model bundle
if os.path.exists(MODEL_PATH):
    try:
        bundle = joblib.load(MODEL_PATH)
        model = bundle.get("model")
        encoders = bundle.get("encoders", {})
        if "localities" in bundle:
            KNOWN_LOCALITIES = bundle["localities"]
        if "property_types" in bundle:
            KNOWN_TYPES = bundle["property_types"]
        if "feature_ranges" in bundle:
            feature_ranges = bundle["feature_ranges"]
        if "locality_status" in bundle:
            locality_status = bundle["locality_status"]
    except Exception as e:
        print(f"Warning loading model.pkl: {e}")

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def resolve_coverage(locality_input: Optional[str], lat: Optional[float], lng: Optional[float]) -> Dict[str, Any]:
    # Case 1: Lat/Lng provided
    if lat is not None and lng is not None:
        lat_f = float(lat)
        lng_f = float(lng)

        # Check Chennai metro bounding box
        if (lat_f < CHENNAI_BOUNDS["lat_min"] or lat_f > CHENNAI_BOUNDS["lat_max"] or
            lng_f < CHENNAI_BOUNDS["lng_min"] or lng_f > CHENNAI_BOUNDS["lng_max"]):
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "OUT_OF_COVERAGE",
                    "message": f"Coordinates ({lat_f:.4f}, {lng_f:.4f}) are outside the Chennai metro coverage area (lat 12.7-13.3, lng 79.9-80.4). DataZen only covers the Chennai metropolitan area."
                }
            )

        # Calculate distances to all centroids
        nearest_entry = None
        min_dist = float("inf")
        for entry in LOCALITIES_CONFIG:
            c = entry["centroid"]
            d = haversine_km(lat_f, lng_f, c["lat"], c["lng"])
            if d < min_dist:
                min_dist = d
                nearest_entry = entry

        # Check alias match first if a locality name was also provided
        alias_entry = None
        alias_dist = None
        if locality_input and locality_input.strip():
            clean_input = locality_input.strip().lower()
            for entry in LOCALITIES_CONFIG:
                all_names = [entry["name"].lower()] + [a.lower() for a in entry.get("aliases", [])]
                if clean_input in all_names or any(clean_input in a for a in all_names):
                    alias_entry = entry
                    alias_dist = haversine_km(lat_f, lng_f, entry["centroid"]["lat"], entry["centroid"]["lng"])
                    break

        # If alias matched and is within 8 km, prefer the user's named locality
        if alias_entry and alias_dist is not None and alias_dist <= 8.0:
            resolved = alias_entry
            res_dist = alias_dist
            resolution = "exact" if res_dist <= 3.0 else "nearest"
        else:
            resolved = nearest_entry
            res_dist = min_dist
            resolution = "exact" if res_dist <= 1.5 else "nearest"

        if res_dist > 8.0 or resolved is None:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "OUT_OF_COVERAGE",
                    "message": f"Location ({lat_f:.4f}, {lng_f:.4f}) is {res_dist:.1f} km from the nearest supported locality '{resolved['name'] if resolved else 'unknown'}' (maximum coverage radius is 8.0 km). Outside coverage area."
                }
            )

        is_assumed = (resolved.get("status") == "assumed")
        if res_dist <= 3.0:
            coverage = "assumed-rate" if is_assumed else ("exact" if resolution == "exact" else "nearest")
            coverage_widening = 1.0
        else:
            # 3.0 km to 8.0 km: extrapolated coverage
            coverage = "assumed-rate" if is_assumed else "extrapolated"
            coverage_widening = 1.5

        return {
            "resolved_locality": resolved["name"],
            "resolution": resolution,
            "resolution_distance_km": round(res_dist, 2),
            "coverage": coverage,
            "coverage_widening": coverage_widening,
            "status": resolved.get("status", "trained"),
            "lat": lat_f,
            "lng": lng_f,
            "base_rate": resolved.get("base_rate_per_sqft", 7000)
        }

    # Case 2: Only locality string provided (e.g. old 9-field request)
    if locality_input and locality_input.strip():
        clean_input = locality_input.strip().lower()
        for entry in LOCALITIES_CONFIG:
            all_names = [entry["name"].lower()] + [a.lower() for a in entry.get("aliases", [])]
            if clean_input in all_names or any(clean_input in a for a in all_names):
                is_assumed = (entry.get("status") == "assumed")
                return {
                    "resolved_locality": entry["name"],
                    "resolution": "exact",
                    "resolution_distance_km": 0.0,
                    "coverage": "assumed-rate" if is_assumed else "exact",
                    "coverage_widening": 1.0,
                    "status": entry.get("status", "trained"),
                    "lat": entry["centroid"]["lat"],
                    "lng": entry["centroid"]["lng"],
                    "base_rate": entry.get("base_rate_per_sqft", 7000)
                }

        raise HTTPException(
            status_code=422,
            detail={
                "code": "OUT_OF_COVERAGE",
                "message": f"Locality '{locality_input}' is outside the supported Chennai coverage area."
            }
        )

    raise HTTPException(
        status_code=422,
        detail={
            "code": "OUT_OF_COVERAGE",
            "message": "Either 'locality' or 'lat'/'lng' coordinates must be provided."
        }
    )

class PropertyInput(BaseModel):
    # Location fields
    locality:               Optional[str]   = None
    lat:                    Optional[float] = None
    lng:                    Optional[float] = None

    # Common fields
    property_type:          Optional[str]   = "Apartment/Flat"
    area_sqft:              float
    built_up_sqft:          Optional[float] = 0.0
    road_width_ft:          Optional[int]   = 30
    approved:               Optional[str]   = "CMDA/DTCP approved"
    corner:                 Optional[int]   = 0
    flood_prone:            Optional[int]   = 0

    # House / Apartment fields
    bhk:                    Optional[int]   = 2
    bathrooms:              Optional[int]   = 2
    age_years:              Optional[int]   = 0
    floor:                  Optional[int]   = 0
    total_floors:           Optional[int]   = 1
    parking:                Optional[int]   = 1   # 0=none, 1=bike/1 car, 2=2 cars, 3=3+ cars
    furnished:              Optional[int]   = 0   # 0=unfurnished, 1=semi, 2=fully
    lift:                   Optional[int]   = 0
    power_backup:           Optional[int]   = 0
    gated:                  Optional[int]   = 0
    facing:                 Optional[str]   = "North"

    # Commercial fields
    commercial_subtype:     Optional[str]   = "none"
    frontage_ft:            Optional[int]   = 0

    # Distances & amenities (None implies missing from Overpass, triggering imputation)
    school_dist_km:         Optional[float] = None
    hospital_dist_km:       Optional[float] = None
    bus_dist_km:            Optional[float] = None
    metro_dist_km:          Optional[float] = None
    supermarket_dist_km:    Optional[float] = None
    park_dist_km:           Optional[float] = None
    amenity_score:          Optional[float] = 75.0
    notes:                  Optional[str]   = ""

@app.get("/coverage")
def get_coverage():
    return {
        "status": "ok",
        "bounds": CHENNAI_BOUNDS,
        "localities": LOCALITIES_CONFIG
    }

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": "XGBoost v2.1 (Multi-Property Chennai Intelligence)",
        "model_version": metadata.get("model_version", "v2.1-synthetic"),
        "data_source": metadata.get("data_source", "synthetic"),
        "n_train_rows": metadata.get("n_train_rows", 0),
        "test_metrics": metadata.get("test_metrics", {}),
        "property_types": KNOWN_TYPES,
        "localities": KNOWN_LOCALITIES,
        "note": "These metrics measure how well the model fits our synthetic generator, NOT real-market accuracy."
    }

def encode_value(encoder_dict, col_name, val, default=0):
    enc = encoder_dict.get(col_name)
    if enc is None:
        return default
    try:
        if str(val) in enc.classes_:
            return int(enc.transform([str(val)])[0])
        return default
    except Exception:
        return default

def calculate_heuristic_prediction(data: PropertyInput, resolved_base_rate: int, resolved_locality: str):
    base_rate = resolved_base_rate or BASE_RATES.get(resolved_locality, 7000)
    
    # Map property type name
    pt = data.property_type or "Apartment/Flat"
    type_mult = 1.0
    if "Commercial" in pt:
        type_mult = 1.45
    elif "Villa" in pt or "House" in pt:
        type_mult = 1.25
    elif "Plot" in pt:
        type_mult = 0.95
    elif "Apartment" in pt or "Flat" in pt:
        type_mult = 1.0
    else:
        type_mult = 0.85

    # Legal approval
    appr = data.approved or "CMDA/DTCP approved"
    appr_mult = 1.0
    if appr == "Panchayat":
        appr_mult = 0.90
    elif appr == "Unapproved":
        appr_mult = 0.80
    elif appr == "Not sure":
        appr_mult = 0.88

    corner_mult = 1.04 if (data.corner or 0) == 1 else 1.0
    flood_mult = 0.91 if (data.flood_prone or 0) == 1 else 1.0
    metro_d = data.metro_dist_km if data.metro_dist_km is not None else 2.0
    metro_mult = 1.06 if metro_d <= 1.0 else (1.03 if metro_d <= 2.5 else 1.0)
    road_w = data.road_width_ft or 30
    road_mult = 1.0 + (road_w - 20) * 0.0015
    age = data.age_years or 0
    age_mult = max(0.70, 1.0 - (age * 0.007))
    amenity_mult = 1.0 + ((data.lift or 0) * 0.02) + ((data.power_backup or 0) * 0.02) + ((data.gated or 0) * 0.03)

    area = data.built_up_sqft if (data.built_up_sqft and data.built_up_sqft > 0) else data.area_sqft
    calc_rate = base_rate * type_mult

    price = area * calc_rate * appr_mult * corner_mult * flood_mult * metro_mult * road_mult * age_mult * amenity_mult
    price += (
        (data.bhk or 0) * 45000 +
        (data.parking or 0) * 35000 +
        (data.furnished or 0) * 40000 +
        ((data.frontage_ft or 0) * 8000 if data.commercial_subtype in ["Shop", "Showroom"] else 0) -
        ((data.school_dist_km or 1.0) * 8000)
    )
    return max(price, 400000)

@app.post("/predict")
def predict(data: PropertyInput):
    # ── 1. Coverage & Locality Resolution ─────────────────────────────────────
    cov_info = resolve_coverage(data.locality, data.lat, data.lng)
    resolved_locality = cov_info["resolved_locality"]
    resolved_lat = cov_info["lat"]
    resolved_lng = cov_info["lng"]
    coverage_status = cov_info["coverage"]
    coverage_widening = cov_info["coverage_widening"]
    res_distance_km = cov_info["resolution_distance_km"]
    locality_tier = cov_info["status"]

    # Canonicalize property_type
    p_type = data.property_type or "Apartment/Flat"
    if p_type not in KNOWN_TYPES:
        for kt in KNOWN_TYPES:
            if kt.lower() in p_type.lower():
                p_type = kt
                break

    # ── 2. Check Impossible Values (Return HTTP 422 with field-level errors) ──
    field_errors = []
    if data.area_sqft <= 0:
        field_errors.append({"field": "area_sqft", "message": f"area_sqft must be positive (> 0), got {data.area_sqft}"})

    distance_fields = ["school_dist_km", "hospital_dist_km", "bus_dist_km", "metro_dist_km", "supermarket_dist_km", "park_dist_km"]
    for d_name in distance_fields:
        val = getattr(data, d_name, None)
        if val is not None and val < 0:
            field_errors.append({"field": d_name, "message": f"{d_name} cannot be negative, got {val}"})

    if data.bhk is not None and data.bhk < 0:
        field_errors.append({"field": "bhk", "message": f"bhk cannot be negative, got {data.bhk}"})

    if data.bathrooms is not None and data.bathrooms < 0:
        field_errors.append({"field": "bathrooms", "message": f"bathrooms cannot be negative, got {data.bathrooms}"})

    if (data.floor is not None and data.total_floors is not None and
        data.total_floors > 0 and data.floor > data.total_floors):
        field_errors.append({"field": "floor", "message": f"floor ({data.floor}) cannot exceed total_floors ({data.total_floors})"})

    if p_type == "Residential Plot" and data.built_up_sqft is not None and data.built_up_sqft > data.area_sqft:
        field_errors.append({"field": "built_up_sqft", "message": f"built_up_sqft ({data.built_up_sqft}) cannot exceed plot area ({data.area_sqft}) for Residential Plot"})

    if field_errors:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "VALIDATION_ERROR",
                "message": "One or more input fields contain invalid or impossible values.",
                "errors": field_errors
            }
        )

    # ── 3. Impute Missing Distances ───────────────────────────────────────────
    imputed_fields = []
    for d_name in distance_fields:
        val = getattr(data, d_name, None)
        if val is None:
            # Impute from feature_ranges training median, default fallback 1.0 km
            med = feature_ranges.get(d_name, {}).get("median", 1.0)
            setattr(data, d_name, float(med))
            imputed_fields.append(d_name)

    # Widen interval by 1.25x per 2 imputed fields (cap at 2x)
    n_imputed = len(imputed_fields)
    imputed_widening = min(2.0, 1.25 ** (n_imputed // 2))

    # ── 4. Clamp Out-of-Range Numerical Values ────────────────────────────────
    clamped_fields = []
    all_numeric_features = [
        "area_sqft", "built_up_sqft", "bhk", "bathrooms", "age_years",
        "floor", "total_floors", "parking", "furnished", "lift",
        "power_backup", "gated", "road_width_ft", "corner", "flood_prone",
        "frontage_ft", "school_dist_km", "hospital_dist_km",
        "bus_dist_km", "metro_dist_km", "supermarket_dist_km", "park_dist_km", "amenity_score"
    ]

    for feat in all_numeric_features:
        if feat in feature_ranges:
            curr_val = getattr(data, feat, None)
            if curr_val is not None:
                f_min = feature_ranges[feat]["min"]
                f_max = feature_ranges[feat]["max"]
                val_f = float(curr_val)
                if val_f < f_min:
                    setattr(data, feat, f_min)
                    clamped_fields.append(feat)
                elif val_f > f_max:
                    setattr(data, feat, f_max)
                    clamped_fields.append(feat)

    clamp_widening = 1.25 if len(clamped_fields) > 0 else 1.0

    # Total interval widening factor
    interval_widening_factor = round(coverage_widening * imputed_widening * clamp_widening, 3)

    # ── 5. Generate Warnings and Quality Flag ──────────────────────────────────
    warnings = []
    if coverage_status == "assumed-rate":
        warnings.append(f"Base rate for {resolved_locality} is a placeholder (assumed rate). Actual market transactions are needed to verify.")
    elif coverage_status == "extrapolated":
        warnings.append(f"Location is {res_distance_km:.1f} km from {resolved_locality} centroid (extrapolated coverage). Prediction interval widened by 1.5x.")

    if imputed_fields:
        clean_imp = [f.replace("_dist_km", " distance") for f in imputed_fields]
        warnings.append(f"Missing distance values estimated using training medians: {', '.join(clean_imp)}.")

    if clamped_fields:
        clean_clp = [f.replace("_dist_km", " distance") for f in clamped_fields]
        warnings.append(f"Input values outside reliable training ranges were clamped: {', '.join(clean_clp)}.")

    if len(imputed_fields) > 3 or len(clamped_fields) > 3:
        quality = "low"
        warnings.append("Low estimation quality: multiple fields were imputed or clamped outside reliable training bounds.")
    elif len(imputed_fields) > 0 or len(clamped_fields) > 0 or coverage_status in ["extrapolated", "assumed-rate"]:
        quality = "medium"
    else:
        quality = "high"

    # ── 6. Run XGBoost Model Inference ────────────────────────────────────────
    price = None
    if model is not None and encoders:
        try:
            p_type_enc = encode_value(encoders, "property_type", p_type)
            loc_enc    = encode_value(encoders, "locality", resolved_locality)
            facing_enc = encode_value(encoders, "facing", data.facing or "North")
            appr_enc   = encode_value(encoders, "approved", data.approved or "CMDA/DTCP approved")
            comm_enc   = encode_value(encoders, "commercial_subtype", data.commercial_subtype or "none")

            features = np.array([[
                p_type_enc,
                loc_enc,
                float(resolved_lat),
                float(resolved_lng),
                float(data.area_sqft),
                float(data.built_up_sqft or 0.0),
                int(data.bhk or 0),
                int(data.bathrooms or 0),
                int(data.age_years or 0),
                int(data.floor or 0),
                int(data.total_floors or 1),
                int(data.parking or 0),
                int(data.furnished or 0),
                int(data.lift or 0),
                int(data.power_backup or 0),
                int(data.gated or 0),
                facing_enc,
                int(data.road_width_ft or 30),
                int(data.corner or 0),
                int(data.flood_prone or 0),
                appr_enc,
                int(data.frontage_ft or 0),
                comm_enc,
                float(data.school_dist_km),
                float(data.hospital_dist_km),
                float(data.bus_dist_km),
                float(data.metro_dist_km),
                float(data.supermarket_dist_km),
                float(data.park_dist_km),
                float(data.amenity_score or 75.0)
            ]])

            pred = model.predict(features)[0]
            price = float(pred)
        except Exception as ex:
            print(f"XGBoost prediction failed, falling back to heuristic: {ex}")
            price = None

    if price is None:
        price = calculate_heuristic_prediction(data, BASE_RATES.get(resolved_locality, 7000), resolved_locality)

    per_sqft = price / data.area_sqft

    # Measured uncertainty via conformal prediction relative bounds with widening
    bounds = metadata.get("interval_relative_bounds", [-0.0803, 0.0788])
    q_low = float(bounds[0]) if len(bounds) > 0 else -0.0803
    q_high = float(bounds[1]) if len(bounds) > 1 else 0.0788

    effective_low_pct = q_low * interval_widening_factor
    effective_high_pct = q_high * interval_widening_factor

    low  = max(0.0, price * (1.0 + effective_low_pct))
    high = price * (1.0 + effective_high_pct)

    # Dynamic Top Factors computation
    factors = []
    
    # 1. Location factor
    loc_rate = BASE_RATES.get(resolved_locality, 7000)
    factors.append({
        "label": f"Location: {resolved_locality} (₹{loc_rate:,}/sqft base)",
        "impact_pct": "+High" if loc_rate >= 8000 else "+Standard",
        "type": "positive"
    })

    # 2. Legal Approval factor
    appr = data.approved or "CMDA/DTCP approved"
    if appr == "CMDA/DTCP approved":
        factors.append({"label": "CMDA/DTCP approved layout", "impact_pct": "+Full Market Value", "type": "positive"})
    elif appr == "Unapproved":
        factors.append({"label": "Unapproved layout (-20% discount)", "impact_pct": "-20%", "type": "negative"})
    elif appr == "Panchayat":
        factors.append({"label": "Panchayat approval (-10% valuation)", "impact_pct": "-10%", "type": "negative"})

    # 3. Metro distance factor
    metro_d = data.metro_dist_km if data.metro_dist_km is not None else 2.0
    if metro_d <= 1.0:
        factors.append({"label": f"Metro within {metro_d:.1f} km", "impact_pct": "+6%", "type": "positive"})
    elif metro_d > 4.0:
        factors.append({"label": f"Metro {metro_d:.1f} km away", "impact_pct": "-4%", "type": "negative"})

    # 4. Flood prone factor
    if (data.flood_prone or 0) == 1:
        factors.append({"label": "Flood-prone area risk", "impact_pct": "-9%", "type": "negative"})

    # 5. Corner property
    if (data.corner or 0) == 1:
        factors.append({"label": "Corner property advantage", "impact_pct": "+4%", "type": "positive"})

    # 6. Road width
    road_w = data.road_width_ft or 30
    if road_w >= 40:
        factors.append({"label": f"Wide access road ({road_w} ft)", "impact_pct": "+3%", "type": "positive"})

    # 7. Age depreciation
    age = data.age_years or 0
    if age > 10:
        factors.append({"label": f"Building age ({age} yrs depreciation)", "impact_pct": f"-{round(age * 0.7)}%", "type": "negative"})

    # 8. Amenities (Gated / Lift)
    if (data.gated or 0) == 1 or (data.lift or 0) == 1:
        factors.append({"label": "Gated society / Lift facilities", "impact_pct": "+5%", "type": "positive"})

    return {
        "predicted_price":          round(price),
        "price_per_sqft":           round(per_sqft),
        "range_low":                round(low),
        "range_high":               round(high),
        "confidence":               None,  # Deprecated
        "interval_coverage":        metadata.get("interval_coverage", 0.8),
        "validation_mape":          metadata.get("validation_mape"),
        "data_source":              metadata.get("data_source", "synthetic"),
        "model_version":            metadata.get("model_version", "v2.1-synthetic"),
        "warning":                  "Demo estimate trained on synthetic data. Not a valuation.",
        "warnings":                 warnings,
        "locality":                 resolved_locality,
        "resolved_locality":        resolved_locality,
        "resolution_distance_km":   res_distance_km,
        "coverage":                 coverage_status,
        "quality":                  quality,
        "imputed_fields":           imputed_fields,
        "clamped_fields":           clamped_fields,
        "interval_widening_factor": interval_widening_factor,
        "property_type":            p_type,
        "factors":                  factors[:6],
        "disclaimer":               "Estimate based on synthetic training data, not live listings."
    }
