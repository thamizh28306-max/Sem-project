import { Router, Request, Response } from 'express';

export const soilRouter = Router();

// Soil quality endpoint for Chennai areas
soilRouter.get('/', (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'lat and lng required' });
  }

  // Simplified soil data for Chennai regions
  return res.json({
    location: { lat, lng },
    soil_type: 'Alluvial',
    bearing_capacity: 'Medium (10-15 t/m²)',
    water_table_depth: '3-5m',
    flood_risk: lat < 13.0 ? 'Medium' : 'Low',
    recommendation: 'Suitable for construction up to G+3 with standard foundation'
  });
});
