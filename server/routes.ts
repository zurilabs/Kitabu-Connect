import type { Express } from "express";
import type { Server } from "http";
import cookieParser from "cookie-parser";
import { authService } from "./services/auth.service";
import { onboardingService } from "./services/onboarding.service";
import { bookListingService } from "./services/bookListing.service";
import { authenticateToken, checkOnboardingStatus } from "./middleware/auth.middleware";
import { passport, isGoogleConfigured } from "./lib/passport";
import { generateToken } from "./lib/jwt";
import {
  sendOTPSchema,
  verifyOTPSchema,
  completeOnboardingSchema,
  createBookListingSchema,
  updateBookListingSchema,
  schools,
  publishers,
  users,
  children,
  bookListings,
  bookPhotos,
} from "server/db/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";
import uploadRoutes from "./routes/upload";
import walletRoutes from "./routes/wallet";
import favoritesRoutes from "./routes/favorites";
import swapRoutes from "./routes/swaps";
import swapOrderRoutes from "./routes/swapOrders";
import conversationRoutes from "./routes/conversations";
import notificationRoutes from "./routes/notifications";
import cyclesRoutes from "./routes/cycles";
import gamificationRoutes from "./routes/gamification";
import childrenRoutes from "./routes/children";
import disputeRoutes from "./routes/disputes";
import wishlistRoutes from "./routes/wishlist";
import sitemapRoutes from "./routes/sitemap";
import ratingsRoutes from "./routes/ratings";
import referralRoutes from "./routes/referrals";
import ordersRoutes from "./routes/orders";
import escrowRoutes from "./routes/escrow";
import { paymentService } from "./services/payment.service";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Add cookie parser middleware
  app.use(cookieParser());

  // ============================================
  // HEALTH CHECK ENDPOINT (for Railway/monitoring)
  // ============================================
  app.get("/api/health", (req, res) => {
    return res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

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
  // SWAP ROUTES
  // ============================================
  app.use("/api/swaps", swapRoutes);

  // ============================================
  // SWAP ORDER & MESSAGING ROUTES
  // ============================================
  app.use("/api/swap-orders", swapOrderRoutes);

  // ============================================
  // DIRECT MESSAGING / CONVERSATIONS ROUTES
  // ============================================
  app.use("/api/conversations", conversationRoutes);

  // ============================================
  // NOTIFICATION ROUTES
  // ============================================
  app.use("/api/notifications", notificationRoutes);

  // ============================================
  // SWAP CYCLES ROUTES
  // ============================================
  app.use("/api/cycles", cyclesRoutes);

  // ============================================
  // GAMIFICATION ROUTES
  // ============================================
  app.use("/api/gamification", gamificationRoutes);

  // ============================================
  // CHILDREN ROUTES
  // ============================================
  app.use("/api/children", childrenRoutes);

  // ============================================
  // DISPUTES ROUTES
  // ============================================
  app.use("/api/disputes", disputeRoutes);

  // ============================================
  // WISHLIST ROUTES
  // ============================================
  app.use("/api/wishlist", wishlistRoutes);

  // ============================================
  // SITEMAP ROUTE (for SEO)
  // ============================================
  app.use("/", sitemapRoutes);

  // ============================================
  // RATINGS ROUTES
  // ============================================
  app.use("/api/ratings", ratingsRoutes);

  // ============================================
  // REFERRAL ROUTES
  // ============================================
  app.use("/api/referrals", referralRoutes);

  // ============================================
  // ORDERS ROUTES
  // ============================================
  app.use("/api/orders", ordersRoutes);

  // ============================================
  // ESCROW ROUTES
  // ============================================
  app.use("/api/escrow", escrowRoutes);

  // ============================================
  // PAYSTACK WEBHOOK
  // ============================================
  app.post("/api/webhooks/paystack", async (req, res) => {
    try {
      const { verifyWebhookSignature } = await import("./config/paystack");
      const { withdrawalService } = await import("./services/withdrawal.service");
      const { notificationService } = await import("./services/notification.service");
      const { transactions } = await import("./db/schema");

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

        if (!isNaN(transactionId)) {
          // Get transaction to find user
          const [tx] = await db.select().from(transactions).where(eq(transactions.id, transactionId)).limit(1);

          if (tx) {
            await withdrawalService.completeWithdrawal(transactionId, reference);

            // Send notification to user
            await notificationService.createNotification({
              userId: tx.userId,
              type: 'withdrawal_completed',
              title: 'Withdrawal Completed',
              message: `Your withdrawal of KES ${parseFloat(tx.amount).toLocaleString()} has been completed successfully.`,
              actionUrl: '/dashboard',
            });

            console.log(`[Webhook] Transfer successful: ${reference}`);
          }
        }
      } else if (event.event === "transfer.failed" || event.event === "transfer.reversed") {
        // Withdrawal failed
        const reference = event.data.reference;
        const transactionId = parseInt(reference.split("-")[1]);
        const reason = event.data.reason || "Transfer failed";

        if (!isNaN(transactionId)) {
          // Get transaction to find user
          const [tx] = await db.select().from(transactions).where(eq(transactions.id, transactionId)).limit(1);

          if (tx) {
            await withdrawalService.failWithdrawal(transactionId, reason);

            // Send notification to user
            await notificationService.createNotification({
              userId: tx.userId,
              type: 'withdrawal_failed',
              title: event.event === "transfer.reversed" ? 'Withdrawal Reversed' : 'Withdrawal Failed',
              message: `Your withdrawal of KES ${parseFloat(tx.amount).toLocaleString()} ${event.event === "transfer.reversed" ? 'was reversed' : 'failed'}. The amount has been refunded to your wallet. Reason: ${reason}`,
              actionUrl: '/dashboard',
            });

            console.log(`[Webhook] Transfer ${event.event}: ${reference}, Reason: ${reason}`);
          }
        }
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

      const { email } = validation.data;
      const result = await authService.sendOTP(email);

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

      const { email, code } = validation.data;
      const result = await authService.verifyOTP(email, code);

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

  // Google OAuth - Initiate authentication
  app.get("/api/auth/google", (req, res, next) => {
    if (!isGoogleConfigured) {
      return res.status(503).json({
        success: false,
        message: "Google authentication is not configured"
      });
    }

    passport.authenticate("google", {
      scope: ["profile", "email"]
    })(req, res, next);
  });

  // Google OAuth - Callback
  app.get("/api/auth/google/callback", (req, res, next) => {
    passport.authenticate("google", {
      session: false,
      failureRedirect: "/login?error=google_auth_failed"
    }, async (err: any, user: any) => {
      if (err || !user) {
        console.error("[Google OAuth] Authentication failed:", err);
        return res.redirect("/login?error=google_auth_failed");
      }

      try {
        // Generate JWT token for the authenticated user
        const token = await generateToken(user);

        // Set JWT token in httpOnly cookie
        res.cookie("auth_token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // Redirect based on onboarding status
        if (user.onboardingCompleted) {
          return res.redirect("/dashboard");
        } else {
          return res.redirect("/onboarding");
        }
      } catch (error) {
        console.error("[Google OAuth] Error setting up session:", error);
        return res.redirect("/login?error=session_setup_failed");
      }
    })(req, res, next);
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

      console.log('[Route] Onboarding complete request body:', JSON.stringify(req.body, null, 2));

      const validation = completeOnboardingSchema.safeParse(req.body);

      if (!validation.success) {
        console.log('[Route] Validation failed:', validation.error);
        const error = fromZodError(validation.error);
        return res.status(400).json({ message: error.message });
      }

      console.log('[Route] Validation successful, validated data:', JSON.stringify(validation.data, null, 2));

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

  // Search schools (optimized for autocomplete)
  app.get("/api/schools/search", async (req, res) => {
    try {
      const { q, limit = "10" } = req.query;

      if (!q || typeof q !== "string") {
        return res.status(200).json({ schools: [] });
      }

      const searchTerm = `%${q.toLowerCase()}%`;
      const limitNum = Math.min(parseInt(limit as string) || 10, 50); // Max 50 results

      // Search schools by name (case-insensitive)
      const results = await db
        .select()
        .from(schools)
        .where(sql`LOWER(${schools.schoolName}) LIKE ${searchTerm}`)
        .limit(limitNum);

      return res.status(200).json({ schools: results });
    } catch (error) {
      console.error("[Route] schools/search error:", error);
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

  // Get all subjects
  app.get("/api/subjects", async (req, res) => {
    try {
      const { subjects } = await import("./db/schema/index");
      const allSubjects = await db.select().from(subjects).orderBy(subjects.sortOrder);
      return res.status(200).json({
        success: true,
        subjects: allSubjects,
      });
    } catch (error) {
      console.error("[Route] subjects error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ISBN Lookup - search local database first, then online
  // Note: Made public so wishlist form can use it without requiring full auth
  app.get("/api/isbn/:isbn", async (req, res) => {
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

  // Get all books in marketplace (accessible to everyone, authenticated or not)
  app.get("/api/books", async (req, res) => {
    try {
      const {
        searchTerm,
        subject,
        classGrade,
        condition,
        minPrice,
        maxPrice,
        listingType,
        sameSchoolOnly,
        maxDistance,
        sortBy,
        page,
        limit,
        personalized // NEW: Frontend can request personalized results
      } = req.query;

      // Get current user's info if authenticated (optional)
      let currentUser = null;
      if (req.cookies?.auth_token) {
        try {
          const { verifyToken } = await import("./lib/jwt");
          const payload = await verifyToken(req.cookies.auth_token);
          if (payload) {
            const [user] = await db.select().from(users).where(eq(users.id, payload.userId));
            currentUser = user;
          }
        } catch (error) {
          // User is not authenticated, that's fine - continue as guest
          console.log("[Route] Guest user browsing marketplace");
        }
      }

      // Enable personalization by default for authenticated users (can be disabled via query param)
      const enablePersonalization = currentUser && personalized !== 'false';

      // Get user's school from children table if needed for sameSchoolOnly filter
      let userSchoolId: string | undefined;
      if (sameSchoolOnly === 'true' && currentUser?.id) {
        const [child] = await db.select().from(children).where(eq(children.parentId, currentUser.id)).limit(1);
        userSchoolId = child?.schoolId || undefined;
      }

      const filters = {
        searchTerm: searchTerm as string | undefined,
        subject: subject as string | undefined,
        classGrade: classGrade as string | undefined,
        condition: condition as string | undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        listingType: listingType as string | undefined,
        schoolId: userSchoolId,
        maxDistance: maxDistance ? Number(maxDistance) : undefined,
        userLatitude: currentUser?.latitude ? Number(currentUser.latitude) : undefined,
        userLongitude: currentUser?.longitude ? Number(currentUser.longitude) : undefined,
        excludeUserId: currentUser?.id, // Exclude current user's own listings
        sortBy: sortBy as string | undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        userId: currentUser?.id, // NEW: Pass user ID for personalization
        personalizedMode: enablePersonalization, // NEW: Enable personalization
      };

      console.log('[Route] /api/books filters:', JSON.stringify(filters, null, 2));

      // Add caching headers - cache for 1 minute for marketplace data
      res.set({
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
      });

      const result = await bookListingService.getAllListings(filters);
      console.log('[Route] /api/books result:', {
        success: result.success,
        listingsCount: result.listings?.length || 0,
        pagination: result.pagination
      });
      return res.status(200).json(result);
    } catch (error) {
      console.error("[Route] books error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get personalized books for homepage (optimized with diversity)
  app.get("/api/books/recent", async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 8;

      // No caching - we want fresh results on every visit
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });

      // Get current user for personalization (if authenticated)
      let currentUser = null;
      if (req.session?.userId) {
        // Fetch user's children to get grades and schools
        const userChildren = await db
          .select({
            childId: children.id,
            grade: children.grade,
            schoolId: children.schoolId,
          })
          .from(children)
          .where(eq(children.parentId, req.session.userId));

        // Use the first child's data for personalization (or could blend multiple children)
        if (userChildren.length > 0) {
          currentUser = {
            childGrade: userChildren[0].grade,
            schoolId: userChildren[0].schoolId,
            allChildren: userChildren,
          };
        }
      }

      // Fetch candidate pool (last 30 days, up to 200 books)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      let candidatePool = await db
        .select({
          listing: bookListings,
          seller: {
            id: users.id,
            fullName: users.fullName,
          }
        })
        .from(bookListings)
        .innerJoin(users, eq(bookListings.sellerId, users.id))
        .where(
          and(
            eq(bookListings.listingStatus, "active"),
            sql`${bookListings.quantityAvailable} > 0`,
            sql`${bookListings.createdAt} >= ${thirtyDaysAgo}`
          )
        )
        .orderBy(desc(bookListings.createdAt))
        .limit(200);

      // Fallback: If not enough recent books, fetch older ones (30+ days)
      if (candidatePool.length < limit) {
        const olderBooks = await db
          .select({
            listing: bookListings,
            seller: {
              id: users.id,
              fullName: users.fullName,
            }
          })
          .from(bookListings)
          .innerJoin(users, eq(bookListings.sellerId, users.id))
          .where(
            and(
              eq(bookListings.listingStatus, "active"),
              sql`${bookListings.quantityAvailable} > 0`,
              sql`${bookListings.createdAt} < ${thirtyDaysAgo}`
            )
          )
          .orderBy(desc(bookListings.createdAt))
          .limit(50);

        candidatePool = [...candidatePool, ...olderBooks];
      }

      // Fetch seller schools for personalization (batch query)
      const sellerIds = [...new Set(candidatePool.map(({ seller }) => seller.id))];

      // Only query seller schools if we have sellers
      const sellerSchools = sellerIds.length > 0
        ? await db
            .select({
              parentId: children.parentId,
              schoolId: children.schoolId,
            })
            .from(children)
            .where(sql`${children.parentId} IN (${sql.join(sellerIds.map(id => sql`${id}`), sql`, `)})`)
        : [];

      // Create a map of sellerId -> schoolId (use first child's school)
      const sellerSchoolMap = new Map<number, string | null>();
      sellerSchools.forEach(({ parentId, schoolId }) => {
        if (!sellerSchoolMap.has(parentId)) {
          sellerSchoolMap.set(parentId, schoolId);
        }
      });

      if (candidatePool.length === 0) {
        return res.status(200).json({
          success: true,
          listings: [],
          pagination: { page: 1, limit, total: 0, totalPages: 0, hasMore: false }
        });
      }

      // HYBRID PERSONALIZATION + POPULARITY SCORING ALGORITHM
      const scoredBooks = candidatePool.map(({ listing, seller }) => {
        let score = 0;

        // 1. PERSONALIZATION (0-100 points) - If logged in
        if (currentUser) {
          // Same school: +40 points (highest priority - physical proximity)
          const sellerSchoolId = sellerSchoolMap.get(seller.id);
          if (currentUser.schoolId && sellerSchoolId && currentUser.schoolId === sellerSchoolId) {
            score += 40;
          }

          // Grade match
          if (currentUser.childGrade && listing.classGrade) {
            const userGrade = currentUser.childGrade;
            const bookGrade = parseInt(listing.classGrade.replace(/\D/g, '')) || 0;

            if (userGrade === bookGrade) {
              score += 60; // Exact match
            } else if (Math.abs(userGrade - bookGrade) === 1) {
              score += 40; // Adjacent grade (±1)
            } else if (Math.abs(userGrade - bookGrade) === 2) {
              score += 20; // Close grade (±2)
            }
          }
        }

        // 2. ENGAGEMENT (0-80 points)
        const viewsCount = listing.viewsCount || 0;
        const favoritesCount = listing.favoritesCount || 0;

        // Views: up to 30 points
        const viewsScore = Math.min(30, (Math.min(viewsCount, 100) / 100) * 30);
        score += viewsScore;

        // Favorites: up to 50 points (strong indicator of interest)
        const favoritesScore = Math.min(50, (Math.min(favoritesCount, 20) / 20) * 50);
        score += favoritesScore;

        // 3. RECENCY (0-60 points)
        const ageInHours = (Date.now() - new Date(listing.createdAt).getTime()) / (1000 * 60 * 60);
        const ageInDays = ageInHours / 24;

        if (ageInHours < 24) {
          score += 60; // Brand new (< 24 hours) - visibility boost!
        } else if (ageInDays <= 3) {
          score += 45; // 1-3 days
        } else if (ageInDays <= 7) {
          score += 30; // 3-7 days
        } else if (ageInDays <= 14) {
          score += 15; // 7-14 days
        } else if (ageInDays <= 30) {
          score += 5; // 14-30 days
        }
        // Older than 30 days: 0 points

        // 4. VALUE INDICATOR (0-30 points)
        const price = parseFloat(listing.price || "0");
        const originalPrice = parseFloat(listing.originalRetailPrice || "0");

        if (originalPrice > 0 && price > 0) {
          const discount = ((originalPrice - price) / originalPrice) * 100;

          if (discount >= 50) {
            score += 30; // Great deal!
          } else if (discount >= 30) {
            score += 20; // Good deal
          } else if (discount >= 20) {
            score += 10; // Decent deal
          }
        }

        // Condition bonus
        if (listing.condition === "Like New") {
          score += 10;
        }

        // 5. LISTING TYPE BALANCE (0-20 points)
        // Boost swap listings slightly to promote platform's swap feature
        if (listing.listingType === "swap") {
          score += 20;
        }

        // 6. RANDOMNESS (±15 points) - Ensures variety across visits
        score += (Math.random() * 30) - 15;

        return { listing, seller, score };
      });

      // Sort by score (highest first)
      scoredBooks.sort((a, b) => b.score - a.score);

      // INTELLIGENT SELECTION WITH DIVERSITY CONSTRAINTS
      const selectedListings: typeof candidatePool = [];
      const usedSubjects = new Map<string, number>(); // Track count per subject
      const usedGrades = new Map<string, number>(); // Track count per grade
      const usedSellers = new Set<string>();
      let swapListingsCount = 0;

      // First pass: Select high-scoring books with diversity
      for (const { listing, seller } of scoredBooks) {
        if (selectedListings.length >= limit) break;

        const subject = listing.subject || "unknown";
        const grade = listing.classGrade || "unknown";
        const sellerId = seller.id;
        const isSwap = listing.listingType === "swap";

        // Check diversity constraints
        const subjectCount = usedSubjects.get(subject) || 0;
        const gradeCount = usedGrades.get(grade) || 0;
        const isNewSeller = !usedSellers.has(sellerId);

        // Diversity rules:
        // - Max 2 books from same subject
        // - Max 2 books from same grade
        // - Max 1 book per seller
        const meetsDiversityRules =
          subjectCount < 2 &&
          gradeCount < 2 &&
          isNewSeller;

        if (meetsDiversityRules) {
          selectedListings.push({ listing, seller });
          usedSubjects.set(subject, subjectCount + 1);
          usedGrades.set(grade, gradeCount + 1);
          usedSellers.add(sellerId);
          if (isSwap) swapListingsCount++;
        }
      }

      // Ensure at least 1-2 swap listings if available
      const minSwapListings = limit >= 8 ? 2 : 1;
      if (swapListingsCount < minSwapListings) {
        const swapBooks = scoredBooks.filter(({ listing }) => listing.listingType === "swap");

        for (const { listing, seller } of swapBooks) {
          if (swapListingsCount >= minSwapListings) break;
          if (selectedListings.length >= limit) break;

          // Avoid duplicates
          const alreadySelected = selectedListings.some(s => s.listing.id === listing.id);
          if (!alreadySelected) {
            selectedListings.push({ listing, seller });
            swapListingsCount++;
          }
        }
      }

      // If we still don't have enough books, relax diversity rules
      if (selectedListings.length < limit) {
        for (const { listing, seller } of scoredBooks) {
          if (selectedListings.length >= limit) break;

          const alreadySelected = selectedListings.some(s => s.listing.id === listing.id);
          if (!alreadySelected) {
            selectedListings.push({ listing, seller });
          }
        }
      }

      // Get listing IDs for batch photo query
      const listingIds = selectedListings.map(({ listing }) => listing.id);

      // Fetch all photos in one query
      const allPhotos = listingIds.length > 0
        ? await db
            .select()
            .from(bookPhotos)
            .where(sql`${bookPhotos.listingId} IN (${sql.join(listingIds.map(id => sql`${id}`), sql`, `)})`)
            .orderBy(bookPhotos.displayOrder)
        : [];

      // Group photos by listing ID
      const photosByListingId = allPhotos.reduce((acc, photo) => {
        if (!acc[photo.listingId]) {
          acc[photo.listingId] = [];
        }
        acc[photo.listingId].push(photo);
        return acc;
      }, {} as Record<number, typeof allPhotos>);

      // Combine listings with photos
      const listingsWithPhotos = selectedListings.map(({ listing, seller }) => ({
        ...listing,
        photos: photosByListingId[listing.id] || [],
        seller: {
          id: seller.id,
          fullName: seller.fullName,
        }
      }));

      return res.status(200).json({
        success: true,
        listings: listingsWithPhotos,
        personalized: !!currentUser,
        pagination: {
          page: 1,
          limit: limit,
          total: listingsWithPhotos.length,
          totalPages: 1,
          hasMore: false
        }
      });
    } catch (error) {
      console.error("[Route] recent-books error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single book details (accessible to everyone)
  app.get("/api/books/:id", async (req, res) => {
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
