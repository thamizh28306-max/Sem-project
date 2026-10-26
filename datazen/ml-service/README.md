# DataZen ML Service

FastAPI + XGBoost service providing property price estimation for Chennai localities.

## Model Training & Uncertainty Quantification

### ⚠️ Crucial Disclaimer on Metrics
The test metrics (R², MAE, MAPE) reported by `train.py` and returned by `/health` measure how well the XGBoost regression model **fits our synthetic generator formula**, NOT real-market valuation accuracy.
Because the training data is generated from benchmark per-sqft rate tables and multiplier heuristics, the model is learning the synthetic distribution. These metrics must **never** be advertised or presented to users as real-market accuracy.

### Split Conformal Prediction
Instead of hardcoded confidence numbers (e.g. "82%") or arbitrary percentage ranges (e.g. "±8%"), this service uses **split conformal prediction on relative errors**:
1. The synthetic dataset is split into **Train (70%)**, **Calibration (15%)**, and **Test (15%)** partitions with a fixed random seed.
2. The calibration set residuals $r_i = \frac{y_{\text{cal}} - \hat{y}_{\text{cal}}}{\hat{y}_{\text{cal}}}$ are computed.
3. For a target coverage level of 80% ($\alpha = 0.20$), the 10th and 90th percentiles of relative residuals are calculated ($q_{\text{low}}$ and $q_{\text{high}}$).
4. New estimates output prediction intervals:
   $$\text{range\_low} = \hat{y} \times (1 + q_{\text{low}})$$
   $$\text{range\_high} = \hat{y} \times (1 + q_{\text{high}})$$
5. This provides honest, measured empirical coverage on the calibration distribution.

## API Endpoints

- `GET /health`: Returns service status, `model_version`, `data_source` ("synthetic" or "synthetic+real"), `n_train_rows`, and test metrics.
- `POST /predict`: Generates price estimate, per-sqft price, measured conformal range (`range_low`, `range_high`), `interval_coverage` (0.8), `validation_mape`, and honesty warning. Note: `confidence` is deprecated and set to `null`.

## Real Data Pipeline
See [README_DATA.md](README_DATA.md) for instructions on collecting, validating, and retraining with real listing data.
