import { db } from "../db.ts";
import { bookListings, bookPhotos, users, type CreateBookListingInput, type UpdateBookListingInput } from "../db/schema/index.ts";
import { eq, and, desc, sql } from "drizzle-orm";

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
    listingType?: string;
    schoolId?: string;
    maxDistance?: number;
    userLatitude?: number;
    userLongitude?: number;
  }) {
    try {
      // Join with users table to get seller info for school/location filtering
      const listingsWithSellers = await db
        .select({
          listing: bookListings,
          seller: {
            id: users.id,
            fullName: users.fullName,
            schoolId: users.schoolId,
            schoolName: users.schoolName,
            latitude: users.latitude,
            longitude: users.longitude,
          }
        })
        .from(bookListings)
        .innerJoin(users, eq(bookListings.sellerId, users.id))
        .where(eq(bookListings.listingStatus, "active"))
        .orderBy(desc(bookListings.createdAt));

      // Apply filters
      let filteredListings = listingsWithSellers;

      if (filters) {
        filteredListings = listingsWithSellers.filter(({ listing, seller }) => {
          if (filters.subject && listing.subject !== filters.subject) return false;
          if (filters.classGrade && listing.classGrade !== filters.classGrade) return false;
          if (filters.condition && listing.condition !== filters.condition) return false;
          if (filters.minPrice && Number(listing.price) < filters.minPrice) return false;
          if (filters.maxPrice && Number(listing.price) > filters.maxPrice) return false;
          if (filters.listingType && listing.listingType !== filters.listingType) return false;

          // School filter - show only listings from same school
          if (filters.schoolId && seller.schoolId !== filters.schoolId) return false;

          // Location/distance filter - calculate distance if both have coordinates
          if (filters.maxDistance && filters.userLatitude && filters.userLongitude) {
            const sellerLat = seller.latitude ? Number(seller.latitude) : null;
            const sellerLng = seller.longitude ? Number(seller.longitude) : null;

            if (sellerLat && sellerLng) {
              const distance = this.calculateDistance(
                filters.userLatitude,
                filters.userLongitude,
                sellerLat,
                sellerLng
              );

              if (distance > filters.maxDistance) return false;
            }
          }

          return true;
        });
      }

      // Fetch photos for each listing
      const listingsWithPhotos = await Promise.all(
        filteredListings.map(async ({ listing, seller }) => {
          const photos = await db
            .select()
            .from(bookPhotos)
            .where(eq(bookPhotos.listingId, listing.id))
            .orderBy(bookPhotos.displayOrder);

          return {
            ...listing,
            photos,
            seller: {
              id: seller.id,
              fullName: seller.fullName,
              schoolName: seller.schoolName,
            }
          };
        })
      );

      return { success: true, listings: listingsWithPhotos };
    } catch (error) {
      console.error("Error fetching all listings:", error);
      throw new Error("Failed to fetch all listings");
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in kilometers
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
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

  /**
   * Search for swap listings based on book criteria
   * This allows users to find existing swap listings that match what they want to offer
   */
  async searchSwapListings(filters?: {
    title?: string;
    author?: string;
    subject?: string;
    classGrade?: string;
    condition?: string;
    schoolId?: string;
    excludeUserId?: string; // Exclude current user's listings
  }) {
    try {
      // Join with users table to get seller info
      const listingsWithSellers = await db
        .select({
          listing: bookListings,
          seller: {
            id: users.id,
            fullName: users.fullName,
            schoolId: users.schoolId,
            schoolName: users.schoolName,
          }
        })
        .from(bookListings)
        .innerJoin(users, eq(bookListings.sellerId, users.id))
        .where(
          and(
            eq(bookListings.listingStatus, "active"),
            eq(bookListings.listingType, "swap")
          )
        )
        .orderBy(desc(bookListings.createdAt));

      // Apply filters
      let filteredListings = listingsWithSellers;

      if (filters) {
        filteredListings = listingsWithSellers.filter(({ listing, seller }) => {
          // Exclude current user's listings
          if (filters.excludeUserId && seller.id === filters.excludeUserId) return false;

          // Title search (case-insensitive, partial match)
          if (filters.title && !listing.title.toLowerCase().includes(filters.title.toLowerCase())) return false;

          // Author search (case-insensitive, partial match)
          if (filters.author && listing.author && !listing.author.toLowerCase().includes(filters.author.toLowerCase())) return false;

          // Exact matches for these fields
          if (filters.subject && listing.subject !== filters.subject) return false;
          if (filters.classGrade && listing.classGrade !== filters.classGrade) return false;
          if (filters.condition && listing.condition !== filters.condition) return false;

          // School filter - prioritize same school
          if (filters.schoolId && seller.schoolId !== filters.schoolId) return false;

          return true;
        });
      }

      // Fetch photos for each listing
      const listingsWithPhotos = await Promise.all(
        filteredListings.map(async ({ listing, seller }) => {
          const photos = await db
            .select()
            .from(bookPhotos)
            .where(eq(bookPhotos.listingId, listing.id))
            .orderBy(bookPhotos.displayOrder);

          return {
            ...listing,
            photos,
            seller: {
              id: seller.id,
              fullName: seller.fullName,
              schoolName: seller.schoolName,
            }
          };
        })
      );

      return { success: true, listings: listingsWithPhotos };
    } catch (error) {
      console.error("Error searching swap listings:", error);
      throw new Error("Failed to search swap listings");
    }
  }
}

export const bookListingService = new BookListingService();
