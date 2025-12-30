/**
 * Migration runner for purchase order support in swap_orders table
 * Run with: npx tsx run-purchase-order-migration.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function runMigration() {
  console.log("[Migration] Starting purchase order fields migration...");

  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);

  try {
    // Add orderType column
    console.log("[Migration] Adding order_type column...");
    try {
      await connection.execute(`
        ALTER TABLE swap_orders
        ADD COLUMN order_type VARCHAR(20) NOT NULL DEFAULT 'swap'
      `);
      console.log("[Migration] ✅ order_type column added");
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log("[Migration] ⚠️  order_type column already exists - skipping");
      } else {
        throw error;
      }
    }

    // Make swapRequestId nullable
    console.log("[Migration] Making swap_request_id nullable...");
    try {
      await connection.execute(`
        ALTER TABLE swap_orders
        MODIFY COLUMN swap_request_id INT NULL
      `);
      console.log("[Migration] ✅ swap_request_id is now nullable");
    } catch (error: any) {
      console.warn("[Migration] ⚠️  Could not modify swap_request_id:", error.message);
    }

    // Add book_price column
    console.log("[Migration] Adding book_price column...");
    try {
      await connection.execute(`
        ALTER TABLE swap_orders
        ADD COLUMN book_price DECIMAL(10, 2)
      `);
      console.log("[Migration] ✅ book_price column added");
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log("[Migration] ⚠️  book_price column already exists - skipping");
      } else {
        throw error;
      }
    }

    // Add convenience_fee column
    console.log("[Migration] Adding convenience_fee column...");
    try {
      await connection.execute(`
        ALTER TABLE swap_orders
        ADD COLUMN convenience_fee DECIMAL(10, 2)
      `);
      console.log("[Migration] ✅ convenience_fee column added");
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log("[Migration] ⚠️  convenience_fee column already exists - skipping");
      } else {
        throw error;
      }
    }

    // Add total_amount column
    console.log("[Migration] Adding total_amount column...");
    try {
      await connection.execute(`
        ALTER TABLE swap_orders
        ADD COLUMN total_amount DECIMAL(10, 2)
      `);
      console.log("[Migration] ✅ total_amount column added");
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log("[Migration] ⚠️  total_amount column already exists - skipping");
      } else {
        throw error;
      }
    }

    // Add index on order_type
    console.log("[Migration] Adding index on order_type...");
    try {
      await connection.execute(`
        CREATE INDEX idx_swap_orders_order_type ON swap_orders (order_type)
      `);
      console.log("[Migration] ✅ Index on order_type created");
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log("[Migration] ⚠️  Index already exists - skipping");
      } else {
        console.warn("[Migration] ⚠️  Could not create index:", error.message);
      }
    }

    console.log("\n[Migration] ✅ Migration completed successfully!");
    console.log("[Migration] The swap_orders table now supports both swap and purchase orders.\n");

  } catch (error: any) {
    console.error("[Migration] ❌ Migration failed:", error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
