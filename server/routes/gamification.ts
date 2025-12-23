/**
 * Gamification API Routes
 *
 * Endpoints for:
 * - User badges and achievements
 * - School and global leaderboards
 * - User rankings and statistics
 */

import { Router, type Request, type Response } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import {
  getAllBadges,
  getUserBadges,
  checkAndAwardBadges,
  getSchoolLeaderboard,
  getGlobalLeaderboard,
  getTopSwappersLeaderboard,
  getUserRank,
} from "../services/gamification.service";
import { db } from "../db";
import { users, userReliabilityScores } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

/* ================================
   BADGE ENDPOINTS
================================ */

/**
 * GET /api/gamification/badges
 * Get all available badges
 */
router.get("/badges", authenticateToken, async (req: Request, res: Response) => {
  try {
    const badges = getAllBadges();

    res.json({
      success: true,
      badges: badges.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        icon: b.icon,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching badges:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch badges",
    });
  }
});

/**
 * GET /api/gamification/badges/me
 * Get current user's earned badges
 */
router.get("/badges/me", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Check for new badges
    await checkAndAwardBadges(userId);

    // Get user's badges
    const badges = await getUserBadges(userId);

    res.json({
      success: true,
      badges: badges.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        icon: b.icon,
      })),
      total: badges.length,
    });
  } catch (error: any) {
    console.error("Error fetching user badges:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch user badges",
    });
  }
});

/**
 * GET /api/gamification/badges/:userId
 * Get badges for a specific user (public)
 */
router.get("/badges/:userId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const badges = await getUserBadges(userId);

    res.json({
      success: true,
      badges: badges.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        icon: b.icon,
      })),
      total: badges.length,
    });
  } catch (error: any) {
    console.error("Error fetching user badges:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch user badges",
    });
  }
});

/* ================================
   LEADERBOARD ENDPOINTS
================================ */

/**
 * GET /api/gamification/leaderboard/school/:schoolId
 * Get school leaderboard (top users by reliability score)
 */
router.get("/leaderboard/school/:schoolId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const leaderboard = await getSchoolLeaderboard(schoolId, limit);

    res.json({
      success: true,
      leaderboard,
      schoolId,
      limit,
    });
  } catch (error: any) {
    console.error("Error fetching school leaderboard:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch school leaderboard",
    });
  }
});

/**
 * GET /api/gamification/leaderboard/global
 * Get global leaderboard (top users by reliability score)
 */
router.get("/leaderboard/global", authenticateToken, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    const leaderboard = await getGlobalLeaderboard(limit);

    res.json({
      success: true,
      leaderboard,
      limit,
    });
  } catch (error: any) {
    console.error("Error fetching global leaderboard:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch global leaderboard",
    });
  }
});

/**
 * GET /api/gamification/leaderboard/swappers
 * Get top swappers leaderboard (ranked by total swaps completed)
 */
router.get("/leaderboard/swappers", authenticateToken, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    const leaderboard = await getTopSwappersLeaderboard(limit);

    res.json({
      success: true,
      leaderboard,
      limit,
    });
  } catch (error: any) {
    console.error("Error fetching top swappers:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch top swappers",
    });
  }
});

/* ================================
   USER STATS & RANKING
================================ */

/**
 * GET /api/gamification/rank/me
 * Get current user's rank and statistics
 */
router.get("/rank/me", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get user's rank
    const ranking = await getUserRank(userId);

    // Get user's reliability score
    const [score] = await db
      .select()
      .from(userReliabilityScores)
      .where(eq(userReliabilityScores.userId, userId))
      .limit(1);

    // Get user info
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    res.json({
      success: true,
      rank: {
        global: ranking.globalRank,
        school: ranking.schoolRank,
        totalUsers: ranking.totalUsers,
      },
      stats: score
        ? {
            reliabilityScore: Number(score.reliabilityScore),
            totalSwapsCompleted: score.totalSwapsCompleted || 0,
            totalCyclesCompleted: score.totalCyclesCompleted || 0,
            avgConfirmationTimeHours: score.avgConfirmationTimeHours
              ? Number(score.avgConfirmationTimeHours)
              : null,
            onTimeDeliveryRate: score.onTimeDeliveryRate
              ? Number(score.onTimeDeliveryRate)
              : null,
            bookConditionAccuracyRate: score.bookConditionAccuracyRate
              ? Number(score.bookConditionAccuracyRate)
              : null,
            penaltyPoints: score.penaltyPoints || 0,
            isSuspended: score.isSuspended || false,
          }
        : null,
      user: user
        ? {
            id: user.id,
            fullName: user.fullName,
            profilePictureUrl: user.profilePictureUrl,
            schoolId: user.schoolId,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Error fetching user rank:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch user rank",
    });
  }
});

/**
 * GET /api/gamification/rank/:userId
 * Get rank for a specific user (public)
 */
router.get("/rank/:userId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const ranking = await getUserRank(userId);

    // Get user's reliability score
    const [score] = await db
      .select()
      .from(userReliabilityScores)
      .where(eq(userReliabilityScores.userId, userId))
      .limit(1);

    res.json({
      success: true,
      rank: {
        global: ranking.globalRank,
        school: ranking.schoolRank,
        totalUsers: ranking.totalUsers,
      },
      stats: score
        ? {
            reliabilityScore: Number(score.reliabilityScore),
            totalSwapsCompleted: score.totalSwapsCompleted || 0,
            totalCyclesCompleted: score.totalCyclesCompleted || 0,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Error fetching user rank:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch user rank",
    });
  }
});

export default router;
