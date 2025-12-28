import { db } from "../server/db.ts";
import { bookListings, users, bookPhotos } from "../server/db/schema/index.ts";
import { eq, and, desc, sql } from "drizzle-orm";

async function testRecentBooksQuery() {
  console.log("🧪 Testing the exact query used by /api/books/recent...\n");

  try {
    const limit = 3;
    const start = Date.now();

    console.log("1️⃣ Fetching recent book listings...");
    const listingsWithSellers = await db
      .select({
        listing: bookListings,
        seller: {
          id: users.id,
          fullName: users.fullName,
          schoolName: users.schoolName,
        }
      })
      .from(bookListings)
      .innerJoin(users, eq(bookListings.sellerId, users.id))
      .where(
        and(
          eq(bookListings.listingStatus, "active"),
          sql`${bookListings.quantityAvailable} > 0`
        )
      )
      .orderBy(desc(bookListings.createdAt))
      .limit(limit);

    console.log(`   ✅ Found ${listingsWithSellers.length} listings (${Date.now() - start}ms)\n`);

    const start2 = Date.now();
    console.log("2️⃣ Fetching photos...");
    const listingIds = listingsWithSellers.map(({ listing }) => listing.id);

    const allPhotos = listingIds.length > 0
      ? await db
          .select()
          .from(bookPhotos)
          .where(sql`${bookPhotos.listingId} IN (${sql.join(listingIds.map(id => sql`${id}`), sql`, `)})`)
          .orderBy(bookPhotos.displayOrder)
      : [];

    console.log(`   ✅ Found ${allPhotos.length} photos (${Date.now() - start2}ms)\n`);

    console.log("3️⃣ Grouping photos by listing...");
    const photosByListingId = allPhotos.reduce((acc, photo) => {
      if (!acc[photo.listingId]) {
        acc[photo.listingId] = [];
      }
      acc[photo.listingId].push(photo);
      return acc;
    }, {} as Record<number, typeof allPhotos>);

    console.log(`   ✅ Grouped into ${Object.keys(photosByListingId).length} listings\n`);

    const listingsWithPhotos = listingsWithSellers.map(({ listing, seller }) => ({
      ...listing,
      photos: photosByListingId[listing.id] || [],
      seller: {
        id: seller.id,
        fullName: seller.fullName,
        schoolName: seller.schoolName,
      }
    }));

    console.log(`\n✨ Total time: ${Date.now() - start}ms`);
    console.log(`📦 Result: ${listingsWithPhotos.length} books with photos\n`);

    if (listingsWithPhotos.length > 0) {
      console.log("📖 Sample book:");
      console.log(`   Title: ${listingsWithPhotos[0].title}`);
      console.log(`   Author: ${listingsWithPhotos[0].author}`);
      console.log(`   Photos: ${listingsWithPhotos[0].photos.length}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

testRecentBooksQuery();
