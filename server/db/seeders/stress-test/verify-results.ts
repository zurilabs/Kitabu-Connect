/**
 * Verification Script
 *
 * Validates stress test data integrity and quality
 */

import { db } from "../../../db";
import { sql } from "drizzle-orm";

interface VerificationResult {
  passed: boolean;
  message: string;
  details?: any;
}

async function verifyResults() {
  try {
    console.log('\n' + '═'.repeat(70));
    console.log('🔍 VERIFYING STRESS TEST RESULTS');
    console.log('═'.repeat(70));

    const results: VerificationResult[] = [];

    // ============================================
    // CHECK 1: User Count
    // ============================================
    console.log('\n📊 Checking user count...');
    const userCount = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
    const actualUsers = Number(userCount.rows[0].count);
    const expectedUsers = 2000;

    results.push({
      passed: actualUsers >= expectedUsers * 0.95, // Allow 5% margin
      message: `User count: ${actualUsers} (expected: ${expectedUsers})`,
      details: { actual: actualUsers, expected: expectedUsers },
    });

    // ============================================
    // CHECK 2: Book Listings Count
    // ============================================
    console.log('📚 Checking book listings...');
    const listingCount = await db.execute(sql`SELECT COUNT(*) as count FROM book_listings`);
    const actualListings = Number(listingCount.rows[0].count);
    const expectedListings = 5000;

    results.push({
      passed: actualListings >= expectedListings * 0.90,
      message: `Book listings: ${actualListings} (expected: ~${expectedListings})`,
      details: { actual: actualListings, expected: expectedListings },
    });

    // ============================================
    // CHECK 3: Swap Cycles Count
    // ============================================
    console.log('🔄 Checking swap cycles...');
    const cycleCount = await db.execute(sql`SELECT COUNT(*) as count FROM swap_cycles`);
    const actualCycles = Number(cycleCount.rows[0].count);
    const expectedCycles = 650;

    results.push({
      passed: actualCycles >= expectedCycles * 0.95,
      message: `Swap cycles: ${actualCycles} (expected: ${expectedCycles})`,
      details: { actual: actualCycles, expected: expectedCycles },
    });

    // ============================================
    // CHECK 4: Foreign Key Integrity
    // ============================================
    console.log('🔗 Checking foreign key integrity...');

    // Check users have valid schoolId
    const invalidUsers = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM users u
      LEFT JOIN schools s ON u.schoolId = s.id
      WHERE s.id IS NULL
    `);

    results.push({
      passed: Number(invalidUsers.rows[0].count) === 0,
      message: `Users with invalid schoolId: ${invalidUsers.rows[0].count} (expected: 0)`,
    });

    // Check book listings have valid sellerId
    const invalidListings = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM book_listings bl
      LEFT JOIN users u ON bl.sellerId = u.id
      WHERE u.id IS NULL
    `);

    results.push({
      passed: Number(invalidListings.rows[0].count) === 0,
      message: `Listings with invalid sellerId: ${invalidListings.rows[0].count} (expected: 0)`,
    });

    // ============================================
    // CHECK 5: Reliability Scores
    // ============================================
    console.log('📈 Checking reliability scores...');

    // All users should have reliability scores
    const usersWithoutScores = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM users u
      LEFT JOIN user_reliability_scores urs ON u.id = urs.userId
      WHERE urs.userId IS NULL
    `);

    results.push({
      passed: Number(usersWithoutScores.rows[0].count) === 0,
      message: `Users without reliability scores: ${usersWithoutScores.rows[0].count} (expected: 0)`,
    });

    // Check score distribution
    const scoreDistribution = await db.execute(sql`
      SELECT
        SUM(CASE WHEN reliabilityScore >= 90 THEN 1 ELSE 0 END) as elite,
        SUM(CASE WHEN reliabilityScore >= 70 AND reliabilityScore < 90 THEN 1 ELSE 0 END) as reliable,
        SUM(CASE WHEN reliabilityScore >= 50 AND reliabilityScore < 70 THEN 1 ELSE 0 END) as average,
        SUM(CASE WHEN reliabilityScore < 30 THEN 1 ELSE 0 END) as suspended
      FROM user_reliability_scores
    `);

    const dist = scoreDistribution.rows[0];
    results.push({
      passed: Number(dist.suspended) > 0 && Number(dist.elite) > 0,
      message: `Score distribution - Elite: ${dist.elite}, Reliable: ${dist.reliable}, Average: ${dist.average}, Suspended: ${dist.suspended}`,
      details: dist,
    });

    // ============================================
    // CHECK 6: Cycle Participants
    // ============================================
    console.log('👥 Checking cycle participants...');

    // All cycles should have at least 2 participants
    const invalidCycles = await db.execute(sql`
      SELECT c.id, c.cycleType, COUNT(cp.id) as participant_count
      FROM swap_cycles c
      LEFT JOIN cycle_participants cp ON c.id = cp.cycleId
      GROUP BY c.id, c.cycleType
      HAVING participant_count < 2
    `);

    results.push({
      passed: invalidCycles.rows.length === 0,
      message: `Cycles with < 2 participants: ${invalidCycles.rows.length} (expected: 0)`,
    });

    // ============================================
    // CHECK 7: Quality Control Data
    // ============================================
    console.log('📝 Checking quality control data...');

    const conditionReportCount = await db.execute(sql`SELECT COUNT(*) as count FROM book_condition_reports`);
    const disputeCount = await db.execute(sql`SELECT COUNT(*) as count FROM cycle_disputes`);

    results.push({
      passed: Number(conditionReportCount.rows[0].count) > 0,
      message: `Condition reports: ${conditionReportCount.rows[0].count}`,
    });

    results.push({
      passed: Number(disputeCount.rows[0].count) > 0,
      message: `Disputes: ${disputeCount.rows[0].count}`,
    });

    // ============================================
    // CHECK 8: Gamification Data
    // ============================================
    console.log('🏆 Checking gamification data...');

    const badgeCount = await db.execute(sql`SELECT COUNT(*) as count FROM user_badges`);
    const usersWithBadges = await db.execute(sql`SELECT COUNT(DISTINCT userId) as count FROM user_badges`);

    results.push({
      passed: Number(badgeCount.rows[0].count) > 0,
      message: `Total badges awarded: ${badgeCount.rows[0].count}`,
    });

    results.push({
      passed: Number(usersWithBadges.rows[0].count) > 0,
      message: `Users with badges: ${usersWithBadges.rows[0].count}`,
    });

    // ============================================
    // PRINT RESULTS
    // ============================================
    console.log('\n' + '═'.repeat(70));
    console.log('📋 VERIFICATION RESULTS');
    console.log('═'.repeat(70));

    let passedCount = 0;
    let failedCount = 0;

    results.forEach((result, index) => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${index + 1}. ${result.message}`);

      if (result.passed) passedCount++;
      else failedCount++;
    });

    console.log('\n' + '═'.repeat(70));
    console.log(`Total Checks: ${results.length}`);
    console.log(`Passed: ${passedCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log('═'.repeat(70));

    if (failedCount === 0) {
      console.log('\n✅ ALL VERIFICATIONS PASSED');
      console.log('The stress test data is valid and ready for testing.');
    } else {
      console.log('\n⚠️  SOME VERIFICATIONS FAILED');
      console.log('Please review the failed checks above.');
    }

    process.exit(failedCount === 0 ? 0 : 1);
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED');
    console.error(error);
    process.exit(1);
  }
}

// Run verification
verifyResults();
