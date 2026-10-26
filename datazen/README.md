# DataZen — Smart Property Intelligence Platform

A full-stack property price prediction and listings platform for Chennai real estate.

---

## Project Structure

```
datazen/
├── frontend/          ← React + Tailwind UI (single HTML file, no build needed)
│   └── index.html
├── backend/           ← Node.js + TypeScript REST API
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── predict.ts
│   │   │   └── listings.ts
│   │   └── middleware/
│   │       └── authMiddleware.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
└── ml-service/        ← Python FastAPI + XGBoost ML engine
    ├── main.py
    ├── train.py
    └── requirements.txt
```

---

## Prerequisites

- Node.js 18+
- Python 3.9+
- PostgreSQL 14+ (running locally)

---

## Setup Instructions

### 1. ML Service (Python FastAPI)

```bash
cd ml-service

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Train the model (generates model.pkl)
python train.py

# Start the ML service
uvicorn main:app --reload --port 8000
```

The ML service will be running at: http://localhost:8000
Test it: http://localhost:8000/health

---

### 2. Backend (Node.js + TypeScript)

```bash
cd backend

# Copy env file and fill in your values
cp .env.example .env
# Edit .env with your Postgres credentials

# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev --name init
npx prisma generate

# Start the backend
npm run dev
```

The backend API will be running at: http://localhost:3000
Test it: http://localhost:3000/health

---

### 3. Frontend

Just open `frontend/index.html` in your browser.
No build step required — it loads React and Tailwind from CDN.

---

## Running All Three Services

Open 3 terminals:

```bash
# Terminal 1 — ML Service
cd ml-service && source venv/bin/activate && uvicorn main:app --reload --port 8000

# Terminal 2 — Backend
cd backend && npm run dev

# Terminal 3 — Frontend
# Just open frontend/index.html in your browser
```

---

## API Endpoints

### Auth
| Method | Endpoint              | Auth     | Description        |
|--------|-----------------------|----------|--------------------|
| POST   | /api/auth/register    | Public   | Register new user  |
| POST   | /api/auth/login       | Public   | Login              |
| GET    | /api/auth/me          | Required | Get current user   |

### Predict
| Method | Endpoint        | Auth   | Description              |
|--------|-----------------|--------|--------------------------|
| POST   | /api/predict    | Public | Get ML price prediction  |

### Listings
| Method | Endpoint                  | Auth     | Description          |
|--------|---------------------------|----------|----------------------|
| GET    | /api/listings             | Public   | Get all listings     |
| GET    | /api/listings/:id         | Public   | Get single listing   |
| POST   | /api/listings             | Required | Create listing       |
| DELETE | /api/listings/:id         | Required | Delete listing       |
| POST   | /api/listings/:id/save    | Required | Save/unsave toggle   |
| GET    | /api/listings/user/saved  | Required | Get saved listings   |

---

## ML Model Details

- **Algorithm**: XGBoost Regressor
- **Features**: locality, area_sqft, bhk, age_years, floor, parking, school_dist_km, metro_dist_km, furnished
- **Training data**: 3,000 synthetic Chennai property records
- **Typical MAE**: ~₹40,000
- **R² Score**: ~0.98

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 18, Tailwind CSS (CDN)      |
| Backend    | Node.js, TypeScript, Express      |
| Database   | PostgreSQL, Prisma ORM            |
| Auth       | JWT (jsonwebtoken + bcryptjs)     |
| ML Service | Python, FastAPI, XGBoost          |
| ML Tools   | scikit-learn, pandas, numpy       |

---

## Next Steps

1. Replace synthetic training data with real Chennai property data from Kaggle
2. Integrate Google Maps API for real map pins and geocoding
3. Add image upload for listings (Cloudinary or AWS S3)
4. Deploy: Frontend on Vercel, Backend on Render, ML on Railway

---

Built with love for DataZen college project.
