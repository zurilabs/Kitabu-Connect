import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { db } from "../db";
import { orders, swapOrders } from "../db/schema";
import { eq, or, and } from "drizzle-orm";

const router = Router();

/**
 * GET /api/orders/count
 * Get count of completed orders for the authenticated user
 */
router.get("/count", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Count completed regular orders (as buyer or seller)
    const regularOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          or(
            eq(orders.buyerId, userId),
            eq(orders.sellerId, userId)
          ),
          eq(orders.status, "completed")
        )
      );

    // Count completed swap orders (as requester or owner)
    const completedSwapOrders = await db
      .select()
      .from(swapOrders)
      .where(
        and(
          or(
            eq(swapOrders.requesterId, userId),
            eq(swapOrders.ownerId, userId)
          ),
          eq(swapOrders.status, "completed")
        )
      );

    // Total count of all completed orders
    const totalCount = regularOrders.length + completedSwapOrders.length;

    return res.status(200).json({
      success: true,
      count: totalCount,
      regularOrders: regularOrders.length,
      swapOrders: completedSwapOrders.length,
    });
  } catch (error: any) {
    console.error("[Route] get-orders-count error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
