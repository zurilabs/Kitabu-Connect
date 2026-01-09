import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { escrowService } from "../services/escrow.service";
import { db } from "../db";
import { escrowAccounts, orders, swapOrders } from "../db/schema";
import { eq, or, and } from "drizzle-orm";

const router = Router();

/**
 * POST /api/escrow/:escrowId/release
 * Manually release escrow funds to seller
 * Can be called by seller after hold period expires
 */
router.post("/:escrowId/release", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const escrowId = parseInt(req.params.escrowId);

    if (isNaN(escrowId)) {
      return res.status(400).json({ message: "Invalid escrow ID" });
    }

    // Get escrow details
    const [escrow] = await db
      .select()
      .from(escrowAccounts)
      .where(eq(escrowAccounts.id, escrowId))
      .limit(1);

    if (!escrow) {
      return res.status(404).json({ message: "Escrow not found" });
    }

    // Verify user is the seller
    if (escrow.sellerId !== userId) {
      return res.status(403).json({
        message: "Only the seller can release escrow funds"
      });
    }

    // Verify escrow is still active
    if (escrow.status !== "active") {
      return res.status(400).json({
        message: `Escrow is already ${escrow.status}`
      });
    }

    // Verify hold period has passed
    const now = new Date();
    const releaseDate = new Date(escrow.releaseAt);

    if (now < releaseDate) {
      return res.status(400).json({
        message: "Hold period has not expired yet. Funds cannot be released early."
      });
    }

    // Release the escrow
    const result = await escrowService.releaseEscrow(escrowId);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(200).json({
      success: true,
      message: "Escrow released successfully",
    });
  } catch (error: any) {
    console.error("[Route] release-escrow error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /api/escrow/:escrowId
 * Get escrow details
 */
router.get("/:escrowId", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const escrowId = parseInt(req.params.escrowId);

    if (isNaN(escrowId)) {
      return res.status(400).json({ message: "Invalid escrow ID" });
    }

    // Get escrow details
    const [escrow] = await db
      .select()
      .from(escrowAccounts)
      .where(eq(escrowAccounts.id, escrowId))
      .limit(1);

    if (!escrow) {
      return res.status(404).json({ message: "Escrow not found" });
    }

    // Verify user is part of this transaction
    if (escrow.buyerId !== userId && escrow.sellerId !== userId) {
      return res.status(403).json({
        message: "You don't have permission to view this escrow"
      });
    }

    return res.status(200).json({
      success: true,
      escrow,
    });
  } catch (error: any) {
    console.error("[Route] get-escrow error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * POST /api/escrow/:escrowId/dispute
 * Create a dispute for an escrow
 */
router.post("/:escrowId/dispute", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const escrowId = parseInt(req.params.escrowId);
    const { reason } = req.body;

    if (isNaN(escrowId)) {
      return res.status(400).json({ message: "Invalid escrow ID" });
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        message: "Please provide a detailed reason for the dispute (minimum 10 characters)"
      });
    }

    // Get escrow details
    const [escrow] = await db
      .select()
      .from(escrowAccounts)
      .where(eq(escrowAccounts.id, escrowId))
      .limit(1);

    if (!escrow) {
      return res.status(404).json({ message: "Escrow not found" });
    }

    // Verify user is part of this transaction
    if (escrow.buyerId !== userId && escrow.sellerId !== userId) {
      return res.status(403).json({
        message: "You don't have permission to dispute this escrow"
      });
    }

    // Create dispute
    const result = await escrowService.createDispute(escrowId, reason);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error("[Route] dispute-escrow error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /api/escrow/user/summary
 * Get summary of user's escrow accounts
 */
router.get("/user/summary", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get escrows as buyer
    const buyerEscrows = await escrowService.getUserEscrows(userId, "buyer");

    // Get escrows as seller
    const sellerEscrows = await escrowService.getUserEscrows(userId, "seller");

    const allEscrows = [
      ...(buyerEscrows.escrows || []),
      ...(sellerEscrows.escrows || []),
    ];

    // Calculate summary
    const summary = {
      totalActive: allEscrows.filter(e => e.status === "active").length,
      totalReleased: allEscrows.filter(e => e.status === "released").length,
      totalRefunded: allEscrows.filter(e => e.status === "refunded").length,
      totalDisputed: allEscrows.filter(e => e.status === "disputed").length,
      activeAmount: allEscrows
        .filter(e => e.status === "active")
        .reduce((sum, e) => sum + parseFloat(e.amount), 0)
        .toFixed(2),
    };

    return res.status(200).json({
      success: true,
      summary,
      escrows: allEscrows,
    });
  } catch (error: any) {
    console.error("[Route] escrow-summary error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
