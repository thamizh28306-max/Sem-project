import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { config } from "../config";
import { authenticateToken, AuthRequest } from "../middleware/authMiddleware";
import { loginLimiter, registerLimiter } from "../middlewares/rateLimiter";

const router = Router();
const prisma = new PrismaClient();

const BCRYPT_COST = 12;
const MIN_BCRYPT_COST = 11; // Rehash on login if cost is lower

// Validation schemas
const registerSchema = z.object({
  name:     z.string().trim().min(1, "Name is required").max(80, "Name must be 80 characters or fewer"),
  email:    z.string().trim().toLowerCase().email("Invalid email format"),
  password: z.string().min(10, "Password must be at least 10 characters").max(72, "Password must be 72 characters or fewer"),
  phone:    z.string().regex(/^[6-9]\d{9}$/, "Phone must be a valid 10-digit Indian mobile number").optional().or(z.literal("")),
});

const loginSchema = z.object({
  email:    z.string().trim().toLowerCase().email("Invalid email format"),
  password: z.string().min(1, "Password is required").max(72, "Password exceeds max length"),
});

function signAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { sub: userId, id: userId, userId, email },
    config.JWT_SECRET,
    { algorithm: "HS256", expiresIn: "15m", issuer: "datazen", audience: "datazen-app" }
  );
}

function signRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, id: userId },
    config.REFRESH_SECRET,
    { algorithm: "HS256", expiresIn: "7d", issuer: "datazen", audience: "datazen-refresh" }
  );
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie("datazen_refresh", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: config.NODE_ENV === "production",
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// POST /api/auth/register
router.post("/register", registerLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid registration input", details: parsed.error.flatten().fieldErrors });
    return;
  }
  const { name, email, password, phone } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Generic conflict message - do not disclose whether email exists
      res.status(409).json({ error: "Unable to complete registration. Please check your details or log in.", code: "CONFLICT" });
      return;
    }

    const hash = await bcrypt.hash(password, BCRYPT_COST);
    const user = await prisma.user.create({
      data: { name, email, password: hash, phone: phone || null },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    const accessToken  = signAccessToken(user.id, user.email);
    const refreshToken = signRefreshToken(user.id);
    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      token: accessToken,
      accessToken,
      user,
    });
  } catch (err) {
    console.error("[auth] register error:", err);
    res.status(500).json({ error: "Registration failed", code: "INTERNAL_ERROR" });
  }
});

// POST /api/auth/login
router.post("/login", loginLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  const GENERIC_ERROR = { error: "Invalid email or password", code: "UNAUTHORIZED" };

  if (!parsed.success) {
    res.status(401).json(GENERIC_ERROR);
    return;
  }
  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Run dummy compare to mitigate timing-based user enumeration
      await bcrypt.compare(password, "$2a$12$e7k2wO5vFk3QZ61K8PjF5.t5N3qfA2K3L4M5N6O7P8Q9R0S1T2U3V");
      res.status(401).json(GENERIC_ERROR);
      return;
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(401).json(GENERIC_ERROR);
      return;
    }

    // Rehash if stored hash cost is lower than MIN_BCRYPT_COST
    const rounds = bcrypt.getRounds(user.password);
    if (rounds < MIN_BCRYPT_COST) {
      const newHash = await bcrypt.hash(password, BCRYPT_COST);
      await prisma.user.update({ where: { id: user.id }, data: { password: newHash } });
    }

    const accessToken  = signAccessToken(user.id, user.email);
    const refreshToken = signRefreshToken(user.id);
    setRefreshCookie(res, refreshToken);

    res.json({
      token: accessToken,
      accessToken,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("[auth] login error:", err);
    res.status(500).json({ error: "Login failed", code: "INTERNAL_ERROR" });
  }
});

/**
 * POST /api/auth/refresh
 * Issues a new access token and rotates the refresh token cookie.
 * Limitation: No server-side revocation is implemented to avoid modifying schema.prisma.
 */
router.post("/refresh", async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.datazen_refresh;
  if (!token) {
    res.status(401).json({ error: "No refresh token provided", code: "UNAUTHORIZED" });
    return;
  }
  try {
    const payload = jwt.verify(token, config.REFRESH_SECRET, {
      algorithms: ["HS256"],
      issuer: "datazen",
      audience: "datazen-refresh",
    }) as { sub?: string; id?: string };

    const userId = payload.sub || payload.id;
    if (!userId) {
      res.status(401).json({ error: "Invalid token payload", code: "UNAUTHORIZED" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) {
      res.status(401).json({ error: "User not found", code: "UNAUTHORIZED" });
      return;
    }

    // Rotate refresh token
    const newAccess  = signAccessToken(user.id, user.email);
    const newRefresh = signRefreshToken(user.id);
    setRefreshCookie(res, newRefresh);

    res.json({ token: newAccess, accessToken: newAccess });
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      res.status(401).json({ error: "Refresh token expired. Please log in again.", code: "TOKEN_EXPIRED" });
    } else {
      res.status(401).json({ error: "Invalid refresh token", code: "UNAUTHORIZED" });
    }
  }
});

// POST /api/auth/logout
router.post("/logout", (_req: Request, res: Response): void => {
  res.clearCookie("datazen_refresh", {
    httpOnly: true,
    sameSite: "strict",
    secure: config.NODE_ENV === "production",
    path: "/api/auth",
  });
  res.json({ message: "Logged out successfully" });
});

// GET /api/auth/me
router.get("/me", authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      res.status(401).json({ error: "Not authenticated", code: "UNAUTHORIZED" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!user) {
      res.status(404).json({ error: "User not found", code: "NOT_FOUND" });
      return;
    }
    res.json(user);
  } catch (err) {
    console.error("[auth] /me error:", err);
    res.status(500).json({ error: "Could not retrieve user", code: "INTERNAL_ERROR" });
  }
});

export default router;
