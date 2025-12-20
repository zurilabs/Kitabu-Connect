import { db } from "../db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function runMigration() {
  try {
    const migrationPath = path.join(process.cwd(), "migrations", "0002_create_user_preferences.sql");
    const migration = fs.readFileSync(migrationPath, "utf-8");

    console.log("Applying migration...");
    await db.execute(sql.raw(migration));
    console.log("✅ Migration applied successfully");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
