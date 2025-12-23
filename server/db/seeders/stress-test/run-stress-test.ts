/**
 * Stress Test Orchestrator
 *
 * Main script to run the complete stress test seeding process
 */

import { db } from "../../../db";
import { logger } from "./utils/progress-logger";
import { perfMonitor } from "./utils/performance-monitor";
import { STRESS_TEST_CONFIG, calculateExpectedListings } from "./config/test-config";
import { SchoolSelector } from "./generators/school-selector";
import { UserGenerator } from "./generators/user-generator";
import { BookGenerator } from "./generators/book-generator";
import { SwapHistoryGenerator } from "./generators/swap-history-generator";
import { ReliabilityCalculator } from "./generators/reliability-calculator";
import { QualityDataGenerator } from "./generators/quality-data-generator";
import { GamificationProcessor } from "./generators/gamification-processor";

async function runStressTest() {
  try {
    // Start logging
    logger.start('KITABU CONNECT - STRESS TEST SEEDER');

    logger.logConfig({
      'Target Users': STRESS_TEST_CONFIG.TOTAL_USERS,
      'Target Listings': `${STRESS_TEST_CONFIG.TARGET_LISTINGS} (${calculateExpectedListings()} expected)`,
      'Schools': STRESS_TEST_CONFIG.TOTAL_SCHOOLS,
      'Historical Cycles': STRESS_TEST_CONFIG.COMPLETED_CYCLES + STRESS_TEST_CONFIG.CANCELLED_CYCLES + STRESS_TEST_CONFIG.TIMEOUT_CYCLES,
      'Condition Reports': STRESS_TEST_CONFIG.CONDITION_REPORTS,
      'Disputes': STRESS_TEST_CONFIG.ACTIVE_DISPUTES,
    });

    // ============================================
    // PHASE 1: SELECT SCHOOLS
    // ============================================
    logger.startPhase(1, 7, 'Selecting Schools');
    perfMonitor.startPhase('School Selection');

    const schoolSelector = new SchoolSelector();
    const selectedSchools = await schoolSelector.selectSchools();
    const schoolsByCounty = schoolSelector.getSchoolsByCounty();
    const schoolStats = schoolSelector.getStatistics();

    logger.logProgress('Urban schools selected', schoolStats.byLevel.SECONDARY || 0);
    logger.logProgress('Primary schools selected', schoolStats.byLevel.PRIMARY || 0);
    logger.logProgress('Total schools', schoolStats.total);

    perfMonitor.endPhase(schoolStats.total);
    logger.endPhase();

    // ============================================
    // PHASE 2: GENERATE USERS
    // ============================================
    logger.startPhase(2, 7, 'Generating Users');
    perfMonitor.startPhase('User Generation');

    const userGenerator = new UserGenerator();
    const users = await userGenerator.generateUsers(schoolsByCounty);

    // Create map of users by school for efficient lookup
    const usersBySchool = new Map();
    selectedSchools.forEach((school) => {
      usersBySchool.set(school.id, userGenerator.getUsersBySchool(school.id));
    });

    const userStats = userGenerator.getStatistics();
    logger.logProgress('Super active users', userStats.byActivity.SUPER_ACTIVE || 0);
    logger.logProgress('Moderate users', userStats.byActivity.MODERATE || 0);
    logger.logProgress('Inactive users', userStats.byActivity.INACTIVE || 0);

    // Save to database
    await userGenerator.saveUsersToDatabase();

    perfMonitor.endPhase(users.length * 2); // Users + reliability scores
    logger.endPhase();

    // ============================================
    // PHASE 3: GENERATE BOOK LISTINGS
    // ============================================
    logger.startPhase(3, 7, 'Generating Book Listings');
    perfMonitor.startPhase('Book Listing Generation');

    const bookGenerator = new BookGenerator();
    const listings = await bookGenerator.generateListings(users, usersBySchool);

    const listingStats = bookGenerator.getStatistics();
    logger.logProgress('Total listings', listingStats.total);
    logger.logProgress('Match groups created', listingStats.matchGroups);
    logger.logProgress('Same-school matches', listingStats.byMatchType['SAME_SCHOOL'] || 0);
    logger.logProgress('Same-county matches', listingStats.byMatchType['SAME_COUNTY'] || 0);
    logger.logProgress('Cross-county matches', listingStats.byMatchType['CROSS_COUNTY'] || 0);

    // Save to database
    await bookGenerator.saveListingsToDatabase();

    perfMonitor.endPhase(listings.length);
    logger.endPhase();

    // ============================================
    // PHASE 4: CREATE SWAP HISTORY
    // ============================================
    logger.startPhase(4, 7, 'Creating Swap History');
    perfMonitor.startPhase('Swap History Generation');

    const historyGenerator = new SwapHistoryGenerator();
    const history = await historyGenerator.generateHistory(users);

    const historyStats = historyGenerator.getStatistics();
    logger.logProgress('Completed cycles', historyStats.byStatus.completed || 0);
    logger.logProgress('Cancelled cycles', historyStats.byStatus.cancelled || 0);
    logger.logProgress('Timed-out cycles', historyStats.byStatus.timeout || 0);
    logger.logProgress('Total participants', historyStats.totalParticipants);

    // Save to database
    await historyGenerator.saveCyclesToDatabase();

    perfMonitor.endPhase(history.length + historyStats.totalParticipants);
    logger.endPhase();

    // ============================================
    // PHASE 5: CALCULATE RELIABILITY SCORES
    // ============================================
    logger.startPhase(5, 7, 'Calculating Reliability Scores');
    perfMonitor.startPhase('Reliability Score Calculation');

    const reliabilityCalculator = new ReliabilityCalculator();
    const participation = historyGenerator.getUserParticipation();
    const reliabilityUpdates = await reliabilityCalculator.calculateScores(users, participation);

    const reliabilityStats = reliabilityCalculator.getStatistics();
    Object.entries(reliabilityStats.byTier).forEach(([tier, count]) => {
      logger.logProgress(tier, count);
    });

    // Update database
    await reliabilityCalculator.updateScoresInDatabase();

    perfMonitor.endPhase(reliabilityUpdates.length);
    logger.endPhase();

    // ============================================
    // PHASE 6: CREATE QUALITY CONTROL DATA
    // ============================================
    logger.startPhase(6, 7, 'Creating Quality Control Data');
    perfMonitor.startPhase('Quality Control Data Generation');

    const qualityGenerator = new QualityDataGenerator();
    const completedCycles = history.filter((c) => c.status === 'completed');
    await qualityGenerator.generateQualityData(completedCycles);

    const qualityStats = qualityGenerator.getStatistics();
    logger.logProgress('Condition reports', qualityStats.conditionReports);
    logger.logProgress('Active disputes', qualityStats.disputes);
    logger.logProgress('Dispute messages', qualityStats.messages);
    logger.logProgress('Condition match rate', `${qualityStats.matchRate.toFixed(1)}%`);

    // Save to database
    await qualityGenerator.saveToDatabase();

    perfMonitor.endPhase(qualityStats.conditionReports + qualityStats.disputes + qualityStats.messages);
    logger.endPhase();

    // ============================================
    // PHASE 7: AWARD GAMIFICATION
    // ============================================
    logger.startPhase(7, 7, 'Awarding Gamification');
    perfMonitor.startPhase('Gamification Processing');

    const gamificationProcessor = new GamificationProcessor();
    await gamificationProcessor.processGamification(users, reliabilityUpdates);

    const gamificationStats = gamificationProcessor.getStatistics();
    logger.logProgress('Badges awarded', gamificationStats.totalBadgesAwarded);
    logger.logProgress('Users with badges', gamificationStats.usersWithBadges);

    perfMonitor.endPhase(gamificationStats.totalBadgesAwarded);
    logger.endPhase();

    // ============================================
    // COMPLETE & SUMMARY
    // ============================================
    const summary = {
      'Users Created': users.length,
      'Book Listings': listings.length,
      'Schools Used': selectedSchools.length,
      'Historical Cycles': history.length,
      'Badges Awarded': gamificationStats.totalBadgesAwarded,
      'Disputes Created': qualityStats.disputes,
      'Condition Reports': qualityStats.conditionReports,
      'Total Records': perfMonitor.getTotalRecords(),
    };

    logger.complete(summary);
    perfMonitor.printSummary();

    console.log('\nNext Steps:');
    console.log('  1. Run cycle detection: POST /api/cycles/detect');
    console.log('  2. Check performance: Monitor response times');
    console.log('  3. Verify data integrity: Check database constraints');
    console.log('  4. Test leaderboards: GET /api/gamification/leaderboard/global');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ STRESS TEST FAILED');
    console.error(error);
    process.exit(1);
  }
}

// Run the stress test
runStressTest();
