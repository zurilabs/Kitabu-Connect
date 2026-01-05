import { Router } from "express";
import {
  createDispute,
  getDispute,
  getUserDisputes,
  getAllDisputes,
  addDisputeMessage,
  respondToDispute,
  escalateDispute,
  assignMediator,
  resolveDispute,
  selfResolveDispute,
  isAdmin,
  getDisputeStats,
} from "../services/dispute.service";
import { authenticateToken } from "../middleware/auth.middleware";
import { fromZodError } from "zod-validation-error";
import { z } from "zod";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Validation schemas
const createDisputeSchema = z.object({
  cycleId: z.string().uuid().optional(),
  swapOrderId: z.number().optional(),
  respondentId: z.string().uuid().optional(),
  disputeType: z.enum([
    "book_condition",
    "missing_book",
    "wrong_book",
    "damage",
    "description_mismatch",
    "non_delivery",
    "other",
  ]),
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  evidencePhotoUrls: z.array(z.string().url()).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  disputeValue: z.number().optional(),
}).refine(
  (data) => data.cycleId || data.swapOrderId,
  { message: "Either cycleId or swapOrderId must be provided" }
);

const addMessageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  attachmentUrls: z.array(z.string().url()).optional(),
});

const respondToDisputeSchema = z.object({
  response: z.string().min(10, "Response must be at least 10 characters"),
  evidencePhotoUrls: z.array(z.string().url()).optional(),
});

const selfResolveDisputeSchema = z.object({
  resolution: z.string().min(10, "Resolution must be at least 10 characters"),
});

const resolveDisputeSchema = z.object({
  resolution: z.string().min(10, "Resolution must be at least 10 characters"),
  resolutionType: z.enum([
    "refund",
    "replacement",
    "penalty",
    "account_warning",
    "no_action",
    "escalated",
  ]),
  adminNotes: z.string().optional(),
});

/**
 * POST /api/disputes
 * Create a new dispute
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;

    const validation = createDisputeSchema.safeParse(req.body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return res.status(400).json({ message: error.message });
    }

    const disputeId = await createDispute({
      reporterId: userId,
      ...validation.data,
    });

    return res.status(201).json({
      success: true,
      disputeId,
      message: "Dispute created successfully",
    });
  } catch (error: any) {
    console.error("[Route] create-dispute error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /api/disputes
 * Get all disputes for the authenticated user
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const status = req.query.status as string | undefined;

    const disputes = await getUserDisputes(userId, status as any);

    return res.status(200).json({
      success: true,
      disputes,
    });
  } catch (error: any) {
    console.error("[Route] get-user-disputes error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /api/disputes/all
 * Get all disputes (admin only)
 */
router.get("/all", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get user email to check admin status
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !isAdmin(user.email)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Optional filters
    const status = req.query.status as string | undefined;
    const priority = req.query.priority as string | undefined;
    const disputeType = req.query.disputeType as string | undefined;

    const disputes = await getAllDisputes({
      status: status as any,
      priority,
      disputeType: disputeType as any,
    });

    return res.status(200).json({
      success: true,
      disputes,
    });
  } catch (error: any) {
    console.error("[Route] get-all-disputes error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /api/disputes/stats
 * Get dispute statistics (admin only)
 */
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get user email to check admin status
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !isAdmin(user.email)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const stats = await getDisputeStats();

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error("[Route] dispute-stats error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /api/disputes/:id
 * Get a single dispute by ID
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const disputeId = req.params.id;

    const dispute = await getDispute(disputeId);

    if (!dispute) {
      return res.status(404).json({ message: "Dispute not found" });
    }

    return res.status(200).json({
      success: true,
      dispute,
    });
  } catch (error: any) {
    console.error("[Route] get-dispute error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * POST /api/disputes/:id/messages
 * Add a message to a dispute
 */
router.post("/:id/messages", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const disputeId = req.params.id;

    const validation = addMessageSchema.safeParse(req.body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return res.status(400).json({ message: error.message });
    }

    const messageId = await addDisputeMessage({
      disputeId,
      senderId: userId,
      message: validation.data.message,
      attachmentUrls: validation.data.attachmentUrls,
    });

    return res.status(201).json({
      success: true,
      messageId,
    });
  } catch (error: any) {
    console.error("[Route] add-dispute-message error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * POST /api/disputes/:id/respond
 * Respondent provides their response to the dispute
 */
router.post("/:id/respond", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const disputeId = req.params.id;

    const validation = respondToDisputeSchema.safeParse(req.body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return res.status(400).json({ message: error.message });
    }

    await respondToDispute(
      disputeId,
      userId,
      validation.data.response,
      validation.data.evidencePhotoUrls
    );

    return res.status(200).json({
      success: true,
      message: "Response submitted successfully",
    });
  } catch (error: any) {
    console.error("[Route] respond-to-dispute error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * POST /api/disputes/:id/self-resolve
 * Self-resolve a dispute (both parties agree)
 */
router.post("/:id/self-resolve", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const disputeId = req.params.id;

    const validation = selfResolveDisputeSchema.safeParse(req.body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return res.status(400).json({ message: error.message });
    }

    await selfResolveDispute(disputeId, userId, validation.data.resolution);

    return res.status(200).json({
      success: true,
      message: "Dispute resolved successfully",
    });
  } catch (error: any) {
    console.error("[Route] self-resolve-dispute error:", error);
    return res.status(400).json({
      message: error.message || "Failed to resolve dispute"
    });
  }
});

/**
 * POST /api/disputes/:id/escalate
 * Escalate a dispute to admin review
 */
router.post("/:id/escalate", authenticateToken, async (req, res) => {
  try {
    const disputeId = req.params.id;
    const reason = req.body.reason as string | undefined;

    await escalateDispute(disputeId, reason);

    return res.status(200).json({
      success: true,
      message: "Dispute escalated to admin review",
    });
  } catch (error: any) {
    console.error("[Route] escalate-dispute error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * PUT /api/disputes/:id/assign-mediator
 * Assign a mediator to a dispute (admin only)
 */
router.put("/:id/assign-mediator", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const disputeId = req.params.id;
    const mediatorId = req.body.mediatorId as string;

    // Get user email to check admin status
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !isAdmin(user.email)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!mediatorId) {
      return res.status(400).json({ message: "Mediator ID is required" });
    }

    await assignMediator(disputeId, mediatorId);

    return res.status(200).json({
      success: true,
      message: "Mediator assigned successfully",
    });
  } catch (error: any) {
    console.error("[Route] assign-mediator error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * PUT /api/disputes/:id/resolve
 * Resolve a dispute (admin only)
 */
router.put("/:id/resolve", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const disputeId = req.params.id;

    // Get user email to check admin status
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !isAdmin(user.email)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const validation = resolveDisputeSchema.safeParse(req.body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return res.status(400).json({ message: error.message });
    }

    await resolveDispute({
      disputeId,
      resolvedBy: userId,
      resolution: validation.data.resolution,
      resolutionType: validation.data.resolutionType,
      adminNotes: validation.data.adminNotes,
    });

    return res.status(200).json({
      success: true,
      message: "Dispute resolved successfully",
    });
  } catch (error: any) {
    console.error("[Route] resolve-dispute error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
