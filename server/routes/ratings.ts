import { Router } from "express";
import { ratingService } from "../services/rating.service";
import { authenticateToken } from "../middleware/auth.middleware";
import { fromZodError } from "zod-validation-error";
import { z } from "zod";

const router = Router();

// Validation schemas
const createRatingSchema = z.object({
  orderId: z.number().optional(),
  swapOrderId: z.number().optional(),
  cycleId: z.string().uuid().optional(),
  revieweeId: z.string().uuid(),
  ratingType: z.enum(["seller", "buyer", "swapper"]),
  overallRating: z.number().min(1).max(5),
  communicationRating: z.number().min(1).max(5).optional(),
  accuracyRating: z.number().min(1).max(5).optional(),
  timelinesRating: z.number().min(1).max(5).optional(),
  conditionRating: z.number().min(1).max(5).optional(),
  professionalismRating: z.number().min(1).max(5).optional(),
  reviewText: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  isAnonymous: z.boolean().optional(),
}).refine(
  (data) => data.orderId || data.swapOrderId || data.cycleId,
  { message: "Either orderId, swapOrderId, or cycleId must be provided" }
);

const respondToRatingSchema = z.object({
  responseText: z.string().min(10, "Response must be at least 10 characters").max(500),
});

/**
 * POST /api/ratings
 * Create a new rating
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;

    const validation = createRatingSchema.safeParse(req.body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return res.status(400).json({ message: error.message });
    }

    const result = await ratingService.createRating({
      ...validation.data,
      reviewerId: userId,
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(201).json({
      success: true,
      ratingId: result.ratingId,
      message: result.message,
    });
  } catch (error: any) {
    console.error("[Route] create-rating error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /api/ratings/user/:userId
 * Get ratings for a specific user
 */
router.get("/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const ratingType = req.query.ratingType as "seller" | "buyer" | "swapper" | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const result = await ratingService.getUserRatings(userId, {
      ratingType,
      limit,
      offset,
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(200).json({
      success: true,
      ratings: result.ratings,
    });
  } catch (error: any) {
    console.error("[Route] get-user-ratings error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /api/ratings/user/:userId/stats
 * Get rating statistics for a user
 */
router.get("/user/:userId/stats", async (req, res) => {
  try {
    const userId = req.params.userId;

    const result = await ratingService.getUserRatingStats(userId);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(200).json({
      success: true,
      stats: result.stats,
    });
  } catch (error: any) {
    console.error("[Route] get-rating-stats error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * POST /api/ratings/:ratingId/respond
 * Respond to a rating (reviewee response)
 */
router.post("/:ratingId/respond", authenticateToken, async (req, res) => {
  try {
    const ratingId = parseInt(req.params.ratingId);

    const validation = respondToRatingSchema.safeParse(req.body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return res.status(400).json({ message: error.message });
    }

    const result = await ratingService.respondToRating({
      ratingId,
      responseText: validation.data.responseText,
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error("[Route] respond-to-rating error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /api/ratings/pending
 * Get pending ratings for the authenticated user
 */
router.get("/pending", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;

    const result = await ratingService.getPendingRatings(userId);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(200).json({
      success: true,
      pending: result.pending,
    });
  } catch (error: any) {
    console.error("[Route] get-pending-ratings error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /api/ratings/check
 * Check if user has already rated someone for a specific order
 */
router.get("/check", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const orderId = req.query.orderId ? parseInt(req.query.orderId as string) : undefined;
    const swapOrderId = req.query.swapOrderId ? parseInt(req.query.swapOrderId as string) : undefined;
    const revieweeId = req.query.revieweeId as string;

    if (!revieweeId) {
      return res.status(400).json({ message: "revieweeId is required" });
    }

    if (!orderId && !swapOrderId) {
      return res.status(400).json({ message: "Either orderId or swapOrderId is required" });
    }

    const result = await ratingService.checkIfRated({
      reviewerId: userId,
      revieweeId,
      orderId,
      swapOrderId,
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(200).json({
      success: true,
      hasRated: result.hasRated,
    });
  } catch (error: any) {
    console.error("[Route] check-rating error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
