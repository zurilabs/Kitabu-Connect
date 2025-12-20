import { db } from "../db";
import { orders, bookListings, users } from "../db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { walletService } from "./wallet.service";
import { escrowService } from "./escrow.service";

export class OrderService {
  /**
   * Generate unique order number
   */
  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Create a new order
   */
  async createOrder(params: {
    buyerId: string;
    bookListingId: number;
    quantity?: number;
    deliveryMethod?: string;
    deliveryAddress?: string;
    buyerNotes?: string;
  }): Promise<{ success: boolean; orderId?: number; order?: any; message?: string }> {
    try {
      // Get book listing details
      const listing = await db
        .select()
        .from(bookListings)
        .where(eq(bookListings.id, params.bookListingId))
        .limit(1);

      if (!listing.length) {
        return { success: false, message: "Book listing not found" };
      }

      const book = listing[0];

      // Check if book is available
      if (book.listingStatus !== "active") {
        return { success: false, message: "This book is no longer available" };
      }

      // Check if buyer is not the seller
      if (book.sellerId === params.buyerId) {
        return { success: false, message: "You cannot buy your own book" };
      }

      const quantity = params.quantity || 1;

      // Check quantity availability
      if ((book.quantityAvailable || 0) < quantity) {
        return { success: false, message: "Insufficient quantity available" };
      }

      const totalAmount = parseFloat(book.price) * quantity;
      const platformFee = (totalAmount * 5) / 100; // 5% platform fee
      const sellerAmount = totalAmount - platformFee;

      // Create order
      const result = await db.insert(orders).values({
        orderNumber: this.generateOrderNumber(),
        buyerId: params.buyerId,
        sellerId: book.sellerId,
        bookListingId: params.bookListingId,
        quantity,
        totalAmount: totalAmount.toFixed(2),
        platformFee: platformFee.toFixed(2),
        sellerAmount: sellerAmount.toFixed(2),
        status: "pending",
        deliveryMethod: params.deliveryMethod,
        deliveryAddress: params.deliveryAddress,
        buyerNotes: params.buyerNotes,
      });

      const orderId = result[0].insertId;

      // Get the created order
      const createdOrder = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

      console.log(`[OrderService] Created order ${orderId} for ${totalAmount}`);

      return {
        success: true,
        orderId,
        order: createdOrder[0],
      };
    } catch (error) {
      console.error("[OrderService] Create order error:", error);
      return {
        success: false,
        message: "Failed to create order",
      };
    }
  }

  /**
   * Process payment for an order (using wallet balance)
   */
  async processPayment(orderId: number, buyerId: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Get order details
      const order = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

      if (!order.length) {
        return { success: false, message: "Order not found" };
      }

      const orderData = order[0];

      // Verify buyer
      if (orderData.buyerId !== buyerId) {
        return { success: false, message: "Unauthorized" };
      }

      // Check if already paid
      if (orderData.status !== "pending") {
        return { success: false, message: "Order already processed" };
      }

      const amount = parseFloat(orderData.totalAmount);

      // Check buyer's wallet balance
      const balanceResult = await walletService.getBalance(buyerId);
      if (!balanceResult.success || !balanceResult.balance) {
        return { success: false, message: "Failed to check wallet balance" };
      }

      if (balanceResult.balance < amount) {
        return {
          success: false,
          message: `Insufficient wallet balance. Required: KES ${amount}, Available: KES ${balanceResult.balance}`,
        };
      }

      // Create purchase transaction
      const txResult = await walletService.createTransaction({
        userId: buyerId,
        type: "purchase",
        amount,
        status: "completed",
        description: `Purchase of book: Order ${orderData.orderNumber}`,
        bookListingId: orderData.bookListingId,
        metadata: {
          orderId,
          quantity: orderData.quantity,
        },
      });

      if (!txResult.success || !txResult.transactionId) {
        return { success: false, message: "Failed to create transaction" };
      }

      // Debit buyer's wallet
      const debitResult = await walletService.debitWallet({
        userId: buyerId,
        amount,
        transactionId: txResult.transactionId,
        description: `Payment for order ${orderData.orderNumber}`,
      });

      if (!debitResult.success) {
        return { success: false, message: debitResult.message || "Failed to debit wallet" };
      }

      // Create escrow account
      const escrowResult = await escrowService.createEscrow({
        bookListingId: orderData.bookListingId,
        buyerId,
        sellerId: orderData.sellerId,
        amount,
        orderId,
      });

      if (!escrowResult.success || !escrowResult.escrowId) {
        // Refund the buyer if escrow creation fails
        await walletService.creditWallet({
          userId: buyerId,
          amount,
          transactionId: txResult.transactionId,
          description: "Refund due to escrow creation failure",
        });
        return { success: false, message: "Failed to create escrow account" };
      }

      // Update order status
      await db
        .update(orders)
        .set({
          status: "paid",
          paidAt: new Date(),
          escrowId: escrowResult.escrowId,
        })
        .where(eq(orders.id, orderId));

      // Update book listing quantity
      const listing = await db.select().from(bookListings).where(eq(bookListings.id, orderData.bookListingId)).limit(1);
      if (listing.length) {
        const newQuantity = (listing[0].quantityAvailable || 0) - orderData.quantity;
        await db
          .update(bookListings)
          .set({
            quantityAvailable: newQuantity,
            listingStatus: newQuantity <= 0 ? "sold" : "active",
            soldAt: newQuantity <= 0 ? new Date() : null,
          })
          .where(eq(bookListings.id, orderData.bookListingId));
      }

      console.log(`[OrderService] Payment processed for order ${orderId}. Escrow created: ${escrowResult.escrowId}`);

      return {
        success: true,
        message: "Payment successful. Funds held in escrow for 7 days.",
      };
    } catch (error) {
      console.error("[OrderService] Process payment error:", error);
      return {
        success: false,
        message: "Failed to process payment",
      };
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: number,
    userId: string,
    status: string,
    updates?: {
      trackingNumber?: string;
      notes?: string;
      cancellationReason?: string;
    }
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // Get order
      const order = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

      if (!order.length) {
        return { success: false, message: "Order not found" };
      }

      const orderData = order[0];

      // Verify user is buyer or seller
      if (orderData.buyerId !== userId && orderData.sellerId !== userId) {
        return { success: false, message: "Unauthorized" };
      }

      const updateData: any = { status };

      // Add timestamp based on status
      if (status === "confirmed") updateData.confirmedAt = new Date();
      if (status === "delivered") updateData.deliveredAt = new Date();
      if (status === "completed") updateData.completedAt = new Date();
      if (status === "cancelled") updateData.cancelledAt = new Date();

      // Add optional fields
      if (updates?.trackingNumber) updateData.trackingNumber = updates.trackingNumber;
      if (updates?.cancellationReason) updateData.cancellationReason = updates.cancellationReason;

      // Handle seller or buyer notes
      if (updates?.notes) {
        if (orderData.sellerId === userId) {
          updateData.sellerNotes = updates.notes;
        } else {
          updateData.buyerNotes = updates.notes;
        }
      }

      // Update order
      await db.update(orders).set(updateData).where(eq(orders.id, orderId));

      // If cancelled and has escrow, refund the buyer
      if (status === "cancelled" && orderData.escrowId) {
        await escrowService.refundEscrow(orderData.escrowId, updates?.cancellationReason || "Order cancelled");
      }

      console.log(`[OrderService] Updated order ${orderId} status to ${status}`);

      return {
        success: true,
        message: `Order status updated to ${status}`,
      };
    } catch (error) {
      console.error("[OrderService] Update order status error:", error);
      return {
        success: false,
        message: "Failed to update order status",
      };
    }
  }

  /**
   * Get user's orders (as buyer or seller)
   */
  async getUserOrders(userId: string, role: "buyer" | "seller" = "buyer") {
    try {
      const condition = role === "buyer" ? eq(orders.buyerId, userId) : eq(orders.sellerId, userId);

      const userOrders = await db.select().from(orders).where(condition).orderBy(desc(orders.createdAt));

      return {
        success: true,
        orders: userOrders,
      };
    } catch (error) {
      console.error("[OrderService] Get user orders error:", error);
      return {
        success: false,
        message: "Failed to get orders",
      };
    }
  }

  /**
   * Get single order details
   */
  async getOrderById(orderId: number, userId: string) {
    try {
      const order = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

      if (!order.length) {
        return { success: false, message: "Order not found" };
      }

      const orderData = order[0];

      // Verify user is buyer or seller
      if (orderData.buyerId !== userId && orderData.sellerId !== userId) {
        return { success: false, message: "Unauthorized" };
      }

      return {
        success: true,
        order: orderData,
      };
    } catch (error) {
      console.error("[OrderService] Get order by ID error:", error);
      return {
        success: false,
        message: "Failed to get order",
      };
    }
  }
}

export const orderService = new OrderService();
