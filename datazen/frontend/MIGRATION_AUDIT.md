# Frontend Migration Audit — DataZen

**Date:** 2026-10-26  
**Source File:** `frontend/index.html` (4,894 lines, single-file React 18 + Babel CDN app)  
**Target Architecture:** Vite + React 18 + TypeScript (Strict Mode) + Plain Leaflet Hooks

---

## 1. Feature & Component Inventory (Parity Checklist)

### 1.1 Navigation & Global Shell
- [ ] **`Nav`**:
  - Logo with interactive home navigation (`DataZen`)
  - Navigation links: Home, Properties (`listings`), Predict Price (`predict`), Map Explorer (`map`), Sell Property (`sell`)
  - Active page indicator highlight
  - Authenticated user state: User first name greeting ("Hi, <FirstName>") + Logout button
  - Unauthenticated user state: "Login" CTA button triggering `AuthModal`
  - Mobile responsive collapse behavior (nav links hide below 768px)
- [ ] **`Toast`**:
  - Auto-dismissing toast notification after 3000ms
  - Visual status dot and message label
- [ ] **`Footer`**:
  - Logo, tagline, and platform navigation links (Properties, Price Predictor, Map Explorer)
  - Company and legal links
  - Chennai location badge and copyright notice

### 1.2 Home View (`HomePage`)
- [ ] **Hero Section**:
  - Badge: "AI-Assisted Property Intelligence (Demo)"
  - Hero headline: "Find, Buy & Predict Property Prices Instantly"
  - Action buttons: "🔮 Predict Price" (navigates to `predict`) and "Browse Properties" (navigates to `listings`)
  - Key metrics stats grid: 2,400+ Active Listings, 80% Interval Coverage, 8 Chennai Localities, ₹6.8L Avg. Savings Found
- [ ] **Platform Benefits ("Why DataZen")**:
  - 6 feature cards with icons and descriptions: ML Price Estimation (Demo), Map-Based Search, Market Analytics, Buy & Sell Platform, Location Intelligence, Investment Insights
- [ ] **Process Steps ("How it works")**:
  - 4 numbered steps with arrow connectors: Pick a location, Enter property details, Get your estimate, Review & verify
- [ ] **Featured Listings Grid**:
  - Shimmer skeleton loaders while loading
  - Fetches from `GET /api/listings` and displays top 3 items
  - Empty state with CTA button ("+ List Your Property") if no listings exist
- [ ] **CTA Section**:
  - "Ready to find your perfect property?" with "Start Predicting Free" and "Browse Listings" buttons

### 1.3 Properties View (`ListingsPage` & `ListingCard`)
- [ ] **Filter Controls**:
  - Type toggle filters: "All", "Buy" (`sale`), "Rent" (`rent`)
  - Total property counter badge
- [ ] **Listing Card Display**:
  - Property image with fallback category emoji (🏢 rent, 🌿 plot, 🏠 house)
  - Rent / Sale badge
  - Formatted INR price tag (e.g. `₹1.25 Cr`, `₹65.0 L`)
  - Title/name, locality, BHK, area (sqft), and building age
  - "Contact" button opening seller contact modal
  - "Save" / "Bookmark" toggle button calling `POST /api/listings/:id/save` with in-memory auth token
- [ ] **Seller Contact Modal**:
  - Modal with property name and locality
  - In legacy, presented a contact form; integrated with backend `POST /api/listings/:id/contact` for authenticated users
  - Toast confirmation upon message send

### 1.4 Predict View (`PredictPage`)
- [ ] **Property Input Form**:
  - Property type toggle (Residential, Commercial, Plot/Land)
  - Locality select dropdown (20 Chennai localities with approx. indicator for assumed rate zones)
  - Area in sqft, BHK (1–5), Age in years, Floor number
  - Nearest school distance (km) and nearest metro distance (km), supporting prefill from Map Explorer
  - Parking toggle (Yes/No)
  - Furnishing select (Unfurnished, Semi-furnished, Fully furnished)
  - "🔮 Predict Price" button with spinner state
- [ ] **Prediction Result Panel**:
  - Estimated Market Value formatted in INR
  - Price per sqft and locality subtitle
  - Model quality badge (`high`, `medium`, `low`)
  - Data source badge (`Model trained with real listings` vs `DEMO ESTIMATE`)
  - Disclaimer banner: "Demo estimate trained on synthetic data. Not a valuation."
  - Approximate fallback banner if `heuristic-fallback` is active
  - Detailed metric breakdown: Predicted price, Price range (low), Price range (high), Price per sqft
  - Conformal interval summary: "Likely range (80% interval): <Low> to <High>" + validation MAPE
  - Collapsible "How is this calculated?" disclosure
  - Key valuation drivers (factors list with positive/negative impacts)

### 1.5 Map Explorer View (`MapPage`)
- [ ] **Leaflet GIS Map**:
  - Centered on Chennai (13.0827, 80.2707, zoom 12)
  - Custom divIcon category markers with emoji, color-coded borders, and popups
  - Selected point marker with coordinates/locality popup
  - Dynamic radius circle (500m, 1 km, 2 km) centered on selected point
  - Tile error monitoring with automatic CARTO basemap fallback after 3 tile errors, updating attribution
  - Interactive map click selecting coordinates and triggering surroundings search
- [ ] **Search Autocomplete**:
  - Search input with clear button and status spinner
  - Instant local autocomplete suggestions for Chennai localities & aliases (min 2 chars, zero network calls)
  - Street-level geocoding search (`GET /api/places/search?q=...`) triggered on Enter or Search button click (min 3 chars)
  - Request debouncing, caching, and stale response cancellation via request IDs
- [ ] **Coverage Detection & Badges**:
  - Evaluates clicked coordinates against Chennai metro bounding box (lat 12.7–13.3, lng 79.9–80.4) and nearest locality centroid
  - Green badge: "Covered: <Locality>" (within 3 km of trained locality)
  - Amber badge: "Uses placeholder rates for <Locality>" or "Nearest known area: ... (<X> km away), estimate is less reliable"
  - Red badge: "Outside supported area (Chennai metro only)" — disables Predict button with explanatory notice
- [ ] **Dynamic Estimation Form (Panel Order Item 1)**:
  - Property type selector: Apartment/Flat, Independent House/Villa, Residential Plot, Commercial, Other
  - Dynamic field visibility per property type (see Section 4 for data table)
  - Common fields: Locality, Area (sqft), Road width, Approval status, Corner property, Flood-prone status, Notes
  - Apartment specific: BHK, Bathrooms, Floor number, Total floors, Building age, Parking, Lift, Power backup, Gated community, Facing, Furnishing
  - House/Villa specific: Plot area, BHK, Bathrooms, Building age, Building floors, Parking, Facing, Furnishing, Geotechnical section
  - Commercial specific: Sub-type (Shop, Office, Showroom, Warehouse), Frontage width, Floor, Building age, Parking slots, Main-road facing, Furnishing status
  - Residential plot specific: Plot shape, Facing, Boundary wall, Agricultural soil note, Geotechnical section
  - Geotechnical section (`GeoTechSection`): Collapsible accordion capturing geotechnical report availability, soil type, groundwater depth and date, safe bearing capacity, SPT N-value, flood history, historical water body, and agency. Displays non-construction disclaimer.
  - Auto-gathered nearby amenities text boxes (editable) with distances for school, college, hospital, clinic/pharmacy, supermarket, bus, metro, park, bank. Imputation notice shown when distance is missing.
  - Amenity Proximity Score indicator (0–100) calculated from nearby amenities.
- [ ] **Estimation Result Card (Panel Order Item 2)**:
  - Renders directly below the estimation form
  - Predicted price in INR, price range (with interval widening factor if extrapolated), price per sqft, coverage badge, quality badge
  - Disclosures for imputed fields (training medians) and clamped fields
  - Warning notices and "How is this calculated?" collapsible explanation
  - Valuation drivers factors chips
- [ ] **Neighborhood Summary & Surroundings (Panel Order Item 3)**:
  - Positioned below the estimation and result cards
  - Radius selection chips (500m, 1km, 2km) and category visibility toggle chips
  - Collapsible category accordions (11 categories in `CATEGORIES_ORDER`) with amenity count badge
  - List of places with distance (m or km), clicking item smoothly pans map and opens popup
  - ODbL OpenStreetMap attribution notice

### 1.6 Sell Property View (`SellPage`)
- [ ] Unauthenticated barrier: Prompts user to log in or register before listing
- [ ] Authenticated submission form:
  - Title, Property type, Listing type (Sale/Rent), Locality, Price, Area (sqft), BHK, Age, Floor, Parking, Furnishing, Full address, Description (max 500 chars with counter), Image URL with live preview
  - "✨ Get AI Price Estimate" button calling `POST /api/predict` and displaying suggested price range
  - Submit button sending payload to `POST /api/listings` with auth header
  - Success banner with automatic redirection to listings view

### 1.7 Authentication Modal (`AuthModal`)
- [ ] Tab switcher: "Login" and "Register"
- [ ] Login tab: Email & Password with Zod validation
- [ ] Register tab: Full Name, Email, Phone (optional), Password (min 10 chars)
- [ ] Submits with `credentials: 'include'` to receive `datazen_refresh` cookie and access token in response
- [ ] Error messages display on invalid credentials or server errors
- [ ] Close button and backdrop click dismissal

---

## 2. External Resources & Global State Inventory

### 2.1 External Scripts & Styles
- `https://fonts.googleapis.com` & `https://fonts.gstatic.com`: Syne & DM Sans fonts (will be self-hosted via `@fontsource/syne` and `@fontsource/dm-sans` to allow a strict CSP without external font origins)
- `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css` & `leaflet.js`: Replaced by local bundled npm package `leaflet` with bundled CSS and asset imports
- `https://unpkg.com/react@18/...`, `react-dom@18/...`, `@babel/standalone`: Completely eliminated by Vite bundler

### 2.2 Tile Server Endpoints
- Primary: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- Fallback: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`

### 2.3 Global Variables & State
- Legacy file stored:
  - `let _accessToken`: Module-level in-memory token
  - `searchReqIdRef`, `searchCacheRef`: Cache maps for search queries
  - `coverageCacheRef`: Cached locality coverage bounds
- In the Vite project, state is encapsulated in typed React contexts (`AuthContext`, `CoverageContext`) and custom hooks (`useLeafletMap`, `useNearby`, `usePredict`).

---

## 3. HTML String & Popup Construction Audit

The following places in legacy code construct HTML strings for Leaflet:
1. `selectLocation` popup (`index.html:2792`): `<strong>${escapeHtml(label)}</strong>`
2. Nearby place marker popup (`index.html:3008-3012`):
   ```html
   <div style="min-width:140px">
     <strong>${escapeHtml(p.name)}</strong><br/>
     <span style="color:${escapeHtml(meta.color)};font-weight:600">${escapeHtml(meta.emoji)} ${escapeHtml(meta.label)}</span><br/>
     <span style="color:#64748b;font-size:0.75rem">${escapeHtml(distLabel)} away</span>
   </div>
   ```
3. Nearby place marker `L.divIcon` (`index.html:2970-2985`):
   ```html
   <div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:white;border:2px solid ${meta.color};border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.18);font-size:15px">${meta.emoji}</div>
   ```
4. Estimation marker popup (`index.html:3415-3424`): Constructed with formatted INR strings and escaped badge text and warnings.

**Port Strategy**: In the Vite TypeScript codebase, helper utility functions (`createMarkerIconElement`, `createPlacePopupElement`, `createPredictionPopupElement`) will construct DOM nodes directly via standard `document.createElement` and `textContent`, or apply strict sanitizing. Unit tests will prove plain text rendering for malicious strings like `<img src=x onerror=alert(1)>`.

---

## 4. Property Type Field Visibility Matrix (Config Table)

Instead of scattered conditionals in JSX, the fields will be configured via a typed data table:

| Field Key | Apartment / Flat | Independent House / Villa | Residential Plot | Commercial | Other |
|-----------|:----------------:|:-------------------------:|:----------------:|:----------:|:-----:|
| `bhk` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `bathrooms` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `floor` | ✅ | ❌ | ❌ | ✅ | ✅ |
| `total_floors` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `age` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `built_up_area` | ❌ | ✅ (Plot area) | ❌ | ❌ | ❌ |
| `parking` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `furnished` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `lift` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `power_backup` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `gated` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `facing` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `plot_shape` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `boundary_wall` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `commercial_subtype` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `frontage_ft` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `parking_slots` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `comm_furnished` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `main_road_facing` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `geotech_section` | ❌ | ✅ | ✅ | ❌ | ❌ |
| `soil_note` | ❌ | ❌ | ✅ | ❌ | ❌ |

---

## 5. Dead Code & Duplicate Logic Audit

1. **`predictPrice` function (`index.html:1821-1833`)**:
   - Issue: Client-side mathematical formula from an early prototype. Never called in `PredictPage` or `MapPage`.
   - Action: Documented and omitted from Vite runtime; replaced with typed API client calls to `POST /api/predict`.
2. **`MAP_PINS` array (`index.html:1813-1819`)**:
   - Issue: Hardcoded static pin array with coordinates and rates. Never rendered on the Leaflet map.
   - Action: Omitted from runtime; documented.
3. **Hardcoded amenity defaults in `SellPage.handleEstimate` (`index.html:4380`)**:
   - Issue: Injected hardcoded `school_dist_km: 1.0, metro_dist_km: 2.0`.
   - Action: Preserved for estimation fallback when listing a property, using the shared prediction client.
4. **Duplicate Haversine distance computations**:
   - Issue: Frontend and backend duplicated geodesic math.
   - Action: Centralized in `src/utils/geo.ts`.
