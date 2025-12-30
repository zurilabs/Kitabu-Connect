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
 * POST /api/swap-orders
 * Create a new swap or purchase order
 */
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { requestedBookId, orderType } = req.body;

    if (!requestedBookId) {
      return res.status(400).json({ message: "Requested book ID is required" });
    }

    if (orderType === "purchase") {
      // Create purchase order with pending status (awaits seller acceptance)
      const result = await swapOrderService.createPurchaseOrder(userId, {
        bookListingId: parseInt(requestedBookId),
        deliveryMethod: "meetup",
      });

      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      return res.status(201).json({
        message: "Purchase request sent! The seller will be notified.",
        order: result.purchaseOrder,
      });
    } else {
      // For swaps, this will be handled by /api/swaps route
      return res.status(400).json({
        message: "Invalid order type. Use /api/swaps for swap requests.",
      });
    }
  } catch (error) {
    console.error("[Swap Orders API] Create order error:", error);
    return res.status(500).json({ message: "Failed to create order" });
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
 * POST /api/swap-orders/:id/accept
 * Accept a swap or purchase order (seller accepts buyer's purchase request)
 */
router.post("/:id/accept", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const orderId = parseInt(req.params.id);

    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const result = await swapOrderService.acceptOrder(orderId, userId);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({ message: result.message });
  } catch (error) {
    console.error("[Swap Orders API] Accept order error:", error);
    return res.status(500).json({ message: "Failed to accept order" });
  }
});

/**
 * POST /api/swap-orders/:id/reject
 * Reject a swap or purchase order
 */
router.post("/:id/reject", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const orderId = parseInt(req.params.id);

    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const result = await swapOrderService.rejectOrder(orderId, userId);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({ message: result.message });
  } catch (error) {
    console.error("[Swap Orders API] Reject order error:", error);
    return res.status(500).json({ message: "Failed to reject order" });
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
    // Note: Paystack will automatically append reference and trxref parameters to callback_url
    const callbackUrl = `${process.env.CLIENT_URL || "http://localhost:5000"}/orders/${swapOrderId}/messages`;

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

/* ================================
   PURCHASE ORDER ROUTES
================================ */

/**
 * POST /api/swap-orders/purchase/create
 * Create a new purchase order (buyer clicks "Buy Now")
 */
router.post("/purchase/create", authenticateToken, async (req: Request, res: Response) => {
  try {
    const buyerId = req.user!.id;
    const { bookListingId, deliveryMethod, deliveryAddress, buyerNotes } = req.body;

    if (!bookListingId) {
      return res.status(400).json({ message: "Book listing ID is required" });
    }

    const result = await swapOrderService.createPurchaseOrder(buyerId, {
      bookListingId: parseInt(bookListingId),
      deliveryMethod: deliveryMethod || "meetup",
      deliveryAddress,
      buyerNotes,
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(201).json({
      message: result.message,
      purchaseOrder: result.purchaseOrder,
    });
  } catch (error) {
    console.error("[Swap Orders API] Create purchase order error:", error);
    return res.status(500).json({ message: "Failed to create purchase order" });
  }
});

/**
 * POST /api/swap-orders/purchase/:id/pay/initialize
 * Initialize payment for a purchase order via Paystack
 */
router.post("/purchase/:id/pay/initialize", authenticateToken, async (req: Request, res: Response) => {
  try {
    const buyerId = req.user!.id;
    const purchaseOrderId = parseInt(req.params.id);
    const { email } = req.body;

    if (isNaN(purchaseOrderId)) {
      return res.status(400).json({ message: "Invalid purchase order ID" });
    }

    // Get the purchase order
    const orderResult = await swapOrderService.getSwapOrderById(purchaseOrderId, buyerId);
    if (!orderResult.success || !orderResult.swapOrder) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    const purchaseOrder = orderResult.swapOrder;

    // Verify it's a purchase order
    if (purchaseOrder.orderType !== "purchase") {
      return res.status(400).json({ message: "This is not a purchase order" });
    }

    // Verify buyer
    if (purchaseOrder.requesterId !== buyerId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Check status
    if (purchaseOrder.status !== "awaiting_payment") {
      return res.status(400).json({ message: "This order is not awaiting payment" });
    }

    const totalAmount = parseFloat(purchaseOrder.totalAmount || "0");
    const userEmail = email || req.user!.email;

    if (!userEmail) {
      return res.status(400).json({ message: "Email is required for payment" });
    }

    // Generate reference with PUR- prefix to identify purchase payments
    const reference = `PUR-${purchaseOrder.orderNumber}-${Date.now()}`;

    // Initialize payment with Paystack
    // Note: Paystack will automatically append reference and trxref parameters to callback_url
    const paystackResult = await initializePayment({
      email: userEmail,
      amount: totalAmount,
      reference,
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/orders/${purchaseOrderId}/messages`,
      metadata: {
        userId: buyerId,
        purchaseOrderId: purchaseOrderId,
        orderNumber: purchaseOrder.orderNumber,
        type: "purchase_order",
      },
    });

    if (!paystackResult.success) {
      return res.status(400).json({
        message: paystackResult.message || "Failed to initialize payment",
      });
    }

    return res.json({
      success: true,
      authorizationUrl: paystackResult.data.authorization_url,
      reference,
    });
  } catch (error) {
    console.error("[Swap Orders API] Initialize purchase payment error:", error);
    return res.status(500).json({ message: "Failed to initialize payment" });
  }
});

/**
 * GET /api/swap-orders/purchase/:id/pay/verify/:reference
 * Verify payment and complete purchase order
 */
router.get("/purchase/:id/pay/verify/:reference", authenticateToken, async (req: Request, res: Response) => {
  try {
    const buyerId = req.user!.id;
    const purchaseOrderId = parseInt(req.params.id);
    const reference = req.params.reference;

    console.log(`[Purchase Payment] Verifying payment for order ${purchaseOrderId}, reference: ${reference}`);

    if (isNaN(purchaseOrderId)) {
      return res.status(400).json({ message: "Invalid purchase order ID" });
    }

    // Verify payment with Paystack
    console.log(`[Purchase Payment] Calling Paystack to verify: ${reference}`);
    const verificationResult = await verifyPayment(reference);

    if (!verificationResult.success || !verificationResult.data) {
      console.error(`[Purchase Payment] Paystack verification failed:`, verificationResult);
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const paymentData = verificationResult.data;
    console.log(`[Purchase Payment] Paystack verification successful. Status: ${paymentData.status}`);

    // Verify payment metadata
    const metadata = paymentData.metadata || {};
    if (metadata.purchaseOrderId !== purchaseOrderId) {
      console.error(`[Purchase Payment] Metadata mismatch. Expected order ${purchaseOrderId}, got ${metadata.purchaseOrderId}`);
      return res.status(400).json({ message: "Payment reference does not match order" });
    }

    // Process payment in swap order service
    console.log(`[Purchase Payment] Processing payment for order ${purchaseOrderId}`);
    const result = await swapOrderService.payPurchaseOrder(
      purchaseOrderId,
      buyerId,
      reference
    );

    if (!result.success) {
      console.error(`[Purchase Payment] Payment processing failed:`, result.message);
      return res.status(400).json({ message: result.message });
    }

    console.log(`[Purchase Payment] Payment successfully processed for order ${purchaseOrderId}`);
    return res.json({
      success: true,
      message: result.message || "Payment verified successfully!",
    });
  } catch (error) {
    console.error("[Swap Orders API] Verify purchase payment error:", error);
    return res.status(500).json({ message: "Failed to verify payment" });
  }
});

export default router;
