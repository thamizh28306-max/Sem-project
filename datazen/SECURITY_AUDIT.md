# Security Audit Report — DataZen

**Date:** 2026-10-26  
**Auditor:** DataZen Security Hardening Task  
**Application:** DataZen Chennai Smart Property Intelligence Platform  
**Scope:** Backend (`backend/src/`), Frontend (`frontend/index.html`), ML Microservice (`ml-service/`)

---

## Executive Summary

A comprehensive security audit of DataZen was conducted. Critical vulnerabilities identified included wildcard/null CORS origins, lack of device authentication on IoT endpoints, insecure JWT handling (7-day single token in localStorage), unvalidated inputs, phone/email leakage in public listing responses, and missing HTTP security headers.

All identified vulnerabilities have been remediated while strictly preserving all existing functionality, design elements, and database schemas.

---

## 1. Audit Findings & Remediations

| # | File & Line(s) | Issue / Vulnerability | Severity | Remediation Status |
|---|----------------|-----------------------|----------|-------------------|
| 1 | `backend/src/index.ts` (lines 27–30) | Permissive CORS: explicitly allowed `"null"` origin and had fallback allowing all origins | **Critical** | ✅ **Fixed**: Removed `"null"` origin and wildcards. Whitelist restricted to configured `ALLOWED_ORIGINS` (localhost:5173, localhost:5500, 127.0.0.1 variants). Credentials only permitted for allowlisted origins. |
| 2 | `backend/src/routes/soil.ts` (lines 7–36) | Ingest endpoint had zero device authentication — any client could POST arbitrary sensor readings | **Critical** | ✅ **Fixed**: Added device authentication requiring `X-Device-Id` and `X-Device-Key` headers matching `DEVICE_KEYS` configuration. Rate-limited to 120 req/15min. |
| 3 | `backend/src/routes/auth.ts` (lines 10–72) | JWT single token (7-day expiry) returned in response body, stored in browser `localStorage` (vulnerable to XSS theft) | **High** | ✅ **Fixed**: Split into short-lived access JWT (15 minutes, HS256, pinned algorithm, iss/aud claims) and refresh JWT (7 days, separate secret) stored in `httpOnly`, `SameSite=Strict`, `path=/api/auth` cookie. Added `POST /api/auth/refresh` and `POST /api/auth/logout`. In frontend, removed all `localStorage` token persistence in favor of in-memory variable + silent cookie refresh. |
| 4 | `backend/src/routes/auth.ts` (lines 50–54) | User enumeration timing attack on login (returned 401 immediately on unknown email without running bcrypt) | **Medium** | ✅ **Fixed**: Constant-time dummy bcrypt comparison performed for unknown email addresses. Generic "Invalid email or password" error used for both missing user and bad password. |
| 5 | `backend/src/routes/auth.ts` (line 24) | Bcrypt hash cost was 10 (below recommended modern standard) | **Medium** | ✅ **Fixed**: Upgraded default cost to 12. Added automatic transparent rehashing on successful login for hashes with cost < 11. |
| 6 | `backend/src/routes/listings.ts` (lines 21, 33) | PII Leak: Listing endpoints included seller's personal `phone` and `email` in public responses to anonymous users | **High** | ✅ **Fixed**: Stripped `phone` and `email` from public `GET /api/listings` and `GET /api/listings/:id`. Created protected `POST /api/listings/:id/contact` endpoint requiring authentication. |
| 7 | `backend/src/routes/listings.ts` (lines 93–108) | Potential IDOR / race condition in listing deletion | **Medium** | ✅ **Fixed**: Implemented atomic scoped deletion `prisma.listing.deleteMany({ where: { id, userId } })`. Mass-assignment prevented via strict Zod input validation. |
| 8 | `backend/src/index.ts` (entire file) | Missing HTTP security hardening: No `helmet`, `x-powered-by` exposed, no body size limit, no global rate limiting, unhandled Prisma error leaks | **High** | ✅ **Fixed**: Added `helmet()`, `app.disable("x-powered-by")`, `express.json({ limit: "100kb" })`, global IP rate limiter (300 req/15min), and central error handler sanitizing all server errors to generic error codes. |
| 9 | `backend/src/routes/predict.ts` (lines 283–287) | ML service request made without authentication headers | **Medium** | ✅ **Fixed**: Configured `X-Internal-Key` header forwarded from backend to ML service based on `ML_INTERNAL_KEY`. |
| 10 | `frontend/index.html` (lines 2989, 3307) | Stored XSS risk: Leaflet marker popups constructed with unescaped HTML concatenation of place/listing text | **Medium** | ✅ **Fixed**: Introduced `escapeHtml()` utility sanitizing all dynamic text inserted into Leaflet popup templates. Added Content-Security-Policy (CSP) meta header. |

---

## 2. Verified Unaffected / Already Secure Features

- **ML Price Model Features**: Verified `ml-service/train.py` and `ml-service/main.py`. The XGBoost model features strictly include property physical attributes and amenity distances; no soil sensor metrics are used in price prediction.
- **Git Tracking Status**: Checked `git ls-files backend/.env`. Result: `.env` was never tracked by git.

---

## 3. Residual Limitations (Architectural Constraints)

1. **Server-Side Refresh Token Revocation Table**: Schema changes were prohibited (`schema.prisma` unmodified). Refresh tokens are stateless and rotated on each refresh; logout clears the browser cookie.
2. **CDN SRI Hashes**: Single-file React+Babel CDN architecture loads external bundles (`react`, `react-dom`, `babel`, `leaflet`). Exact SRI hashes require build-time locking. Clear TODO instructions for pinning hashes are provided.
