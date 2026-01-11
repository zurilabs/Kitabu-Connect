/**
 * Rating Service
 *
 * Handles user ratings and reviews for transactions
 * Similar to eBay, Airbnb, Upwork - mutual rating system
 */

import { db } from "../db";
import {
  userRatings,
  ratingReminders,
  userReliabilityScores,
  users,
  orders,
  swapOrders,
  swapCycles,
} from "../db/schema";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";
import { notificationService } from "./notification.service";

/* ================================
   TYPES
================================ */

export interface CreateRatingInput {
  // Transaction reference (one required)
  orderId?: number;
  swapOrderId?: number;
  cycleId?: string;

  // Rating parties
  reviewerId: string;
  revieweeId: string;
  ratingType: "seller" | "buyer" | "swapper";

  // Ratings
  overallRating: number; // 1-5
  communicationRating?: number;
  accuracyRating?: number;
  timelinesRating?: number;
  conditionRating?: number;
  professionalismRating?: number;

  // Review
  reviewText?: string;
  tags?: string[]; // e.g., ["fast_delivery", "great_communication"]
  isAnonymous?: boolean;
}

export interface UpdateRatingInput {
  ratingId: number;
  responseText: string;
}

/* ================================
   RATING CREATION & VALIDATION
================================ */

/**
 * Create a new rating/review
 */
export async function createRating(input: CreateRatingInput) {
  try {
    // Validate that exactly one transaction reference is provided
    const transactionCount = [input.orderId, input.swapOrderId, input.cycleId].filter(Boolean).length;
    if (transactionCount !== 1) {
      return {
        success: false,
        message: "Exactly one transaction reference (orderId, swapOrderId, or cycleId) must be provided",
      };
    }

    // Validate ratings are in range
    if (input.overallRating < 1 || input.overallRating > 5) {
      return { success: false, message: "Overall rating must be between 1 and 5" };
    }

    // Check if reviewer can rate this transaction
    const canRate = await canUserRateTransaction(
      input.reviewerId,
      input.orderId,
      input.swapOrderId,
      input.cycleId
    );

    if (!canRate.success) {
      return canRate;
    }

    // Check if rating already exists
    const existingRating = await db
      .select()
      .from(userRatings)
      .where(
        and(
          eq(userRatings.reviewerId, input.reviewerId),
          eq(userRatings.revieweeId, input.revieweeId),
          input.orderId ? eq(userRatings.orderId, input.orderId) : sql`1=1`,
          input.swapOrderId ? eq(userRatings.swapOrderId, input.swapOrderId) : sql`1=1`,
          input.cycleId ? eq(userRatings.cycleId, input.cycleId) : sql`1=1`
        )
      )
      .limit(1);

    if (existingRating.length > 0) {
      return {
        success: false,
        message: "You have already rated this transaction",
      };
    }

    // Create rating
    const result = await db.insert(userRatings).values({
      orderId: input.orderId || null,
      swapOrderId: input.swapOrderId || null,
      cycleId: input.cycleId || null,
      reviewerId: input.reviewerId,
      revieweeId: input.revieweeId,
      ratingType: input.ratingType,
      overallRating: input.overallRating,
      communicationRating: input.communicationRating || null,
      accuracyRating: input.accuracyRating || null,
      timelinesRating: input.timelinesRating || null,
      conditionRating: input.conditionRating || null,
      professionalismRating: input.professionalismRating || null,
      reviewText: input.reviewText || null,
      tags: input.tags ? JSON.stringify(input.tags) : null,
      isAnonymous: input.isAnonymous || false,
      isApproved: true, // Auto-approve ratings by default
    });

    const ratingId = result[0].insertId;

    // Update reviewee's rating statistics
    await updateUserRatingStats(input.revieweeId);

    // Send notification to reviewee
    const [reviewer] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, input.reviewerId))
      .limit(1);

    await notificationService.createNotification({
      userId: input.revieweeId,
      type: "rating_received",
      title: "New Rating Received",
      message: input.isAnonymous
        ? `You received a ${input.overallRating}-star rating`
        : `${reviewer?.fullName || "Someone"} gave you a ${input.overallRating}-star rating`,
      actionUrl: `/profile/ratings`,
    });

    console.log(`[Rating] Created rating ${ratingId}: ${input.overallRating} stars for user ${input.revieweeId}`);

    return {
      success: true,
      ratingId,
      message: "Rating submitted successfully",
    };
  } catch (error) {
    console.error("[Rating] Create rating error:", error);
    return {
      success: false,
      message: "Failed to submit rating",
    };
  }
}

/**
 * Check if user can rate a transaction
 */
async function canUserRateTransaction(
  userId: string,
  orderId?: number,
  swapOrderId?: number,
  cycleId?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    if (orderId) {
      // Check purchase order
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        return { success: false, message: "Order not found" };
      }

      // User must be buyer or seller
      if (order.buyerId !== userId && order.sellerId !== userId) {
        return { success: false, message: "You are not part of this transaction" };
      }

      // Order must be completed
      if (order.status !== "completed") {
        return { success: false, message: "Order must be completed before rating" };
      }

      return { success: true };
    }

    if (swapOrderId) {
      // Check swap order
      const [swapOrder] = await db
        .select()
        .from(swapOrders)
        .where(eq(swapOrders.id, swapOrderId))
        .limit(1);

      if (!swapOrder) {
        return { success: false, message: "Swap order not found" };
      }

      // User must be requester or owner
      if (swapOrder.requesterId !== userId && swapOrder.ownerId !== userId) {
        return { success: false, message: "You are not part of this swap" };
      }

      // Swap must be completed
      if (swapOrder.status !== "completed") {
        return { success: false, message: "Swap must be completed before rating" };
      }

      return { success: true };
    }

    if (cycleId) {
      // Check if user is participant in cycle
      const [cycle] = await db
        .select()
        .from(swapCycles)
        .where(eq(swapCycles.id, cycleId))
        .limit(1);

      if (!cycle) {
        return { success: false, message: "Cycle not found" };
      }

      // Cycle must be completed
      if (cycle.status !== "completed") {
        return { success: false, message: "Cycle must be completed before rating" };
      }

      // Check if user is a participant
      const participantIds = cycle.participantIds ? JSON.parse(cycle.participantIds) : [];
      if (!participantIds.includes(userId)) {
        return { success: false, message: "You are not part of this cycle" };
      }

      return { success: true };
    }

    return { success: false, message: "Invalid transaction reference" };
  } catch (error) {
    console.error("[Rating] Can user rate check error:", error);
    return { success: false, message: "Failed to verify transaction" };
  }
}

/**
 * Update user's aggregated rating statistics
 */
async function updateUserRatingStats(userId: string) {
  try {
    // Calculate average ratings
    const stats = await db
      .select({
        avgOverall: sql<number>`AVG(${userRatings.overallRating})`,
        avgCommunication: sql<number>`AVG(${userRatings.communicationRating})`,
        avgAccuracy: sql<number>`AVG(${userRatings.accuracyRating})`,
        avgTimeliness: sql<number>`AVG(${userRatings.timelinesRating})`,
        avgCondition: sql<number>`AVG(${userRatings.conditionRating})`,
        avgProfessionalism: sql<number>`AVG(${userRatings.professionalismRating})`,
        totalRatings: sql<number>`COUNT(*)`,
      })
      .from(userRatings)
      .where(
        and(
          eq(userRatings.revieweeId, userId),
          eq(userRatings.isApproved, true)
        )
      );

    const avgRating = stats[0]?.avgOverall || 0;
    const totalRatings = stats[0]?.totalRatings || 0;

    // Convert average rating (1-5) to reliability score (0-100)
    // 5 stars = 100, 4 stars = 80, 3 stars = 60, 2 stars = 40, 1 star = 20
    const reliabilityScore = ((avgRating / 5) * 100).toFixed(2);

    // Update or create reliability score
    const [existing] = await db
      .select()
      .from(userReliabilityScores)
      .where(eq(userReliabilityScores.userId, userId))
      .limit(1);

    if (existing) {
      await db
        .update(userReliabilityScores)
        .set({
          reliabilityScore,
        })
        .where(eq(userReliabilityScores.userId, userId));
    } else {
      await db.insert(userReliabilityScores).values({
        userId,
        reliabilityScore,
      });
    }

    console.log(`[Rating] Updated rating stats for user ${userId}: ${avgRating.toFixed(1)}/5 (${totalRatings} ratings)`);
  } catch (error) {
    console.error("[Rating] Update rating stats error:", error);
  }
}

/* ================================
   RATING RETRIEVAL
================================ */

/**
 * Get ratings for a user (received ratings)
 */
export async function getUserRatings(userId: string, options?: {
  limit?: number;
  offset?: number;
  ratingType?: "seller" | "buyer" | "swapper";
}) {
  try {
    const conditions = [
      eq(userRatings.revieweeId, userId),
      eq(userRatings.isApproved, true),
    ];

    if (options?.ratingType) {
      conditions.push(eq(userRatings.ratingType, options.ratingType));
    }

    const ratingsData = await db
      .select({
        rating: userRatings,
        reviewer: {
          id: users.id,
          fullName: users.fullName,
          profilePictureUrl: users.profilePictureUrl,
        },
      })
      .from(userRatings)
      .innerJoin(users, eq(userRatings.reviewerId, users.id))
      .where(and(...conditions))
      .orderBy(desc(userRatings.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    // Parse tags from JSON
    const ratings = ratingsData.map(({ rating, reviewer }) => ({
      ...rating,
      tags: rating.tags ? JSON.parse(rating.tags) : [],
      reviewer: rating.isAnonymous ? null : reviewer,
    }));

    return {
      success: true,
      ratings,
    };
  } catch (error) {
    console.error("[Rating] Get user ratings error:", error);
    return {
      success: false,
      message: "Failed to fetch ratings",
    };
  }
}

/**
 * Get rating statistics for a user
 */
export async function getUserRatingStats(userId: string) {
  try {
    const stats = await db
      .select({
        avgOverall: sql<number>`AVG(${userRatings.overallRating})`,
        avgCommunication: sql<number>`AVG(${userRatings.communicationRating})`,
        avgAccuracy: sql<number>`AVG(${userRatings.accuracyRating})`,
        avgTimeliness: sql<number>`AVG(${userRatings.timelinesRating})`,
        avgCondition: sql<number>`AVG(${userRatings.conditionRating})`,
        avgProfessionalism: sql<number>`AVG(${userRatings.professionalismRating})`,
        total: sql<number>`COUNT(*)`,
        fiveStars: sql<number>`SUM(CASE WHEN ${userRatings.overallRating} = 5 THEN 1 ELSE 0 END)`,
        fourStars: sql<number>`SUM(CASE WHEN ${userRatings.overallRating} = 4 THEN 1 ELSE 0 END)`,
        threeStars: sql<number>`SUM(CASE WHEN ${userRatings.overallRating} = 3 THEN 1 ELSE 0 END)`,
        twoStars: sql<number>`SUM(CASE WHEN ${userRatings.overallRating} = 2 THEN 1 ELSE 0 END)`,
        oneStar: sql<number>`SUM(CASE WHEN ${userRatings.overallRating} = 1 THEN 1 ELSE 0 END)`,
      })
      .from(userRatings)
      .where(
        and(
          eq(userRatings.revieweeId, userId),
          eq(userRatings.isApproved, true)
        )
      );

    const result = stats[0] || {
      avgOverall: 0,
      avgCommunication: 0,
      avgAccuracy: 0,
      avgTimeliness: 0,
      avgCondition: 0,
      avgProfessionalism: 0,
      total: 0,
      fiveStars: 0,
      fourStars: 0,
      threeStars: 0,
      twoStars: 0,
      oneStar: 0,
    };

    // Count by rating type
    const typeStats = await db
      .select({
        ratingType: userRatings.ratingType,
        count: sql<number>`COUNT(*)`,
        avg: sql<number>`AVG(${userRatings.overallRating})`,
      })
      .from(userRatings)
      .where(
        and(
          eq(userRatings.revieweeId, userId),
          eq(userRatings.isApproved, true)
        )
      )
      .groupBy(userRatings.ratingType);

    return {
      success: true,
      stats: {
        // Flat structure for easy access
        averageRating: result.avgOverall ? parseFloat(Number(result.avgOverall).toFixed(2)) : 0,
        totalRatings: result.total || 0,
        ratingDistribution: {
          5: result.fiveStars || 0,
          4: result.fourStars || 0,
          3: result.threeStars || 0,
          2: result.twoStars || 0,
          1: result.oneStar || 0,
        },
        categoryAverages: {
          communication: result.avgCommunication ? parseFloat(Number(result.avgCommunication).toFixed(2)) : 0,
          accuracy: result.avgAccuracy ? parseFloat(Number(result.avgAccuracy).toFixed(2)) : 0,
          timeliness: result.avgTimeliness ? parseFloat(Number(result.avgTimeliness).toFixed(2)) : 0,
          condition: result.avgCondition ? parseFloat(Number(result.avgCondition).toFixed(2)) : 0,
          professionalism: result.avgProfessionalism ? parseFloat(Number(result.avgProfessionalism).toFixed(2)) : 0,
        },
        byType: typeStats.reduce((acc, item) => {
          acc[item.ratingType] = {
            count: item.count || 0,
            average: item.avg ? parseFloat(Number(item.avg).toFixed(2)) : 0,
          };
          return acc;
        }, {} as Record<string, { count: number; average: number }>),
      },
    };
  } catch (error) {
    console.error("[Rating] Get rating stats error:", error);
    return {
      success: false,
      message: "Failed to fetch rating statistics",
    };
  }
}

/**
 * Add response to a rating (reviewee responds to review)
 */
export async function respondToRating(input: UpdateRatingInput) {
  try {
    const [rating] = await db
      .select()
      .from(userRatings)
      .where(eq(userRatings.id, input.ratingId))
      .limit(1);

    if (!rating) {
      return { success: false, message: "Rating not found" };
    }

    if (rating.responseText) {
      return { success: false, message: "You have already responded to this rating" };
    }

    await db
      .update(userRatings)
      .set({
        responseText: input.responseText,
        respondedAt: new Date(),
      })
      .where(eq(userRatings.id, input.ratingId));

    // Notify the reviewer
    await notificationService.createNotification({
      userId: rating.reviewerId,
      type: "rating_response",
      title: "Response to Your Review",
      message: "The user you reviewed has responded to your rating",
      actionUrl: `/profile/ratings`,
    });

    return {
      success: true,
      message: "Response added successfully",
    };
  } catch (error) {
    console.error("[Rating] Respond to rating error:", error);
    return {
      success: false,
      message: "Failed to add response",
    };
  }
}

/**
 * Check if user needs to rate a transaction
 */
export async function getPendingRatings(userId: string) {
  try {
    // Get completed orders where user hasn't rated
    const completedOrders = await db
      .select({
        order: orders,
      })
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

    // Filter out orders already rated
    const pending = [];
    for (const { order } of completedOrders) {
      const otherUserId = order.buyerId === userId ? order.sellerId : order.buyerId;

      const [existingRating] = await db
        .select()
        .from(userRatings)
        .where(
          and(
            eq(userRatings.orderId, order.id),
            eq(userRatings.reviewerId, userId),
            eq(userRatings.revieweeId, otherUserId)
          )
        )
        .limit(1);

      if (!existingRating) {
        pending.push({
          type: "order",
          orderId: order.id,
          otherUserId,
          ratingType: order.buyerId === userId ? "seller" : "buyer",
          completedAt: order.completedAt,
        });
      }
    }

    return {
      success: true,
      pending,
    };
  } catch (error) {
    console.error("[Rating] Get pending ratings error:", error);
    return {
      success: false,
      message: "Failed to fetch pending ratings",
    };
  }
}

/**
 * Check if a user has already rated someone for a specific transaction
 */
export async function checkIfRated(input: {
  reviewerId: string;
  revieweeId: string;
  orderId?: number;
  swapOrderId?: number;
}) {
  try {
    const conditions = [
      eq(userRatings.reviewerId, input.reviewerId),
      eq(userRatings.revieweeId, input.revieweeId),
    ];

    if (input.orderId) {
      conditions.push(eq(userRatings.orderId, input.orderId));
    }

    if (input.swapOrderId) {
      conditions.push(eq(userRatings.swapOrderId, input.swapOrderId));
    }

    const existingRating = await db
      .select()
      .from(userRatings)
      .where(and(...conditions))
      .limit(1);

    return {
      success: true,
      hasRated: existingRating.length > 0,
    };
  } catch (error) {
    console.error("[RatingService] Check if rated error:", error);
    return {
      success: false,
      message: "Failed to check rating status",
    };
  }
}

export const ratingService = {
  createRating,
  getUserRatings,
  getUserRatingStats,
  respondToRating,
  getPendingRatings,
  checkIfRated,
};
