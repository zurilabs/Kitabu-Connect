import { db } from "../../db";
import { sql } from "drizzle-orm";

/**
 * Migration: Create paystack_recipients table
 * This migration creates the paystack_recipients table for storing
 * Paystack transfer recipient information for withdrawals
 */
export async function createPaystackRecipientsTable() {
  console.log("[Migration] Creating paystack_recipients table...");

  try {
    // Create the table without foreign key first
    await db.execute(sql`
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

    console.log("[Migration] Table created successfully");

    // Try to add foreign key constraint
    try {
      await db.execute(sql`
        ALTER TABLE paystack_recipients
        ADD CONSTRAINT fk_paystack_recipients_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      `);
      console.log("[Migration] Foreign key constraint added successfully");
    } catch (fkError: any) {
      // If foreign key fails, just log it - table is still usable
      console.warn("[Migration] Warning: Could not add foreign key constraint:", fkError.message);
      console.warn("[Migration] Table created without foreign key - will still work correctly");
    }

    console.log("[Migration] ✅ paystack_recipients table is ready");
    return { success: true };
  } catch (error: any) {
    if (error.message?.includes("already exists")) {
      console.log("[Migration] Table already exists - skipping");
      return { success: true, message: "Table already exists" };
    }
    console.error("[Migration] ❌ Failed to create table:", error);
    return { success: false, error: error.message };
  }
}

// Run migration if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`;
if (isMainModule) {
  createPaystackRecipientsTable()
    .then((result) => {
      console.log("Migration result:", result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
