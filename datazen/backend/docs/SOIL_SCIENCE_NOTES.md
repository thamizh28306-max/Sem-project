# Soil Science Technical Reference — DataZen

## 1. What the Ingested Soil Metrics Measure

The ESP32 sensor platform collects surface/topsoil physical and chemical indicators:

- **pH**: The logarithmic activity of hydrogen ions in the shallow soil solution (typically 0–30 cm). Optimal crop absorption occurs between 6.0 and 7.5.
- **Moisture**: Volumetric water content (% VWC) in the root zone. Highly dependent on ambient humidity, recent precipitation, irrigation, and surface compaction.
- **NPK (Nitrogen, Phosphorus, Potassium)**: Macro-nutrient availability measured in mg/kg (ppm), relevant for agricultural yield and gardening.
- **Temperature**: Root-zone thermal condition, fluctuating with solar radiation and seasonal weather.

---

## 2. Why Agricultural Sensors Cannot Determine Foundation Suitability

A building's foundation transfers structural loads into deeper subsurface strata (typically 1.5 m to 30+ m below grade). Foundation design requires geotechnical parameters that are physical, mechanical, and geologic:

| Required Foundation Metric | Standard Measurement Method | Can ESP32 Topsoil Probe Measure It? |
|----------------------------|----------------------------|-------------------------------------|
| Safe Bearing Capacity (SBC) | Plate Load Test (IS 1888) / Borehole analysis | **NO** |
| Standard Penetration Resistance (N-value) | Standard Penetration Test (IS 2131) | **NO** |
| Soil Stratigraphy & Bedrock Depth | Rotary / Percussion Boreholes (IS 1892) | **NO** |
| Seasonal Groundwater Table | Observation wells / Piezometers across seasons | **NO** |
| Atterberg Limits (Liquid & Plastic Limit) | Casagrande apparatus / Cone penetrometer | **NO** |
| Swelling Potential (Expansive Clay / Black Cotton) | Free Swell Index (IS 2720 Part 40) | **NO** |
| Historic Land Use / Unengineered Fill | Historical cartography / Geotechnical trenching | **NO** |

---

## 3. Chennai Subsurface Context

Chennai encompasses diverse geologic domains:
1. **Coastal Sands**: Found along the Marina, Besant Nagar, and ECR corridors. High permeability, low bearing capacity when loose, susceptible to liquefaction in seismic events.
2. **Marine Clays & Estuarine Alluvium**: Found around Adyar, Cooum basins, and parts of Velachery / Madipakkam. High plasticity, high compressibility, prone to prolonged consolidation settlement and waterlogging.
3. **Hard Charnockite (Granitic Rock)**: Found inland in Guindy, Pallavaram, and Tambaram ridges. Shallow depth to bedrock providing high bearing capacity.

Because topsoil moisture or pH gives no information on whether a site is underlain by 10 meters of soft compressible marine clay or 1 meter of hard charnockite, **DataZen explicitly disclaims all construction and structural suitability judgments from probe readings.**
