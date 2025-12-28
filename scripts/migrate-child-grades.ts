/**
 * Migration Script: Migrate existing childGrade data to children table
 *
 * This script:
 * 1. Finds all users with a childGrade value
 * 2. Creates a child entry for each user with name "My Child"
 * 3. Preserves the grade value as "Grade X"
 *
 * Run with: npx tsx scripts/migrate-child-grades.ts
 */

import { childService } from "../server/services/child.service";

async function migrateChildGrades() {
  console.log("Starting childGrade migration...\n");

  try {
    const result = await childService.migrateExistingChildGrades();

    if (result.success) {
      console.log("✅ Migration completed successfully!");
      console.log(`📊 ${result.migratedCount} users migrated`);
      console.log(`📝 ${result.message}\n`);
    } else {
      console.error("❌ Migration failed");
    }
  } catch (error) {
    console.error("❌ Migration error:", error);
    process.exit(1);
  }
}

// Run migration
migrateChildGrades()
  .then(() => {
    console.log("Migration script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
