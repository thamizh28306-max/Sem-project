import os
import json
from datetime import datetime, timezone
import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

# IMPORTANT NOTE ON METRICS:
# These metrics measure how well the model fits our synthetic generator,
# NOT real-market accuracy. They must not be presented to users as real-market accuracy.

np.random.seed(42)
COVERAGE_LEVEL = 0.80  # 80% conformal prediction interval
REAL_SAMPLE_WEIGHT = 5.0
MIN_REAL_ROWS = 200

LOCALITIES_FILE = os.path.join(os.path.dirname(__file__), "localities.json")
if not os.path.exists(LOCALITIES_FILE):
    raise FileNotFoundError(f"Missing config file: {LOCALITIES_FILE}")

with open(LOCALITIES_FILE, "r", encoding="utf-8") as f:
    localities_config = json.load(f)

loc_entries = localities_config.get("localities", [])
localities = [l["name"] for l in loc_entries]
base_rates = {l["name"]: l["base_rate_per_sqft"] for l in loc_entries}
centroids = {l["name"]: l["centroid"] for l in loc_entries}
locality_status = {l["name"]: l.get("status", "assumed") for l in loc_entries}

property_types = [
    "Residential Plot",
    "Independent House/Villa",
    "Apartment/Flat",
    "Commercial",
    "Other"
]

commercial_subtypes = ["none", "Shop", "Office space", "Showroom", "Warehouse"]
legal_statuses = ["CMDA/DTCP approved", "Panchayat", "Unapproved", "Not sure"]
facings = ["none", "North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"]

def generate_synthetic_data(n=10000):
    rows = []
    for _ in range(n):
        p_type = np.random.choice(property_types, p=[0.25, 0.25, 0.35, 0.10, 0.05])
        loc = np.random.choice(localities)
        base_rate = base_rates[loc]
        c = centroids[loc]
        # Jitter lat/lng around locality centroid (~0.5 - 1 km standard deviation)
        lat = round(float(c["lat"] + np.random.normal(0, 0.007)), 5)
        lng = round(float(c["lng"] + np.random.normal(0, 0.007)), 5)

        # Distances & surroundings
        school_dist = round(float(np.random.uniform(0.2, 5.0)), 2)
        hospital_dist = round(float(np.random.uniform(0.3, 6.0)), 2)
        bus_dist = round(float(np.random.uniform(0.1, 3.5)), 2)
        metro_dist = round(float(np.random.uniform(0.3, 10.0)), 2)
        supermarket_dist = round(float(np.random.uniform(0.2, 4.0)), 2)
        park_dist = round(float(np.random.uniform(0.2, 5.0)), 2)

        # Calculate amenity score (0 to 100)
        score_raw = 100 - (
            school_dist * 4 +
            hospital_dist * 3 +
            bus_dist * 5 +
            metro_dist * 3 +
            supermarket_dist * 3 +
            park_dist * 2
        )
        amenity_score = max(10, min(100, round(score_raw)))

        # Common fields
        road_width_ft = int(np.random.choice([20, 24, 30, 40, 60, 80]))
        approved = str(np.random.choice(legal_statuses, p=[0.60, 0.15, 0.15, 0.10]))
        corner = int(np.random.choice([0, 1], p=[0.8, 0.2]))
        flood_prone = int(np.random.choice([0, 1], p=[0.85, 0.15]))

        # Type-specific defaults
        area_sqft = 0
        built_up_sqft = 0
        bhk = 0
        bathrooms = 0
        age_years = 0
        floor = 0
        total_floors = 0
        parking = 0
        furnished = 0
        lift = 0
        power_backup = 0
        gated = 0
        facing = str(np.random.choice(facings[1:]))
        frontage_ft = 0
        comm_subtype = "none"

        type_mult = 1.0

        if p_type == "Residential Plot":
            area_sqft = int(np.random.randint(600, 4800))
            built_up_sqft = 0
            type_mult = 0.95
        elif p_type == "Independent House/Villa":
            area_sqft = int(np.random.randint(800, 4000))
            built_up_sqft = int(area_sqft * np.random.uniform(0.9, 1.8))
            bhk = int(np.random.choice([2, 3, 4, 5, 6], p=[0.2, 0.4, 0.25, 0.1, 0.05]))
            bathrooms = int(max(1, bhk + np.random.choice([-1, 0, 1])))
            age_years = int(np.random.randint(0, 30))
            total_floors = int(np.random.choice([1, 2, 3], p=[0.4, 0.5, 0.1]))
            floor = 0
            parking = int(np.random.choice([0, 1, 2, 3], p=[0.1, 0.4, 0.35, 0.15]))
            furnished = int(np.random.choice([0, 1, 2], p=[0.3, 0.5, 0.2]))
            power_backup = int(np.random.choice([0, 1], p=[0.6, 0.4]))
            gated = int(np.random.choice([0, 1], p=[0.7, 0.3]))
            type_mult = 1.25
        elif p_type == "Apartment/Flat":
            built_up_sqft = int(np.random.randint(450, 2800))
            area_sqft = built_up_sqft
            bhk = int(np.random.choice([1, 2, 3, 4, 5], p=[0.15, 0.45, 0.3, 0.08, 0.02]))
            bathrooms = int(max(1, bhk + np.random.choice([-1, 0, 1])))
            age_years = int(np.random.randint(0, 25))
            total_floors = int(np.random.randint(3, 20))
            floor = int(np.random.randint(0, total_floors))
            parking = int(np.random.choice([0, 1, 2, 3], p=[0.15, 0.55, 0.25, 0.05]))
            furnished = int(np.random.choice([0, 1, 2], p=[0.35, 0.45, 0.2]))
            lift = int(np.random.choice([0, 1], p=[0.15, 0.85]))
            power_backup = int(np.random.choice([0, 1], p=[0.25, 0.75]))
            gated = int(np.random.choice([0, 1], p=[0.3, 0.7]))
            type_mult = 1.0
        elif p_type == "Commercial":
            area_sqft = int(np.random.randint(300, 5000))
            built_up_sqft = area_sqft
            comm_subtype = str(np.random.choice(["Shop", "Office space", "Showroom", "Warehouse"], p=[0.35, 0.35, 0.2, 0.1]))
            age_years = int(np.random.randint(0, 25))
            floor = int(np.random.randint(0, 10))
            total_floors = int(max(floor, np.random.randint(1, 12)))
            frontage_ft = int(np.random.randint(10, 80))
            parking = int(np.random.choice([0, 1, 2, 3], p=[0.2, 0.4, 0.3, 0.1]))
            furnished = int(np.random.choice([0, 1, 2], p=[0.5, 0.3, 0.2]))
            lift = int(np.random.choice([0, 1], p=[0.3, 0.7]))
            power_backup = int(np.random.choice([0, 1], p=[0.2, 0.8]))
            type_mult = 1.45
        else:
            area_sqft = int(np.random.randint(1000, 8000))
            built_up_sqft = int(area_sqft * 0.5)
            age_years = int(np.random.randint(0, 30))
            type_mult = 0.85

        effective_area = built_up_sqft if built_up_sqft > 0 else area_sqft
        calc_rate = base_rate * type_mult

        approval_mult = 1.0
        if approved == "CMDA/DTCP approved":
            approval_mult = 1.0
        elif approved == "Panchayat":
            approval_mult = 0.90
        elif approved == "Unapproved":
            approval_mult = 0.80
        elif approved == "Not sure":
            approval_mult = 0.88

        corner_mult = 1.04 if corner == 1 else 1.0
        flood_mult = 0.91 if flood_prone == 1 else 1.0
        metro_mult = 1.06 if metro_dist <= 1.0 else (1.03 if metro_dist <= 2.5 else 1.0)
        road_mult = 1.0 + (road_width_ft - 20) * 0.0015
        age_mult = max(0.70, 1.0 - (age_years * 0.007))
        amenity_mult = 1.0 + (lift * 0.02) + (power_backup * 0.02) + (gated * 0.03)

        price = effective_area * calc_rate * approval_mult * corner_mult * flood_mult * metro_mult * road_mult * age_mult * amenity_mult
        price += (
            bhk * 45000 +
            parking * 35000 +
            furnished * 40000 +
            (frontage_ft * 8000 if comm_subtype in ["Shop", "Showroom"] else 0) -
            (school_dist * 8000) -
            (hospital_dist * 6000)
        )

        noise = np.random.normal(0, price * 0.03)
        final_price = max(price + noise, 400000)

        rows.append([
            p_type, loc, lat, lng, area_sqft, built_up_sqft, bhk, bathrooms, age_years, floor, total_floors,
            parking, furnished, lift, power_backup, gated, facing, road_width_ft, corner,
            flood_prone, approved, frontage_ft, comm_subtype, school_dist, hospital_dist,
            bus_dist, metro_dist, supermarket_dist, park_dist, amenity_score, final_price
        ])

    columns = [
        "property_type", "locality", "lat", "lng", "area_sqft", "built_up_sqft", "bhk", "bathrooms",
        "age_years", "floor", "total_floors", "parking", "furnished", "lift",
        "power_backup", "gated", "facing", "road_width_ft", "corner", "flood_prone",
        "approved", "frontage_ft", "commercial_subtype", "school_dist_km", "hospital_dist_km",
        "bus_dist_km", "metro_dist_km", "supermarket_dist_km", "park_dist_km", "amenity_score",
        "price"
    ]
    return pd.DataFrame(rows, columns=columns)

FEATURES = [
    "property_type_enc", "locality_enc", "lat", "lng", "area_sqft", "built_up_sqft", "bhk", "bathrooms",
    "age_years", "floor", "total_floors", "parking", "furnished", "lift",
    "power_backup", "gated", "facing_enc", "road_width_ft", "corner", "flood_prone",
    "approved_enc", "frontage_ft", "commercial_subtype_enc", "school_dist_km", "hospital_dist_km",
    "bus_dist_km", "metro_dist_km", "supermarket_dist_km", "park_dist_km", "amenity_score"
]

cat_cols = ["property_type", "locality", "facing", "approved", "commercial_subtype"]

# Create and fit encoders on canonical universe
encoders = {}
for col, vals in [
    ("property_type", property_types),
    ("locality", localities),
    ("facing", facings),
    ("approved", legal_statuses),
    ("commercial_subtype", commercial_subtypes)
]:
    le = LabelEncoder()
    le.fit([str(v) for v in vals])
    encoders[col] = le

def encode_df(df_in):
    df_out = df_in.copy()
    for col in cat_cols:
        enc = encoders[col]
        known = set(enc.classes_)
        df_out[col + "_enc"] = df_out[col].apply(lambda x: int(enc.transform([str(x)])[0]) if str(x) in known else 0)
    return df_out

n_trained = len([l for l in localities if locality_status.get(l) == "trained"])
n_assumed = len(localities) - n_trained
print(f"Generating synthetic training dataset for {len(localities)} localities ({n_trained} trained, {n_assumed} assumed)...")
df_synthetic = generate_synthetic_data(10000)

# Check for real data
real_data_file = os.path.join(os.path.dirname(__file__), "data", "real_listings.csv")
real_df = None
data_source = "synthetic"
n_real_rows = 0

if os.path.exists(real_data_file):
    try:
        raw_real = pd.read_csv(real_data_file)
        if "source" in raw_real.columns:
            valid_real = raw_real[raw_real["source"] != "EXAMPLE_DELETE"].copy()
        else:
            valid_real = raw_real.copy()

        if "price_inr" in valid_real.columns and "price" not in valid_real.columns:
            valid_real["price"] = valid_real["price_inr"]

        n_valid = len(valid_real)
        if n_valid >= MIN_REAL_ROWS:
            print(f"Loaded {n_valid} real listing rows from {real_data_file}.")
            real_df = valid_real
            data_source = "synthetic+real"
            n_real_rows = n_valid
        else:
            print(f"Notice: Found {n_valid} real listing rows in {real_data_file} (< {MIN_REAL_ROWS} required).")
            print("Staying synthetic-only to prevent overfitting on insufficient real listings.")
    except Exception as ex:
        print(f"Warning reading real listings file: {ex}. Proceeding with synthetic-only data.")

# Prepare datasets
if data_source == "synthetic+real" and real_df is not None:
    print(f"Training in hybrid mode: {len(df_synthetic)} synthetic rows (weight 1.0) + {n_real_rows} real rows (weight {REAL_SAMPLE_WEIGHT}).")
    df_synthetic = encode_df(df_synthetic)
    real_df = encode_df(real_df)

    s_train, s_temp = train_test_split(df_synthetic, test_size=0.30, random_state=42)
    s_cal, s_test = train_test_split(s_temp, test_size=0.50, random_state=42)

    r_train, r_temp = train_test_split(real_df, test_size=0.30, random_state=42)
    r_cal, r_test = train_test_split(r_temp, test_size=0.50, random_state=42)

    s_train["sample_weight"] = 1.0
    r_train["sample_weight"] = REAL_SAMPLE_WEIGHT
    df_train = pd.concat([s_train, r_train], ignore_index=True)

    df_cal = r_cal
    df_test = r_test
else:
    print("Training in synthetic-only mode (70% train / 15% calibration / 15% test).")
    df_synthetic = encode_df(df_synthetic)
    df_train, df_temp = train_test_split(df_synthetic, test_size=0.30, random_state=42)
    df_cal, df_test = train_test_split(df_temp, test_size=0.50, random_state=42)
    df_train["sample_weight"] = 1.0

X_train = df_train[FEATURES]
y_train = df_train["price"].astype(float)
weights_train = df_train["sample_weight"].values

X_cal = df_cal[FEATURES]
y_cal = df_cal["price"].astype(float)

X_test = df_test[FEATURES]
y_test = df_test["price"].astype(float)

# Compute feature ranges (min, max, median) on training set
numeric_features = [
    "lat", "lng", "area_sqft", "built_up_sqft", "bhk", "bathrooms",
    "age_years", "floor", "total_floors", "parking", "furnished", "lift",
    "power_backup", "gated", "road_width_ft", "corner", "flood_prone",
    "frontage_ft", "school_dist_km", "hospital_dist_km",
    "bus_dist_km", "metro_dist_km", "supermarket_dist_km", "park_dist_km", "amenity_score"
]
feature_ranges = {}
for col in numeric_features:
    feature_ranges[col] = {
        "min": round(float(X_train[col].min()), 4),
        "max": round(float(X_train[col].max()), 4),
        "median": round(float(X_train[col].median()), 4)
    }

print(f"Dataset split: Train = {len(X_train)} rows, Calibration = {len(X_cal)} rows, Test = {len(X_test)} rows.")

model = XGBRegressor(
    n_estimators=350,
    max_depth=6,
    learning_rate=0.07,
    subsample=0.85,
    colsample_bytree=0.85,
    random_state=42
)

model.fit(
    X_train,
    y_train,
    sample_weight=weights_train,
    eval_set=[(X_cal, y_cal)],
    verbose=False
)

# ── Split Conformal Prediction on Calibration Set ─────────────────────────────
cal_preds = model.predict(X_cal)
cal_residuals = (y_cal.values - cal_preds) / cal_preds

alpha = 1.0 - COVERAGE_LEVEL
lower_percentile = (alpha / 2.0) * 100.0
upper_percentile = (1.0 - (alpha / 2.0)) * 100.0

q_low = float(np.percentile(cal_residuals, lower_percentile))
q_high = float(np.percentile(cal_residuals, upper_percentile))
interval_relative_bounds = [round(q_low, 4), round(q_high, 4)]

print("\n" + "=" * 65)
print(f"SPLIT CONFORMAL CALIBRATION ({int(COVERAGE_LEVEL * 100)}% Coverage Level)")
print("=" * 65)
print(f"Calibration residual 10th percentile (lower relative bound): {q_low:+.4f} ({q_low*100:+.2f}%)")
print(f"Calibration residual 90th percentile (upper relative bound): {q_high:+.4f} ({q_high*100:+.2f}%)")
print(f"Interval relative bounds: {interval_relative_bounds}")

# ── Test Set Evaluation ───────────────────────────────────────────────────────
test_preds = model.predict(X_test)
test_r2 = float(r2_score(y_test, test_preds))
test_mae = float(mean_absolute_error(y_test, test_preds))
test_mape = float(np.mean(np.abs((y_test.values - test_preds) / y_test.values)) * 100.0)

print("\n" + "=" * 65)
print("TEST SET EVALUATION METRICS")
print("NOTE: These metrics measure how well the model fits our synthetic")
print("generator, NOT real-market accuracy.")
print("=" * 65)
print(f"Overall Test R2   : {test_r2:.4f}")
print(f"Overall Test MAE  : INR {test_mae:,.0f}")
print(f"Overall Test MAPE : {test_mape:.2f}%")

# Metrics per locality
per_locality_metrics = {}
per_locality_mape = {}
print("\n" + "-" * 65)
print(f"{'Locality':<18} | {'Status':<8} | {'Count':<6} | {'R2':<8} | {'MAE (INR)':<14} | {'MAPE (%)':<8}")
print("-" * 65)
for loc in localities:
    mask = (df_test["locality"] == loc).values
    if np.sum(mask) > 0:
        y_loc = y_test.values[mask]
        p_loc = test_preds[mask]
        loc_mae = float(mean_absolute_error(y_loc, p_loc))
        loc_mape = float(np.mean(np.abs((y_loc - p_loc) / y_loc)) * 100.0)
        loc_r2 = float(r2_score(y_loc, p_loc)) if len(y_loc) > 1 else 0.0
        status = locality_status.get(loc, "assumed")
        per_locality_metrics[loc] = {
            "status": status,
            "r2": round(loc_r2, 4),
            "mae": round(loc_mae, 2),
            "mape": round(loc_mape, 2),
            "n_test_samples": int(np.sum(mask))
        }
        per_locality_mape[loc] = round(loc_mape, 2)
        print(f"{loc:<18} | {status:<8} | {int(np.sum(mask)):<6} | {loc_r2:<8.4f} | INR {loc_mae:<10,.0f} | {loc_mape:<7.2f}%")

# Metrics per property type
per_property_type_metrics = {}
print("\n" + "-" * 65)
print(f"{'Property Type':<26} | {'Count':<6} | {'R2':<8} | {'MAE (INR)':<14} | {'MAPE (%)':<8}")
print("-" * 65)
for pt in property_types:
    mask = (df_test["property_type"] == pt).values
    if np.sum(mask) > 0:
        y_pt = y_test.values[mask]
        p_pt = test_preds[mask]
        pt_mae = float(mean_absolute_error(y_pt, p_pt))
        pt_mape = float(np.mean(np.abs((y_pt - p_pt) / y_pt)) * 100.0)
        pt_r2 = float(r2_score(y_pt, p_pt)) if len(y_pt) > 1 else 0.0
        per_property_type_metrics[pt] = {
            "r2": round(pt_r2, 4),
            "mae": round(pt_mae, 2),
            "mape": round(pt_mape, 2),
            "n_test_samples": int(np.sum(mask))
        }
        print(f"{pt:<26} | {int(np.sum(mask)):<6} | {pt_r2:<8.4f} | INR {pt_mae:<10,.0f} | {pt_mape:<7.2f}%")
print("=" * 65)

# Save model_metadata.json
now_iso = datetime.now(timezone.utc).isoformat()
metadata = {
    "model_version": f"v2.1-{now_iso}",
    "trained_at": now_iso,
    "n_train_rows": int(len(X_train)),
    "n_calibration_rows": int(len(X_cal)),
    "n_test_rows": int(len(X_test)),
    "n_real_rows": int(n_real_rows),
    "data_source": data_source,
    "localities": localities,
    "locality_status": locality_status,
    "features": FEATURES,
    "feature_ranges": feature_ranges,
    "interval_coverage": COVERAGE_LEVEL,
    "interval_relative_bounds": interval_relative_bounds,
    "validation_mape": round(test_mape, 2),
    "test_metrics": {
        "r2": round(test_r2, 4),
        "mae": round(test_mae, 2),
        "mape": round(test_mape, 2)
    },
    "per_locality_mape": per_locality_mape,
    "per_locality_metrics": per_locality_metrics,
    "per_property_type_metrics": per_property_type_metrics,
    "warning": "Demo estimate trained on synthetic data. Not a valuation.",
    "synthetic_disclaimer": "These metrics measure how well the model fits our synthetic generator, NOT real-market accuracy."
}

metadata_path = os.path.join(os.path.dirname(__file__), "model_metadata.json")
with open(metadata_path, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2)
print(f"\nSaved metadata to {metadata_path}")

# Save bundle to model.pkl
bundle = {
    "model": model,
    "encoders": encoders,
    "features": FEATURES,
    "feature_ranges": feature_ranges,
    "property_types": property_types,
    "localities": localities,
    "locality_status": locality_status,
    "centroids": centroids,
    "base_rates": base_rates,
    "model_version": metadata["model_version"],
    "data_source": data_source,
    "interval_coverage": COVERAGE_LEVEL,
    "interval_relative_bounds": interval_relative_bounds,
    "validation_mape": round(test_mape, 2)
}

model_path = os.path.join(os.path.dirname(__file__), "model.pkl")
joblib.dump(bundle, model_path)
print(f"Saved model bundle to {model_path}")
