import os
import sys
import json
from datetime import datetime, timezone
import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error
import joblib

REAL_DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "real_listings.csv")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")
REPORT_PATH = os.path.join(os.path.dirname(__file__), "real_validation_report.json")

def main():
    print("=" * 65)
    print("DATAZEN - REAL MARKET LISTINGS VALIDATION")
    print("=" * 65)

    if not os.path.exists(REAL_DATA_PATH):
        print("\nFriendly Notice: No real listings dataset found at:")
        print(f"  {REAL_DATA_PATH}")
        print("\nTo validate the model against real market data:")
        print("  1. Copy 'data/real_listings_template.csv' to 'data/real_listings.csv'")
        print("  2. Add real Chennai property listings (remove EXAMPLE_DELETE rows)")
        print("  3. Run 'python validate_real.py' again.")
        print("\nExiting cleanly (no real data to validate).")
        sys.exit(0)

    try:
        df_raw = pd.read_csv(REAL_DATA_PATH)
    except Exception as e:
        print(f"Error loading {REAL_DATA_PATH}: {e}")
        sys.exit(1)

    # Filter out placeholder example rows
    if "source" in df_raw.columns:
        df = df_raw[df_raw["source"] != "EXAMPLE_DELETE"].copy()
    else:
        df = df_raw.copy()

    if len(df) == 0:
        print("\nFriendly Notice: 'data/real_listings.csv' contains only EXAMPLE_DELETE rows or is empty.")
        print("Please add verified real listing rows to run validation.")
        print("Exiting cleanly.")
        sys.exit(0)

    # Target price column
    price_col = None
    if "price_inr" in df.columns:
        price_col = "price_inr"
    elif "price" in df.columns:
        price_col = "price"
    else:
        print("Error: Neither 'price_inr' nor 'price' column found in real listings.")
        sys.exit(1)

    # Check model
    if not os.path.exists(MODEL_PATH):
        print(f"Error: Trained model bundle not found at {MODEL_PATH}. Run 'python train.py' first.")
        sys.exit(1)

    bundle = joblib.load(MODEL_PATH)
    model = bundle.get("model")
    encoders = bundle.get("encoders", {})
    features = bundle.get("features", [])

    if model is None or not encoders or not features:
        print("Error: Model bundle is incomplete or corrupted.")
        sys.exit(1)

    # Fill and encode features
    df_eval = df.copy()

    # Ensure required numerical columns exist with defaults
    numeric_defaults = {
        "lat": 13.0827, "lng": 80.2707,
        "area_sqft": 1000.0, "built_up_sqft": 0.0, "bhk": 2, "bathrooms": 2,
        "age_years": 0, "floor": 0, "total_floors": 1, "parking": 1,
        "furnished": 0, "lift": 0, "power_backup": 0, "gated": 0,
        "road_width_ft": 30, "corner": 0, "flood_prone": 0, "frontage_ft": 0,
        "school_dist_km": 1.0, "hospital_dist_km": 1.5, "bus_dist_km": 0.5,
        "metro_dist_km": 2.0, "supermarket_dist_km": 0.8, "park_dist_km": 1.2,
        "amenity_score": 75.0
    }
    for col, default in numeric_defaults.items():
        if col not in df_eval.columns:
            df_eval[col] = default
        else:
            df_eval[col] = pd.to_numeric(df_eval[col], errors="coerce").fillna(default)

    # Encode categorical columns
    cat_cols = ["property_type", "locality", "facing", "approved", "commercial_subtype"]
    for col in cat_cols:
        enc = encoders.get(col)
        enc_col = col + "_enc"
        if col not in df_eval.columns:
            df_eval[col] = "Apartment/Flat" if col == "property_type" else ("Anna Nagar" if col == "locality" else "none")
        if enc is not None:
            known = set(enc.classes_)
            df_eval[enc_col] = df_eval[col].astype(str).apply(lambda x: int(enc.transform([x])[0]) if x in known else 0)
        else:
            df_eval[enc_col] = 0

    X = df_eval[features]
    y_actual = df_eval[price_col].astype(float).values

    # Run predictions
    y_pred = model.predict(X)

    # Compute validation metrics
    mae = float(mean_absolute_error(y_actual, y_pred))
    pct_errors = np.abs((y_actual - y_pred) / y_actual) * 100.0
    mape = float(np.mean(pct_errors))

    diffs = y_pred - y_actual
    mean_diff = float(np.mean(diffs))
    bias_pct = float((np.mean(y_pred) - np.mean(y_actual)) / np.mean(y_actual) * 100.0)
    bias_direction = "overestimation" if mean_diff > 0 else "underestimation"

    # Per-locality MAPE
    per_locality_mape = {}
    per_locality_details = {}
    for loc in sorted(df_eval["locality"].unique()):
        mask = (df_eval["locality"] == loc).values
        if np.sum(mask) > 0:
            loc_actual = y_actual[mask]
            loc_pred = y_pred[mask]
            loc_mape = float(np.mean(np.abs((loc_actual - loc_pred) / loc_actual)) * 100.0)
            loc_mae = float(mean_absolute_error(loc_actual, loc_pred))
            per_locality_mape[str(loc)] = round(loc_mape, 2)
            per_locality_details[str(loc)] = {
                "count": int(np.sum(mask)),
                "mae": round(loc_mae, 2),
                "mape": round(loc_mape, 2)
            }

    # Worst 10 errors
    df_eval["actual_price"] = y_actual
    df_eval["predicted_price"] = y_pred
    df_eval["diff_inr"] = diffs
    df_eval["abs_error_inr"] = np.abs(diffs)
    df_eval["pct_error"] = pct_errors

    worst_10_df = df_eval.sort_values(by="pct_error", ascending=False).head(10)
    worst_10 = []
    for rank, (_, row) in enumerate(worst_10_df.iterrows(), 1):
        worst_10.append({
            "rank": rank,
            "locality": str(row.get("locality", "Unknown")),
            "property_type": str(row.get("property_type", "Unknown")),
            "actual_price": round(float(row["actual_price"])),
            "predicted_price": round(float(row["predicted_price"])),
            "diff_inr": round(float(row["diff_inr"])),
            "pct_error": round(float(row["pct_error"]), 2)
        })

    # Print results
    print(f"\nValidated on {len(df_eval)} real listing(s).")
    print(f"Overall MAE   : INR {mae:,.0f}")
    print(f"Overall MAPE  : {mape:.2f}%")
    print(f"Overall Bias  : INR {mean_diff:+,.0f} ({bias_pct:+.2f}%) [{bias_direction}]")

    print("\n" + "-" * 65)
    print(f"{'Locality':<18} | {'Listings':<10} | {'MAE (INR)':<16} | {'MAPE (%)':<8}")
    print("-" * 65)
    for loc, d in per_locality_details.items():
        print(f"{loc:<18} | {d['count']:<10} | INR {d['mae']:<12,.0f} | {d['mape']:<7.2f}%")

    print("\n" + "-" * 65)
    print("WORST 10 PREDICTION ERRORS (by % error):")
    print("-" * 65)
    print(f"{'Rank':<5} | {'Locality':<14} | {'Actual (INR)':<14} | {'Predicted (INR)':<16} | {'Error %':<8}")
    print("-" * 65)
    for w in worst_10:
        print(f"{w['rank']:<5} | {w['locality']:<14} | INR {w['actual_price']:<10,} | INR {w['predicted_price']:<12,} | {w['pct_error']:<7.2f}%")
    print("=" * 65)

    # Write report
    report = {
        "validated_at": datetime.now(timezone.utc).isoformat(),
        "n_real_listings": int(len(df_eval)),
        "model_version": bundle.get("model_version", "unknown"),
        "overall_metrics": {
            "mae": round(mae, 2),
            "mape": round(mape, 2),
            "bias_mean_inr": round(mean_diff, 2),
            "bias_pct": round(bias_pct, 2),
            "bias_direction": bias_direction
        },
        "per_locality_mape": per_locality_mape,
        "per_locality_details": per_locality_details,
        "worst_10_errors": worst_10
    }

    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"\nValidation report saved to {REPORT_PATH}")

if __name__ == "__main__":
    main()
