# ESP32 Sensor Setup Guide — DataZen IoT Integration

> **Scope:** This guide details connecting an ESP32 microcontroller with NPK/pH/moisture sensors to the DataZen backend for agricultural soil observation.
>
> **Important Limitation:** The sensor measures agricultural soil parameters (pH, moisture, NPK, temperature) at a single point and shallow insertion depth. These readings **cannot** determine foundation suitability, safe bearing capacity, or structural ground safety. For geotechnical soil evaluation, engage a certified geotechnical testing laboratory to conduct borehole exploration and SPT tests.

---

## 1. Hardware Requirements

- ESP32 Development Board (e.g. ESP32 NodeMCU)
- Multi-parameter Soil Sensor Probe (RS485 Modbus output for pH, Moisture, NPK, Temperature)
- MAX485 / TTL-to-RS485 transceiver module
- 9V–12V DC power supply for industrial soil probes
- Connecting jumper wires

---

## 2. Probe Placement Guidance (Agricultural Only)

- Insert probes into the **topsoil layer** (depth 0–30 cm).
- Avoid measurements immediately following torrential rainfall; surface saturation does not indicate groundwater levels.
- Take measurements across multiple dispersed locations on different dates to account for natural spatial and seasonal variability.
- Avoid sampling near construction debris, freshly dumped fill, or paved surfaces.

---

## 3. Device Authentication

Every ingestion request to `POST /api/soil-data` requires two authentication headers:

| Header | Description | Example |
|--------|-------------|---------|
| `X-Device-Id` | Registered Device ID | `esp32-001` |
| `X-Device-Key` | Secret Device Pre-shared Key | `5a9d82e1c7f4b360e28d49a15c8e2f6b` |

Keys must be registered in the backend `.env`:
```env
DEVICE_KEYS=esp32-001:5a9d82e1c7f4b360e28d49a15c8e2f6b
```

---

## 4. Ingestion Payload Format

**Endpoint:** `POST http://<server-ip>:3000/api/soil-data`  
**Headers:**
```http
Content-Type: application/json
X-Device-Id: esp32-001
X-Device-Key: 5a9d82e1c7f4b360e28d49a15c8e2f6b
```

**JSON Payload:**
```json
{
  "propertyId": "cly1234567890abcdef",
  "moisture": 42.5,
  "ph": 6.8,
  "nitrogen": 140.0,
  "phosphorus": 35.0,
  "potassium": 210.0,
  "temperature": 28.4
}
```

---

## 5. Summary Statistics Endpoint

Readings are queried via:
`GET /api/soil-data/listing/:listingId/summary`

The response includes:
- **`reading_quality`**: `"insufficient"` (< 5 readings or < 24h span), `"stale"` (> 30 days old), `"noisy"` (moisture CV > 0.5), or `"adequate"`.
- **`scope_note`**: Explicit statement of agricultural context.
- **`outliers_excluded`**: Count of extreme outliers removed using 1.5 * IQR filtering (only applied when count >= 10).
- **`interpretation`**: Non-construction general guidelines.
