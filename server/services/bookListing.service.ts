import { db } from "../db.ts";
import { bookListings, bookPhotos, users, schools, children, type CreateBookListingInput, type UpdateBookListingInput } from "../db/schema/index.ts";
import { eq, and, desc, asc, sql } from "drizzle-orm";

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

      // Get all listing IDs for batch photo query
      const listingIds = listings.map(listing => listing.id);

      // Fetch all photos in a single query (fixes N+1 problem)
      const allPhotos = listingIds.length > 0
        ? await db
            .select()
            .from(bookPhotos)
            .where(sql`${bookPhotos.listingId} IN (${sql.join(listingIds.map(id => sql`${id}`), sql`, `)})`)
            .orderBy(bookPhotos.displayOrder)
        : [];

      // Group photos by listing ID
      const photosByListingId = allPhotos.reduce((acc, photo) => {
        if (!acc[photo.listingId]) {
          acc[photo.listingId] = [];
        }
        acc[photo.listingId].push(photo);
        return acc;
      }, {} as Record<number, typeof allPhotos>);

      // Combine listings with their photos
      const listingsWithPhotos = listings.map(listing => ({
        ...listing,
        photos: photosByListingId[listing.id] || [],
      }));

      return { success: true, listings: listingsWithPhotos };
    } catch (error) {
      console.error("Error fetching seller listings:", error);
      throw new Error("Failed to fetch seller listings");
    }
  }

  async getAllListings(filters?: {
    searchTerm?: string; // Search by title, author, ISBN
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
    userSchoolId?: string; // For school-based distance calculation
    excludeUserId?: string; // Exclude listings from this user
    sortBy?: string; // Sort field: newest, price_low, price_high, popular, distance, personalized
    curriculum?: string; // Filter by curriculum (e.g., "CBC", "8-4-4")
    negotiable?: boolean; // Filter for negotiable prices only
    county?: string; // Filter by county from schools table
    district?: string; // Filter by district from schools table
    page?: number;
    limit?: number;
    userId?: string; // For personalization
    personalizedMode?: boolean; // Enable personalization
  }) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;

      // Build WHERE conditions for database-level filtering
      const conditions = [
        eq(bookListings.listingStatus, "active"),
        sql`${bookListings.quantityAvailable} > 0`
      ];

      // Search term - search across title, author, ISBN, publisher
      if (filters?.searchTerm) {
        const searchPattern = `%${filters.searchTerm.toLowerCase()}%`;
        conditions.push(
          sql`(
            LOWER(${bookListings.title}) LIKE ${searchPattern} OR
            LOWER(${bookListings.author}) LIKE ${searchPattern} OR
            LOWER(${bookListings.isbn}) LIKE ${searchPattern} OR
            LOWER(${bookListings.publisher}) LIKE ${searchPattern}
          )`
        );
      }

      if (filters?.subject) {
        conditions.push(eq(bookListings.subject, filters.subject));
      }
      if (filters?.classGrade) {
        conditions.push(eq(bookListings.classGrade, filters.classGrade));
      }
      if (filters?.condition) {
        conditions.push(eq(bookListings.condition, filters.condition));
      }
      if (filters?.listingType) {
        conditions.push(eq(bookListings.listingType, filters.listingType));
      }
      if (filters?.minPrice !== undefined) {
        conditions.push(sql`${bookListings.price} >= ${filters.minPrice}`);
      }
      if (filters?.maxPrice !== undefined) {
        conditions.push(sql`${bookListings.price} <= ${filters.maxPrice}`);
      }
      if (filters?.excludeUserId) {
        conditions.push(sql`${bookListings.sellerId} != ${filters.excludeUserId}`);
      }
      if (filters?.curriculum) {
        conditions.push(eq(bookListings.curriculum, filters.curriculum));
      }
      if (filters?.negotiable !== undefined) {
        conditions.push(eq(bookListings.negotiable, filters.negotiable));
      }

      console.log('[BookListingService] getAllListings conditions count:', conditions.length);
      console.log('[BookListingService] Filters:', JSON.stringify(filters, null, 2));

      // Get total count for pagination
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(bookListings)
        .innerJoin(users, eq(bookListings.sellerId, users.id))
        .where(and(...conditions));

      const totalCount = Number(countResult?.count || 0);
      console.log('[BookListingService] Total count:', totalCount);

      // Determine sort order
      let orderByClause;
      switch (filters?.sortBy) {
        case 'price_low':
          orderByClause = asc(bookListings.price);
          break;
        case 'price_high':
          orderByClause = desc(bookListings.price);
          break;
        case 'popular':
          orderByClause = desc(bookListings.viewsCount);
          break;
        case 'newest':
        default:
          orderByClause = desc(bookListings.createdAt);
          break;
      }

      // Conditionally join with schools table if geographic filtering or distance calculation is needed
      const needsSchoolJoin = filters?.county || filters?.district || filters?.maxDistance;

      let query = db
        .select({
          listing: bookListings,
          seller: {
            id: users.id,
            fullName: users.fullName,
            schoolId: users.schoolId,
            schoolName: users.schoolName,
            latitude: users.latitude,
            longitude: users.longitude,
          },
          ...(needsSchoolJoin && {
            school: {
              county: schools.county,
              district: schools.district,
              xCoord: schools.xCoord,
              yCoord: schools.yCoord,
            }
          })
        })
        .from(bookListings)
        .innerJoin(users, eq(bookListings.sellerId, users.id));

      // Add school join if needed for geographic filtering or distance calculation
      if (needsSchoolJoin) {
        query = query.leftJoin(schools, eq(users.schoolId, schools.id)) as any;
      }

      const listingsWithSellers = await query
        .where(and(...conditions))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Apply client-side filters only for complex conditions (school, distance, county, district)
      let filteredListings = listingsWithSellers;

      if (filters?.schoolId) {
        filteredListings = filteredListings.filter(({ seller }) => seller.schoolId === filters.schoolId);
      }

      if (filters?.county && needsSchoolJoin) {
        filteredListings = filteredListings.filter((item: any) =>
          item.school?.county === filters.county
        );
      }

      if (filters?.district && needsSchoolJoin) {
        filteredListings = filteredListings.filter((item: any) =>
          item.school?.district === filters.district
        );
      }

      // Hybrid distance filtering: School-first, then user coordinates
      if (filters?.maxDistance) {
        // Fetch user's school coordinates if userSchoolId is provided
        let userSchoolLat: number | null = null;
        let userSchoolLng: number | null = null;

        if (filters.userSchoolId) {
          const [userSchool] = await db
            .select({ xCoord: schools.xCoord, yCoord: schools.yCoord })
            .from(schools)
            .where(eq(schools.id, filters.userSchoolId))
            .limit(1);

          if (userSchool?.yCoord && userSchool?.xCoord) {
            userSchoolLat = Number(userSchool.yCoord);
            userSchoolLng = Number(userSchool.xCoord);
          }
        }

        filteredListings = filteredListings.filter((item: any) => {
          const { seller, school } = item;

          // Try school-to-school distance first (most privacy-friendly)
          if (userSchoolLat && userSchoolLng && school?.yCoord && school?.xCoord) {
            const schoolLat = Number(school.yCoord);
            const schoolLng = Number(school.xCoord);
            const distance = this.calculateDistance(
              userSchoolLat,
              userSchoolLng,
              schoolLat,
              schoolLng
            );
            return distance <= filters.maxDistance!;
          }

          // Fallback to user-to-seller coordinates if school coordinates unavailable
          if (filters.userLatitude && filters.userLongitude) {
            const sellerLat = seller.latitude ? Number(seller.latitude) : null;
            const sellerLng = seller.longitude ? Number(seller.longitude) : null;

            if (sellerLat && sellerLng) {
              const distance = this.calculateDistance(
                filters.userLatitude,
                filters.userLongitude,
                sellerLat,
                sellerLng
              );
              return distance <= filters.maxDistance;
            }
          }

          // If no coordinates available, exclude from distance filter
          return false;
        });
      }

      // Get all listing IDs for batch photo query
      const listingIds = filteredListings.map(({ listing }) => listing.id);

      // Fetch all photos in a single query (fixes N+1 problem)
      const allPhotos = listingIds.length > 0
        ? await db
            .select()
            .from(bookPhotos)
            .where(sql`${bookPhotos.listingId} IN (${sql.join(listingIds.map(id => sql`${id}`), sql`, `)})`)
            .orderBy(bookPhotos.displayOrder)
        : [];

      // Group photos by listing ID
      const photosByListingId = allPhotos.reduce((acc, photo) => {
        if (!acc[photo.listingId]) {
          acc[photo.listingId] = [];
        }
        acc[photo.listingId].push(photo);
        return acc;
      }, {} as Record<number, typeof allPhotos>);

      // Combine listings with their photos
      const listingsWithPhotos = filteredListings.map(({ listing, seller }) => ({
        ...listing,
        photos: photosByListingId[listing.id] || [],
        seller: {
          id: seller.id,
          fullName: seller.fullName,
          schoolName: seller.schoolName,
        }
      }));

      // Apply personalization scoring if enabled
      let finalListings = listingsWithPhotos;
      if (filters?.personalizedMode && filters?.userId) {
        console.log('[BookListingService] Applying personalization for user:', filters.userId);
        finalListings = await this.applyPersonalization(listingsWithPhotos, filters.userId);
      }

      return {
        success: true,
        listings: finalListings,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: page < Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.error("Error fetching all listings:", error);
      throw new Error("Failed to fetch all listings");
    }
  }

  /**
   * Apply personalization scoring to book listings for single-child parent
   * Filters to show only relevant grades (current ± 1) and sorts by relevance
   */
  private async applyPersonalization(listings: any[], userId: string): Promise<any[]> {
    try {
      // Fetch user context (children information)
      const userContext = await this.getUserContext(userId);

      if (!userContext || userContext.childrenCount === 0) {
        console.log('[Personalization] No children found for user, returning unpersonalized results');
        return listings;
      }

      console.log('[Personalization] User context:', {
        childrenCount: userContext.childrenCount,
        activeChildGrade: userContext.activeChild?.grade,
        schoolIds: userContext.schoolIds
      });

      // Filter to only relevant grades (current grade ± 1)
      const relevantListings = listings.filter(listing => {
        const listingGrade = listing.classGrade;
        const childGrade = userContext.activeChild?.grade;

        if (!childGrade || !listingGrade) {
          return false; // Exclude if grade information is missing
        }

        // Include if exact match or adjacent grade
        return childGrade === listingGrade || this.isAdjacentGrade(listingGrade, childGrade);
      });

      console.log('[Personalization] Filtered listings:', {
        original: listings.length,
        relevant: relevantListings.length,
        childGrade: userContext.activeChild?.grade
      });

      // Calculate relevance score for each relevant listing
      const scoredListings = relevantListings.map(listing => {
        const score = this.calculateRelevanceScore(listing, userContext);
        return {
          ...listing,
          _relevanceScore: score
        };
      });

      // Sort by relevance score (highest first)
      scoredListings.sort((a, b) => b._relevanceScore - a._relevanceScore);

      // Remove score from final output (internal use only)
      return scoredListings.map(({ _relevanceScore, ...listing }) => listing);
    } catch (error) {
      console.error('[Personalization] Error applying personalization:', error);
      // If personalization fails, return original listings
      return listings;
    }
  }

  /**
   * Get user context for personalization
   */
  private async getUserContext(userId: string) {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return null;
      }

      // Fetch children for this parent
      const childrenList = await db
        .select()
        .from(children)
        .where(eq(children.parentId, userId))
        .orderBy(asc(children.displayOrder));

      // Determine active child (first child if not specified)
      const activeChild = childrenList[0] || null;

      return {
        user,
        children: childrenList,
        childrenCount: childrenList.length,
        activeChild,
        grades: childrenList.map(c => c.grade),
        schoolIds: Array.from(new Set(childrenList.map(c => c.schoolId).filter(Boolean))),
      };
    } catch (error) {
      console.error('[Personalization] Error fetching user context:', error);
      return null;
    }
  }

  /**
   * Calculate relevance score for a book listing
   * Score range: 0-100
   * - Grade match: 70 points (exact) or 35 points (adjacent)
   * - School match: 15 points (same school) or 7 points (same county)
   * - Recency: 10 points (newer is better)
   * - Popularity: 5 points (more views is better)
   */
  private calculateRelevanceScore(listing: any, userContext: any): number {
    let score = 0;

    // 1. Grade matching (0-70 points) - Most important for single child
    if (userContext.activeChild) {
      const childGrade = userContext.activeChild.grade;
      const listingGrade = listing.classGrade;

      if (childGrade === listingGrade) {
        // Exact grade match - highest priority
        score += 70;
      } else if (this.isAdjacentGrade(listingGrade, childGrade)) {
        // Adjacent grade (next or previous) - planning ahead or swap-backs
        score += 35;
      }
    }

    // 2. School matching (0-15 points)
    if (userContext.schoolIds.length > 0 && listing.seller?.schoolId) {
      if (userContext.schoolIds.includes(listing.seller.schoolId)) {
        // Same school - trust and convenience
        score += 15;
      }
      // Note: County matching would require additional school data lookup
    }

    // 3. Recency (0-10 points) - Newer listings are more relevant
    if (listing.createdAt) {
      const daysOld = this.getDaysSinceCreated(listing.createdAt);
      // Linear decay: 10 points for today, 0 points after 20 days
      score += Math.max(0, 10 - (daysOld * 0.5));
    }

    // 4. Popularity (0-5 points) - Social proof
    if (listing.viewsCount) {
      // Normalize views: cap at 100 views = 5 points
      const normalizedViews = Math.min(listing.viewsCount / 100, 1);
      score += normalizedViews * 5;
    }

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Check if a grade is adjacent to the child's current grade
   * Adjacent means +1 or -1 from current grade
   */
  private isAdjacentGrade(listingGrade: string, childGrade: string): boolean {
    // Extract numeric part from grade strings (e.g., "Grade 5" -> 5, "Form 2" -> 2)
    const extractNumber = (grade: string): number | null => {
      const match = grade.match(/\d+/);
      return match ? parseInt(match[0], 10) : null;
    };

    const listingNum = extractNumber(listingGrade);
    const childNum = extractNumber(childGrade);

    if (listingNum === null || childNum === null) {
      return false;
    }

    // Check if grades are within system (Grade 1-8 or Form 1-4)
    const isGradeSystem = childGrade.toLowerCase().includes('grade');
    const isFormSystem = childGrade.toLowerCase().includes('form');

    if (listingGrade.toLowerCase().includes('grade') !== isGradeSystem &&
        listingGrade.toLowerCase().includes('form') !== isFormSystem) {
      // Different systems (Grade vs Form)
      return false;
    }

    // Adjacent if difference is exactly 1
    return Math.abs(listingNum - childNum) === 1;
  }

  /**
   * Calculate days since listing was created
   */
  private getDaysSinceCreated(createdAt: Date | string): number {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return Math.floor(diffDays);
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
      // Build WHERE conditions for database-level filtering
      const conditions = [
        eq(bookListings.listingStatus, "active"),
        eq(bookListings.listingType, "swap")
      ];

      if (filters?.subject) {
        conditions.push(eq(bookListings.subject, filters.subject));
      }
      if (filters?.classGrade) {
        conditions.push(eq(bookListings.classGrade, filters.classGrade));
      }
      if (filters?.condition) {
        conditions.push(eq(bookListings.condition, filters.condition));
      }
      if (filters?.excludeUserId) {
        conditions.push(sql`${bookListings.sellerId} != ${filters.excludeUserId}`);
      }

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
        .where(and(...conditions))
        .orderBy(desc(bookListings.createdAt));

      // Apply client-side filters for text search (title, author, school)
      let filteredListings = listingsWithSellers;

      if (filters) {
        filteredListings = listingsWithSellers.filter(({ listing, seller }) => {
          // Title search (case-insensitive, partial match)
          if (filters.title && !listing.title.toLowerCase().includes(filters.title.toLowerCase())) return false;

          // Author search (case-insensitive, partial match)
          if (filters.author && listing.author && !listing.author.toLowerCase().includes(filters.author.toLowerCase())) return false;

          // School filter - prioritize same school
          if (filters.schoolId && seller.schoolId !== filters.schoolId) return false;

          return true;
        });
      }

      // Get all listing IDs for batch photo query
      const listingIds = filteredListings.map(({ listing }) => listing.id);

      // Fetch all photos in a single query (fixes N+1 problem)
      const allPhotos = listingIds.length > 0
        ? await db
            .select()
            .from(bookPhotos)
            .where(sql`${bookPhotos.listingId} IN (${sql.join(listingIds.map(id => sql`${id}`), sql`, `)})`)
            .orderBy(bookPhotos.displayOrder)
        : [];

      // Group photos by listing ID
      const photosByListingId = allPhotos.reduce((acc, photo) => {
        if (!acc[photo.listingId]) {
          acc[photo.listingId] = [];
        }
        acc[photo.listingId].push(photo);
        return acc;
      }, {} as Record<number, typeof allPhotos>);

      // Combine listings with their photos
      const listingsWithPhotos = filteredListings.map(({ listing, seller }) => ({
        ...listing,
        photos: photosByListingId[listing.id] || [],
        seller: {
          id: seller.id,
          fullName: seller.fullName,
          schoolName: seller.schoolName,
        }
      }));

      return { success: true, listings: listingsWithPhotos };
    } catch (error) {
      console.error("Error searching swap listings:", error);
      throw new Error("Failed to search swap listings");
    }
  }
}

export const bookListingService = new BookListingService();
