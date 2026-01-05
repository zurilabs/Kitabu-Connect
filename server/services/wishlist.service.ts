import { db } from "../db.ts";
import {
  wishlistItems,
  children,
  users,
  bookListings,
  type CreateWishlistItemInput,
  type UpdateWishlistItemInput,
} from "../db/schema/index.ts";
import { eq, and, desc, sql } from "drizzle-orm";

export class WishlistService {
  /**
   * Create a wishlist item for a child
   */
  async createWishlistItem(
    parentId: string,
    data: CreateWishlistItemInput
  ): Promise<{
    success: boolean;
    wishlistItem?: any;
    message?: string;
  }> {
    try {
      // Verify the child belongs to the parent
      const [child] = await db
        .select()
        .from(children)
        .where(
          and(
            eq(children.id, data.childId),
            eq(children.parentId, parentId)
          )
        )
        .limit(1);

      if (!child) {
        return {
          success: false,
          message: "Child not found or unauthorized",
        };
      }

      // Use child's grade if grade not specified in wishlist item
      const grade = data.grade || child.grade;

      // Create the wishlist item
      const [result] = await db.insert(wishlistItems).values({
        childId: data.childId,
        title: data.title,
        publisher: data.publisher || null,
        author: data.author || null,
        isbn: data.isbn || null,
        edition: data.edition || null,
        subject: data.subject || null,
        grade: grade,
        curriculum: data.curriculum || null,
        notes: data.notes || null,
        status: "active",
      });

      const wishlistItemId = result.insertId;

      // Fetch the complete wishlist item with parent info
      const wishlistItem = await this.getWishlistItemWithParent(wishlistItemId, parentId);

      // IMPORTANT: Check existing book listings for matches (reverse matching)
      // This runs asynchronously so it doesn't block the response
      this.checkExistingListingsForMatch(wishlistItem, parentId).catch((error) => {
        console.error("[WishlistService] Error checking existing listings:", error);
      });

      return {
        success: true,
        wishlistItem,
      };
    } catch (error) {
      console.error("Error creating wishlist item:", error);
      return {
        success: false,
        message: "Failed to create wishlist item",
      };
    }
  }

  /**
   * Get wishlist item with parent information (for matching)
   */
  private async getWishlistItemWithParent(
    wishlistItemId: number,
    parentId: string
  ): Promise<any | null> {
    try {
      const [item] = await db
        .select({
          wishlistItem: wishlistItems,
          child: children,
          parent: users,
        })
        .from(wishlistItems)
        .innerJoin(children, eq(wishlistItems.childId, children.id))
        .innerJoin(users, eq(children.parentId, users.id))
        .where(
          and(
            eq(wishlistItems.id, wishlistItemId),
            eq(children.parentId, parentId)
          )
        )
        .limit(1);

      if (!item) {
        return null;
      }

      return {
        ...item.wishlistItem,
        child: {
          id: item.child.id,
          parentId: item.child.parentId,
          name: item.child.name,
          grade: item.child.grade,
        },
        parent: {
          id: item.parent.id,
          fullName: item.parent.fullName,
          email: item.parent.email,
        },
      };
    } catch (error) {
      console.error("Error fetching wishlist item with parent:", error);
      return null;
    }
  }

  /**
   * Check existing book listings for matches when a new wishlist item is created
   * This is "reverse matching" - checking listings against a new wishlist item
   */
  private async checkExistingListingsForMatch(wishlistItem: any, parentId: string): Promise<void> {
    try {
      // Dynamic import to avoid circular dependency
      const { bookListingService } = await import("./bookListing.service.ts");

      console.log(`[WishlistService] 🔍 Checking existing listings for new wishlist item: "${wishlistItem.title}"`);

      // Get all active book listings (excluding the parent's own listings)
      const activeListings = await db
        .select()
        .from(bookListings)
        .where(
          and(
            eq(bookListings.listingStatus, "active"),
            sql`${bookListings.quantityAvailable} > 0`,
            sql`${bookListings.sellerId} != ${parentId}`
          )
        )
        .orderBy(desc(bookListings.createdAt))
        .limit(200); // Check up to 200 most recent listings

      console.log(`[WishlistService] Found ${activeListings.length} active listings to check against wishlist item`);

      let matchCount = 0;

      // Check each listing against the wishlist item
      for (const listing of activeListings) {
        // Use the same matching algorithm from bookListingService
        const matchResult = (bookListingService as any).calculateWishlistMatchScore(listing, wishlistItem);

        if (matchResult.score >= 60) {
          console.log(`[WishlistService] ✅ Match found! Listing: "${listing.title}" (ID: ${listing.id}), Score: ${matchResult.score}`);

          matchCount++;

          // Determine match quality
          let matchQuality: string;
          if (matchResult.score >= 100) {
            matchQuality = "excellent";
          } else if (matchResult.score >= 80) {
            matchQuality = "good";
          } else {
            matchQuality = "fair";
          }

          // Send notification using the bookListingService method
          await (bookListingService as any).sendWishlistMatchNotification(
            {
              wishlistItem,
              score: matchResult.score,
              matchQuality,
              matchReasons: matchResult.matchReasons,
            },
            listing
          );
        }
      }

      console.log(`[WishlistService] ✨ Completed reverse matching for wishlist item ${wishlistItem.id}. Found ${matchCount} matches.`);
    } catch (error) {
      console.error("[WishlistService] Error in checkExistingListingsForMatch:", error);
    }
  }

  /**
   * Get wishlist item by ID
   */
  async getWishlistItemById(
    wishlistItemId: number,
    parentId: string
  ): Promise<any | null> {
    try {
      const [item] = await db
        .select({
          wishlistItem: wishlistItems,
          child: children,
        })
        .from(wishlistItems)
        .innerJoin(children, eq(wishlistItems.childId, children.id))
        .where(
          and(
            eq(wishlistItems.id, wishlistItemId),
            eq(children.parentId, parentId)
          )
        )
        .limit(1);

      if (!item) {
        return null;
      }

      return {
        ...item.wishlistItem,
        child: {
          id: item.child.id,
          name: item.child.name,
          grade: item.child.grade,
        },
      };
    } catch (error) {
      console.error("Error fetching wishlist item:", error);
      return null;
    }
  }

  /**
   * Get all wishlist items for a child
   */
  async getWishlistByChildId(
    childId: number,
    parentId: string
  ): Promise<{
    success: boolean;
    wishlistItems?: any[];
    message?: string;
  }> {
    try {
      // Verify the child belongs to the parent
      const [child] = await db
        .select()
        .from(children)
        .where(
          and(
            eq(children.id, childId),
            eq(children.parentId, parentId)
          )
        )
        .limit(1);

      if (!child) {
        return {
          success: false,
          message: "Child not found or unauthorized",
        };
      }

      // Fetch all wishlist items for this child
      const items = await db
        .select({
          wishlistItem: wishlistItems,
          child: {
            id: children.id,
            name: children.name,
            grade: children.grade,
          },
        })
        .from(wishlistItems)
        .innerJoin(children, eq(wishlistItems.childId, children.id))
        .where(eq(wishlistItems.childId, childId))
        .orderBy(desc(wishlistItems.createdAt));

      return {
        success: true,
        wishlistItems: items.map((item) => ({
          ...item.wishlistItem,
          child: item.child,
        })),
      };
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      return {
        success: false,
        message: "Failed to fetch wishlist",
      };
    }
  }

  /**
   * Get all wishlist items for a parent (across all children)
   */
  async getWishlistByParentId(
    parentId: string,
    status?: string
  ): Promise<{
    success: boolean;
    wishlistItems?: any[];
    message?: string;
  }> {
    try {
      // Build conditions
      const conditions = [eq(children.parentId, parentId)];

      // Add status filter if provided
      if (status) {
        conditions.push(eq(wishlistItems.status, status));
      }

      // Fetch all wishlist items for all children of this parent
      const items = await db
        .select({
          wishlistItem: wishlistItems,
          child: {
            id: children.id,
            name: children.name,
            grade: children.grade,
          },
        })
        .from(wishlistItems)
        .innerJoin(children, eq(wishlistItems.childId, children.id))
        .where(and(...conditions))
        .orderBy(desc(wishlistItems.createdAt));

      return {
        success: true,
        wishlistItems: items.map((item) => ({
          ...item.wishlistItem,
          child: item.child,
        })),
      };
    } catch (error) {
      console.error("Error fetching parent wishlist:", error);
      return {
        success: false,
        message: "Failed to fetch wishlist",
      };
    }
  }

  /**
   * Update a wishlist item
   */
  async updateWishlistItem(
    wishlistItemId: number,
    parentId: string,
    data: UpdateWishlistItemInput
  ): Promise<{
    success: boolean;
    wishlistItem?: any;
    message?: string;
  }> {
    try {
      // Verify the wishlist item belongs to the parent
      const existingItem = await this.getWishlistItemById(wishlistItemId, parentId);

      if (!existingItem) {
        return {
          success: false,
          message: "Wishlist item not found or unauthorized",
        };
      }

      // Update the wishlist item
      await db
        .update(wishlistItems)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(wishlistItems.id, wishlistItemId));

      // Fetch the updated wishlist item
      const updatedItem = await this.getWishlistItemById(wishlistItemId, parentId);

      return {
        success: true,
        wishlistItem: updatedItem,
      };
    } catch (error) {
      console.error("Error updating wishlist item:", error);
      return {
        success: false,
        message: "Failed to update wishlist item",
      };
    }
  }

  /**
   * Delete a wishlist item
   */
  async deleteWishlistItem(
    wishlistItemId: number,
    parentId: string
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      // Verify the wishlist item belongs to the parent
      const existingItem = await this.getWishlistItemById(wishlistItemId, parentId);

      if (!existingItem) {
        return {
          success: false,
          message: "Wishlist item not found or unauthorized",
        };
      }

      // Delete the wishlist item
      await db.delete(wishlistItems).where(eq(wishlistItems.id, wishlistItemId));

      return {
        success: true,
        message: "Wishlist item deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting wishlist item:", error);
      return {
        success: false,
        message: "Failed to delete wishlist item",
      };
    }
  }

  /**
   * Mark wishlist item as fulfilled when a match is found
   */
  async markAsFulfilled(
    wishlistItemId: number,
    listingId: number
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      await db
        .update(wishlistItems)
        .set({
          status: "fulfilled",
          matchedListingId: listingId,
          notifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(wishlistItems.id, wishlistItemId));

      return {
        success: true,
      };
    } catch (error) {
      console.error("Error marking wishlist as fulfilled:", error);
      return {
        success: false,
        message: "Failed to mark wishlist as fulfilled",
      };
    }
  }

  /**
   * Get all active wishlist items for matching
   * Used by the matching service to check against new book listings
   */
  async getActiveWishlistItems(): Promise<any[]> {
    try {
      const items = await db
        .select({
          wishlistItem: wishlistItems,
          child: {
            id: children.id,
            parentId: children.parentId,
            name: children.name,
            grade: children.grade,
          },
          parent: {
            id: users.id,
            fullName: users.fullName,
            email: users.email,
          },
        })
        .from(wishlistItems)
        .innerJoin(children, eq(wishlistItems.childId, children.id))
        .innerJoin(users, eq(children.parentId, users.id))
        .where(eq(wishlistItems.status, "active"))
        .orderBy(desc(wishlistItems.createdAt));

      return items.map((item) => ({
        ...item.wishlistItem,
        child: item.child,
        parent: item.parent,
      }));
    } catch (error) {
      console.error("Error fetching active wishlist items:", error);
      return [];
    }
  }

  /**
   * Update wishlist notification timestamp
   * Called when a match notification is sent to track the latest notification
   * Note: Does NOT mark as fulfilled - allows multiple matches for same wishlist item
   */
  async updateWishlistNotificationTime(
    wishlistItemId: number,
    listingId: number
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      await db
        .update(wishlistItems)
        .set({
          notifiedAt: new Date(),
          matchedListingId: listingId, // Track the most recent match
          updatedAt: new Date(),
        })
        .where(eq(wishlistItems.id, wishlistItemId));

      console.log(`[WishlistService] Updated notification time for wishlist item ${wishlistItemId} with listing ${listingId}`);

      return {
        success: true,
      };
    } catch (error) {
      console.error("Error updating wishlist notification time:", error);
      return {
        success: false,
        message: "Failed to update notification time",
      };
    }
  }
}

export const wishlistService = new WishlistService();

