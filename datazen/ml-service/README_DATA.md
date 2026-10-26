# DataZen — Real Market Data Collection & Retraining Guide

This guide details the procedure for gathering verified real estate listing data in Chennai, evaluating the benchmark ML model against it, and retraining the model to incorporate real-market intelligence.

---

## 1. Data Schema & Requirements

### Target File
- **Template:** `ml-service/data/real_listings_template.csv`
- **Working File:** `ml-service/data/real_listings.csv`

### Sample Size Recommendations
- **Total Minimum to Train:** 200 verified listings (the training script enforces $N \ge 200$ to prevent overfitting on tiny samples).
- **Per-Locality Target:** At least **30 listings per locality** (across Anna Nagar, Velachery, OMR, Adyar, Tambaram, Porur, T Nagar, Chrompet) across residential apartments, independent houses, and plots to ensure representative coverage.

### Column Specification
| Column | Description | Example |
|---|---|---|
| `property_type` | One of: `Residential Plot`, `Independent House/Villa`, `Apartment/Flat`, `Commercial`, `Other` | `Apartment/Flat` |
| `locality` | One of the 8 supported Chennai localities | `Anna Nagar` |
| `area_sqft` | Total plot or land area in square feet | `1200` |
| `built_up_sqft` | Super built-up / carpet area (0 for plots) | `1200` |
| `bhk` | Number of bedrooms (0 for plots/bare commercial) | `2` |
| `bathrooms` | Number of bathrooms | `2` |
| `age_years` | Building age in years (0 for brand new / under construction) | `3` |
| `floor` | Floor number of the unit | `2` |
| `total_floors` | Total floors in the building | `4` |
| `parking` | 0 = none, 1 = bike/1 car, 2 = 2 cars, 3 = 3+ cars | `1` |
| `furnished` | 0 = unfurnished, 1 = semi-furnished, 2 = fully furnished | `1` |
| `lift` | 1 if lift available, 0 if not | `1` |
| `power_backup` | 1 if generator/inverter backup available, 0 if not | `1` |
| `gated` | 1 if gated community / 24x7 security, 0 if not | `1` |
| `facing` | `North`, `South`, `East`, `West`, `North-East`, etc. | `North` |
| `road_width_ft` | Access road width in feet | `30` |
| `corner` | 1 if corner plot/property, 0 otherwise | `0` |
| `flood_prone` | 1 if historical flood vulnerability (e.g. 2015/2023 floods), 0 otherwise | `0` |
| `approved` | `CMDA/DTCP approved`, `Panchayat`, `Unapproved`, `Not sure` | `CMDA/DTCP approved` |
| `frontage_ft` | Road frontage width (feet) | `0` |
| `commercial_subtype` | `none`, `Shop`, `Office space`, `Showroom`, `Warehouse` | `none` |
| `school_dist_km` | Distance to nearest school (km) | `0.8` |
| `hospital_dist_km` | Distance to nearest hospital (km) | `1.2` |
| `bus_dist_km` | Distance to nearest bus stop (km) | `0.4` |
| `metro_dist_km` | Distance to nearest metro station (km) | `1.5` |
| `supermarket_dist_km` | Distance to nearest supermarket (km) | `0.6` |
| `park_dist_km` | Distance to nearest park (km) | `0.9` |
| `amenity_score` | Neighborhood infrastructure score (0 to 100) | `82` |
| `price_inr` | Actual listing price or registered sale value in INR | `10500000` |
| `source` | Portal or registry source (e.g. `99acres`, `MagicBricks`, `TNREGINET registered sale`) | `99acres` |
| `listed_date` | Date of listing / transaction | `2026-02-15` |
| `lat` / `lng` | Geographic coordinates | `13.0850`, `80.2100` |
| `notes` | Remarks or key features | `Near roundtana, semi-furnished` |

---

## 2. Legal & Ethical Data Collection Standards

When gathering real estate listings in Chennai:
1. **Respect Terms of Service:** Always review and comply with terms of service and `robots.txt` directives of portals (e.g., 99acres, MagicBricks, Housing.com).
2. **No Personal or Contact Data:** Strictly **never** collect, scrape, or store personal identifiable information (PII) such as owners' or brokers' names, phone numbers, or email addresses.
3. **Public Property Attributes Only:** Gather only objective property characteristics (sqft, BHK, age, amenities) and asking or registered sale prices.
4. **Official Government Records:** Verified guideline values and registered deeds publicly accessible via TNREGINET (Tamil Nadu Registration Department) provide authoritative ground truth.
5. **No Denial-of-Service:** Rate limit requests strictly if accessing public APIs; do not overload external platforms.

---

## 3. Workflow: Validation and Retraining

### Step 1: Initialize the real listings file
```bash
cp data/real_listings_template.csv data/real_listings.csv
```
Open `data/real_listings.csv` in Excel or VS Code. Remove the 3 `EXAMPLE_DELETE` rows and populate your verified real listings.

### Step 2: Validate current model against real market data
Before modifying or retraining the model, measure the current model's bias and error against real listings:
```bash
python validate_real.py
```
This script will:
- Calculate real-world **MAPE** and **MAE** (INR).
- Measure **systemic bias** (whether the formula over- or under-estimates real market prices).
- Print per-locality MAPE and the **worst 10 prediction errors**.
- Save the full diagnostic report to `ml-service/real_validation_report.json`.

### Step 3: Retrain with hybrid real + synthetic data
Once at least **200 valid real rows** have been collected:
```bash
python train.py
```
`train.py` automatically detects `data/real_listings.csv`:
- If valid real rows $\ge 200$:
  - Trains in hybrid mode with real listings weighted at **5x** (`sample_weight = 5.0`).
  - Runs **split conformal calibration exclusively on real listings**, providing true market-grounded prediction intervals.
  - Updates `model_metadata.json` with `data_source: "synthetic+real"`.
- If valid real rows $< 200$:
  - Displays a notice explaining why the dataset is insufficient and continues in synthetic-only mode to prevent severe overfitting.
