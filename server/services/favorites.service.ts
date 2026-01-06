import { db } from "../db";
import { favorites, bookListings, users } from "../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export class FavoritesService {
  /**
   * Add a book to user's favorites
   */
  async addFavorite(userId: string, listingId: number): Promise<{
    success: boolean;
    message?: string;
    favoriteId?: number;
  }> {
    try {
      // Check if already favorited
      const existing = await db
        .select()
        .from(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId)))
        .limit(1);

      if (existing.length > 0) {
        return {
          success: false,
          message: "Book already in favorites",
        };
      }

      // Check if listing exists
      const listing = await db
        .select()
        .from(bookListings)
        .where(eq(bookListings.id, listingId))
        .limit(1);

      if (!listing.length) {
        return {
          success: false,
          message: "Book listing not found",
        };
      }

      // Add to favorites and update count in transaction
      const result = await db.transaction(async (tx) => {
        const insertResult = await tx.insert(favorites).values({
          userId,
          listingId,
        });

        // Increment favoritesCount
        await tx
          .update(bookListings)
          .set({ favoritesCount: sql`${bookListings.favoritesCount} + 1` })
          .where(eq(bookListings.id, listingId));

        return insertResult[0].insertId;
      });

      console.log(`[FavoritesService] User ${userId} favorited listing ${listingId}`);

      return {
        success: true,
        favoriteId: result,
        message: "Book added to favorites",
      };
    } catch (error) {
      console.error("[FavoritesService] Add favorite error:", error);
      return {
        success: false,
        message: "Failed to add to favorites",
      };
    }
  }

  /**
   * Remove a book from user's favorites
   */
  async removeFavorite(userId: string, listingId: number): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      // Remove favorite and update count in transaction
      const affectedRows = await db.transaction(async (tx) => {
        const result = await tx
          .delete(favorites)
          .where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId)));

        if (result[0].affectedRows === 0) {
          return 0;
        }

        // Decrement favoritesCount
        await tx
          .update(bookListings)
          .set({ favoritesCount: sql`GREATEST(0, ${bookListings.favoritesCount} - 1)` })
          .where(eq(bookListings.id, listingId));

        return result[0].affectedRows;
      });

      if (affectedRows === 0) {
        return {
          success: false,
          message: "Favorite not found",
        };
      }

      console.log(`[FavoritesService] User ${userId} removed listing ${listingId} from favorites`);

      return {
        success: true,
        message: "Book removed from favorites",
      };
    } catch (error) {
      console.error("[FavoritesService] Remove favorite error:", error);
      return {
        success: false,
        message: "Failed to remove from favorites",
      };
    }
  }

  /**
   * Toggle favorite status for a book
   * Uses atomic operation to prevent race conditions
   */
  async toggleFavorite(userId: string, listingId: number): Promise<{
    success: boolean;
    isFavorited: boolean;
    message?: string;
  }> {
    try {
      // Use a transaction to ensure atomicity
      const result = await db.transaction(async (tx) => {
        // Check if already favorited
        const existing = await tx
          .select()
          .from(favorites)
          .where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId)))
          .limit(1);

        if (existing.length > 0) {
          // Remove from favorites
          await tx
            .delete(favorites)
            .where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId)));

          // Decrement favoritesCount on the book listing
          await tx
            .update(bookListings)
            .set({ favoritesCount: sql`GREATEST(0, ${bookListings.favoritesCount} - 1)` })
            .where(eq(bookListings.id, listingId));

          return { isFavorited: false, message: "Removed from favorites" };
        } else {
          // Add to favorites
          await tx.insert(favorites).values({
            userId,
            listingId,
          });

          // Increment favoritesCount on the book listing
          await tx
            .update(bookListings)
            .set({ favoritesCount: sql`${bookListings.favoritesCount} + 1` })
            .where(eq(bookListings.id, listingId));

          return { isFavorited: true, message: "Added to favorites" };
        }
      });

      console.log(`[FavoritesService] User ${userId} toggled favorite for listing ${listingId}, now ${result.isFavorited ? 'favorited' : 'unfavorited'}`);

      return {
        success: true,
        isFavorited: result.isFavorited,
        message: result.message,
      };
    } catch (error) {
      console.error("[FavoritesService] Toggle favorite error:", error);
      return {
        success: false,
        isFavorited: false,
        message: "Failed to update favorites",
      };
    }
  }

  /**
   * Get all favorites for a user with book details
   */
  async getUserFavorites(userId: string, limit: number = 50, offset: number = 0) {
    try {
      const userFavorites = await db
        .select({
          favoriteId: favorites.id,
          addedAt: favorites.addedAt,
          listing: {
            id: bookListings.id,
            title: bookListings.title,
            author: bookListings.author,
            isbn: bookListings.isbn,
            price: bookListings.price,
            originalRetailPrice: bookListings.originalRetailPrice,
            condition: bookListings.condition,
            description: bookListings.description,
            classGrade: bookListings.classGrade,
            subject: bookListings.subject,
            coverImageUrl: bookListings.primaryPhotoUrl,
            status: bookListings.listingStatus,
            sellerId: bookListings.sellerId,
            createdAt: bookListings.createdAt,
          },
          seller: {
            id: users.id,
            fullName: users.fullName,
            profilePictureUrl: users.profilePictureUrl,
          },
        })
        .from(favorites)
        .innerJoin(bookListings, eq(favorites.listingId, bookListings.id))
        .innerJoin(users, eq(bookListings.sellerId, users.id))
        .where(eq(favorites.userId, userId))
        .orderBy(desc(favorites.addedAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(favorites)
        .where(eq(favorites.userId, userId));

      const total = Number(countResult[0].count);

      return {
        success: true,
        favorites: userFavorites,
        total,
        hasMore: offset + userFavorites.length < total,
      };
    } catch (error) {
      console.error("[FavoritesService] Get user favorites error:", error);
      return {
        success: false,
        message: "Failed to get favorites",
        favorites: [],
        total: 0,
        hasMore: false,
      };
    }
  }

  /**
   * Check if a book is favorited by a user
   */
  async isFavorited(userId: string, listingId: number): Promise<boolean> {
    try {
      const result = await db
        .select({ id: favorites.id })
        .from(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId)))
        .limit(1);

      return result.length > 0;
    } catch (error) {
      console.error("[FavoritesService] Check favorited error:", error);
      return false;
    }
  }

  /**
   * Get favorite IDs for a user (useful for checking multiple books at once)
   */
  async getUserFavoriteIds(userId: string): Promise<number[]> {
    try {
      const result = await db
        .select({ listingId: favorites.listingId })
        .from(favorites)
        .where(eq(favorites.userId, userId));

      return result.map((f) => f.listingId);
    } catch (error) {
      console.error("[FavoritesService] Get favorite IDs error:", error);
      return [];
    }
  }

  /**
   * Get favorites count for a user
   */
  async getFavoritesCount(userId: string): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(favorites)
        .where(eq(favorites.userId, userId));

      return Number(result[0].count);
    } catch (error) {
      console.error("[FavoritesService] Get favorites count error:", error);
      return 0;
    }
  }
}

export const favoritesService = new FavoritesService();
