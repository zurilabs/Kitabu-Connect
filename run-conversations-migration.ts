/**
 * Migration runner for conversations and direct messaging
 * Run with: npx tsx run-conversations-migration.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function runMigration() {
  console.log("[Migration] Starting conversations table migration...");

  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);

  try {
    // Create conversations table without foreign keys
    console.log("[Migration] Creating conversations table...");
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS conversations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user1_id VARCHAR(36) NOT NULL,
          user2_id VARCHAR(36) NOT NULL,
          book_listing_id INT,
          last_message_content TEXT,
          last_message_at TIMESTAMP,
          last_message_sender_id VARCHAR(36),
          user1_unread_count INT NOT NULL DEFAULT 0,
          user2_unread_count INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

          INDEX idx_conversations_user1 (user1_id),
          INDEX idx_conversations_user2 (user2_id),
          INDEX idx_conversations_book_listing (book_listing_id),
          INDEX idx_conversations_participants (user1_id, user2_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("[Migration] ✅ Conversations table created");
    } catch (error: any) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log("[Migration] ⚠️  Conversations table already exists - skipping");
      } else {
        throw error;
      }
    }

    // Add foreign keys
    console.log("[Migration] Adding foreign keys...");
    try {
      await connection.execute(`
        ALTER TABLE conversations
        ADD CONSTRAINT fk_conversations_user1
          FOREIGN KEY (user1_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      `);
      console.log("[Migration] ✅ user1_id foreign key added");
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log("[Migration] ⚠️  user1_id foreign key already exists");
      } else {
        console.warn("[Migration] ⚠️  Could not add user1_id foreign key:", error.message);
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE conversations
        ADD CONSTRAINT fk_conversations_user2
          FOREIGN KEY (user2_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      `);
      console.log("[Migration] ✅ user2_id foreign key added");
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log("[Migration] ⚠️  user2_id foreign key already exists");
      } else {
        console.warn("[Migration] ⚠️  Could not add user2_id foreign key:", error.message);
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE conversations
        ADD CONSTRAINT fk_conversations_book_listing
          FOREIGN KEY (book_listing_id)
          REFERENCES book_listings(id)
          ON DELETE SET NULL
      `);
      console.log("[Migration] ✅ book_listing_id foreign key added");
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log("[Migration] ⚠️  book_listing_id foreign key already exists");
      } else {
        console.warn("[Migration] ⚠️  Could not add book_listing_id foreign key:", error.message);
      }
    }

    // Make messages.swap_order_id nullable
    console.log("[Migration] Making messages.swap_order_id nullable...");
    try {
      await connection.execute(`
        ALTER TABLE messages
        MODIFY COLUMN swap_order_id INT NULL
      `);
      console.log("[Migration] ✅ messages.swap_order_id is now nullable");
    } catch (error: any) {
      console.warn("[Migration] ⚠️  Could not modify messages.swap_order_id:", error.message);
    }

    // Add conversation_id column to messages
    console.log("[Migration] Adding conversation_id to messages...");
    try {
      await connection.execute(`
        ALTER TABLE messages
        ADD COLUMN conversation_id INT,
        ADD CONSTRAINT fk_messages_conversation
          FOREIGN KEY (conversation_id)
          REFERENCES conversations(id)
          ON DELETE CASCADE
      `);
      console.log("[Migration] ✅ conversation_id column added");
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log("[Migration] ⚠️  conversation_id column already exists - skipping");
      } else if (error.code === 'ER_DUP_KEYNAME') {
        console.log("[Migration] ⚠️  Foreign key already exists - skipping");
      } else {
        throw error;
      }
    }

    // Add index on conversation_id
    console.log("[Migration] Adding index on conversation_id...");
    try {
      await connection.execute(`
        CREATE INDEX idx_messages_conversation ON messages (conversation_id)
      `);
      console.log("[Migration] ✅ Index on conversation_id created");
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log("[Migration] ⚠️  Index already exists - skipping");
      } else {
        console.warn("[Migration] ⚠️  Could not create index:", error.message);
      }
    }

    console.log("\n[Migration] ✅ Migration completed successfully!");
    console.log("[Migration] Direct messaging is now ready to use.\n");

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
