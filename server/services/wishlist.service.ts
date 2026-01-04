import { db } from "../db.ts";
import {
  wishlistItems,
  children,
  users,
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

      // Fetch the complete wishlist item
      const wishlistItem = await this.getWishlistItemById(wishlistItemId, parentId);

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
}

export const wishlistService = new WishlistService();

