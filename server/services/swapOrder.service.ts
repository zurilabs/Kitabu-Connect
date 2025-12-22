import { db } from "../db";
import {
  swapOrders,
  swapRequests,
  bookListings,
  users,
  escrowAccounts,
  transactions,
  type CreateSwapOrderInput,
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
          // Get owner info
          const [owner] = await db
            .select({
              id: users.id,
              fullName: users.fullName,
              profilePictureUrl: users.profilePictureUrl,
            })
            .from(users)
            .where(eq(users.id, order.ownerId))
            .limit(1);

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

      // Update the swap order
      await db
        .update(swapOrders)
        .set({
          requirementsSubmitted: true,
          meetupLocation: data.meetupLocation,
          meetupTime: new Date(data.meetupTime),
        })
        .where(eq(swapOrders.id, swapOrderId));

      // Send system message
      await messageService.sendSystemMessage(
        swapOrderId,
        `📋 Requirements submitted!\n\nMeetup Location: ${data.meetupLocation}\nMeetup Time: ${new Date(data.meetupTime).toLocaleString()}\n\n${data.additionalNotes ? `Notes: ${data.additionalNotes}` : ""}`,
        "requirement"
      );

      // Notify owner
      await notificationService.createNotification({
        userId: swapOrder.ownerId,
        type: "swap_accepted",
        title: "Requirements Submitted",
        message: "The requester has submitted meetup details. Please review and approve.",
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

      // Update the swap order to awaiting payment
      await db
        .update(swapOrders)
        .set({
          requirementsApproved: true,
          status: "awaiting_payment",
          startedAt: new Date(),
        })
        .where(eq(swapOrders.id, swapOrderId));

      // Send system message about commitment fees
      await messageService.sendSystemMessage(
        swapOrderId,
        "✅ Requirements approved! Both parties need to pay a commitment fee of KES 50 to proceed. This fee will be refunded when the swap is completed successfully.",
        "system"
      );

      // Notify requester
      await notificationService.createNotification({
        userId: swapOrder.requesterId,
        type: "swap_accepted",
        title: "Requirements Approved! ✅",
        message: "The owner approved the meetup details. Your swap is now in progress!",
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
          `💳 ${userName} has paid their commitment fee. Waiting for the other party to pay.`,
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

      // Check if both parties have paid
      if (!swapOrder.requesterPaidFee || !swapOrder.ownerPaidFee) {
        return {
          success: false,
          message: "Both parties must pay commitment fees before dispatching books",
        };
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

      // Update the appropriate confirmation field
      const updateData: any = {};
      if (isRequester) {
        updateData.requesterReceivedBook = true;
      }
      if (isOwner) {
        updateData.ownerReceivedBook = true;
      }

      // If both have confirmed, mark as completed
      const bothConfirmed =
        (isRequester && swapOrder.ownerReceivedBook) ||
        (isOwner && swapOrder.requesterReceivedBook);

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
        // Release escrow and transfer service fees to platform
        if (swapOrder.escrowId) {
          await db
            .update(escrowAccounts)
            .set({
              status: "released",
              releasedAt: new Date(),
            })
            .where(eq(escrowAccounts.id, swapOrder.escrowId));

          // Update the pending escrow_hold transactions to completed
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
}

export const swapOrderService = new SwapOrderService();
