import { Router, Request, Response } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";

const router = Router();
const prisma = new PrismaClient();

// Fields safe to return publicly — phone and email are strictly omitted
const PUBLIC_USER_SELECT = { name: true } as const;

const createListingSchema = z.object({
  title:       z.string().trim().min(3).max(200),
  locality:    z.string().trim().min(2).max(100),
  type:        z.string().trim().min(2).max(50),
  bhk:         z.coerce.number().int().min(0).max(20),
  sqft:        z.coerce.number().positive().max(1000000),
  price:       z.coerce.number().positive(),
  age:         z.coerce.number().int().min(0).max(200).optional().default(0),
  floor:       z.coerce.number().int().min(0).max(200).optional().default(0),
  parking:     z.union([z.boolean(), z.string().transform(v => v === "yes" || v === "true")]).optional().default(false),
  furnished:   z.coerce.number().int().min(0).max(2).optional().default(0),
  description: z.string().trim().max(2000).optional().nullable(),
  lat:         z.coerce.number().min(12.7).max(13.3).optional().nullable(),
  lng:         z.coerce.number().min(79.9).max(80.4).optional().nullable(),
});

// GET /api/listings — public list
router.get("/", async (req: Request, res: Response) => {
  try {
    const { type, locality, bhk, minPrice, maxPrice } = req.query;

    const listings = await prisma.listing.findMany({
      where: {
        ...(type && type !== "all" ? { type: String(type) } : {}),
        ...(locality ? { locality: { contains: String(locality), mode: "insensitive" } } : {}),
        ...(bhk ? { bhk: Number(bhk) } : {}),
        ...(minPrice || maxPrice ? {
          price: {
            ...(minPrice ? { gte: Number(minPrice) } : {}),
            ...(maxPrice ? { lte: Number(maxPrice) } : {}),
          }
        } : {}),
      },
      include: {
        user: { select: PUBLIC_USER_SELECT }
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(listings);
  } catch (err) {
    console.error("[listings] GET / error:", err);
    res.status(500).json({ error: "Could not fetch listings", code: "INTERNAL_ERROR" });
  }
});

// GET /api/listings/user/saved — protected
router.get("/user/saved", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      return;
    }

    const saved = await prisma.savedListing.findMany({
      where: { userId },
      include: {
        listing: {
          include: {
            user: { select: PUBLIC_USER_SELECT }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(saved.map((s) => s.listing));
  } catch (err) {
    console.error("[listings] GET saved error:", err);
    res.status(500).json({ error: "Could not fetch saved listings", code: "INTERNAL_ERROR" });
  }
});

// GET /api/listings/:id — single listing (public, owner contact stripped)
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: PUBLIC_USER_SELECT }
      },
    });

    if (!listing) {
      res.status(404).json({ error: "Listing not found", code: "NOT_FOUND" });
      return;
    }

    res.json(listing);
  } catch (err) {
    console.error("[listings] GET /:id error:", err);
    res.status(500).json({ error: "Could not fetch listing", code: "INTERNAL_ERROR" });
  }
});

// POST /api/listings — protected: create a listing
router.post("/", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
    return;
  }

  const parsed = createListingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid listing input", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const d = parsed.data;

  try {
    const listing = await prisma.listing.create({
      data: {
        title:       d.title,
        locality:    d.locality,
        type:        d.type,
        bhk:         d.bhk,
        sqft:        d.sqft,
        price:       d.price,
        age:         d.age,
        floor:       d.floor,
        parking:     Boolean(d.parking),
        furnished:   d.furnished,
        description: d.description || null,
        lat:         d.lat || null,
        lng:         d.lng || null,
        userId:      userId,
      },
    });

    res.status(201).json(listing);
  } catch (err) {
    console.error("[listings] POST create error:", err);
    res.status(500).json({ error: "Could not create listing", code: "INTERNAL_ERROR" });
  }
});

// DELETE /api/listings/:id — protected: atomic ownership check + delete (IDOR protection)
router.delete("/:id", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
    return;
  }

  try {
    const result = await prisma.listing.deleteMany({
      where: {
        id: req.params.id,
        userId: userId,
      },
    });

    if (result.count === 0) {
      res.status(404).json({ error: "Listing not found or you do not have permission to delete it", code: "NOT_FOUND" });
      return;
    }

    res.json({ message: "Listing deleted successfully" });
  } catch (err) {
    console.error("[listings] DELETE error:", err);
    res.status(500).json({ error: "Could not delete listing", code: "INTERNAL_ERROR" });
  }
});

// POST /api/listings/:id/save — protected: save / unsave toggle
router.post("/:id/save", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
    return;
  }

  const listingId = req.params.id;

  try {
    // Verify listing exists before saving
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });

    if (!listing) {
      res.status(404).json({ error: "Listing not found", code: "NOT_FOUND" });
      return;
    }

    const existing = await prisma.savedListing.findUnique({
      where: {
        userId_listingId: { userId, listingId }
      },
    });

    if (existing) {
      await prisma.savedListing.delete({ where: { id: existing.id } });
      res.json({ saved: false });
      return;
    }

    await prisma.savedListing.create({
      data: { userId, listingId },
    });
    res.json({ saved: true });
  } catch (err) {
    console.error("[listings] save toggle error:", err);
    res.status(500).json({ error: "Could not update bookmark", code: "INTERNAL_ERROR" });
  }
});

// POST /api/listings/:id/contact — protected: get owner contact details for interested buyers
router.post("/:id/contact", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || req.userId;
  if (!userId) {
    res.status(401).json({ error: "You must be logged in to contact the seller", code: "UNAUTHORIZED" });
    return;
  }

  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { name: true, phone: true, email: true } }
      },
    });

    if (!listing) {
      res.status(404).json({ error: "Listing not found", code: "NOT_FOUND" });
      return;
    }

    res.json({
      seller: {
        name:  listing.user.name,
        phone: listing.user.phone || null,
        email: listing.user.email,
      }
    });
  } catch (err) {
    console.error("[listings] contact seller error:", err);
    res.status(500).json({ error: "Could not retrieve seller contact", code: "INTERNAL_ERROR" });
  }
});

export default router;
