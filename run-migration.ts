/**
 * Simple migration runner for paystack_recipients table
 * Run with: npm run dev and then manually execute, or npx tsx run-migration.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function runMigration() {
  console.log("[Migration] Starting paystack_recipients table migration...");

  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);

  try {
    // Step 1: Create table without foreign key
    console.log("[Migration] Creating table...");
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS paystack_recipients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        recipient_code VARCHAR(255) NOT NULL UNIQUE,
        type VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        account_number VARCHAR(50) NOT NULL,
        bank_code VARCHAR(50) NOT NULL,
        bank_name VARCHAR(255),
        currency VARCHAR(10) NOT NULL DEFAULT 'KES',
        active BOOLEAN NOT NULL DEFAULT TRUE,
        paystack_data TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_paystack_recipients_user (user_id),
        INDEX idx_paystack_recipients_account (account_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("[Migration] ✅ Table created successfully");

    // Step 2: Try to add foreign key
    try {
      console.log("[Migration] Adding foreign key constraint...");
      await connection.execute(`
        ALTER TABLE paystack_recipients
        ADD CONSTRAINT fk_paystack_recipients_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      `);
      console.log("[Migration] ✅ Foreign key constraint added");
    } catch (fkError: any) {
      if (fkError.code === 'ER_DUP_KEYNAME') {
        console.log("[Migration] ⚠️  Foreign key already exists - skipping");
      } else {
        console.warn("[Migration] ⚠️  Could not add foreign key:", fkError.message);
        console.warn("[Migration] Table will work without foreign key constraint");
      }
    }

    console.log("\n[Migration] ✅ Migration completed successfully!");
    console.log("[Migration] The paystack_recipients table is ready for use.\n");

  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log("[Migration] ℹ️  Table already exists - no action needed");
    } else {
      console.error("[Migration] ❌ Migration failed:", error.message);
      throw error;
    }
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
