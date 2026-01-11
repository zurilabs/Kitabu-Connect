import { Router } from "express";
import {
  createOrGetReferralCode,
  trackReferralSignup,
  getUserReferralStats,
  getReferralLeaderboard,
} from "../services/referral.service";
import { authenticateToken } from "../middleware/auth.middleware";
import { fromZodError } from "zod-validation-error";
import { z } from "zod";

const router = Router();

// Validation schemas
const trackSignupSchema = z.object({
  referralCode: z.string().min(1, "Referral code is required"),
  deviceFingerprint: z.string().min(1, "Device fingerprint is required"),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
});

/**
 * GET /api/referrals/my-code
 * Get or create referral code for authenticated user
 */
router.get("/my-code", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;

    const result = await createOrGetReferralCode({ userId });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(200).json({
      success: true,
      referralCode: result.referralCode,
      referralLink: result.referralLink,
    });
  } catch (error: any) {
    console.error("[Route] get-referral-code error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /api/referrals/stats
 * Get referral statistics and history for authenticated user
 */
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;

    const result = await getUserReferralStats(userId);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(200).json({
      success: true,
      stats: result.stats,
      referralCode: result.referralCode,
      referralLink: result.referralLink,
      referrals: result.referrals,
    });
  } catch (error: any) {
    console.error("[Route] get-referral-stats error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * POST /api/referrals/track-signup
 * Track when a new user signs up via referral link
 * This endpoint is called during signup process
 */
router.post("/track-signup", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;

    const validation = trackSignupSchema.safeParse(req.body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return res.status(400).json({ message: error.message });
    }

    // Get IP address and user agent from request
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.socket.remoteAddress ||
      "unknown";

    const userAgent = req.headers["user-agent"] || "unknown";

    const result = await trackReferralSignup({
      referralCode: validation.data.referralCode,
      newUserId: userId,
      ipAddress,
      deviceFingerprint: validation.data.deviceFingerprint,
      userAgent,
      utmSource: validation.data.utmSource,
      utmMedium: validation.data.utmMedium,
      utmCampaign: validation.data.utmCampaign,
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(200).json({
      success: true,
      message: result.message || "Referral tracked successfully",
    });
  } catch (error: any) {
    console.error("[Route] track-referral-signup error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /api/referrals/leaderboard
 * Get referral leaderboard (global or school-based)
 */
router.get("/leaderboard", async (req, res) => {
  try {
    const scope = (req.query.scope as "global" | "school") || "global";
    const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const result = await getReferralLeaderboard(scope, schoolId, limit);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(200).json({
      success: true,
      leaderboard: result.leaderboard,
    });
  } catch (error: any) {
    console.error("[Route] get-leaderboard error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /api/referrals/validate/:code
 * Validate a referral code (public endpoint for signup page)
 */
router.get("/validate/:code", async (req, res) => {
  try {
    const { code } = req.params;

    // Import here to avoid circular dependency
    const { db } = await import("../db");
    const { referrals, users } = await import("../db/schema");
    const { eq, and } = await import("drizzle-orm");

    const [referral] = await db
      .select({
        id: referrals.id,
        referralCode: referrals.referralCode,
        referrerId: referrals.referrerId,
        referrerName: users.fullName,
        refereeId: referrals.refereeId,
        status: referrals.status,
      })
      .from(referrals)
      .innerJoin(users, eq(referrals.referrerId, users.id))
      .where(eq(referrals.referralCode, code))
      .limit(1);

    if (!referral) {
      return res.status(404).json({
        success: false,
        message: "Invalid referral code",
      });
    }

    // Check if already used
    if (referral.refereeId) {
      return res.status(400).json({
        success: false,
        message: "This referral code has already been used",
      });
    }

    return res.status(200).json({
      success: true,
      isValid: true,
      referrerName: referral.referrerName,
      message: `You've been invited by ${referral.referrerName}!`,
    });
  } catch (error: any) {
    console.error("[Route] validate-referral-code error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
