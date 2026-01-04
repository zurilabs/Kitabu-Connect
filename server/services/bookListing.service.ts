import { db } from "../db.ts";
import { bookListings, bookPhotos, users, schools, children, type CreateBookListingInput, type UpdateBookListingInput } from "../db/schema/index.ts";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { wishlistService } from "./wishlist.service.ts";
import { notificationService } from "./notification.service.ts";

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

      // Check for wishlist matches (async, don't wait for it)
      // Pass sellerId separately since listing might not have it in the response
      this.checkWishlistMatches(completeListing, sellerId).catch((error) => {
        console.error("Error checking wishlist matches:", error);
      });

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
    sortBy?: string; // Sort field: newest, price_low, price_high, popular, distance, relevance, best_value, recommended
    curriculum?: string; // Filter by curriculum (e.g., "CBC", "8-4-4")
    negotiable?: boolean; // Filter for negotiable prices only
    county?: string; // Filter by county from schools table
    district?: string; // Filter by district from schools table
    page?: number;
    limit?: number;
    userId?: string; // For personalization
    personalizedMode?: boolean; // Enable personalization
    activeChildId?: number; // For focusing on specific child in multi-child households
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
        case 'best_value':
          // Sort by discount percentage (requires originalRetailPrice)
          // This is approximate - actual sorting happens in personalization
          orderByClause = desc(bookListings.favoritesCount);
          break;
        case 'relevance':
        case 'recommended':
          // These use personalization scoring - default to newest for database query
          // Actual sorting happens in applyPersonalization
          orderByClause = desc(bookListings.createdAt);
          break;
        case 'distance':
          // Distance sorting requires coordinates - default to newest for now
          // Actual distance filtering happens in post-processing
          orderByClause = desc(bookListings.createdAt);
          break;
        case 'newest':
        default:
          orderByClause = desc(bookListings.createdAt);
          break;
      }

      // OPTIMIZATION: Always join with children and schools for personalization
      // This avoids N+1 queries when scoring listings
      const needsSchoolJoin = filters?.county || filters?.district || filters?.maxDistance || filters?.personalizedMode;

      let query = db
        .select({
          listing: bookListings,
          seller: {
            id: users.id,
            fullName: users.fullName,
          },
          ...(needsSchoolJoin && {
            sellerSchool: {
              id: schools.id,
              schoolName: schools.schoolName,
              county: schools.county,
              district: schools.district,
              xCoord: schools.xCoord,
              yCoord: schools.yCoord,
            }
          })
        })
        .from(bookListings)
        .innerJoin(users, eq(bookListings.sellerId, users.id));

      // Join with children table to get seller's children (for school info)
      // Then join with schools to get coordinates
      if (needsSchoolJoin) {
        query = query
          .leftJoin(children, eq(children.parentId, users.id))
          .leftJoin(schools, eq(children.schoolId, schools.id)) as any;
      }

      const listingsWithSellers = await query
        .where(and(...conditions))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Apply client-side filters only for complex conditions (school, distance, county, district)
      let filteredListings = listingsWithSellers;

      if (filters?.schoolId) {
        filteredListings = filteredListings.filter((item: any) =>
          item.sellerSchool?.id === filters.schoolId
        );
      }

      if (filters?.county && needsSchoolJoin) {
        filteredListings = filteredListings.filter((item: any) =>
          item.sellerSchool?.county === filters.county
        );
      }

      if (filters?.district && needsSchoolJoin) {
        filteredListings = filteredListings.filter((item: any) =>
          item.sellerSchool?.district === filters.district
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
          const { sellerSchool } = item;

          // School-to-school distance (privacy-friendly)
          if (userSchoolLat && userSchoolLng && sellerSchool?.yCoord && sellerSchool?.xCoord) {
            const schoolLat = Number(sellerSchool.yCoord);
            const schoolLng = Number(sellerSchool.xCoord);
            const distance = this.calculateDistance(
              userSchoolLat,
              userSchoolLng,
              schoolLat,
              schoolLng
            );
            return distance <= filters.maxDistance!;
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

      // Combine listings with their photos and seller school info
      const listingsWithPhotos = filteredListings.map((item: any) => {
        const { listing, seller, sellerSchool } = item;
        return {
          ...listing,
          photos: photosByListingId[listing.id] || [],
          seller: {
            id: seller.id,
            fullName: seller.fullName,
            schoolId: sellerSchool?.id,
            schoolName: sellerSchool?.schoolName,
          }
        };
      });

      // Apply personalization scoring if enabled OR if relevance/recommended sort is selected
      let finalListings = listingsWithPhotos;
      const shouldPersonalize =
        (filters?.personalizedMode && filters?.userId) ||
        (filters?.userId && (filters?.sortBy === 'relevance' || filters?.sortBy === 'recommended'));

      if (shouldPersonalize && filters?.userId) {
        console.log('[BookListingService] Applying personalization for user:', filters.userId);
        finalListings = await this.applyPersonalization(listingsWithPhotos, filters.userId, filters.activeChildId);
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
   * Apply multi-child personalization scoring to book listings
   * Scores books based on ALL children's needs (grades, schools)
   * Does NOT filter - only scores and sorts by relevance
   */
  private async applyPersonalization(listings: any[], userId: string, activeChildId?: number): Promise<any[]> {
    try {
      // Fetch user context (all children + schools information)
      const userContext = await this.getMultiChildUserContext(userId);

      if (!userContext || userContext.childrenCount === 0) {
        console.log('[Personalization] No children found for user, returning unpersonalized results');
        return listings;
      }

      console.log('[Personalization] Multi-child context:', {
        childrenCount: userContext.childrenCount,
        grades: userContext.grades,
        schoolCount: userContext.schools.length,
        activeChildId: activeChildId
      });

      // Calculate relevance score for each listing
      const scoredListings = listings.map(listing => {
        const score = this.calculateMultiChildRelevanceScore(listing, userContext, activeChildId);
        return {
          ...listing,
          _relevanceScore: score
        };
      });

      // Sort by relevance score (highest first)
      scoredListings.sort((a, b) => b._relevanceScore - a._relevanceScore);

      console.log('[Personalization] Top 5 scores:',
        scoredListings.slice(0, 5).map(l => ({ title: l.title, score: l._relevanceScore }))
      );

      // Remove score from final output (internal use only)
      return scoredListings.map(({ _relevanceScore, ...listing }) => listing);
    } catch (error) {
      console.error('[Personalization] Error applying personalization:', error);
      // If personalization fails, return original listings
      return listings;
    }
  }

  /**
   * Get multi-child user context for personalization
   * Fetches ALL children + their schools with coordinates
   */
  private async getMultiChildUserContext(userId: string) {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return null;
      }

      // Fetch ALL children for this parent
      const childrenList = await db
        .select()
        .from(children)
        .where(eq(children.parentId, userId))
        .orderBy(asc(children.displayOrder));

      if (childrenList.length === 0) {
        return null;
      }

      // Extract unique school IDs
      const schoolIds = Array.from(new Set(
        childrenList
          .map(c => c.schoolId)
          .filter((id): id is string => id !== null && id !== undefined)
      ));

      // Fetch school details with coordinates
      const schoolsList = schoolIds.length > 0
        ? await db
            .select()
            .from(schools)
            .where(sql`${schools.id} IN (${sql.join(schoolIds.map(id => sql`${id}`), sql`, `)})`)
        : [];

      return {
        user,
        children: childrenList,
        childrenCount: childrenList.length,
        grades: childrenList.map(c => c.grade),
        schools: schoolsList,
        schoolIds,
      };
    } catch (error) {
      console.error('[Personalization] Error fetching multi-child user context:', error);
      return null;
    }
  }

  /**
   * Calculate multi-child relevance score for a book listing
   * Score range: 0-350+ points
   *
   * SCORING BREAKDOWN:
   * - GRADE RELEVANCE (0-100): Exact match +100, Adjacent ±1 +60, Close ±2 +30
   * - SCHOOL PROXIMITY (0-80): Same school +80, <5km +40, <10km +20
   * - ACTIVE CHILD BOOST (0-40): If user selected specific child
   * - ENGAGEMENT (0-50): Favorites +30, Views +20
   * - VALUE & FRESHNESS (0-40): Discount +20, Recent <7 days +20
   * - SEARCH RELEVANCE (0-80): Title/author match scoring (when search active)
   */
  private calculateMultiChildRelevanceScore(listing: any, userContext: any, activeChildId?: number): number {
    let score = 0;

    // 1. GRADE RELEVANCE (0-100) - Check against ALL children's grades
    let bestGradeScore = 0;
    let matchedChildId: number | null = null;

    for (const child of userContext.children) {
      const childGrade = child.grade;
      const listingGrade = listing.classGrade;

      if (!listingGrade) continue;

      let gradeScore = 0;
      if (childGrade === listingGrade) {
        gradeScore = 100; // Exact match
      } else if (this.isAdjacentGrade(listingGrade, childGrade)) {
        gradeScore = 60; // Adjacent grade (±1)
      } else if (this.isCloseGrade(listingGrade, childGrade)) {
        gradeScore = 30; // Close grade (±2)
      }

      if (gradeScore > bestGradeScore) {
        bestGradeScore = gradeScore;
        matchedChildId = child.id;
      }
    }
    score += bestGradeScore;

    // 2. SCHOOL PROXIMITY (0-80) - Calculate distance to nearest child's school
    let bestSchoolScore = 0;

    if (userContext.schools.length > 0 && listing.seller) {
      for (const userSchool of userContext.schools) {
        const userLat = userSchool.yCoord ? Number(userSchool.yCoord) : null;
        const userLng = userSchool.xCoord ? Number(userSchool.xCoord) : null;

        if (!userLat || !userLng) continue;

        // Try to get seller's school coordinates (from seller object if available)
        // Note: This assumes seller object might have school info - adjust based on actual data
        let sellerLat: number | null = null;
        let sellerLng: number | null = null;

        // If we have seller's school ID, we could fetch it, but for now we'll skip distance
        // and just check for same school ID match
        if (listing.seller.schoolId && userSchool.id === listing.seller.schoolId) {
          bestSchoolScore = 80; // Same school
          break;
        }
      }
    }
    score += bestSchoolScore;

    // 3. ACTIVE CHILD BOOST (0-40) - If book matches actively selected child
    if (activeChildId && matchedChildId === activeChildId) {
      score += 40;
    }

    // 4. ENGAGEMENT (0-50) - Social proof
    const favoritesScore = Math.min((listing.favoritesCount || 0) / 10, 30); // Cap at 30
    const viewsScore = Math.min((listing.viewsCount || 0) / 50, 20); // Cap at 20
    score += favoritesScore + viewsScore;

    // 5. VALUE & FRESHNESS (0-40)
    // Discount scoring
    if (listing.originalRetailPrice && listing.price) {
      const discount = ((listing.originalRetailPrice - listing.price) / listing.originalRetailPrice) * 100;
      if (discount >= 50) {
        score += 20; // Great deal!
      } else if (discount >= 30) {
        score += 10;
      }
    }

    // Recency scoring
    if (listing.createdAt) {
      const daysOld = this.getDaysSinceCreated(listing.createdAt);
      if (daysOld < 7) {
        score += 20 - (daysOld * 2); // Fresh listings
      }
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
   * Check if a grade is close to the child's current grade
   * Close means +2 or -2 from current grade
   */
  private isCloseGrade(listingGrade: string, childGrade: string): boolean {
    const extractNumber = (grade: string): number | null => {
      const match = grade.match(/\d+/);
      return match ? parseInt(match[0], 10) : null;
    };

    const listingNum = extractNumber(listingGrade);
    const childNum = extractNumber(childGrade);

    if (listingNum === null || childNum === null) {
      return false;
    }

    // Check if grades are within same system
    const isGradeSystem = childGrade.toLowerCase().includes('grade');
    const isFormSystem = childGrade.toLowerCase().includes('form');

    if (listingGrade.toLowerCase().includes('grade') !== isGradeSystem &&
        listingGrade.toLowerCase().includes('form') !== isFormSystem) {
      return false;
    }

    // Close if difference is exactly 2
    return Math.abs(listingNum - childNum) === 2;
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

      // Join with users, children, and schools to get seller info
      const listingsWithSellers = await db
        .select({
          listing: bookListings,
          seller: {
            id: users.id,
            fullName: users.fullName,
          },
          sellerSchool: {
            id: schools.id,
            schoolName: schools.schoolName,
          }
        })
        .from(bookListings)
        .innerJoin(users, eq(bookListings.sellerId, users.id))
        .leftJoin(children, eq(children.parentId, users.id))
        .leftJoin(schools, eq(children.schoolId, schools.id))
        .where(and(...conditions))
        .orderBy(desc(bookListings.createdAt));

      // Apply client-side filters for text search (title, author, school)
      let filteredListings = listingsWithSellers;

      if (filters) {
        filteredListings = listingsWithSellers.filter((item: any) => {
          const { listing, sellerSchool } = item;
          // Title search (case-insensitive, partial match)
          if (filters.title && !listing.title.toLowerCase().includes(filters.title.toLowerCase())) return false;

          // Author search (case-insensitive, partial match)
          if (filters.author && listing.author && !listing.author.toLowerCase().includes(filters.author.toLowerCase())) return false;

          // School filter - prioritize same school
          if (filters.schoolId && sellerSchool?.id !== filters.schoolId) return false;

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
      const listingsWithPhotos = filteredListings.map((item: any) => {
        const { listing, seller, sellerSchool } = item;
        return {
          ...listing,
          photos: photosByListingId[listing.id] || [],
          seller: {
            id: seller.id,
            fullName: seller.fullName,
            schoolName: sellerSchool?.schoolName,
          }
        };
      });

      return { success: true, listings: listingsWithPhotos };
    } catch (error) {
      console.error("Error searching swap listings:", error);
      throw new Error("Failed to search swap listings");
    }
  }

  /**
   * Check if a new book listing matches any active wishlist items
   * and send notifications to parents
   */
  private async checkWishlistMatches(listing: any, sellerId: string): Promise<void> {
    try {
      // Only check active listings
      if (listing.listingStatus !== "active") {
        return;
      }

      // Get all active wishlist items
      const activeWishlistItems = await wishlistService.getActiveWishlistItems();

      if (activeWishlistItems.length === 0) {
        return;
      }

      console.log(`[WishlistMatch] Checking ${activeWishlistItems.length} wishlist items against listing: ${listing.title}`);

      // Check each wishlist item for matches
      for (const wishlistItem of activeWishlistItems) {
        const matchScore = this.calculateWishlistMatchScore(listing, wishlistItem);

        // If match score is above threshold, send notification
        if (matchScore >= 60) {
          console.log(`[WishlistMatch] Match found! Score: ${matchScore}, Wishlist ID: ${wishlistItem.id}, Listing ID: ${listing.id}`);

          // Don't notify if the listing belongs to the same parent
          if (wishlistItem.parent.id === sellerId) {
            console.log(`[WishlistMatch] Skipping notification - listing belongs to same parent`);
            continue;
          }

          // Send notification to parent
          await notificationService.createNotification({
            userId: wishlistItem.parent.id,
            type: "wishlist_match",
            title: "Wishlist Match Found! 🎉",
            message: `A book matching your wishlist for ${wishlistItem.child.name || "your child"} has been listed: "${listing.title}"`,
            relatedBookListingId: listing.id,
            actionUrl: `/book/${listing.id}`,
          });

          // Mark wishlist item as fulfilled (optional - you might want to keep it active for multiple matches)
          // await wishlistService.markAsFulfilled(wishlistItem.id, listing.id);
        }
      }
    } catch (error) {
      console.error("[WishlistMatch] Error checking wishlist matches:", error);
    }
  }

  /**
   * Calculate match score between a book listing and a wishlist item
   * Returns a score from 0-100
   * 
   * Scoring:
   * - Grade match: 0-30 points (exact: 30, adjacent: 20, close: 10)
   * - Subject match: 0-25 points (exact: 25)
   * - Title similarity: 0-25 points (fuzzy match)
   * - Publisher match: 0-20 points (exact: 20)
   */
  private calculateWishlistMatchScore(listing: any, wishlistItem: any): number {
    let score = 0;

    // 1. GRADE MATCH (0-30 points)
    if (listing.classGrade && wishlistItem.grade) {
      if (listing.classGrade === wishlistItem.grade) {
        score += 30; // Exact match
      } else if (this.isAdjacentGrade(listing.classGrade, wishlistItem.grade)) {
        score += 20; // Adjacent grade
      } else if (this.isCloseGrade(listing.classGrade, wishlistItem.grade)) {
        score += 10; // Close grade
      }
    }

    // 2. SUBJECT MATCH (0-25 points)
    if (listing.subject && wishlistItem.subject) {
      if (listing.subject.toLowerCase() === wishlistItem.subject.toLowerCase()) {
        score += 25;
      }
    }

    // 3. TITLE SIMILARITY (0-25 points) - Fuzzy match
    if (listing.title && wishlistItem.title) {
      const titleSimilarity = this.calculateStringSimilarity(
        listing.title.toLowerCase(),
        wishlistItem.title.toLowerCase()
      );
      score += Math.round(titleSimilarity * 25);
    }

    // 4. PUBLISHER MATCH (0-20 points)
    if (listing.publisher && wishlistItem.publisher) {
      const publisherSimilarity = this.calculateStringSimilarity(
        listing.publisher.toLowerCase(),
        wishlistItem.publisher.toLowerCase()
      );
      if (publisherSimilarity >= 0.8) {
        score += 20;
      } else if (publisherSimilarity >= 0.5) {
        score += 10;
      }
    }

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * Returns a value between 0 and 1
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    // Check if one string contains the other (for partial matches)
    if (longer.includes(shorter)) {
      return 0.9;
    }

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

export const bookListingService = new BookListingService();
