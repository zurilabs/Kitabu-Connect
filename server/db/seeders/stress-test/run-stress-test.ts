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
    logger.start('KITABU CONNECT - STRESS TEST SEEDER');

    logger.logConfig({
      'Target Users': STRESS_TEST_CONFIG.TOTAL_USERS,
      'Target Listings': `${STRESS_TEST_CONFIG.TARGET_LISTINGS}`,
      'Schools': STRESS_TEST_CONFIG.TOTAL_SCHOOLS,
    });

    // PHASE 1: SCHOOLS
    logger.startPhase(1, 7, 'Selecting Schools');
    perfMonitor.startPhase('School Selection');
    const schoolSelector = new SchoolSelector();
    const selectedSchools = await schoolSelector.selectSchools();
    const schoolsByCounty = schoolSelector.getSchoolsByCounty();
    const schoolStats = schoolSelector.getStatistics();
    logger.logProgress('Total schools', schoolStats.total);
    perfMonitor.endPhase(schoolStats.total);
    logger.endPhase();

    // PHASE 2: USERS
    logger.startPhase(2, 7, 'Generating Users');
    perfMonitor.startPhase('User Generation');
    const userGenerator = new UserGenerator();
    const users = await userGenerator.generateUsers(schoolsByCounty);
    
    // Create map of users by school for Phase 3
    const usersBySchool = new Map();
    users.forEach(u => {
      if (!usersBySchool.has(u.schoolId)) usersBySchool.set(u.schoolId, []);
      usersBySchool.get(u.schoolId).push(u);
    });

    const userStats = userGenerator.getStatistics();
    logger.logProgress('Active Users', userStats.byActivity?.SUPER_ACTIVE ?? 0);
    await userGenerator.saveUsersToDatabase();
    perfMonitor.endPhase(users.length);
    logger.endPhase();

    // PHASE 3: BOOK LISTINGS
    logger.startPhase(3, 7, 'Generating Book Listings');
    perfMonitor.startPhase('Book Listing Generation');
    const bookGenerator = new BookGenerator();
    const listings = await bookGenerator.generateListings(users, usersBySchool);
    const listingStats = bookGenerator.getStatistics();
    logger.logProgress('Total listings', listingStats.total);
    await bookGenerator.saveListingsToDatabase();
    perfMonitor.endPhase(listings.length);
    logger.endPhase();

    // PHASE 4: SWAP HISTORY
    logger.startPhase(4, 7, 'Creating Swap History');
    perfMonitor.startPhase('Swap History Generation');
    const historyGenerator = new SwapHistoryGenerator();
    const history = await historyGenerator.generateHistory(users);
    const historyStats = historyGenerator.getStatistics();
    logger.logProgress('Completed cycles', historyStats.byStatus?.completed ?? 0);
    
    // CRITICAL: Passing real listings here to avoid Foreign Key errors
    await historyGenerator.saveCyclesToDatabase(listings);
    perfMonitor.endPhase(history.length);
    logger.endPhase();

    // PHASE 5: RELIABILITY
    logger.startPhase(5, 7, 'Calculating Reliability');
    perfMonitor.startPhase('Reliability Score Calculation');
    const reliabilityCalculator = new ReliabilityCalculator();
    const participation = historyGenerator.getUserParticipation();
    const reliabilityUpdates = await reliabilityCalculator.calculateScores(users, participation);
    await reliabilityCalculator.updateScoresInDatabase();
    perfMonitor.endPhase(reliabilityUpdates.length);
    logger.endPhase();

    // PHASE 6: QUALITY CONTROL
    logger.startPhase(6, 7, 'Creating Quality Data');
    perfMonitor.startPhase('Quality Control Data');
    const qualityGenerator = new QualityDataGenerator();
    const completedCycles = history.filter((c) => c.status === 'completed');
    await qualityGenerator.generateQualityData(completedCycles);
    const qualityStats = qualityGenerator.getStatistics();
    logger.logProgress('Condition reports', qualityStats.conditionReports);
    await qualityGenerator.saveToDatabase();
    perfMonitor.endPhase(qualityStats.conditionReports);
    logger.endPhase();

    // PHASE 7: GAMIFICATION
    logger.startPhase(7, 7, 'Awarding Gamification');
    perfMonitor.startPhase('Gamification Processing');
    const gamificationProcessor = new GamificationProcessor();
    await gamificationProcessor.processGamification(users, reliabilityUpdates);
    const gamificationStats = gamificationProcessor.getStatistics();
    logger.logProgress('Badges awarded', gamificationStats.totalBadgesAwarded);
    perfMonitor.endPhase(gamificationStats.totalBadgesAwarded);
    logger.endPhase();

    logger.complete({ 'Records Processed': perfMonitor.getTotalRecords() });
    process.exit(0);
  } catch (error) {
    console.error('\n❌ STRESS TEST FAILED');
    console.error(error);
    process.exit(1);
  }
}
runStressTest();