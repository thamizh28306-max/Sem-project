import { Router, Request, Response } from 'express';

export const predictRouter = Router();

// Property price prediction endpoint
// Expects POST body with property features
predictRouter.post('/', (req: Request, res: Response) => {
  const {
    area_sqft,
    bedrooms,
    bathrooms,
    location,
    distance_to_school_km,
    distance_to_metro_km,
    property_type
  } = req.body;

  if (!area_sqft || !bedrooms) {
    return res.status(400).json({ error: 'area_sqft and bedrooms are required' });
  }

  // Simple heuristic prediction (replace with ML service call)
  const basePrice = (area_sqft || 1000) * 5500;
  const bedroomMultiplier = 1 + ((bedrooms || 2) - 1) * 0.15;
  const schoolDiscount = distance_to_school_km ? Math.max(0.85, 1 - distance_to_school_km * 0.02) : 1;
  const metroDiscount = distance_to_metro_km ? Math.max(0.85, 1 - distance_to_metro_km * 0.03) : 1;

  const predictedPrice = Math.round(basePrice * bedroomMultiplier * schoolDiscount * metroDiscount);

  return res.json({
    predicted_price: predictedPrice,
    confidence: 0.78,
    price_range: {
      low: Math.round(predictedPrice * 0.9),
      high: Math.round(predictedPrice * 1.1)
    },
    factors: {
      area_sqft,
      bedrooms,
      bathrooms: bathrooms || 1,
      distance_to_school_km: distance_to_school_km || null,
      distance_to_metro_km: distance_to_metro_km || null,
      property_type: property_type || 'Apartment'
    }
  });
});
