import type { Express } from "express";
import type { Server } from "http";
import cookieParser from "cookie-parser";
import { authService } from "./services/auth.service";
import { onboardingService } from "./services/onboarding.service";
import { authenticateToken, checkOnboardingStatus } from "./middleware/auth.middleware";
import {
  sendOTPSchema,
  verifyOTPSchema,
  completeOnboardingSchema,
  schools,
} from "@shared/schema";
import { db } from "./db";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Add cookie parser middleware
  app.use(cookieParser());

  // ============================================
  // AUTH ROUTES
  // ============================================

  // Send OTP
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const validation = sendOTPSchema.safeParse(req.body);

      if (!validation.success) {
        const error = fromZodError(validation.error);
        return res.status(400).json({ message: error.message });
      }

      const { phoneNumber } = validation.data;
      const result = await authService.sendOTP(phoneNumber);

      return res.status(200).json(result);
    } catch (error) {
      console.error("[Route] send-otp error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Verify OTP
  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const validation = verifyOTPSchema.safeParse(req.body);

      if (!validation.success) {
        const error = fromZodError(validation.error);
        return res.status(400).json({ message: error.message });
      }

      const { phoneNumber, code } = validation.data;
      const result = await authService.verifyOTP(phoneNumber, code);

      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      // Set JWT token in httpOnly cookie (7 days)
      res.cookie("auth_token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.status(200).json({
        success: true,
        user: result.user,
        isNewUser: result.isNewUser,
      });
    } catch (error) {
      console.error("[Route] verify-otp error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user
  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      return res.status(200).json({ user: req.user });
    } catch (error) {
      console.error("[Route] me error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout (requires authentication)
  app.post("/api/auth/logout", authenticateToken, async (req, res) => {
    try {
      res.clearCookie("auth_token");
      return res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      console.error("[Route] logout error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============================================
  // ONBOARDING ROUTES
  // ============================================

  // Complete onboarding
  app.post("/api/onboarding/complete", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const validation = completeOnboardingSchema.safeParse(req.body);

      if (!validation.success) {
        const error = fromZodError(validation.error);
        return res.status(400).json({ message: error.message });
      }

      const result = await onboardingService.completeOnboarding(
        req.user.id,
        validation.data
      );

      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      return res.status(200).json({
        success: true,
        user: result.user,
      });
    } catch (error) {
      console.error("[Route] complete-onboarding error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get onboarding status
  app.get("/api/onboarding/status", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const result = await onboardingService.checkOnboardingStatus(req.user.id);

      return res.status(200).json({
        completed: result.completed,
        user: result.user,
      });
    } catch (error) {
      console.error("[Route] onboarding-status error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============================================
  // SCHOOLS ROUTES
  // ============================================

  // Get all schools
  app.get("/api/schools", async (req, res) => {
    try {
      const allSchools = await db.select().from(schools);
      return res.status(200).json({ schools: allSchools });
    } catch (error) {
      console.error("[Route] schools error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============================================
  // PROTECTED ROUTES (require authentication + onboarding completion)
  // ============================================

  // Get dashboard data
  app.get("/api/dashboard", authenticateToken, checkOnboardingStatus, async (req, res) => {
    try {
      return res.status(200).json({
        message: "Dashboard data",
        user: req.user,
      });
    } catch (error) {
      console.error("[Route] dashboard error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user profile
  app.get("/api/profile", authenticateToken, checkOnboardingStatus, async (req, res) => {
    try {
      return res.status(200).json({
        success: true,
        user: req.user,
      });
    } catch (error) {
      console.error("[Route] profile error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user profile
  app.put("/api/profile", authenticateToken, checkOnboardingStatus, async (req, res) => {
    try {
      // TODO: Implement profile update logic
      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user: req.user,
      });
    } catch (error) {
      console.error("[Route] update-profile error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============================================
  // BOOKS/MARKETPLACE ROUTES (require authentication + onboarding)
  // ============================================

  // Get all books in marketplace
  app.get("/api/books", authenticateToken, checkOnboardingStatus, async (req, res) => {
    try {
      // TODO: Implement book listing logic
      return res.status(200).json({
        success: true,
        books: [],
        message: "Book marketplace - Coming soon",
      });
    } catch (error) {
      console.error("[Route] books error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single book details
  app.get("/api/books/:id", authenticateToken, checkOnboardingStatus, async (req, res) => {
    try {
      const { id } = req.params;
      // TODO: Implement book details logic
      return res.status(200).json({
        success: true,
        book: null,
        message: `Book details for ID: ${id} - Coming soon`,
      });
    } catch (error) {
      console.error("[Route] book-details error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create/sell a book listing
  app.post("/api/books", authenticateToken, checkOnboardingStatus, async (req, res) => {
    try {
      // TODO: Implement create book listing logic
      return res.status(201).json({
        success: true,
        message: "Book listing created successfully",
        book: null,
      });
    } catch (error) {
      console.error("[Route] create-book error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update a book listing
  app.put("/api/books/:id", authenticateToken, checkOnboardingStatus, async (req, res) => {
    try {
      const { id } = req.params;
      // TODO: Implement update book listing logic
      // Verify user owns this listing
      return res.status(200).json({
        success: true,
        message: `Book ${id} updated successfully`,
      });
    } catch (error) {
      console.error("[Route] update-book error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete a book listing
  app.delete("/api/books/:id", authenticateToken, checkOnboardingStatus, async (req, res) => {
    try {
      const { id } = req.params;
      // TODO: Implement delete book listing logic
      // Verify user owns this listing
      return res.status(200).json({
        success: true,
        message: `Book ${id} deleted successfully`,
      });
    } catch (error) {
      console.error("[Route] delete-book error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
