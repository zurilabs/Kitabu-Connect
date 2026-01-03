import { db } from "../db";
import {
  swapOrders,
  swapRequests,
  bookListings,
  users,
  escrowAccounts,
  transactions,
  walletTransactions,
  type CreateSwapOrderInput,
  type CreatePurchaseOrderInput,
  type UpdateSwapOrderInput,
  type SubmitRequirementsInput,
} from "../db/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { notificationService } from "./notification.service";
import { messageService } from "./message.service";

export class SwapOrderService {
  /**
   * Create a swap order when a swap request is accepted
   * This is similar to Fiverr creating an order when a gig is purchased
   */
  async createSwapOrder(
    swapRequestId: number
  ): Promise<{
    success: boolean;
    message?: string;
    swapOrder?: any;
  }> {
    try {
      // Get the swap request
      const [swapRequest] = await db
        .select()
        .from(swapRequests)
        .where(eq(swapRequests.id, swapRequestId))
        .limit(1);

      if (!swapRequest) {
        return {
          success: false,
          message: "Swap request not found",
        };
      }

      // Check if order already exists
      const existingOrder = await db
        .select()
        .from(swapOrders)
        .where(eq(swapOrders.swapRequestId, swapRequestId))
        .limit(1);

      if (existingOrder.length > 0) {
        return {
          success: false,
          message: "Order already exists for this swap request",
        };
      }

      // Generate order number (format: SWP-YYYYMMDD-XXXX)
      const orderNumber = `SWP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Calculate delivery deadline (7 days from now)
      const deliveryDeadline = new Date();
      deliveryDeadline.setDate(deliveryDeadline.getDate() + 7);

      // Calculate auto-complete date (3 days after delivery deadline)
      const autoCompleteAt = new Date(deliveryDeadline);
      autoCompleteAt.setDate(autoCompleteAt.getDate() + 3);

      // Create the swap order
      const [result] = await db.insert(swapOrders).values({
        orderNumber,
        swapRequestId,
        requesterId: swapRequest.requesterId,
        ownerId: swapRequest.ownerId,
        requestedListingId: swapRequest.requestedListingId,
        offeredListingId: swapRequest.offeredListingId,
        status: "requirements_gathering",
        deliveryMethod: swapRequest.deliveryMethod,
        meetupLocation: swapRequest.meetupLocation,
        deliveryDeadline,
        autoCompleteAt,
      });

      const swapOrderId = result.insertId;

      // Send system message to start the conversation
      await messageService.sendSystemMessage(
        swapOrderId,
        "🎉 Your swap order has been created! Please discuss the meetup details and book conditions with each other. Once both parties agree, the requester should submit the requirements to begin the swap process.",
        "system"
      );

      // Send notifications to both parties
      const [requester] = await db
        .select()
        .from(users)
        .where(eq(users.id, swapRequest.requesterId))
        .limit(1);

      const [owner] = await db
        .select()
        .from(users)
        .where(eq(users.id, swapRequest.ownerId))
        .limit(1);

      await notificationService.createNotification({
        userId: swapRequest.requesterId,
        type: "swap_accepted",
        title: "Swap Accepted! 🎉",
        message: `${owner.fullName} accepted your swap request. Start chatting to arrange the meetup!`,
        relatedSwapRequestId: swapRequestId,
        actionUrl: `/orders/${swapOrderId}/messages`,
      });

      await notificationService.createNotification({
        userId: swapRequest.ownerId,
        type: "swap_accepted",
        title: "Swap Order Created! 🎉",
        message: `Your swap order with ${requester.fullName} is ready. Start chatting to arrange the meetup!`,
        relatedSwapRequestId: swapRequestId,
        actionUrl: `/orders/${swapOrderId}/messages`,
      });

      // Fetch the complete swap order
      const [newSwapOrder] = await db
        .select()
        .from(swapOrders)
        .where(eq(swapOrders.id, swapOrderId))
        .limit(1);

      return {
        success: true,
        message: "Swap order created successfully",
        swapOrder: newSwapOrder,
      };
    } catch (error) {
      console.error("[SwapOrderService] Create swap order error:", error);
      return {
        success: false,
        message: "Failed to create swap order",
      };
    }
  }

  /**
   * Create a purchase order when a user clicks "Buy Now"
   * Uses same flow as swaps: order → payment → escrow → delivery → release
   */
  async createPurchaseOrder(
    buyerId: string,
    data: CreatePurchaseOrderInput
  ): Promise<{
    success: boolean;
    message?: string;
    purchaseOrder?: any;
  }> {
    try {
      // Get the book listing
      const [listing] = await db
        .select()
        .from(bookListings)
        .where(eq(bookListings.id, data.bookListingId))
        .limit(1);

      if (!listing) {
        return {
          success: false,
          message: "Book listing not found",
        };
      }

      // Check if listing is available
      if (listing.listingStatus !== "active") {
        return {
          success: false,
          message: "This book is no longer available",
        };
      }

      // Check if buyer is trying to buy their own book
      if (listing.sellerId === buyerId) {
        return {
          success: false,
          message: "You cannot buy your own book",
        };
      }

      // Calculate costs
      const bookPrice = parseFloat(listing.price);
      const convenienceFee = bookPrice * 0.05; // 5% convenience fee
      const totalAmount = bookPrice + convenienceFee;

      // Generate order number (format: PUR-YYYYMMDD-XXXX)
      const orderNumber = `PUR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Create the purchase order with 'pending' status (awaiting seller acceptance)
      const [result] = await db.insert(swapOrders).values({
        orderNumber,
        orderType: "purchase",
        swapRequestId: null, // No swap request for purchase orders
        requesterId: buyerId, // Buyer
        ownerId: listing.sellerId, // Seller
        requestedListingId: listing.id,
        offeredListingId: null, // No offered book for purchases
        bookPrice: bookPrice.toFixed(2),
        convenienceFee: convenienceFee.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        status: "pending", // Pending seller acceptance (like swap flow)
        deliveryMethod: data.deliveryMethod || "meetup",
        meetupLocation: data.deliveryAddress,
      });

      const purchaseOrderId = result.insertId;

      // Send system message to start the conversation
      await messageService.sendSystemMessage(
        purchaseOrderId,
        `🛒 Purchase request created!\n\n` +
        `Book: ${listing.title}\n` +
        `Price: KES ${bookPrice.toLocaleString()}\n` +
        `Platform Fee (5%): KES ${convenienceFee.toLocaleString()}\n` +
        `Total: KES ${totalAmount.toLocaleString()}\n\n` +
        `Waiting for seller to accept your purchase request.`,
        "system"
      );

      // Notify seller
      const [buyer] = await db
        .select()
        .from(users)
        .where(eq(users.id, buyerId))
        .limit(1);

      await notificationService.createNotification({
        userId: listing.sellerId,
        type: "swap_request",
        title: "New Purchase Request! 🛒",
        message: `${buyer.fullName} wants to buy "${listing.title}" for KES ${totalAmount.toLocaleString()}`,
        relatedBookListingId: listing.id,
        actionUrl: `/orders/${purchaseOrderId}/messages`,
      });

      // Fetch the complete purchase order
      const [newPurchaseOrder] = await db
        .select()
        .from(swapOrders)
        .where(eq(swapOrders.id, purchaseOrderId))
        .limit(1);

      return {
        success: true,
        message: "Purchase order created successfully",
        purchaseOrder: newPurchaseOrder,
      };
    } catch (error) {
      console.error("[SwapOrderService] Create purchase order error:", error);
      return {
        success: false,
        message: "Failed to create purchase order",
      };
    }
  }

  /**
   * Get a swap order by ID
   */
  async getSwapOrderById(
    swapOrderId: number,
    userId: string
  ): Promise<{
    success: boolean;
    swapOrder?: any;
    message?: string;
  }> {
    try {
      const [result] = await db
        .select({
          order: swapOrders,
          requester: {
            id: users.id,
            fullName: users.fullName,
            profilePictureUrl: users.profilePictureUrl,
            schoolName: users.schoolName,
            phoneNumber: users.phoneNumber,
          },
          requestedBook: {
            id: bookListings.id,
            title: bookListings.title,
            author: bookListings.author,
            condition: bookListings.condition,
            coverImageUrl: bookListings.primaryPhotoUrl,
          },
        })
        .from(swapOrders)
        .innerJoin(users, eq(swapOrders.requesterId, users.id))
        .innerJoin(bookListings, eq(swapOrders.requestedListingId, bookListings.id))
        .where(eq(swapOrders.id, swapOrderId))
        .limit(1);

      if (!result) {
        return {
          success: false,
          message: "Swap order not found",
        };
      }

      // Verify user is part of this swap
      if (
        result.order.requesterId !== userId &&
        result.order.ownerId !== userId
      ) {
        return {
          success: false,
          message: "You don't have permission to view this swap order",
        };
      }

      // Get owner info
      const [owner] = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          profilePictureUrl: users.profilePictureUrl,
          schoolName: users.schoolName,
          phoneNumber: users.phoneNumber,
        })
        .from(users)
        .where(eq(users.id, result.order.ownerId))
        .limit(1);

      // Get offered book info if exists
      let offeredBook = null;
      if (result.order.offeredListingId) {
        const [offered] = await db
          .select({
            id: bookListings.id,
            title: bookListings.title,
            author: bookListings.author,
            condition: bookListings.condition,
            coverImageUrl: bookListings.primaryPhotoUrl,
          })
          .from(bookListings)
          .where(eq(bookListings.id, result.order.offeredListingId))
          .limit(1);

        offeredBook = offered;
      }

      return {
        success: true,
        swapOrder: {
          ...result.order,
          requester: result.requester,
          owner,
          requestedBook: result.requestedBook,
          offeredBook,
        },
      };
    } catch (error) {
      console.error("[SwapOrderService] Get swap order error:", error);
      console.error("[SwapOrderService] Error details:", error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error("[SwapOrderService] Error stack:", error.stack);
      }
      return {
        success: false,
        message: "Failed to fetch swap order",
      };
    }
  }

  /**
   * Get all swap orders for a user
   */
  async getUserSwapOrders(userId: string): Promise<{
    success: boolean;
    orders?: any[];
    message?: string;
  }> {
    try {
      const userOrders = await db
        .select({
          order: swapOrders,
          requester: {
            id: users.id,
            fullName: users.fullName,
            profilePictureUrl: users.profilePictureUrl,
          },
          requestedBook: {
            id: bookListings.id,
            title: bookListings.title,
            coverImageUrl: bookListings.primaryPhotoUrl,
          },
        })
        .from(swapOrders)
        .innerJoin(users, eq(swapOrders.requesterId, users.id))
        .innerJoin(bookListings, eq(swapOrders.requestedListingId, bookListings.id))
        .where(
          or(
            eq(swapOrders.requesterId, userId),
            eq(swapOrders.ownerId, userId)
          )
        )
        .orderBy(desc(swapOrders.createdAt));

      // Get additional info for each order
      const enrichedOrders = await Promise.all(
        userOrders.map(async ({ order, requester, requestedBook }) => {
          // Get owner info (only if ownerId exists - it might be null for purchase orders)
          let owner = null;
          if (order.ownerId) {
            const [ownerResult] = await db
              .select({
                id: users.id,
                fullName: users.fullName,
                profilePictureUrl: users.profilePictureUrl,
              })
              .from(users)
              .where(eq(users.id, order.ownerId))
              .limit(1);
            owner = ownerResult;
          }

          // Determine other party (the person user is swapping with)
          const otherParty = order.requesterId === userId ? owner : requester;

          return {
            ...order,
            otherParty,
            requestedBook,
          };
        })
      );

      return {
        success: true,
        orders: enrichedOrders,
      };
    } catch (error) {
      console.error("[SwapOrderService] Get user swap orders error:", error);
      return {
        success: false,
        orders: [],
        message: "Failed to fetch swap orders",
      };
    }
  }

  /**
   * Submit requirements (meetup details) - Requester only
   * Similar to Fiverr's requirement submission
   */
  async submitRequirements(
    swapOrderId: number,
    userId: string,
    data: SubmitRequirementsInput
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const [swapOrder] = await db
        .select()
        .from(swapOrders)
        .where(eq(swapOrders.id, swapOrderId))
        .limit(1);

      if (!swapOrder) {
        return {
          success: false,
          message: "Swap order not found",
        };
      }

      // Only requester can submit requirements
      if (swapOrder.requesterId !== userId) {
        return {
          success: false,
          message: "Only the requester can submit requirements",
        };
      }

      // Check if already submitted
      if (swapOrder.requirementsSubmitted) {
        return {
          success: false,
          message: "Requirements already submitted",
        };
      }

      const isPurchase = swapOrder.orderType === "purchase";

      // Both purchase and swap orders now use datetime for meetupTime
      const meetupTimeValue = new Date(data.meetupTime);

      // Update the swap order
      await db
        .update(swapOrders)
        .set({
          requirementsSubmitted: true,
          meetupLocation: data.meetupLocation,
          meetupTime: meetupTimeValue,
        })
        .where(eq(swapOrders.id, swapOrderId));

      // Send system message (same format for both purchase and swap)
      const systemMessage = `📋 Meetup details submitted!\n\n📍 Meetup Location: ${data.meetupLocation}\n📅 Meetup Time: ${meetupTimeValue.toLocaleString()}\n\n${data.additionalNotes ? `📝 Notes: ${data.additionalNotes}` : ""}`;

      await messageService.sendSystemMessage(
        swapOrderId,
        systemMessage,
        "requirement"
      );

      // Notify owner
      const notificationMessage = isPurchase
        ? "The buyer has submitted meetup details. Please review and approve to proceed."
        : "The requester has submitted meetup details. Please review and approve.";

      await notificationService.createNotification({
        userId: swapOrder.ownerId,
        type: "swap_accepted",
        title: "Meetup Details Submitted",
        message: notificationMessage,
        relatedSwapRequestId: swapOrder.swapRequestId,
        actionUrl: `/orders/${swapOrderId}/messages`,
      });

      return {
        success: true,
        message: "Requirements submitted successfully",
      };
    } catch (error) {
      console.error("[SwapOrderService] Submit requirements error:", error);
      return {
        success: false,
        message: "Failed to submit requirements",
      };
    }
  }

  /**
   * Approve requirements - Owner only
   */
  async approveRequirements(
    swapOrderId: number,
    userId: string
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const [swapOrder] = await db
        .select()
        .from(swapOrders)
        .where(eq(swapOrders.id, swapOrderId))
        .limit(1);

      if (!swapOrder) {
        return {
          success: false,
          message: "Swap order not found",
        };
      }

      // Only owner can approve
      if (swapOrder.ownerId !== userId) {
        return {
          success: false,
          message: "Only the owner can approve requirements",
        };
      }

      if (!swapOrder.requirementsSubmitted) {
        return {
          success: false,
          message: "Requirements not yet submitted",
        };
      }

      const isPurchase = swapOrder.orderType === "purchase";

      // For purchases, buyer already paid - move to in_progress
      // For swaps, move to awaiting_payment for commitment fees
      const newStatus = isPurchase ? "in_progress" : "awaiting_payment";

      // Update the swap order
      await db
        .update(swapOrders)
        .set({
          requirementsApproved: true,
          status: newStatus,
          startedAt: new Date(),
        })
        .where(eq(swapOrders.id, swapOrderId));

      // Send different messages for purchases vs swaps
      const systemMessage = isPurchase
        ? "✅ Delivery details approved! The seller can now prepare and dispatch your book. You will be notified once the book is on its way."
        : "✅ Requirements approved! Both parties need to pay a commitment fee of KES 50 to proceed. This fee will be refunded when the swap is completed successfully.";

      await messageService.sendSystemMessage(
        swapOrderId,
        systemMessage,
        "system"
      );

      // Notify requester
      const notificationMessage = isPurchase
        ? "The seller approved your delivery details. Your book will be dispatched soon!"
        : "The owner approved the meetup details. Your swap is now in progress!";

      await notificationService.createNotification({
        userId: swapOrder.requesterId,
        type: "swap_accepted",
        title: "Requirements Approved! ✅",
        message: notificationMessage,
        relatedSwapRequestId: swapOrder.swapRequestId,
        actionUrl: `/orders/${swapOrderId}/messages`,
      });

      return {
        success: true,
        message: "Requirements approved successfully",
      };
    } catch (error) {
      console.error("[SwapOrderService] Approve requirements error:", error);
      return {
        success: false,
        message: "Failed to approve requirements",
      };
    }
  }

  /**
   * Pay commitment fee for a swap order
   */
  async payCommitmentFee(
    swapOrderId: number,
    userId: string,
    paymentReference: string
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const [swapOrder] = await db
        .select()
        .from(swapOrders)
        .where(eq(swapOrders.id, swapOrderId))
        .limit(1);

      if (!swapOrder) {
        return {
          success: false,
          message: "Swap order not found",
        };
      }

      if (swapOrder.status !== "awaiting_payment") {
        return {
          success: false,
          message: "Order is not awaiting payment",
        };
      }

      const isRequester = swapOrder.requesterId === userId;
      const isOwner = swapOrder.ownerId === userId;

      if (!isRequester && !isOwner) {
        return {
          success: false,
          message: "Not authorized",
        };
      }

      // Update payment status
      const updateData: any = {};
      if (isRequester) {
        updateData.requesterPaidFee = true;
        updateData.requesterPaymentReference = paymentReference;
      }
      if (isOwner) {
        updateData.ownerPaidFee = true;
        updateData.ownerPaymentReference = paymentReference;
      }

      await db
        .update(swapOrders)
        .set(updateData)
        .where(eq(swapOrders.id, swapOrderId));

      // Record transaction in transaction history (held in escrow until swap completes)
      const commitmentFeeAmount = parseFloat(swapOrder.commitmentFee || "50.00");
      await db.insert(transactions).values({
        userId: userId,
        type: "escrow_hold",
        status: "pending",
        amount: commitmentFeeAmount.toString(),
        currency: "KES",
        paymentMethod: "paystack",
        paymentReference: paymentReference,
        bookListingId: swapOrder.requestedListingId,
        description: `Service fee held in escrow for swap order #${swapOrder.orderNumber}`,
        metadata: JSON.stringify({
          swapOrderId: swapOrderId,
          orderNumber: swapOrder.orderNumber,
          role: isRequester ? "requester" : "owner",
          feeType: "swap_service_fee",
        }),
        createdAt: new Date(),
      });

      // Check if both parties have paid
      const [updatedOrder] = await db
        .select()
        .from(swapOrders)
        .where(eq(swapOrders.id, swapOrderId))
        .limit(1);

      const bothPaid = updatedOrder.requesterPaidFee && updatedOrder.ownerPaidFee;

      if (bothPaid) {
        // Create escrow account to hold the commitment fees
        const commitmentFeeAmount = parseFloat(swapOrder.commitmentFee || "50.00");
        const totalEscrowAmount = commitmentFeeAmount * 2; // Both parties' fees

        const [escrowAccount] = await db
          .insert(escrowAccounts)
          .values({
            bookListingId: swapOrder.requestedListingId,
            buyerId: swapOrder.requesterId,
            sellerId: swapOrder.ownerId,
            amount: totalEscrowAmount.toString(),
            currency: "KES",
            platformFee: "0.00", // No platform fee for commitment fees
            status: "active",
            holdPeriodDays: 7,
            releaseAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          })
          .$returningId();

        // Update swap order with escrow ID and move to in_progress
        await db
          .update(swapOrders)
          .set({
            escrowId: escrowAccount.id,
            status: "in_progress",
          })
          .where(eq(swapOrders.id, swapOrderId));

        // Send system message
        await messageService.sendSystemMessage(
          swapOrderId,
          "💰 Both parties have paid their commitment fees! The swap is now in progress. Please proceed with the book exchange at the agreed meetup location and time.",
          "system"
        );
      } else {
        // Send confirmation message for individual payment
        const userName = isRequester ? "Requester" : "Owner";
        await messageService.sendSystemMessage(
          swapOrderId,
          `💳 ${userName} has paid their KES 50 commitment fee. Waiting for the other party to pay their fee before the swap can proceed.`,
          "system"
        );
      }

      return {
        success: true,
        message: bothPaid
          ? "Both parties have paid! Swap is now in progress."
          : "Payment recorded. Waiting for the other party.",
      };
    } catch (error) {
      console.error("[SwapOrderService] Pay commitment fee error:", error);
      return {
        success: false,
        message: "Failed to process payment",
      };
    }
  }

  /**
   * Pay for a purchase order (book price + convenience fee)
   * Called after Paystack payment is verified
   */
  async payPurchaseOrder(
    purchaseOrderId: number,
    buyerId: string,
    paymentReference: string
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const [purchaseOrder] = await db
        .select()
        .from(swapOrders)
        .where(eq(swapOrders.id, purchaseOrderId))
        .limit(1);

      if (!purchaseOrder) {
        return {
          success: false,
          message: "Purchase order not found",
        };
      }

      // Verify it's a purchase order
      if (purchaseOrder.orderType !== "purchase") {
        return {
          success: false,
          message: "This is not a purchase order",
        };
      }

      // Verify the buyer
      if (purchaseOrder.requesterId !== buyerId) {
        return {
          success: false,
          message: "You are not authorized to pay for this order",
        };
      }

      // Check status
      if (purchaseOrder.status !== "awaiting_payment") {
        return {
          success: false,
          message: "This order is not awaiting payment",
        };
      }

      const totalAmount = parseFloat(purchaseOrder.totalAmount || "0");
      const bookPrice = parseFloat(purchaseOrder.bookPrice || "0");
      const convenienceFee = parseFloat(purchaseOrder.convenienceFee || "0");

      // Create escrow account to hold the payment
      const [escrowAccount] = await db
        .insert(escrowAccounts)
        .values({
          bookListingId: purchaseOrder.requestedListingId,
          buyerId: buyerId,
          sellerId: purchaseOrder.ownerId,
          amount: bookPrice.toFixed(2), // Only book price goes to seller
          currency: "KES",
          platformFee: convenienceFee.toFixed(2), // Convenience fee is platform fee
          status: "active",
          holdPeriodDays: 7,
          releaseAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        })
        .$returningId();

      // Record transaction
      await db.insert(transactions).values({
        userId: buyerId,
        type: "purchase",
        status: "completed",
        amount: totalAmount.toFixed(2),
        currency: "KES",
        paymentMethod: "paystack",
        paymentReference: paymentReference,
        bookListingId: purchaseOrder.requestedListingId,
        escrowId: escrowAccount.id,
        description: `Purchase of book - Order #${purchaseOrder.orderNumber}`,
        metadata: JSON.stringify({
          purchaseOrderId: purchaseOrderId,
          orderNumber: purchaseOrder.orderNumber,
          bookPrice: bookPrice,
          convenienceFee: convenienceFee,
        }),
        completedAt: new Date(),
      });

      // Update purchase order status to requirements_gathering so buyer can submit delivery details
      await db
        .update(swapOrders)
        .set({
          escrowId: escrowAccount.id,
          status: "requirements_gathering",
          requesterPaidFee: true, // Using this field to track buyer payment
          requesterPaymentReference: paymentReference,
        })
        .where(eq(swapOrders.id, purchaseOrderId));

      // Send system message
      await messageService.sendSystemMessage(
        purchaseOrderId,
        `💰 Payment received! KES ${totalAmount.toLocaleString()} has been placed in escrow.\n\n` +
        `Please provide your delivery details (meetup location or shipping address) so the seller can dispatch the book.`,
        "system"
      );

      // Notify seller
      await notificationService.createNotification({
        userId: purchaseOrder.ownerId,
        type: "swap_accepted",
        title: "Payment Received! 💰",
        message: `The buyer has paid for "${purchaseOrder.requestedListing?.title || 'the book'}". Waiting for delivery details.`,
        actionUrl: `/orders/${purchaseOrderId}/messages`,
      });

      return {
        success: true,
        message: "Payment successful! The order is now in progress.",
      };
    } catch (error) {
      console.error("[SwapOrderService] Pay purchase order error:", error);
      return {
        success: false,
        message: "Failed to process payment",
      };
    }
  }

  /**
   * Mark book as dispatched/sent
   */
  async markBookDispatched(
    swapOrderId: number,
    userId: string
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const [swapOrder] = await db
        .select()
        .from(swapOrders)
        .where(eq(swapOrders.id, swapOrderId))
        .limit(1);

      if (!swapOrder) {
        return {
          success: false,
          message: "Swap order not found",
        };
      }

      const isRequester = swapOrder.requesterId === userId;
      const isOwner = swapOrder.ownerId === userId;

      if (!isRequester && !isOwner) {
        return {
          success: false,
          message: "Not authorized",
        };
      }

      // For purchase orders: only seller dispatches after buyer pays
      if (swapOrder.orderType === "purchase") {
        // Only seller can dispatch in purchase orders
        if (!isOwner) {
          return {
            success: false,
            message: "Only the seller can dispatch books in purchase orders",
          };
        }

        // Check if buyer has paid
        if (!swapOrder.requesterPaidFee) {
          return {
            success: false,
            message: "The buyer must complete payment before you can dispatch the book",
          };
        }
      } else {
        // For swap orders: both parties must pay before dispatching
        if (!swapOrder.requesterPaidFee || !swapOrder.ownerPaidFee) {
          return {
            success: false,
            message: "Both parties must pay commitment fees before dispatching books",
          };
        }
      }

      // Update the appropriate dispatch field
      const updateData: any = {};
      if (isRequester) {
        if (swapOrder.requesterShipped) {
          return {
            success: false,
            message: "You have already marked your book as dispatched",
          };
        }
        updateData.requesterShipped = true;
      }
      if (isOwner) {
        if (swapOrder.ownerShipped) {
          return {
            success: false,
            message: "You have already marked your book as dispatched",
          };
        }
        updateData.ownerShipped = true;
      }

      await db
        .update(swapOrders)
        .set(updateData)
        .where(eq(swapOrders.id, swapOrderId));

      // Send system message
      const userName = isRequester ? swapOrder.requester?.fullName : swapOrder.owner?.fullName;
      await messageService.sendSystemMessage(
        swapOrderId,
        `📦 ${userName || (isRequester ? "Requester" : "Owner")} has dispatched their book!`,
        "system"
      );

      // Send notification to the other party
      const otherPartyId = isRequester ? swapOrder.ownerId : swapOrder.requesterId;
      const otherPartyName = isRequester ? swapOrder.owner?.fullName : swapOrder.requester?.fullName;

      await notificationService.createNotification({
        userId: otherPartyId,
        type: "swap_accepted",
        title: "Book Dispatched! 📦",
        message: `${userName || "The other party"} has dispatched their book. You should receive it soon!`,
        relatedSwapRequestId: swapOrder.swapRequestId,
        actionUrl: `/orders/${swapOrderId}/messages`,
      });

      return {
        success: true,
        message: "Book marked as dispatched",
      };
    } catch (error) {
      console.error("[SwapOrderService] Mark book dispatched error:", error);
      return {
        success: false,
        message: "Failed to mark book as dispatched",
      };
    }
  }

  /**
   * Mark book as delivered/received
   */
  async confirmDelivery(
    swapOrderId: number,
    userId: string
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const [swapOrder] = await db
        .select()
        .from(swapOrders)
        .where(eq(swapOrders.id, swapOrderId))
        .limit(1);

      if (!swapOrder) {
        return {
          success: false,
          message: "Swap order not found",
        };
      }

      const isRequester = swapOrder.requesterId === userId;
      const isOwner = swapOrder.ownerId === userId;

      if (!isRequester && !isOwner) {
        return {
          success: false,
          message: "Not authorized",
        };
      }

      // For purchase orders: only buyer confirms receipt
      const isPurchaseOrder = swapOrder.orderType === "purchase";

      if (isPurchaseOrder) {
        // Only buyer can confirm in purchase orders
        if (!isRequester) {
          return {
            success: false,
            message: "Only the buyer can confirm receipt in purchase orders",
          };
        }
      }

      // Update the appropriate confirmation field
      const updateData: any = {};
      if (isRequester) {
        updateData.requesterReceivedBook = true;
      }
      if (isOwner) {
        updateData.ownerReceivedBook = true;
      }

      // For purchase orders: complete immediately when buyer confirms
      // For swap orders: both parties must confirm
      let bothConfirmed;
      if (isPurchaseOrder) {
        bothConfirmed = isRequester; // Buyer confirmed = order complete
      } else {
        bothConfirmed =
          (isRequester && swapOrder.ownerReceivedBook) ||
          (isOwner && swapOrder.requesterReceivedBook);
      }

      if (bothConfirmed) {
        updateData.status = "completed";
        updateData.completedAt = new Date();
      } else {
        updateData.status = "delivered";
        updateData.deliveredAt = new Date();
      }

      await db
        .update(swapOrders)
        .set(updateData)
        .where(eq(swapOrders.id, swapOrderId));

      if (bothConfirmed) {
        // Release escrow
        if (swapOrder.escrowId) {
          await db
            .update(escrowAccounts)
            .set({
              status: "released",
              releasedAt: new Date(),
            })
            .where(eq(escrowAccounts.id, swapOrder.escrowId));

          if (isPurchaseOrder) {
            // For purchase orders: credit seller's wallet with book price
            const bookPrice = parseFloat(swapOrder.bookPrice || "0");

            // Get the escrow account to check platform fee
            const [escrowAccount] = await db
              .select()
              .from(escrowAccounts)
              .where(eq(escrowAccounts.id, swapOrder.escrowId))
              .limit(1);

            // Get the purchase transaction
            const [purchaseTransaction] = await db
              .select()
              .from(transactions)
              .where(
                and(
                  eq(transactions.userId, swapOrder.requesterId),
                  eq(transactions.type, "purchase"),
                  eq(transactions.paymentReference, swapOrder.requesterPaymentReference || "")
                )
              )
              .limit(1);

            // Credit seller - create a "sale" transaction
            if (purchaseTransaction) {
              // Get current seller balance BEFORE crediting
              const [sellerUser] = await db
                .select()
                .from(users)
                .where(eq(users.id, swapOrder.ownerId))
                .limit(1);

              const currentBalance = parseFloat(sellerUser.walletBalance || "0");
              const newBalance = currentBalance + bookPrice;

              // Create sale transaction
              const [saleTransactionResult] = await db.insert(transactions).values({
                userId: swapOrder.ownerId,
                type: "sale",
                status: "completed",
                amount: bookPrice.toFixed(2),
                currency: "KES",
                paymentMethod: "paystack",
                paymentReference: swapOrder.requesterPaymentReference,
                bookListingId: swapOrder.requestedListingId,
                escrowId: swapOrder.escrowId,
                description: `Sale of book - Order #${swapOrder.orderNumber}`,
                metadata: JSON.stringify({
                  purchaseOrderId: swapOrderId,
                  orderNumber: swapOrder.orderNumber,
                  buyerId: swapOrder.requesterId,
                }),
                completedAt: new Date(),
              }).$returningId();

              // Update seller's wallet balance
              await db
                .update(users)
                .set({
                  walletBalance: newBalance.toFixed(2),
                })
                .where(eq(users.id, swapOrder.ownerId));

              // Record wallet transaction for seller (credit)
              await db.insert(walletTransactions).values({
                userId: swapOrder.ownerId,
                type: "credit",
                amount: bookPrice.toFixed(2),
                balanceAfter: newBalance.toFixed(2),
                transactionId: saleTransactionResult.id,
                description: `Payment received for book sale - Order #${swapOrder.orderNumber}`,
              });

              console.log(`[SwapOrderService] Released KES ${bookPrice.toFixed(2)} from escrow to seller ${swapOrder.ownerId}. New balance: KES ${newBalance.toFixed(2)}`);

              // Credit platform account with convenience fee
              const platformFee = parseFloat(escrowAccount?.platformFee || swapOrder.convenienceFee || "0");

              if (platformFee > 0) {
                const PLATFORM_EMAIL = "platform@kitabuconnect.com";

                // Get platform account by email (works regardless of ID)
                const [platformUser] = await db
                  .select()
                  .from(users)
                  .where(eq(users.email, PLATFORM_EMAIL))
                  .limit(1);

                if (platformUser) {
                  const platformCurrentBalance = parseFloat(platformUser.walletBalance || "0");
                  const platformNewBalance = platformCurrentBalance + platformFee;

                  // Create platform revenue transaction
                  const [platformRevenueResult] = await db.insert(transactions).values({
                    userId: platformUser.id,
                    type: "platform_revenue",
                    status: "completed",
                    amount: platformFee.toFixed(2),
                    currency: "KES",
                    paymentMethod: "paystack",
                    paymentReference: swapOrder.requesterPaymentReference,
                    bookListingId: swapOrder.requestedListingId,
                    escrowId: swapOrder.escrowId,
                    description: `Platform fee from Order #${swapOrder.orderNumber}`,
                    metadata: JSON.stringify({
                      purchaseOrderId: swapOrderId,
                      orderNumber: swapOrder.orderNumber,
                      sellerId: swapOrder.ownerId,
                      buyerId: swapOrder.requesterId,
                      bookPrice: bookPrice,
                    }),
                    completedAt: new Date(),
                  }).$returningId();

                  // Update platform wallet balance
                  await db
                    .update(users)
                    .set({
                      walletBalance: platformNewBalance.toFixed(2),
                    })
                    .where(eq(users.id, platformUser.id));

                  // Record wallet transaction for platform (credit)
                  await db.insert(walletTransactions).values({
                    userId: platformUser.id,
                    type: "credit",
                    amount: platformFee.toFixed(2),
                    balanceAfter: platformNewBalance.toFixed(2),
                    transactionId: platformRevenueResult.id,
                    description: `Platform fee collected - Order #${swapOrder.orderNumber}`,
                  });

                  console.log(`[SwapOrderService] Collected KES ${platformFee.toFixed(2)} platform fee. Platform balance: KES ${platformNewBalance.toFixed(2)}`);
                }
              }
            }
          } else {
            // For swap orders: release commitment fees to platform
            const commitmentFeeAmount = parseFloat(swapOrder.commitmentFee || "50.00");

            // Complete the escrow hold transaction for requester (transfer to platform)
            await db
              .update(transactions)
              .set({
                status: "completed",
                completedAt: new Date(),
                description: `Service fee released to platform for swap order #${swapOrder.orderNumber}`,
              })
              .where(
                and(
                  eq(transactions.userId, swapOrder.requesterId),
                  eq(transactions.type, "escrow_hold"),
                  eq(transactions.paymentReference, swapOrder.requesterPaymentReference || ""),
                  eq(transactions.status, "pending")
                )
              );

            // Complete the escrow hold transaction for owner (transfer to platform)
            await db
              .update(transactions)
              .set({
                status: "completed",
                completedAt: new Date(),
                description: `Service fee released to platform for swap order #${swapOrder.orderNumber}`,
              })
              .where(
                and(
                  eq(transactions.userId, swapOrder.ownerId),
                  eq(transactions.type, "escrow_hold"),
                  eq(transactions.paymentReference, swapOrder.ownerPaymentReference || ""),
                  eq(transactions.status, "pending")
                )
              );
          }
        }

        // Decrement quantity for both books involved in the swap
        // This will hide books with quantity 0 from marketplace
        if (swapOrder.requestedListingId) {
          await db
            .update(bookListings)
            .set({
              quantityAvailable: sql`GREATEST(0, ${bookListings.quantityAvailable} - 1)`,
            })
            .where(eq(bookListings.id, swapOrder.requestedListingId));
        }

        if (swapOrder.offeredListingId) {
          await db
            .update(bookListings)
            .set({
              quantityAvailable: sql`GREATEST(0, ${bookListings.quantityAvailable} - 1)`,
            })
            .where(eq(bookListings.id, swapOrder.offeredListingId));
        }

        // Send completion messages
        if (isPurchaseOrder) {
          const bookPrice = parseFloat(swapOrder.bookPrice || "0");
          await messageService.sendSystemMessage(
            swapOrderId,
            `🎊 Purchase completed! Payment of KES ${bookPrice.toLocaleString()} has been released to the seller. Thank you for using Kitabu Connect!`,
            "system"
          );

          // Notify buyer
          await notificationService.createNotification({
            userId: swapOrder.requesterId,
            type: "swap_completed",
            title: "Purchase Completed! 🎊",
            message: "Your purchase is complete. Thank you for using Kitabu Connect!",
          });

          // Notify seller
          await notificationService.createNotification({
            userId: swapOrder.ownerId,
            type: "swap_completed",
            title: "Sale Completed! 💰",
            message: `You've received KES ${bookPrice.toLocaleString()} for your book sale. The funds are now in your wallet.`,
          });
        } else {
          await messageService.sendSystemMessage(
            swapOrderId,
            "🎊 Swap completed! Both parties have confirmed receiving their books. Thank you for using our platform!",
            "system"
          );

          // Notify both parties
          await notificationService.createNotification({
            userId: swapOrder.requesterId,
            type: "swap_completed",
            title: "Swap Completed! 🎊",
            message: "Your book swap is complete. Thank you for using Kitabu Connect!",
            relatedSwapRequestId: swapOrder.swapRequestId,
          });

          await notificationService.createNotification({
            userId: swapOrder.ownerId,
            type: "swap_completed",
            title: "Swap Completed! 🎊",
            message: "Your book swap is complete. Thank you for using Kitabu Connect!",
            relatedSwapRequestId: swapOrder.swapRequestId,
          });
        }
      } else {
        // Notify the other party
        const otherPartyId = isRequester ? swapOrder.ownerId : swapOrder.requesterId;
        await notificationService.createNotification({
          userId: otherPartyId,
          type: "swap_accepted",
          title: "Book Received",
          message: "The other party confirmed receiving their book. Please confirm once you receive yours.",
          relatedSwapRequestId: swapOrder.swapRequestId,
          actionUrl: `/orders/${swapOrderId}`,
        });
      }

      return {
        success: true,
        message: bothConfirmed
          ? "Swap completed successfully!"
          : "Receipt confirmed. Waiting for other party to confirm.",
      };
    } catch (error) {
      console.error("[SwapOrderService] Confirm delivery error:", error);
      return {
        success: false,
        message: "Failed to confirm delivery",
      };
    }
  }

  /**
   * Cancel a swap order
   */
  async cancelSwapOrder(
    swapOrderId: number,
    userId: string,
    reason: string
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const [swapOrder] = await db
        .select()
        .from(swapOrders)
        .where(eq(swapOrders.id, swapOrderId))
        .limit(1);

      if (!swapOrder) {
        return {
          success: false,
          message: "Swap order not found",
        };
      }

      // Both parties can cancel before completion
      if (
        swapOrder.requesterId !== userId &&
        swapOrder.ownerId !== userId
      ) {
        return {
          success: false,
          message: "Not authorized to cancel this order",
        };
      }

      // Cannot cancel if already completed
      if (swapOrder.status === "completed") {
        return {
          success: false,
          message: "Cannot cancel a completed swap",
        };
      }

      await db
        .update(swapOrders)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          cancelledBy: userId,
          cancellationReason: reason,
        })
        .where(eq(swapOrders.id, swapOrderId));

      // Handle escrow/commitment fee forfeiture
      const isRequester = swapOrder.requesterId === userId;
      let feeMessage = "";

      if (swapOrder.escrowId && (swapOrder.requesterPaidFee || swapOrder.ownerPaidFee)) {
        // If payment stage has passed, the cancelling party forfeits their fee
        const forfeiterPaidFee = isRequester ? swapOrder.requesterPaidFee : swapOrder.ownerPaidFee;
        const otherPartyPaidFee = isRequester ? swapOrder.ownerPaidFee : swapOrder.requesterPaidFee;

        if (forfeiterPaidFee && otherPartyPaidFee) {
          // Both paid - cancelling party forfeits, other party gets refunded
          feeMessage = "\n\n⚠️ You have forfeited your commitment fee. The other party will be refunded.";
        } else if (forfeiterPaidFee) {
          // Only cancelling party paid - they forfeit
          feeMessage = "\n\n⚠️ You have forfeited your commitment fee.";
        } else if (otherPartyPaidFee) {
          // Only other party paid - they get refunded
          feeMessage = "\n\n✅ The other party will be refunded their commitment fee.";
        }

        // Update escrow status to refunded (partial or full depending on situation)
        await db
          .update(escrowAccounts)
          .set({
            status: "refunded",
            refundedAt: new Date(),
          })
          .where(eq(escrowAccounts.id, swapOrder.escrowId));
      }

      // Send system message
      await messageService.sendSystemMessage(
        swapOrderId,
        `❌ Order cancelled.\n\nReason: ${reason}${feeMessage}`,
        "system"
      );

      // Notify the other party
      const otherPartyId =
        swapOrder.requesterId === userId
          ? swapOrder.ownerId
          : swapOrder.requesterId;

      await notificationService.createNotification({
        userId: otherPartyId,
        type: "swap_rejected",
        title: "Swap Order Cancelled",
        message: `The swap order has been cancelled. Reason: ${reason}`,
        relatedSwapRequestId: swapOrder.swapRequestId,
      });

      return {
        success: true,
        message: "Swap order cancelled successfully",
      };
    } catch (error) {
      console.error("[SwapOrderService] Cancel swap order error:", error);
      return {
        success: false,
        message: "Failed to cancel swap order",
      };
    }
  }

  /**
   * Accept a swap or purchase order (seller/owner accepts the request)
   */
  async acceptOrder(
    orderId: number,
    userId: string
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      // Get the order
      const [order] = await db
        .select()
        .from(swapOrders)
        .where(eq(swapOrders.id, orderId))
        .limit(1);

      if (!order) {
        return {
          success: false,
          message: "Order not found",
        };
      }

      // Check authorization (must be owner/seller)
      if (order.ownerId !== userId) {
        return {
          success: false,
          message: "Only the seller can accept this order",
        };
      }

      // Check status
      if (order.status !== "pending") {
        return {
          success: false,
          message: "This order cannot be accepted",
        };
      }

      const isPurchase = order.orderType === "purchase";

      // Update status based on order type
      const newStatus = isPurchase ? "awaiting_payment" : "requirements_gathering";

      await db
        .update(swapOrders)
        .set({ status: newStatus })
        .where(eq(swapOrders.id, orderId));

      // Send system message
      const message = isPurchase
        ? `✅ Seller accepted your purchase request!\n\nPlease complete payment to proceed with the order.`
        : `✅ Your swap request has been accepted!\n\nBoth parties need to pay the KES 50 service fee to proceed.`;

      await messageService.sendSystemMessage(orderId, message, "system");

      // Notify buyer/requester
      const [seller] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      await notificationService.createNotification({
        userId: order.requesterId,
        type: "swap_accepted",
        title: isPurchase ? "Purchase Request Accepted! ✅" : "Swap Request Accepted! ✅",
        message: isPurchase
          ? `${seller.fullName} accepted your purchase request. Please complete payment.`
          : `${seller.fullName} accepted your swap request. Pay the service fee to proceed.`,
        relatedBookListingId: order.requestedListingId || undefined,
        actionUrl: `/orders/${orderId}/messages`,
      });

      return {
        success: true,
        message: isPurchase ? "Purchase request accepted" : "Swap request accepted",
      };
    } catch (error) {
      console.error("[SwapOrderService] Accept order error:", error);
      return {
        success: false,
        message: "Failed to accept order",
      };
    }
  }

  /**
   * Reject a swap or purchase order
   */
  async rejectOrder(
    orderId: number,
    userId: string
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      // Get the order
      const [order] = await db
        .select()
        .from(swapOrders)
        .where(eq(swapOrders.id, orderId))
        .limit(1);

      if (!order) {
        return {
          success: false,
          message: "Order not found",
        };
      }

      // Check authorization (must be owner/seller)
      if (order.ownerId !== userId) {
        return {
          success: false,
          message: "Only the seller can reject this order",
        };
      }

      // Check status
      if (order.status !== "pending") {
        return {
          success: false,
          message: "This order cannot be rejected",
        };
      }

      const isPurchase = order.orderType === "purchase";

      // Update status to rejected
      await db
        .update(swapOrders)
        .set({ status: "rejected" })
        .where(eq(swapOrders.id, orderId));

      // Send system message
      const message = isPurchase
        ? `❌ Seller rejected your purchase request.`
        : `❌ Your swap request has been rejected.`;

      await messageService.sendSystemMessage(orderId, message, "system");

      // Notify buyer/requester
      const [seller] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      await notificationService.createNotification({
        userId: order.requesterId,
        type: "swap_rejected",
        title: isPurchase ? "Purchase Request Rejected ❌" : "Swap Request Rejected ❌",
        message: isPurchase
          ? `${seller.fullName} rejected your purchase request.`
          : `${seller.fullName} rejected your swap request.`,
        relatedBookListingId: order.requestedListingId || undefined,
        actionUrl: `/orders/${orderId}/messages`,
      });

      return {
        success: true,
        message: isPurchase ? "Purchase request rejected" : "Swap request rejected",
      };
    } catch (error) {
      console.error("[SwapOrderService] Reject order error:", error);
      return {
        success: false,
        message: "Failed to reject order",
      };
    }
  }
}

export const swapOrderService = new SwapOrderService();
