/**
 * Stress Test Configuration
 *
 * Optimized for Core i7 with local MySQL
 * Target duration: 30-45 seconds
 */

export const STRESS_TEST_CONFIG = {
  // User Distribution
  TOTAL_USERS: 1000,
  USERS_PER_BATCH: 100, // Optimized for Core i7

  // School Distribution
  TOTAL_SCHOOLS: 150,
  URBAN_SCHOOLS: 120,
  RURAL_SCHOOLS: 30,

  // Book Listings
  TARGET_LISTINGS: 5500, // Average across activity levels
  LISTINGS_PER_BATCH: 50,

  // Historical Cycles
  COMPLETED_CYCLES: 500,
  CANCELLED_CYCLES: 100,
  TIMEOUT_CYCLES: 50,
  CYCLES_PER_BATCH: 20,

  // Quality Control
  CONDITION_REPORTS: 200,
  ACTIVE_DISPUTES: 30,
  DISPUTE_MESSAGES_PER_DISPUTE: 3,

  // Performance Tuning
  MAX_PARALLEL_INSERTS: 5,
  DATABASE_POOL_SIZE: 10,

  // Activity Level Distribution
  ACTIVITY_LEVELS: {
    SUPER_ACTIVE: {
      percentage: 0.30,
      listingsMin: 5,
      listingsMax: 10,
    },
    MODERATE: {
      percentage: 0.50,
      listingsMin: 2,
      listingsMax: 4,
    },
    INACTIVE: {
      percentage: 0.20,
      listingsMin: 0,
      listingsMax: 1,
    },
  },

  // Geographic Distribution (Kenya Counties)
  COUNTY_DISTRIBUTION: {
    'NAIROBI': { percentage: 0.25, users: 500, schools: 30 },
    'MOMBASA': { percentage: 0.15, users: 300, schools: 20 },
    'KIAMBU': { percentage: 0.12, users: 240, schools: 15 },
    'NAKURU': { percentage: 0.10, users: 200, schools: 15 },
    'KISUMU': { percentage: 0.08, users: 160, schools: 12 },
    'UASIN GISHU': { percentage: 0.05, users: 100, schools: 8 },
    'MACHAKOS': { percentage: 0.05, users: 100, schools: 8 },
    'KAKAMEGA': { percentage: 0.05, users: 100, schools: 8 },
    'RURAL_MIX': { percentage: 0.15, users: 300, schools: 34 },
  },

  // School Level Distribution
  SCHOOL_LEVELS: {
    SECONDARY: {
      percentage: 0.60,
      grades: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
    },
    PRIMARY: {
      percentage: 0.40,
      grades: ['Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8'],
    },
  },

  // Subject Distribution (Kenya Curriculum)
  SUBJECT_DISTRIBUTION: {
    'Mathematics': 0.20,
    'English': 0.15,
    'Kiswahili': 0.15,
    'Biology': 0.10,
    'Chemistry': 0.10,
    'Physics': 0.05,
    'History': 0.05,
    'Geography': 0.05,
    'CRE': 0.05,
    'Business Studies': 0.05,
    'Agriculture': 0.03,
    'Computer Studies': 0.02,
  },

  // Book Condition Distribution
  CONDITION_DISTRIBUTION: {
    'Excellent': 0.15,
    'Very Good': 0.30,
    'Good': 0.35,
    'Fair': 0.15,
    'Poor': 0.05,
  },

  // Reliability Score Distribution
  RELIABILITY_DISTRIBUTION: {
    ELITE: { min: 90, max: 100, percentage: 0.20 },
    RELIABLE: { min: 70, max: 89, percentage: 0.50 },
    AVERAGE: { min: 50, max: 69, percentage: 0.20 },
    POOR: { min: 30, max: 49, percentage: 0.07 },
    SUSPENDED: { min: 0, max: 29, percentage: 0.03 },
  },

  // Swap Matching Rules
  SWAP_MATCHING: {
    // Percentage of listings that will have intentional matches
    MATCH_RATE: 0.70, // 70% of listings should find swap partners

    // Same school swap probability (highest priority)
    SAME_SCHOOL_RATE: 0.40,

    // Same county swap probability
    SAME_COUNTY_RATE: 0.35,

    // Cross-county swap probability (rare books)
    CROSS_COUNTY_RATE: 0.25,

    // Cycle size distribution
    CYCLE_SIZES: {
      '2-way': 0.60, // Most common
      '3-way': 0.25,
      '4-way': 0.10,
      '5-way': 0.05, // Rare
    },
  },
};

// Helper function to get user count by activity level
export function getUserCountByActivity(level: 'SUPER_ACTIVE' | 'MODERATE' | 'INACTIVE'): number {
  return Math.floor(STRESS_TEST_CONFIG.TOTAL_USERS * STRESS_TEST_CONFIG.ACTIVITY_LEVELS[level].percentage);
}

// Helper function to get listings range for activity level
export function getListingsRange(level: 'SUPER_ACTIVE' | 'MODERATE' | 'INACTIVE'): [number, number] {
  const config = STRESS_TEST_CONFIG.ACTIVITY_LEVELS[level];
  return [config.listingsMin, config.listingsMax];
}

// Helper function to calculate expected listings
export function calculateExpectedListings(): number {
  let total = 0;

  Object.entries(STRESS_TEST_CONFIG.ACTIVITY_LEVELS).forEach(([level, config]) => {
    const userCount = Math.floor(STRESS_TEST_CONFIG.TOTAL_USERS * config.percentage);
    const avgListings = (config.listingsMin + config.listingsMax) / 2;
    total += userCount * avgListings;
  });

  return Math.floor(total);
}
