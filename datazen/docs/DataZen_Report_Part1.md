# DataZen Project Report - Part 1

## 1. Project Overview

DataZen is a full-stack property intelligence project for Chennai real estate, as described in the project README and implemented across three main components:

- Frontend: a single-page, browser-based interface using React via CDN with a custom HTML file in the frontend folder.
- Backend: a Node.js + TypeScript REST API built with Express, CORS, environment-based configuration, and Prisma ORM.
- ML Service: a Python FastAPI application that loads an XGBoost-based model and exposes price prediction endpoints.

The workspace structure shows the project is organized into three directories:

- frontend/
- backend/
- ml-service/

The project README explicitly identifies the system as a property price prediction and listing platform for Chennai real estate. The backend is configured around authentication, listing management, prediction requests, and soil-data ingestion for property-related readings. The ML service is designed to predict property values based on locality, area, BHK count, age, floor, parking, distances to school and metro, and furnishing status.

### Verified implementation summary

From the actual code in the workspace:

- The backend exposes health, auth, prediction, listing, and soil-data routes.
- Prisma defines `User`, `Listing`, `SoilReading`, and `SavedListing` models.
- The ML model is trained with synthetic Chennai property data in `ml-service/train.py` and loaded via `ml-service/main.py`.
- The frontend is a static HTML page rather than a full build-driven React app.

### Verification status

This project appears to be a prototype/college project rather than a production deployment. That is supported by the README language stating it was built as a college project and by the current code structure, which includes a simple static frontend and local service configuration.

---

## 2. Problem Statement

The workspace indicates that the project addresses a gap in local property decision-making by combining three functions that are usually fragmented:

1. Property listing discovery and management
2. Price estimation using machine learning
3. Property-related soil/environment context through IoT-style readings

The repository makes clear that the system is intended to help users evaluate real-estate opportunities in Chennai using a combination of listing data and predictive pricing. In particular:

- The backend includes listing creation, filtering, and saved-listing functionality.
- The ML service predicts price ranges for property inputs.
- The soil-data API accepts readings for a property and stores them in the database.

This suggests the core problem is to make property evaluation faster and more informed for buyers, sellers, and property managers by combining listing information with predictive analytics and supporting field data.

### What is directly verified

The following are directly supported by the code:

- Users can register and log in with JWT-based authentication.
- Listings can be created, viewed, filtered, and deleted by their owners.
- Property prices can be predicted via an external Python ML service.
- Soil measurement data can be stored and retrieved for a listing.

### What needs confirmation

The following business-level items are not fully verifiable from code alone and require confirmation from stakeholders or product documentation:

- Exact target users (buyers, sellers, agents, investors, or a combined audience)
- Actual pain points in the current real-estate market being addressed
- Whether the project is intended for public deployment or educational demonstration only
- Real-world business constraints such as compliance, scalability, or local regulations

---

## 3. Objectives

The project objectives can be inferred from the implemented features and supporting README guidance:

### Primary objectives

- Provide a property listing platform for Chennai real estate.
- Enable users to create and manage listings.
- Support property search and filtering by locality, price, BHK, and type.
- Generate estimated property values using machine learning.
- Allow authenticated users to save listings for future reference.
- Support soil-related readings linked to specific property listings.

### Secondary objectives

- Keep the application modular across frontend, backend, and ML service layers.
- Use Prisma with PostgreSQL for structured data persistence.
- Use a Python-based ML engine for prediction logic and model management.
- Provide a working local prototype using standard development tools and services.

### Verification status

The objectives above are well-supported by the code and README. However, any broader commercial or strategic goals—for example revenue targets, launch timeline, or scalability objectives—are not explicitly stated in the code and therefore require confirmation.

---

## 4. Scope

### In-scope items (verified)

From the implemented code and configuration, the current scope includes:

- User registration and login flows using JWT authentication
- Listing creation, retrieval, filtering, and deletion
- Saved listing toggle and retrieval for authenticated users
- Price prediction endpoint calling the ML service
- Soil reading submission and history retrieval for a property
- Local PostgreSQL integration through Prisma
- A static frontend interface for the user experience

### Out-of-scope or future-facing items (verified as future work)

The README lists several planned next steps, which are clearly not full implementation and should be treated as future scope rather than current functionality:

- Replacement of synthetic property data with real Chennai property data
- Google Maps API integration for map pins and geocoding
- Image upload support using a cloud storage service
- Production deployment architecture and hosting strategy

### Scope boundary based on repository evidence

The project currently functions as a local prototype and demo application. It does not show evidence of:

- Real production dataset ingestion
- Real geospatial mapping features
- Full image management workflows
- CI/CD or deployment automation files in the current workspace
- Enterprise-grade monitoring or analytics

These omissions are consistent with a laboratory project baseline rather than a full-scale production system.

### Requires confirmation

The full intended product scope cannot be confirmed without product requirements or stakeholder input. The current scope appears to be a functional MVP style platform, but the final product boundaries still need validation.

---

## 5. Existing System vs Proposed System

### Existing system (implemented in this workspace)

The existing implementation is best understood as a working local prototype with the following characteristics:

- Frontend: a single HTML page with embedded React and CSS, loaded directly in the browser without a build system.
- Backend: Express API running on port 3000 with route-based architecture for auth, listing, prediction, and soil data.
- Data layer: PostgreSQL through Prisma schema with `User`, `Listing`, `SavedListing`, and `SoilReading` models.
- Authentication: JWT-based sign-in and protected routes.
- ML layer: FastAPI service with an XGBoost Regressor model and a `predict` endpoint.
- Data source: synthetic property data generated in `ml-service/train.py` for Chennai localities.
- Domain focus: Chennai real-estate prediction and listing management.

### Proposed system (inferred target state)

The intended target system is a property intelligence platform that integrates:

- Listing discovery and user-generated property postings
- Price prediction using locality-based and property-feature-driven models
- Saved-listing and user account functionality
- Soil or environmental data for property assessment
- A more polished frontend experience and stronger operational deployment planning

This proposed system is inferred from the README’s project description, API routes, and the structure of the ML and backend services. The repository indicates the platform is intended to evolve beyond a prototype into a more complete market-facing product, but the code alone does not confirm the complete final specification.

### Comparison

| Aspect | Existing system | Proposed system |
|---|---|---|
| Frontend | Static HTML + React CDN | Improved user-facing property platform |
| Backend | Express + TypeScript API with route modules | Scalable, production-oriented property backend |
| Data model | Prisma with listings, users, saved listings, soil readings | Potentially broader domain data and richer features |
| ML capability | XGBoost-based prediction using synthetic data | Real-world predictive model with real property data |
| User experience | Basic prototype UI | End-user-friendly marketplace and analytics experience |
| Deployment | Local service-based setup | Hosted or cloud deployment |

### Requires confirmation

The exact “proposed system” beyond the current codebase is not fully defined in the repository. The README and architecture suggest a broader digital property platform, but the final business requirements, user flow, and release expectations still need confirmation.

---

## Part 1 conclusion

Part 1 confirms that DataZen is a local, modular, and feature-oriented property intelligence prototype built around three layers: frontend, backend, and ML service. The project addresses a clear use case around Chennai property price estimation and listing management, and the current implementation demonstrates a working MVP structure capable of user authentication, property listing workflows, predictive price estimation, and soil-data storage.

The most important limitation is that the project is not yet verified as a production-ready system or fully defined business product. Several strategic and operational details—especially target audience, business case, and future deployment scope—require confirmation before the project can be treated as a finalized proposal beyond the current prototype.

This report stops at Part 1 as requested.
