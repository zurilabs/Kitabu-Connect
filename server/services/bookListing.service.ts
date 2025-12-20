import { db } from "../db.ts";
import { bookListings, bookPhotos, type CreateBookListingInput, type UpdateBookListingInput } from "../db/schema/index.ts";
import { eq, and, desc } from "drizzle-orm";

class BookListingService {
  async createListing(sellerId: string, data: CreateBookListingInput) {
    try {
      const { additionalPhotos, ...listingData } = data;

      // Create the book listing
      const [listing] = await db.insert(bookListings).values({
        sellerId,
        ...listingData,
      });

      const listingId = listing.insertId;

      // If there are additional photos, insert them
      if (additionalPhotos && additionalPhotos.length > 0) {
        const photoValues = additionalPhotos.map((photoUrl, index) => ({
          listingId,
          photoUrl,
          displayOrder: index + 1,
          photoType: "additional",
        }));

        await db.insert(bookPhotos).values(photoValues);
      }

      // Fetch the complete listing with photos
      const completeListing = await this.getListingById(listingId);

      return { success: true, listing: completeListing };
    } catch (error) {
      console.error("Error creating book listing:", error);
      throw new Error("Failed to create book listing");
    }
  }

  async getListingById(listingId: number) {
    try {
      const [listing] = await db
        .select()
        .from(bookListings)
        .where(eq(bookListings.id, listingId));

      if (!listing) {
        return null;
      }

      // Fetch associated photos
      const photos = await db
        .select()
        .from(bookPhotos)
        .where(eq(bookPhotos.listingId, listingId))
        .orderBy(bookPhotos.displayOrder);

      return {
        ...listing,
        photos,
      };
    } catch (error) {
      console.error("Error fetching book listing:", error);
      throw new Error("Failed to fetch book listing");
    }
  }

  async getListingsBySeller(sellerId: string) {
    try {
      const listings = await db
        .select()
        .from(bookListings)
        .where(eq(bookListings.sellerId, sellerId))
        .orderBy(desc(bookListings.createdAt));

      // Fetch photos for each listing
      const listingsWithPhotos = await Promise.all(
        listings.map(async (listing) => {
          const photos = await db
            .select()
            .from(bookPhotos)
            .where(eq(bookPhotos.listingId, listing.id))
            .orderBy(bookPhotos.displayOrder);

          return {
            ...listing,
            photos,
          };
        })
      );

      return { success: true, listings: listingsWithPhotos };
    } catch (error) {
      console.error("Error fetching seller listings:", error);
      throw new Error("Failed to fetch seller listings");
    }
  }

  async getAllListings(filters?: {
    subject?: string;
    classGrade?: string;
    condition?: string;
    minPrice?: number;
    maxPrice?: number;
  }) {
    try {
      let query = db.select().from(bookListings)
        .where(eq(bookListings.listingStatus, "active"))
        .orderBy(desc(bookListings.createdAt));

      const listings = await query;

      // Apply filters if provided
      let filteredListings = listings;

      if (filters) {
        filteredListings = listings.filter(listing => {
          if (filters.subject && listing.subject !== filters.subject) return false;
          if (filters.classGrade && listing.classGrade !== filters.classGrade) return false;
          if (filters.condition && listing.condition !== filters.condition) return false;
          if (filters.minPrice && Number(listing.price) < filters.minPrice) return false;
          if (filters.maxPrice && Number(listing.price) > filters.maxPrice) return false;
          return true;
        });
      }

      // Fetch photos for each listing
      const listingsWithPhotos = await Promise.all(
        filteredListings.map(async (listing) => {
          const photos = await db
            .select()
            .from(bookPhotos)
            .where(eq(bookPhotos.listingId, listing.id))
            .orderBy(bookPhotos.displayOrder);

          return {
            ...listing,
            photos,
          };
        })
      );

      return { success: true, listings: listingsWithPhotos };
    } catch (error) {
      console.error("Error fetching all listings:", error);
      throw new Error("Failed to fetch all listings");
    }
  }

  async updateListing(listingId: number, sellerId: string, data: UpdateBookListingInput) {
    try {
      const { additionalPhotos, ...listingData } = data;

      // Verify the listing belongs to the seller
      const [existingListing] = await db
        .select()
        .from(bookListings)
        .where(
          and(
            eq(bookListings.id, listingId),
            eq(bookListings.sellerId, sellerId)
          )
        );

      if (!existingListing) {
        return { success: false, message: "Listing not found or unauthorized" };
      }

      // Update the listing
      await db
        .update(bookListings)
        .set(listingData)
        .where(eq(bookListings.id, listingId));

      // Handle additional photos if provided
      if (additionalPhotos !== undefined) {
        // Delete existing photos
        await db.delete(bookPhotos).where(eq(bookPhotos.listingId, listingId));

        // Insert new photos
        if (additionalPhotos.length > 0) {
          const photoValues = additionalPhotos.map((photoUrl, index) => ({
            listingId,
            photoUrl,
            displayOrder: index + 1,
            photoType: "additional",
          }));

          await db.insert(bookPhotos).values(photoValues);
        }
      }

      // Fetch the updated listing
      const updatedListing = await this.getListingById(listingId);

      return { success: true, listing: updatedListing };
    } catch (error) {
      console.error("Error updating book listing:", error);
      throw new Error("Failed to update book listing");
    }
  }

  async deleteListing(listingId: number, sellerId: string) {
    try {
      // Verify the listing belongs to the seller
      const [existingListing] = await db
        .select()
        .from(bookListings)
        .where(
          and(
            eq(bookListings.id, listingId),
            eq(bookListings.sellerId, sellerId)
          )
        );

      if (!existingListing) {
        return { success: false, message: "Listing not found or unauthorized" };
      }

      // Delete the listing (cascade will handle photos)
      await db.delete(bookListings).where(eq(bookListings.id, listingId));

      return { success: true, message: "Listing deleted successfully" };
    } catch (error) {
      console.error("Error deleting book listing:", error);
      throw new Error("Failed to delete book listing");
    }
  }

  async incrementViews(listingId: number) {
    try {
      const [listing] = await db
        .select()
        .from(bookListings)
        .where(eq(bookListings.id, listingId));

      if (!listing) {
        return { success: false, message: "Listing not found" };
      }

      await db
        .update(bookListings)
        .set({ viewsCount: (listing.viewsCount || 0) + 1 })
        .where(eq(bookListings.id, listingId));

      return { success: true };
    } catch (error) {
      console.error("Error incrementing views:", error);
      throw new Error("Failed to increment views");
    }
  }
}

export const bookListingService = new BookListingService();
