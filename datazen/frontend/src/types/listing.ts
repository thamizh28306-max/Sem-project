export interface ListingUser {
  name: string;
}

export interface Listing {
  id: string;
  title: string;
  locality: string;
  address?: string | null;
  type: string; // 'sale' | 'rent' | 'plot' | 'residential' | 'commercial'
  bhk: number;
  sqft: number;
  price: number;
  age?: number;
  age_years?: number;
  floor?: number;
  parking?: boolean;
  furnished?: number;
  description?: string | null;
  imageUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  userId?: string;
  user?: ListingUser;
  createdAt?: string;
  emoji?: string;
}

export interface CreateListingInput {
  title: string;
  locality: string;
  address?: string;
  type: string;
  bhk: number;
  sqft: number;
  price: number;
  age?: number;
  floor?: number;
  parking: boolean;
  furnished: number;
  description?: string;
  imageUrl?: string | null;
  lat?: number;
  lng?: number;
}

export interface ContactSellerResponse {
  seller: {
    name: string;
    phone: string | null;
    email: string;
  };
}
