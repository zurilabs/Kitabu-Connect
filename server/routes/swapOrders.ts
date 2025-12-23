import { Router } from "express";
import { swapOrderService } from "../services/swapOrder.service";
import { messageService } from "../services/message.service";
import { authenticateToken } from "../middleware/auth.middleware";
import {
  submitRequirementsSchema,
  sendMessageSchema,
  markMessagesAsReadSchema,
} from "../db/schema";
import { initializePayment, verifyPayment } from "../config/paystack";
import type { Request, Response } from "express";

const router = Router();

/**
 * GET /api/swap-orders
 * Get all swap orders for the current user
 */
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await swapOrderService.getUserSwapOrders(userId);

    if (!result.success) {
      return res.status(500).json({ message: result.message });
    }

    return res.json({ orders: result.orders });
  } catch (error) {
    console.error("[Swap Orders API] Get user orders error:", error);
    return res.status(500).json({ message: "Failed to fetch swap orders" });
  }
});

/**
 * GET /api/swap-orders/:id
 * Get a specific swap order by ID
 */
router.get("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const swapOrderId = parseInt(req.params.id);

    if (isNaN(swapOrderId)) {
      return res.status(400).json({ message: "Invalid swap order ID" });
    }

    const result = await swapOrderService.getSwapOrderById(swapOrderId, userId);

    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }

    return res.json({ swapOrder: result.swapOrder });
  } catch (error) {
    console.error("[Swap Orders API] Get swap order error:", error);
    return res.status(500).json({ message: "Failed to fetch swap order" });
  }
});

/**
 * POST /api/swap-orders/:id/requirements
 * Submit requirements (meetup details) for a swap order
 */
router.post("/:id/requirements", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const swapOrderId = parseInt(req.params.id);

    if (isNaN(swapOrderId)) {
      return res.status(400).json({ message: "Invalid swap order ID" });
    }

    const validation = submitRequirementsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Invalid requirements data",
        errors: validation.error.errors,
      });
    }

    const result = await swapOrderService.submitRequirements(
      swapOrderId,
      userId,
      validation.data
    );

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({ message: result.message });
  } catch (error) {
    console.error("[Swap Orders API] Submit requirements error:", error);
    return res.status(500).json({ message: "Failed to submit requirements" });
  }
});

/**
 * POST /api/swap-orders/:id/approve-requirements
 * Approve requirements submitted by requester
 */
router.post("/:id/approve-requirements", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const swapOrderId = parseInt(req.params.id);

    if (isNaN(swapOrderId)) {
      return res.status(400).json({ message: "Invalid swap order ID" });
    }

    const result = await swapOrderService.approveRequirements(swapOrderId, userId);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({ message: result.message });
  } catch (error) {
    console.error("[Swap Orders API] Approve requirements error:", error);
    return res.status(500).json({ message: "Failed to approve requirements" });
  }
});

/**
 * POST /api/swap-orders/:id/pay-commitment-fee/initialize
 * Initialize commitment fee payment (redirect to Paystack)
 */
router.post("/:id/pay-commitment-fee/initialize", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email; // Ensure your middleware provides this!
    const swapOrderId = parseInt(req.params.id);

    // 1. Validation Guard
    if (!userEmail) {
      return res.status(400).json({ message: "User email is required for payment" });
    }

    if (isNaN(swapOrderId)) {
      return res.status(400).json({ message: "Invalid swap order ID" });
    }

    // 2. Fetch Order
    const orderResult = await swapOrderService.getSwapOrderById(swapOrderId, userId!);
    if (!orderResult.success || !orderResult.swapOrder) {
      return res.status(404).json({ message: "Swap order not found" });
    }

    // 3. Amount Calculation
    const rawFee = orderResult.swapOrder.commitmentFee || "50.00";
    const commitmentFee = parseFloat(rawFee);
    
    if (isNaN(commitmentFee) || commitmentFee <= 0) {
      return res.status(400).json({ message: "Invalid commitment fee amount" });
    }

    // 4. Paystack Initialization
    const reference = `SWAP_FEE_${swapOrderId}_${Date.now()}`;
    const callbackUrl = `${process.env.CLIENT_URL || "http://localhost:5000"}/orders/${swapOrderId}/messages?payment=success&reference=${reference}`;

    const result = await initializePayment({
      email: userEmail,
      amount: commitmentFee,
      reference: reference,
      callback_url: callbackUrl,
      metadata: {
        swap_order_id: swapOrderId,
        user_id: userId,
        payment_type: "commitment_fee",
      },
    });

    if (result.success && result.data) {
      return res.json({
        success: true,
        authorizationUrl: result.data.authorization_url,
        reference: reference,
      });
    } else {
      console.error("Paystack Error Response:", result);
      return res.status(400).json({ message: result.message || "Paystack initialization failed" });
    }
  } catch (error) {
  console.error("FULL ERROR LOG:", error); // This will tell you exactly what failed
  return res.status(500).json({ message: "Internal server error", details: error.message });
}
});

/**
 * GET /api/swap-orders/:id/pay-commitment-fee/verify/:reference
 * Verify commitment fee payment after Paystack redirect
 */
router.get("/:id/pay-commitment-fee/verify/:reference", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const swapOrderId = parseInt(req.params.id);
    const { reference } = req.params;

    if (isNaN(swapOrderId)) {
      return res.status(400).json({ message: "Invalid swap order ID" });
    }

    if (!reference) {
      return res.status(400).json({ message: "Payment reference is required" });
    }

    // Verify transaction with Paystack
    const verification = await verifyPayment(reference);

    if (verification.success && verification.data) {
      // Payment verified, record it in the database
      const result = await swapOrderService.payCommitmentFee(
        swapOrderId,
        userId,
        reference
      );

      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      return res.json({
        success: true,
        message: result.message,
        amount: verification.data.amount / 100, // Convert from kobo
      });
    } else {
      return res.status(400).json({
        message: verification.message || "Payment verification failed"
      });
    }
  } catch (error) {
    console.error("[Swap Orders API] Verify payment error:", error);
    return res.status(500).json({ message: "Failed to verify payment" });
  }
});

/**
 * POST /api/swap-orders/:id/dispatch
 * Mark your book as dispatched/sent
 */
router.post("/:id/dispatch", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const swapOrderId = parseInt(req.params.id);

    if (isNaN(swapOrderId)) {
      return res.status(400).json({ message: "Invalid swap order ID" });
    }

    const result = await swapOrderService.markBookDispatched(swapOrderId, userId);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({ message: result.message });
  } catch (error) {
    console.error("[Swap Orders API] Mark book dispatched error:", error);
    return res.status(500).json({ message: "Failed to mark book as dispatched" });
  }
});

/**
 * POST /api/swap-orders/:id/confirm-delivery
 * Confirm that you received the book
 */
router.post("/:id/confirm-delivery", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const swapOrderId = parseInt(req.params.id);

    if (isNaN(swapOrderId)) {
      return res.status(400).json({ message: "Invalid swap order ID" });
    }

    const result = await swapOrderService.confirmDelivery(swapOrderId, userId);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({ message: result.message });
  } catch (error) {
    console.error("[Swap Orders API] Confirm delivery error:", error);
    return res.status(500).json({ message: "Failed to confirm delivery" });
  }
});

/**
 * POST /api/swap-orders/:id/cancel
 * Cancel a swap order
 */
router.post("/:id/cancel", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const swapOrderId = parseInt(req.params.id);
    const { reason } = req.body;

    if (isNaN(swapOrderId)) {
      return res.status(400).json({ message: "Invalid swap order ID" });
    }

    if (!reason) {
      return res.status(400).json({ message: "Cancellation reason is required" });
    }

    const result = await swapOrderService.cancelSwapOrder(swapOrderId, userId, reason);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({ message: result.message });
  } catch (error) {
    console.error("[Swap Orders API] Cancel swap order error:", error);
    return res.status(500).json({ message: "Failed to cancel swap order" });
  }
});

/**
 * GET /api/swap-orders/:id/messages
 * Get all messages for a swap order
 */
router.get("/:id/messages", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const swapOrderId = parseInt(req.params.id);

    if (isNaN(swapOrderId)) {
      return res.status(400).json({ message: "Invalid swap order ID" });
    }

    const result = await messageService.getOrderMessages(swapOrderId, userId);

    if (!result.success) {
      return res.status(404).json({ message: result.error });
    }

    return res.json({ messages: result.messages });
  } catch (error) {
    console.error("[Swap Orders API] Get messages error:", error);
    return res.status(500).json({ message: "Failed to fetch messages" });
  }
});

/**
 * POST /api/swap-orders/:id/messages
 * Send a message in a swap order
 */
router.post("/:id/messages", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const swapOrderId = parseInt(req.params.id);

    if (isNaN(swapOrderId)) {
      return res.status(400).json({ message: "Invalid swap order ID" });
    }

    const validation = sendMessageSchema.safeParse({
      ...req.body,
      swapOrderId,
    });

    if (!validation.success) {
      return res.status(400).json({
        message: "Invalid message data",
        errors: validation.error.errors,
      });
    }

    const result = await messageService.sendMessage(userId, validation.data);

    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }

    return res.status(201).json({
      message: "Message sent successfully",
      data: result.message,
    });
  } catch (error) {
    console.error("[Swap Orders API] Send message error:", error);
    return res.status(500).json({ message: "Failed to send message" });
  }
});

/**
 * POST /api/swap-orders/:id/messages/mark-read
 * Mark all messages in an order as read
 */
router.post("/:id/messages/mark-read", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const swapOrderId = parseInt(req.params.id);

    if (isNaN(swapOrderId)) {
      return res.status(400).json({ message: "Invalid swap order ID" });
    }

    const result = await messageService.markMessagesAsRead(swapOrderId, userId);

    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }

    return res.json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("[Swap Orders API] Mark messages as read error:", error);
    return res.status(500).json({ message: "Failed to mark messages as read" });
  }
});

/**
 * GET /api/swap-orders/conversations
 * Get all conversations (orders with messages) for the user
 */
router.get("/conversations/all", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await messageService.getUserConversations(userId);

    if (!result.success) {
      return res.status(500).json({ message: "Failed to fetch conversations" });
    }

    return res.json({ conversations: result.conversations });
  } catch (error) {
    console.error("[Swap Orders API] Get conversations error:", error);
    return res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

export default router;
