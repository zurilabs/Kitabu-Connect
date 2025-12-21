import type { Express } from "express";
import type { Server } from "http";
import cookieParser from "cookie-parser";
import { authService } from "./services/auth.service";
import { onboardingService } from "./services/onboarding.service";
import { bookListingService } from "./services/bookListing.service";
import { authenticateToken, checkOnboardingStatus } from "./middleware/auth.middleware";
import {
  sendOTPSchema,
  verifyOTPSchema,
  completeOnboardingSchema,
  createBookListingSchema,
  updateBookListingSchema,
  schools,
  publishers,
  users,
} from "server/db/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";
import uploadRoutes from "./routes/upload";
import walletRoutes from "./routes/wallet";
import favoritesRoutes from "./routes/favorites";
import { paymentService } from "./services/payment.service";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Add cookie parser middleware
  app.use(cookieParser());

  // ============================================
  // UPLOAD ROUTES
  // ============================================
  app.use("/api/upload", uploadRoutes);

  // ============================================
  // DEBUG ENDPOINT - Check environment variables
  // ============================================
  app.get("/api/debug/config", (req, res) => {
    return res.json({
      FRONTEND_URL: process.env.FRONTEND_URL || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: process.env.PORT || '5000',
      PAYSTACK_CONFIGURED: !!process.env.PAYSTACK_SECRET_KEY,
    });
  });

  // ============================================
  // WALLET & ORDER ROUTES
  // ============================================
  app.use("/api/wallet", walletRoutes);

  // ============================================
  // FAVORITES ROUTES
  // ============================================
  app.use("/api/favorites", favoritesRoutes);

  // ============================================
  // PAYSTACK WEBHOOK
  // ============================================
  app.post("/api/webhooks/paystack", async (req, res) => {
    try {
      const { verifyWebhookSignature } = await import("./config/paystack");
      const { withdrawalService } = await import("./services/withdrawal.service");

      // Verify webhook signature
      const signature = req.headers["x-paystack-signature"] as string;
      const payload = JSON.stringify(req.body);

      if (signature && !verifyWebhookSignature(payload, signature)) {
        console.error("[Webhook] Invalid signature");
        return res.status(400).send("Invalid signature");
      }

      const event = req.body;
      console.log("[Webhook] Paystack event received:", event.event);

      // Handle different event types
      if (event.event === "charge.success") {
        // Wallet top-up successful
        await paymentService.handlePaystackWebhook(event);
      } else if (event.event === "transfer.success") {
        // Withdrawal successful
        const reference = event.data.reference;
        const transactionId = parseInt(reference.split("-")[1]); // Extract from WD-{txId}-{timestamp}

        await withdrawalService.completeWithdrawal(transactionId, reference);
        console.log(`[Webhook] Transfer successful: ${reference}`);
      } else if (event.event === "transfer.failed" || event.event === "transfer.reversed") {
        // Withdrawal failed
        const reference = event.data.reference;
        const transactionId = parseInt(reference.split("-")[1]);
        const reason = event.data.reason || "Transfer failed";

        await withdrawalService.failWithdrawal(transactionId, reason);
        console.log(`[Webhook] Transfer failed: ${reference}, Reason: ${reason}`);
      }

      return res.status(200).send("OK");
    } catch (error) {
      console.error("[Webhook] Paystack webhook error:", error);
      return res.status(500).send("Error");
    }
  });

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
      const { updateProfileSchema } = await import("./db/schema/index");
      const { fromZodError } = await import("zod-validation-error");

      const validation = updateProfileSchema.safeParse(req.body);

      if (!validation.success) {
        const zodError = fromZodError(validation.error);
        return res.status(400).json({ message: zodError.message });
      }

      const userId = req.user!.id;
      const { fullName, email, phoneNumber, schoolId, schoolName, profilePictureUrl } = validation.data;

      // If phone number is being changed, require verification
      if (phoneNumber && phoneNumber !== req.user!.phoneNumber) {
        return res.status(400).json({
          message: "Phone number change requires verification",
          requiresVerification: true
        });
      }

      // Build update object with only provided fields
      const updateData: any = {};
      if (fullName !== undefined) updateData.fullName = fullName;
      if (email !== undefined) updateData.email = email;
      if (schoolId !== undefined) updateData.schoolId = schoolId;
      if (schoolName !== undefined) updateData.schoolName = schoolName;
      if (profilePictureUrl !== undefined) updateData.profilePictureUrl = profilePictureUrl;

      // Update user in database
      if (Object.keys(updateData).length > 0) {
        await db.update(users).set(updateData).where(eq(users.id, userId));
      }

      // Fetch updated user
      const [updatedUser] = await db.select().from(users).where(eq(users.id, userId));

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error("[Route] update-profile error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============================================
  // PREFERENCES ROUTES
  // ============================================

  // Get user preferences
  app.get("/api/preferences", authenticateToken, async (req, res) => {
    try {
      const { userPreferences } = await import("./db/schema/index");
      const userId = req.user!.id;

      const [preferences] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));

      // Create default preferences if they don't exist
      if (!preferences) {
        await db.insert(userPreferences).values({ userId });
        const [createdPreferences] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));

        return res.status(200).json({
          success: true,
          preferences: createdPreferences,
        });
      }

      return res.status(200).json({
        success: true,
        preferences,
      });
    } catch (error) {
      console.error("[Route] get-preferences error:", error);
      console.error("[Route] Error details:", error instanceof Error ? error.message : error);
      return res.status(500).json({ message: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Update notification preferences
  app.put("/api/preferences/notifications", authenticateToken, async (req, res) => {
    try {
      const { userPreferences, updateNotificationPreferencesSchema } = await import("./db/schema/index");
      const { fromZodError } = await import("zod-validation-error");

      const validation = updateNotificationPreferencesSchema.safeParse(req.body);

      if (!validation.success) {
        const zodError = fromZodError(validation.error);
        return res.status(400).json({ message: zodError.message });
      }

      const userId = req.user!.id;

      // Build update object with only provided fields
      const updateData: any = {};
      Object.keys(validation.data).forEach(key => {
        if (validation.data[key as keyof typeof validation.data] !== undefined) {
          updateData[key] = validation.data[key as keyof typeof validation.data];
        }
      });

      // Update or create preferences
      const [existing] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));

      if (existing) {
        await db.update(userPreferences).set(updateData).where(eq(userPreferences.userId, userId));
      } else {
        await db.insert(userPreferences).values({ userId, ...updateData });
      }

      // Fetch updated preferences
      const [updated] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));

      return res.status(200).json({
        success: true,
        message: "Notification preferences updated successfully",
        preferences: updated,
      });
    } catch (error) {
      console.error("[Route] update-notification-preferences error:", error);
      console.error("[Route] Error details:", error instanceof Error ? error.message : error);
      return res.status(500).json({ message: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Update payment preferences
  app.put("/api/preferences/payment", authenticateToken, async (req, res) => {
    try {
      const { userPreferences, updatePaymentPreferencesSchema } = await import("./db/schema/index");
      const { fromZodError } = await import("zod-validation-error");

      console.log("[Route] Payment update request body:", req.body);

      const validation = updatePaymentPreferencesSchema.safeParse(req.body);

      if (!validation.success) {
        const zodError = fromZodError(validation.error);
        console.error("[Route] Validation failed:", zodError.message);
        return res.status(400).json({ message: zodError.message });
      }

      const userId = req.user!.id;

      // Build update object with only provided fields
      // Convert empty strings to null
      const updateData: any = {};
      Object.keys(validation.data).forEach(key => {
        const value = validation.data[key as keyof typeof validation.data];
        if (value !== undefined) {
          updateData[key] = value === "" ? null : value;
        }
      });

      console.log("[Route] Update data:", updateData);

      // Update or create preferences
      const [existing] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));

      if (existing) {
        console.log("[Route] Updating existing preferences");
        await db.update(userPreferences).set(updateData).where(eq(userPreferences.userId, userId));
      } else {
        console.log("[Route] Creating new preferences");
        await db.insert(userPreferences).values({ userId, ...updateData });
      }

      // Fetch updated preferences
      const [updated] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));

      return res.status(200).json({
        success: true,
        message: "Payment preferences updated successfully",
        preferences: updated,
      });
    } catch (error) {
      console.error("[Route] update-payment-preferences error:", error);
      console.error("[Route] Error stack:", error instanceof Error ? error.stack : error);
      return res.status(500).json({ message: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // ============================================
  // REFERENCE DATA ROUTES
  // ============================================

  // Get all publishers
  app.get("/api/publishers", async (req, res) => {
    try {
      const allPublishers = await db.select().from(publishers);
      console.log("[Publishers] Found:", allPublishers.length, "publishers");
      console.log("[Publishers] Data:", JSON.stringify(allPublishers));
      return res.status(200).json({
        success: true,
        publishers: allPublishers,
      });
    } catch (error) {
      console.error("[Route] publishers error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ISBN Lookup - search local database first, then online
  app.get("/api/isbn/:isbn", authenticateToken, async (req, res) => {
    try {
      const { isbn } = req.params;

      if (!isbn) {
        return res.status(400).json({ message: "ISBN is required" });
      }

      console.log("[ISBN Lookup] Searching for ISBN:", isbn);

      // First, search local database
      const { bookListings } = await import("./db/schema/index");
      const localBook = await db
        .select()
        .from(bookListings)
        .where(eq(bookListings.isbn, isbn))
        .limit(1);

      if (localBook.length > 0) {
        console.log("[ISBN Lookup] Found in local database");
        const book = localBook[0];
        return res.status(200).json({
          success: true,
          source: "local",
          bookData: {
            title: book.title,
            author: book.author,
            publisher: book.publisher,
            isbn: book.isbn,
            edition: book.edition,
            publicationYear: book.publicationYear,
            language: book.language,
            bindingType: book.bindingType,
            numberOfPages: book.numberOfPages,
            subject: book.subject,
            classGrade: book.classGrade,
            curriculum: book.curriculum,
          },
        });
      }

      // If not found locally, search Open Library API
      console.log("[ISBN Lookup] Not found locally, searching online...");
      const openLibraryUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;

      const response = await fetch(openLibraryUrl);
      const data = await response.json();

      const bookKey = `ISBN:${isbn}`;
      if (data[bookKey]) {
        const bookInfo = data[bookKey];
        console.log("[ISBN Lookup] Found online:", bookInfo.title);

        return res.status(200).json({
          success: true,
          source: "online",
          bookData: {
            title: bookInfo.title || null,
            author: bookInfo.authors?.[0]?.name || null,
            publisher: bookInfo.publishers?.[0]?.name || null,
            isbn: isbn,
            edition: null,
            publicationYear: bookInfo.publish_date ? parseInt(bookInfo.publish_date) : null,
            language: "English",
            bindingType: null,
            numberOfPages: bookInfo.number_of_pages || null,
            subject: bookInfo.subjects?.[0]?.name || null,
            classGrade: null,
            curriculum: null,
          },
        });
      }

      // Not found anywhere
      console.log("[ISBN Lookup] Not found in local or online databases");
      return res.status(404).json({
        success: false,
        message: "Book not found with this ISBN",
      });
    } catch (error) {
      console.error("[Route] isbn-lookup error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============================================
  // BOOKS/MARKETPLACE ROUTES (require authentication + onboarding)
  // ============================================

  // Get all books in marketplace
  app.get("/api/books", authenticateToken, checkOnboardingStatus, async (req, res) => {
    try {
      const { subject, classGrade, condition, minPrice, maxPrice } = req.query;

      const filters = {
        subject: subject as string | undefined,
        classGrade: classGrade as string | undefined,
        condition: condition as string | undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
      };

      const result = await bookListingService.getAllListings(filters);
      return res.status(200).json(result);
    } catch (error) {
      console.error("[Route] books error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single book details
  app.get("/api/books/:id", authenticateToken, checkOnboardingStatus, async (req, res) => {
    try {
      const { id } = req.params;
      const listing = await bookListingService.getListingById(parseInt(id));

      if (!listing) {
        return res.status(404).json({ message: "Book listing not found" });
      }

      // Increment view count
      await bookListingService.incrementViews(parseInt(id));

      return res.status(200).json({
        success: true,
        listing,
      });
    } catch (error) {
      console.error("[Route] book-details error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create/sell a book listing
  app.post("/api/books", authenticateToken, checkOnboardingStatus, async (req, res) => {
    try {
      const validation = createBookListingSchema.safeParse(req.body);

      if (!validation.success) {
        const zodError = fromZodError(validation.error);
        return res.status(400).json({ message: zodError.message });
      }

      const sellerId = req.user!.id;
      const result = await bookListingService.createListing(sellerId, validation.data);

      return res.status(201).json(result);
    } catch (error) {
      console.error("[Route] create-book error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update a book listing
  app.put("/api/books/:id", authenticateToken, checkOnboardingStatus, async (req, res) => {
    try {
      const { id } = req.params;
      const validation = updateBookListingSchema.safeParse(req.body);

      if (!validation.success) {
        const zodError = fromZodError(validation.error);
        return res.status(400).json({ message: zodError.message });
      }

      const sellerId = req.user!.id;
      const result = await bookListingService.updateListing(
        parseInt(id),
        sellerId,
        validation.data
      );

      if (!result.success) {
        return res.status(404).json({ message: result.message });
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("[Route] update-book error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete a book listing
  app.delete("/api/books/:id", authenticateToken, checkOnboardingStatus, async (req, res) => {
    try {
      const { id } = req.params;
      const sellerId = req.user!.id;
      const result = await bookListingService.deleteListing(parseInt(id), sellerId);

      if (!result.success) {
        return res.status(404).json({ message: result.message });
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("[Route] delete-book error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user's listings
  app.get("/api/my-books", authenticateToken, checkOnboardingStatus, async (req, res) => {
    try {
      const sellerId = req.user!.id;
      console.log("[My Books] Fetching listings for seller:", sellerId);
      const result = await bookListingService.getListingsBySeller(sellerId);
      console.log("[My Books] Found", result.listings?.length || 0, "listings");

      return res.status(200).json(result);
    } catch (error) {
      console.error("[Route] my-books error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
