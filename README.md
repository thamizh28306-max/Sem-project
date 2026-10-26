# DataZen — Chennai Property Intelligence

A property intelligence platform for Chennai with interactive map exploration,
neighborhood analysis, and price prediction.

## Quick Start

### Prerequisites
- Node.js 18+ and npm

### 1. Install dependencies
```bash
cd DataZen
npm install
```

### 2. Start the backend API server (port 3000)
```bash
npm run dev
```

### 3. Start the frontend (port 5173)

In a separate terminal:
```bash
npm run serve:frontend
```

Or use the single command to run both:
```bash
npm run serve:all
```

### 4. Open the app
Navigate to **http://localhost:5173** in your browser.

> **Note:** Using `http://localhost` instead of `file://` ensures OSM tile
> servers receive a valid Referer header. If tiles still fail, the app
> automatically falls back to CARTO tiles.

## Project Structure
```
DataZen/
├── frontend/
│   └── index.html          # Single-file React app (CDN, no build step)
├── src/
│   ├── server.ts            # Express entry point (port 3000)
│   └── routes/
│       ├── auth.ts          # POST /api/auth/login, /register, GET /me
│       ├── listings.ts      # GET/POST /api/listings
│       ├── places.ts        # GET /api/places/search, /api/places/nearby
│       ├── predict.ts       # POST /api/predict
│       └── soil.ts          # GET /api/soil
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

| Method | Endpoint                              | Description                            |
|--------|---------------------------------------|----------------------------------------|
| GET    | `/api/health`                         | Health check                           |
| POST   | `/api/auth/login`                     | Login                                  |
| POST   | `/api/auth/register`                  | Register                               |
| GET    | `/api/listings`                       | List all properties                    |
| GET    | `/api/listings/:id`                   | Get single listing                     |
| POST   | `/api/predict`                        | Price prediction                       |
| GET    | `/api/soil?lat=&lng=`                 | Soil quality info                      |
| GET    | `/api/places/search?q=`              | Nominatim search proxy                 |
| GET    | `/api/places/nearby?lat=&lng=&radius=`| Overpass nearby places proxy           |

## Features

### Map Explorer
- Interactive Leaflet map centered on Chennai
- OSM tiles with automatic CARTO fallback on tile errors
- Click anywhere to explore the neighborhood
- Search box with autocomplete (debounced, cached, via backend Nominatim proxy)
- Radius selector: 500m / 1km / 2km

### Neighborhood Analysis
- Queries nearby amenities via Overpass API (through backend proxy)
- Categories: schools, colleges, hospitals, clinics, pharmacies, supermarkets,
  restaurants, banks/ATMs, parks, bus stops, metro/railway stations
- Colored markers with emoji icons on map
- Toggleable legend/filter per category
- Side panel with nearest place per category + distance
- Neighborhood summary card with counts + nearest school & metro distances

### Price Prediction
- Form with area, bedrooms, bathrooms, property type, school distance, metro distance
- "Use for Prediction" button auto-fills distances from Map Explorer
- Visual feedback when distances are auto-filled

### OSM Policy Compliance
- Proper attribution on all tile layers
- Backend proxies set correct User-Agent header for Nominatim
- Request throttling (max 1 req/sec) for both Nominatim and Overpass
- 10-minute server-side cache on all external API results
- Frontend debounces search input by 600ms + caches results in memory
