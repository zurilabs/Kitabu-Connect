import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JWTPayload } from "../lib/jwt";
import { authService } from "../services/auth.service";
import { onboardingService } from "../services/onboarding.service";
import type { User } from "server/db/schema";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      jwtPayload?: JWTPayload;
    }
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from cookie
    const token = req.cookies?.auth_token;

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Verify token
    const payload = await verifyToken(token);

    if (!payload) {
      res.clearCookie("auth_token");
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Get user from database
    const user = await authService.getUserById(payload.userId);

    if (!user) {
      res.clearCookie("auth_token");
      return res.status(401).json({ message: "User not found" });
    }

    // Attach user to request
    req.user = user;
    req.jwtPayload = payload;

    next();
  } catch (error) {
    console.error("[Auth Middleware] Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function checkOnboardingStatus(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Check if user has completed onboarding
    if (!req.user.onboardingCompleted) {
      return res.status(403).json({
        message: "Onboarding not completed",
        redirectTo: "/onboarding",
      });
    }

    next();
  } catch (error) {
    console.error("[Onboarding Middleware] Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
}
