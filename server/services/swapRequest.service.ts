import { db } from "../db";
import {
  swapRequests,
  bookListings,
  users,
  type CreateSwapRequestInput,
  type UpdateSwapRequestInput,
} from "../db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { notificationService } from "./notification.service";

export class SwapRequestService {
  /**
   * Create a new swap request
   */
  async createSwapRequest(
    requesterId: string,
    data: CreateSwapRequestInput
  ): Promise<{
    success: boolean;
    message?: string;
    swapRequest?: any;
  }> {
    try {
      // Get the book listing to find the owner
      const [listing] = await db
        .select()
        .from(bookListings)
        .where(eq(bookListings.id, data.requestedListingId))
        .limit(1);

      if (!listing) {
        return {
          success: false,
          message: "Book listing not found",
        };
      }

      // Check if listing is actually for swap
      if (listing.listingType !== "swap") {
        return {
          success: false,
          message: "This book is not listed for swapping",
        };
      }

      // Check if user is trying to swap with themselves
      if (listing.sellerId === requesterId) {
        return {
          success: false,
          message: "You cannot swap with yourself",
        };
      }

      // Check if there's already a pending request
      const existingRequest = await db
        .select()
        .from(swapRequests)
        .where(
          and(
            eq(swapRequests.requesterId, requesterId),
            eq(swapRequests.requestedListingId, data.requestedListingId),
            or(
              eq(swapRequests.status, "pending"),
              eq(swapRequests.status, "accepted")
            )
          )
        )
        .limit(1);

      if (existingRequest.length > 0) {
        return {
          success: false,
          message: "You already have a pending swap request for this book",
        };
      }

      // Create the swap request
      const [result] = await db.insert(swapRequests).values({
        requesterId,
        ownerId: listing.sellerId,
        requestedListingId: data.requestedListingId,
        offeredBookTitle: data.offeredBookTitle,
        offeredBookAuthor: data.offeredBookAuthor || null,
        offeredBookCondition: data.offeredBookCondition,
        offeredBookDescription: data.offeredBookDescription || null,
        offeredBookPhotoUrl: data.offeredBookPhotoUrl || null,
        message: data.message || null,
        deliveryMethod: data.deliveryMethod || "meetup",
        meetupLocation: data.meetupLocation || null,
        status: "pending",
      });

      const swapRequestId = result.insertId;

      // Get requester info for notification
      const [requester] = await db
        .select()
        .from(users)
        .where(eq(users.id, requesterId))
        .limit(1);

      // Send notification to the book owner
      await notificationService.createNotification({
        userId: listing.sellerId,
        type: "swap_request",
        title: "New Swap Request!",
        message: `${requester.fullName || "Someone"} wants to swap "${data.offeredBookTitle}" for your "${listing.title}"`,
        relatedSwapRequestId: swapRequestId,
        relatedBookListingId: data.requestedListingId,
        actionUrl: `/swaps/${swapRequestId}`,
      });

      // Fetch the complete swap request with related data
      const [newSwapRequest] = await db
        .select({
          swapRequest: swapRequests,
          requester: {
            id: users.id,
            fullName: users.fullName,
            profilePictureUrl: users.profilePictureUrl,
            schoolName: users.schoolName,
          },
        })
        .from(swapRequests)
        .innerJoin(users, eq(swapRequests.requesterId, users.id))
        .where(eq(swapRequests.id, swapRequestId))
        .limit(1);

      return {
        success: true,
        message: "Swap request sent successfully!",
        swapRequest: newSwapRequest,
      };
    } catch (error) {
      console.error("[SwapRequestService] Create swap request error:", error);
      return {
        success: false,
        message: "Failed to create swap request",
      };
    }
  }

  /**
   * Get swap requests for a user (both incoming and outgoing)
   */
  async getUserSwapRequests(userId: string): Promise<{
    success: boolean;
    incoming: any[];
    outgoing: any[];
    message?: string;
  }> {
    try {
      // Incoming requests (where user is the owner)
      const incoming = await db
        .select({
          swapRequest: swapRequests,
          requester: {
            id: users.id,
            fullName: users.fullName,
            profilePictureUrl: users.profilePictureUrl,
            schoolName: users.schoolName,
          },
          requestedBook: {
            id: bookListings.id,
            title: bookListings.title,
            author: bookListings.author,
            coverImageUrl: bookListings.primaryPhotoUrl,
          },
        })
        .from(swapRequests)
        .innerJoin(users, eq(swapRequests.requesterId, users.id))
        .innerJoin(bookListings, eq(swapRequests.requestedListingId, bookListings.id))
        .where(eq(swapRequests.ownerId, userId))
        .orderBy(desc(swapRequests.createdAt));

      // Outgoing requests (where user is the requester)
      const outgoingData = await db
        .select({
          swapRequest: swapRequests,
          owner: {
            id: users.id,
            fullName: users.fullName,
            profilePictureUrl: users.profilePictureUrl,
            schoolName: users.schoolName,
          },
          requestedBook: {
            id: bookListings.id,
            title: bookListings.title,
            author: bookListings.author,
            coverImageUrl: bookListings.primaryPhotoUrl,
          },
        })
        .from(swapRequests)
        .innerJoin(users, eq(swapRequests.ownerId, users.id))
        .innerJoin(bookListings, eq(swapRequests.requestedListingId, bookListings.id))
        .where(eq(swapRequests.requesterId, userId))
        .orderBy(desc(swapRequests.createdAt));

      return {
        success: true,
        incoming,
        outgoing: outgoingData,
      };
    } catch (error) {
      console.error("[SwapRequestService] Get user swap requests error:", error);
      return {
        success: false,
        incoming: [],
        outgoing: [],
        message: "Failed to fetch swap requests",
      };
    }
  }

  /**
   * Get a single swap request by ID
   */
  async getSwapRequestById(swapRequestId: number, userId: string): Promise<{
    success: boolean;
    swapRequest?: any;
    message?: string;
  }> {
    try {
      const [result] = await db
        .select({
          swapRequest: swapRequests,
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
            coverImageUrl: bookListings.primaryPhotoUrl,
            condition: bookListings.condition,
            description: bookListings.description,
          },
        })
        .from(swapRequests)
        .innerJoin(users, eq(swapRequests.requesterId, users.id))
        .innerJoin(bookListings, eq(swapRequests.requestedListingId, bookListings.id))
        .where(eq(swapRequests.id, swapRequestId))
        .limit(1);

      if (!result) {
        return {
          success: false,
          message: "Swap request not found",
        };
      }

      // Verify user is involved in this swap
      if (
        result.swapRequest.requesterId !== userId &&
        result.swapRequest.ownerId !== userId
      ) {
        return {
          success: false,
          message: "You don't have permission to view this swap request",
        };
      }

      return {
        success: true,
        swapRequest: result,
      };
    } catch (error) {
      console.error("[SwapRequestService] Get swap request by ID error:", error);
      return {
        success: false,
        message: "Failed to fetch swap request",
      };
    }
  }

  /**
   * Update swap request (accept, reject, confirm, etc.)
   */
  async updateSwapRequest(
    swapRequestId: number,
    userId: string,
    data: UpdateSwapRequestInput
  ): Promise<{
    success: boolean;
    message?: string;
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

      // Check permissions based on action
      if (data.status === "accepted" || data.status === "rejected") {
        // Only owner can accept/reject
        if (swapRequest.ownerId !== userId) {
          return {
            success: false,
            message: "Only the book owner can accept or reject swap requests",
          };
        }
      }

      // Update the swap request
      await db
        .update(swapRequests)
        .set({
          ...data,
          acceptedAt: data.status === "accepted" ? new Date() : undefined,
          completedAt: data.status === "completed" ? new Date() : undefined,
          cancelledAt: data.status === "cancelled" ? new Date() : undefined,
        })
        .where(eq(swapRequests.id, swapRequestId));

      // Send appropriate notification
      if (data.status === "accepted") {
        await notificationService.createNotification({
          userId: swapRequest.requesterId,
          type: "swap_accepted",
          title: "Swap Request Accepted!",
          message: "Your swap request has been accepted. Arrange a meetup!",
          relatedSwapRequestId: swapRequestId,
          actionUrl: `/swaps/${swapRequestId}`,
        });
      } else if (data.status === "rejected") {
        await notificationService.createNotification({
          userId: swapRequest.requesterId,
          type: "swap_rejected",
          title: "Swap Request Declined",
          message: "Your swap request was not accepted. Try another book!",
          relatedSwapRequestId: swapRequestId,
        });
      } else if (data.status === "completed") {
        // Notify both parties
        await notificationService.createNotification({
          userId: swapRequest.requesterId,
          type: "swap_completed",
          title: "Swap Completed!",
          message: "Great! Your book swap is complete. Enjoy your new book!",
          relatedSwapRequestId: swapRequestId,
        });

        await notificationService.createNotification({
          userId: swapRequest.ownerId,
          type: "swap_completed",
          title: "Swap Completed!",
          message: "Great! Your book swap is complete. Enjoy your new book!",
          relatedSwapRequestId: swapRequestId,
        });
      }

      return {
        success: true,
        message: `Swap request ${data.status || "updated"} successfully`,
      };
    } catch (error) {
      console.error("[SwapRequestService] Update swap request error:", error);
      return {
        success: false,
        message: "Failed to update swap request",
      };
    }
  }

  /**
   * Cancel a swap request
   */
  async cancelSwapRequest(swapRequestId: number, userId: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
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

      // Only requester can cancel
      if (swapRequest.requesterId !== userId) {
        return {
          success: false,
          message: "Only the requester can cancel the swap request",
        };
      }

      await db
        .update(swapRequests)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
        })
        .where(eq(swapRequests.id, swapRequestId));

      return {
        success: true,
        message: "Swap request cancelled successfully",
      };
    } catch (error) {
      console.error("[SwapRequestService] Cancel swap request error:", error);
      return {
        success: false,
        message: "Failed to cancel swap request",
      };
    }
  }
}

export const swapRequestService = new SwapRequestService();
