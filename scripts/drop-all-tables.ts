/**
 * Drop All Tables Script
 * 
 * This script will delete all tables in the current database,
 * leaving only an empty database with no tables.
 * 
 * WARNING: This will permanently delete all data!
 * 
 * Usage: tsx scripts/drop-all-tables.ts
 */

import "dotenv/config";
import mysql from "mysql2/promise";

async function dropAllTables() {
  console.log("⚠️  WARNING: This will delete ALL tables and data in the database!\n");

  let connection;

  try {
    // Create MySQL connection using same logic as db.ts
    if (process.env.DATABASE_URL) {
      // Railway or other cloud providers typically provide DATABASE_URL
      console.log("📡 Connecting using DATABASE_URL...");
      connection = await mysql.createConnection(process.env.DATABASE_URL);
    } else {
      // Local development with individual credentials
      const config = {
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "kitabu_connect",
      };

      console.log("📡 Connecting to database...");
      console.log(`   Host: ${config.host}`);
      console.log(`   Database: ${config.database}`);
      console.log(`   User: ${config.user}\n`);

      connection = await mysql.createConnection(config);
    }

    console.log("✅ Connected to database\n");

    // Get all table names
    console.log("🔍 Fetching all tables...");
    const [tables] = await connection.execute<mysql.RowDataPacket[]>(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()"
    );

    if (tables.length === 0) {
      console.log("ℹ️  No tables found in the database. Database is already empty.\n");
      await connection.end();
      process.exit(0);
    }

    const tableNames = tables.map((row) => row.TABLE_NAME);
    console.log(`📋 Found ${tableNames.length} tables:\n`);
    tableNames.forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`);
    });
    console.log("");

    // Disable foreign key checks to allow dropping tables with foreign keys
    console.log("🔓 Disabling foreign key checks...");
    await connection.execute("SET FOREIGN_KEY_CHECKS = 0");

    // Drop all tables
    console.log("🗑️  Dropping all tables...\n");
    let droppedCount = 0;

    for (const tableName of tableNames) {
      try {
        await connection.execute(`DROP TABLE IF EXISTS \`${tableName}\``);
        console.log(`   ✅ Dropped table: ${tableName}`);
        droppedCount++;
      } catch (error) {
        console.error(`   ❌ Failed to drop table ${tableName}:`, error);
      }
    }

    // Re-enable foreign key checks
    console.log("\n🔒 Re-enabling foreign key checks...");
    await connection.execute("SET FOREIGN_KEY_CHECKS = 1");

    console.log(`\n✅ Successfully dropped ${droppedCount}/${tableNames.length} tables\n`);
    console.log("📊 Database is now empty (no tables)\n");

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

// Run the script
dropAllTables();

