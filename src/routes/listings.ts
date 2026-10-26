import { Router, Request, Response } from 'express';

export const listingsRouter = Router();

// In-memory listings store (replace with DB)
const listings: any[] = [
  {
    id: '1',
    title: '2 BHK in T Nagar',
    location: 'T Nagar, Chennai',
    lat: 13.0418,
    lng: 80.2341,
    price: 7500000,
    bedrooms: 2,
    bathrooms: 2,
    area_sqft: 1100,
    type: 'Apartment'
  },
  {
    id: '2',
    title: '3 BHK in Adyar',
    location: 'Adyar, Chennai',
    lat: 13.0067,
    lng: 80.2572,
    price: 12000000,
    bedrooms: 3,
    bathrooms: 2,
    area_sqft: 1500,
    type: 'Apartment'
  },
  {
    id: '3',
    title: 'Villa in OMR',
    location: 'OMR, Chennai',
    lat: 12.9165,
    lng: 80.2274,
    price: 25000000,
    bedrooms: 4,
    bathrooms: 3,
    area_sqft: 2800,
    type: 'Villa'
  }
];

listingsRouter.get('/', (_req: Request, res: Response) => {
  return res.json(listings);
});

listingsRouter.get('/:id', (req: Request, res: Response) => {
  const listing = listings.find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  return res.json(listing);
});

listingsRouter.post('/', (req: Request, res: Response) => {
  const newListing = { id: String(listings.length + 1), ...req.body };
  listings.push(newListing);
  return res.status(201).json(newListing);
});
