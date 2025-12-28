import { db } from "../server/db.ts";
import { sql } from "drizzle-orm";

async function checkDatabasePerformance() {
  console.log("🔍 Checking database performance...\n");

  try {
    // 1. Check total count of book_listings
    console.log("📊 Checking book_listings count...");
    const [countResult] = await db.execute(sql`SELECT COUNT(*) as count FROM book_listings`);
    console.log(`Total book listings: ${(countResult as any).count}\n`);

    // 2. Check indexes on book_listings table
    console.log("🗂️ Checking indexes on book_listings...");
    const indexes = await db.execute(sql`SHOW INDEX FROM book_listings`);
    console.log("Indexes found:");
    (indexes as any[]).forEach((idx: any) => {
      console.log(`  - ${idx.Key_name} on ${idx.Column_name}`);
    });
    console.log();

    // 3. Test query performance
    console.log("⏱️ Testing query performance...");

    const start1 = Date.now();
    await db.execute(sql`
      SELECT bl.*, u.full_name, u.school_name
      FROM book_listings bl
      INNER JOIN users u ON bl.seller_id = u.id
      WHERE bl.listing_status = 'active'
      AND bl.quantity_available > 0
      ORDER BY bl.created_at DESC
      LIMIT 3
    `);
    const time1 = Date.now() - start1;
    console.log(`Query with LIMIT 3: ${time1}ms`);

    const start2 = Date.now();
    await db.execute(sql`
      SELECT COUNT(*) as count
      FROM book_listings bl
      INNER JOIN users u ON bl.seller_id = u.id
      WHERE bl.listing_status = 'active'
      AND bl.quantity_available > 0
    `);
    const time2 = Date.now() - start2;
    console.log(`COUNT query: ${time2}ms`);

    // 4. Check for missing indexes
    console.log("\n📝 Recommendations:");
    const hasStatusIndex = (indexes as any[]).some((idx: any) =>
      idx.Column_name === 'listing_status'
    );
    const hasCreatedAtIndex = (indexes as any[]).some((idx: any) =>
      idx.Column_name === 'created_at'
    );

    if (!hasStatusIndex) {
      console.log("⚠️  Missing index on listing_status - ADD IT!");
    } else {
      console.log("✅ Index on listing_status exists");
    }

    if (!hasCreatedAtIndex) {
      console.log("⚠️  Missing index on created_at - ADD IT!");
    } else {
      console.log("✅ Index on created_at exists");
    }

    console.log("\n✨ Database check complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkDatabasePerformance();
