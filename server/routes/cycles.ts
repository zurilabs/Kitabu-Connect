/**
 * Swap Cycles API Routes
 *
 * Endpoints for multilateral swap cycle management:
 * - Detect potential swap cycles
 * - View cycle details
 * - Confirm participation
 * - Track drop-off and collection
 */

import { Router, type Request, type Response } from "express";
import { db } from "../db";
import {
  swapCycles,
  cycleParticipants,
  bookListings,
  users,
  schools,
  userReliabilityScores,
} from "../db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { cycleDetector } from "../services/swapCycle.service";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

/* ================================
   CYCLE DETECTION
================================ */

/**
 * POST /api/cycles/detect
 * Run cycle detection algorithm
 *
 * Body:
 * - maxCycleSize: number (optional, default: 5)
 * - topN: number (optional, default: 50)
 */
router.post("/detect", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { maxCycleSize = 5, topN = 50 } = req.body;

    console.log(`🔄 Starting cycle detection (max size: ${maxCycleSize}, top: ${topN})...`);

    const count = await cycleDetector.detectAndSave(maxCycleSize, topN);

    res.json({
      success: true,
      message: `Successfully detected and saved ${count} swap cycles`,
      data: {
        cyclesDetected: count,
        maxCycleSize,
      },
    });
  } catch (error: any) {
    console.error("❌ Error detecting cycles:", error);
    res.status(500).json({
      success: false,
      message: "Failed to detect cycles",
      error: error.message,
    });
  }
});

/* ================================
   CYCLE RETRIEVAL
================================ */

/**
 * GET /api/cycles
 * Get all cycles for current user
 *
 * Query params:
 * - status: string (optional) - filter by status
 * - limit: number (optional, default: 20)
 */
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status, limit = "20" } = req.query;

    // Get all cycles where user is a participant
    const userParticipations = await db
      .select({
        cycle: swapCycles,
        participant: cycleParticipants,
      })
      .from(cycleParticipants)
      .innerJoin(swapCycles, eq(cycleParticipants.cycleId, swapCycles.id))
      .where(
        and(
          eq(cycleParticipants.userId, userId),
          status ? eq(swapCycles.status, status as string) : undefined
        )
      )
      .limit(parseInt(limit as string));

    // Enhance with participant details
    const cyclesWithDetails = await Promise.all(
      userParticipations.map(async ({ cycle, participant }) => {
        // Get all participants in this cycle
        const allParticipants = await db
          .select({
            participant: cycleParticipants,
            user: users,
            bookToGive: bookListings,
            bookToReceive: bookListings,
          })
          .from(cycleParticipants)
          .innerJoin(users, eq(cycleParticipants.userId, users.id))
          .leftJoin(
            bookListings,
            eq(cycleParticipants.bookToGiveId, bookListings.id)
          )
          .leftJoin(
            bookListings,
            eq(cycleParticipants.bookToReceiveId, bookListings.id)
          )
          .where(eq(cycleParticipants.cycleId, cycle.id))
          .orderBy(cycleParticipants.positionInCycle);

        return {
          ...cycle,
          myParticipation: participant,
          participants: allParticipants.map((p) => ({
            ...p.participant,
            user: p.user,
            bookToGive: p.bookToGive,
            bookToReceive: p.bookToReceive,
          })),
        };
      })
    );

    res.json({
      success: true,
      data: {
        cycles: cyclesWithDetails,
        total: cyclesWithDetails.length,
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching cycles:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cycles",
      error: error.message,
    });
  }
});

/**
 * GET /api/cycles/:id
 * Get cycle details by ID
 */
router.get("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Get cycle
    const [cycle] = await db
      .select()
      .from(swapCycles)
      .where(eq(swapCycles.id, id))
      .limit(1);

    if (!cycle) {
      return res.status(404).json({
        success: false,
        message: "Cycle not found",
      });
    }

    // Get all participants with full details
    const participants = await db
      .select({
        participant: cycleParticipants,
        user: users,
        school: schools,
        bookToGive: bookListings,
        bookToReceive: bookListings,
      })
      .from(cycleParticipants)
      .innerJoin(users, eq(cycleParticipants.userId, users.id))
      .leftJoin(schools, eq(cycleParticipants.userSchoolId, schools.id))
      .leftJoin(bookListings, eq(cycleParticipants.bookToGiveId, bookListings.id))
      .leftJoin(bookListings, eq(cycleParticipants.bookToReceiveId, bookListings.id))
      .where(eq(cycleParticipants.cycleId, id))
      .orderBy(cycleParticipants.positionInCycle);

    // Check if user is participant
    const isParticipant = participants.some((p) => p.user.id === userId);

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this cycle",
      });
    }

    res.json({
      success: true,
      data: {
        cycle,
        participants: participants.map((p) => ({
          ...p.participant,
          user: p.user,
          school: p.school,
          bookToGive: p.bookToGive,
          bookToReceive: p.bookToReceive,
        })),
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching cycle:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cycle",
      error: error.message,
    });
  }
});

/* ================================
   CYCLE CONFIRMATION
================================ */

/**
 * POST /api/cycles/:id/confirm
 * User confirms participation in cycle
 */
router.post("/:id/confirm", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Get cycle
    const [cycle] = await db
      .select()
      .from(swapCycles)
      .where(eq(swapCycles.id, id))
      .limit(1);

    if (!cycle) {
      return res.status(404).json({
        success: false,
        message: "Cycle not found",
      });
    }

    // Check if cycle is still pending confirmation
    if (cycle.status !== "pending_confirmation") {
      return res.status(400).json({
        success: false,
        message: `Cannot confirm cycle with status: ${cycle.status}`,
      });
    }

    // Check confirmation deadline
    if (cycle.confirmationDeadline && new Date() > new Date(cycle.confirmationDeadline)) {
      // Mark cycle as timeout
      await db
        .update(swapCycles)
        .set({ status: "timeout", cancelledAt: new Date() })
        .where(eq(swapCycles.id, id));

      return res.status(400).json({
        success: false,
        message: "Confirmation deadline has passed",
      });
    }

    // Get user's participation record
    const [participant] = await db
      .select()
      .from(cycleParticipants)
      .where(
        and(
          eq(cycleParticipants.cycleId, id),
          eq(cycleParticipants.userId, userId)
        )
      )
      .limit(1);

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this cycle",
      });
    }

    // Check if already confirmed
    if (participant.confirmed) {
      return res.status(400).json({
        success: false,
        message: "You have already confirmed participation",
      });
    }

    // Update participant confirmation
    await db
      .update(cycleParticipants)
      .set({
        confirmed: true,
        confirmedAt: new Date(),
        status: "confirmed",
      })
      .where(eq(cycleParticipants.id, participant.id));

    // Increment confirmed count
    const newConfirmedCount = (cycle.confirmedParticipantsCount || 0) + 1;

    await db
      .update(swapCycles)
      .set({ confirmedParticipantsCount: newConfirmedCount })
      .where(eq(swapCycles.id, id));

    // Check if all participants have confirmed
    if (newConfirmedCount === cycle.totalParticipantsCount) {
      await db
        .update(swapCycles)
        .set({
          status: "confirmed",
          confirmedAt: new Date(),
        })
        .where(eq(swapCycles.id, id));

      // TODO: Send notifications to all participants
      // TODO: Update reliability scores
    }

    res.json({
      success: true,
      message: "Participation confirmed successfully",
      data: {
        confirmed: true,
        allConfirmed: newConfirmedCount === cycle.totalParticipantsCount,
        confirmedCount: newConfirmedCount,
        totalCount: cycle.totalParticipantsCount,
      },
    });
  } catch (error: any) {
    console.error("❌ Error confirming cycle:", error);
    res.status(500).json({
      success: false,
      message: "Failed to confirm cycle",
      error: error.message,
    });
  }
});

/* ================================
   DROP-OFF TRACKING
================================ */

/**
 * POST /api/cycles/:id/drop-off
 * Mark book as dropped off
 *
 * Body:
 * - verificationPhotoUrl: string (optional)
 */
router.post("/:id/drop-off", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { verificationPhotoUrl } = req.body;

    // Get cycle
    const [cycle] = await db
      .select()
      .from(swapCycles)
      .where(eq(swapCycles.id, id))
      .limit(1);

    if (!cycle) {
      return res.status(404).json({
        success: false,
        message: "Cycle not found",
      });
    }

    // Check if cycle is confirmed
    if (cycle.status !== "confirmed" && cycle.status !== "active") {
      return res.status(400).json({
        success: false,
        message: `Cannot drop off book for cycle with status: ${cycle.status}`,
      });
    }

    // Get user's participation
    const [participant] = await db
      .select()
      .from(cycleParticipants)
      .where(
        and(
          eq(cycleParticipants.cycleId, id),
          eq(cycleParticipants.userId, userId)
        )
      )
      .limit(1);

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this cycle",
      });
    }

    // Check if already dropped off
    if (participant.bookDropped) {
      return res.status(400).json({
        success: false,
        message: "You have already dropped off your book",
      });
    }

    // Update participant
    await db
      .update(cycleParticipants)
      .set({
        bookDropped: true,
        droppedAt: new Date(),
        dropVerificationPhotoUrl: verificationPhotoUrl || null,
        status: "book_dropped",
      })
      .where(eq(cycleParticipants.id, participant.id));

    // Update cycle status to active if not already
    if (cycle.status === "confirmed") {
      await db
        .update(swapCycles)
        .set({ status: "active" })
        .where(eq(swapCycles.id, id));
    }

    // TODO: Check if all books dropped, update cycle status
    // TODO: Send notification to next participant

    res.json({
      success: true,
      message: "Book drop-off recorded successfully",
      data: {
        droppedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error("❌ Error recording drop-off:", error);
    res.status(500).json({
      success: false,
      message: "Failed to record drop-off",
      error: error.message,
    });
  }
});

/* ================================
   COLLECTION TRACKING
================================ */

/**
 * POST /api/cycles/:id/collect
 * Mark book as collected
 *
 * Body:
 * - qrCode: string (required)
 * - verificationPhotoUrl: string (optional)
 */
router.post("/:id/collect", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { qrCode, verificationPhotoUrl } = req.body;

    if (!qrCode) {
      return res.status(400).json({
        success: false,
        message: "QR code is required",
      });
    }

    // Get user's participation
    const [participant] = await db
      .select()
      .from(cycleParticipants)
      .where(
        and(
          eq(cycleParticipants.cycleId, id),
          eq(cycleParticipants.userId, userId)
        )
      )
      .limit(1);

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this cycle",
      });
    }

    // Verify QR code
    if (participant.collectionQrCode !== qrCode) {
      return res.status(400).json({
        success: false,
        message: "Invalid QR code",
      });
    }

    // Check if already collected
    if (participant.bookCollected) {
      return res.status(400).json({
        success: false,
        message: "You have already collected your book",
      });
    }

    // Update participant
    await db
      .update(cycleParticipants)
      .set({
        bookCollected: true,
        collectedAt: new Date(),
        collectionVerificationPhotoUrl: verificationPhotoUrl || null,
        status: "completed",
      })
      .where(eq(cycleParticipants.id, participant.id));

    // Check if all participants have collected
    const allParticipants = await db
      .select()
      .from(cycleParticipants)
      .where(eq(cycleParticipants.cycleId, id));

    const allCollected = allParticipants.every((p) => p.bookCollected);

    if (allCollected) {
      // Mark cycle as completed
      await db
        .update(swapCycles)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(swapCycles.id, id));

      // TODO: Update reliability scores for all participants
      // TODO: Send completion notifications
    }

    res.json({
      success: true,
      message: "Book collection recorded successfully",
      data: {
        collectedAt: new Date(),
        cycleCompleted: allCollected,
      },
    });
  } catch (error: any) {
    console.error("❌ Error recording collection:", error);
    res.status(500).json({
      success: false,
      message: "Failed to record collection",
      error: error.message,
    });
  }
});

/* ================================
   CYCLE CANCELLATION
================================ */

/**
 * POST /api/cycles/:id/cancel
 * Cancel cycle (admin or all participants must agree)
 *
 * Body:
 * - reason: string (required)
 */
router.post("/:id/cancel", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Cancellation reason is required",
      });
    }

    // Get cycle
    const [cycle] = await db
      .select()
      .from(swapCycles)
      .where(eq(swapCycles.id, id))
      .limit(1);

    if (!cycle) {
      return res.status(404).json({
        success: false,
        message: "Cycle not found",
      });
    }

    // Check if cycle can be cancelled
    if (cycle.status === "completed" || cycle.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel cycle with status: ${cycle.status}`,
      });
    }

    // Update cycle
    await db
      .update(swapCycles)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
      })
      .where(eq(swapCycles.id, id));

    // TODO: Update reliability scores (penalty for cancellation)
    // TODO: Send notifications to all participants

    res.json({
      success: true,
      message: "Cycle cancelled successfully",
    });
  } catch (error: any) {
    console.error("❌ Error cancelling cycle:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel cycle",
      error: error.message,
    });
  }
});

export default router;
