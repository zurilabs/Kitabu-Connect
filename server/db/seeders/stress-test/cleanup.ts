/**
 * Cleanup Script
 *
 * Removes all stress test data while preserving schools
 */

import { db } from "../../../db";
import { sql } from "drizzle-orm";

async function cleanup() {
  try {
    console.log('\n' + '═'.repeat(70));
    console.log('🧹 CLEANING UP STRESS TEST DATA');
    console.log('═'.repeat(70));

    console.log('\n⚠️  This will delete:');
    console.log('  - All users and their data');
    console.log('  - All book listings');
    console.log('  - All swap cycles');
    console.log('  - All reliability scores');
    console.log('  - All quality control data');
    console.log('  - All gamification data');
    console.log('\n✅ This will preserve:');
    console.log('  - Schools data (40k+ schools)');
    console.log('  - Publishers data');
    console.log('  - Database schema');

    console.log('\nStarting cleanup in 3 seconds...\n');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Delete in correct order (respecting foreign key constraints)

    console.log('  🗑️  Deleting dispute messages...');
    await db.execute(sql`DELETE FROM dispute_messages`);

    console.log('  🗑️  Deleting cycle disputes...');
    await db.execute(sql`DELETE FROM cycle_disputes`);

    console.log('  🗑️  Deleting book condition reports...');
    await db.execute(sql`DELETE FROM book_condition_reports`);

    console.log('  🗑️  Deleting cycle participants...');
    await db.execute(sql`DELETE FROM cycle_participants`);

    console.log('  🗑️  Deleting swap cycles...');
    await db.execute(sql`DELETE FROM swap_cycles`);

    console.log('  🗑️  Deleting drop points...');
    await db.execute(sql`DELETE FROM drop_points`);

    console.log('  🗑️  Deleting book listings...');
    await db.execute(sql`DELETE FROM book_listings`);

    console.log('  🗑️  Deleting user badges...');
    await db.execute(sql`DELETE FROM user_badges`);

    console.log('  🗑️  Deleting user reliability scores...');
    await db.execute(sql`DELETE FROM user_reliability_scores`);

    console.log('  🗑️  Deleting notifications...');
    await db.execute(sql`DELETE FROM notifications`);

    console.log('  🗑️  Deleting favorites...');
    await db.execute(sql`DELETE FROM favorites`);

    console.log('  🗑️  Deleting user preferences...');
    await db.execute(sql`DELETE FROM user_preferences`);

    console.log('  🗑️  Deleting wallet transactions...');
    await db.execute(sql`DELETE FROM wallet_transactions`);

    console.log('  🗑️  Deleting user wallets...');
    await db.execute(sql`DELETE FROM user_wallets`);

    console.log('  🗑️  Deleting users...');
    await db.execute(sql`DELETE FROM users`);

    // Reset auto-increment counters
    console.log('\n  🔄 Resetting auto-increment counters...');
    await db.execute(sql`ALTER TABLE book_listings AUTO_INCREMENT = 1`);

    console.log('\n' + '═'.repeat(70));
    console.log('✅ CLEANUP COMPLETED SUCCESSFULLY');
    console.log('═'.repeat(70));
    console.log('\nDatabase is now clean and ready for a fresh stress test.');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ CLEANUP FAILED');
    console.error(error);
    process.exit(1);
  }
}

// Run cleanup
cleanup();
