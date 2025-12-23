/**
 * Stress Test Configuration - SCALED DOWN VERSION
 * * Optimized for: 200 Users
 * Target duration: 20-30 seconds (faster due to lower volume)
 */

export const STRESS_TEST_CONFIG = {
  // User Distribution
  TOTAL_USERS: 200,             // Scaled 10x down
  USERS_PER_BATCH: 20,          // Reduced to keep CPU overhead low

  // School Distribution (Reduced to maintain student-per-school density)
  TOTAL_SCHOOLS: 20,            
  URBAN_SCHOOLS: 15,
  RURAL_SCHOOLS: 5,

  // Book Listings (Recalculated based on 200 users)
  TARGET_LISTINGS: 550,         
  LISTINGS_PER_BATCH: 10,

  // Historical Cycles
  COMPLETED_CYCLES: 50,
  CANCELLED_CYCLES: 10,
  TIMEOUT_CYCLES: 5,
  CYCLES_PER_BATCH: 5,

  // Quality Control
  CONDITION_REPORTS: 20,
  ACTIVE_DISPUTES: 3,
  DISPUTE_MESSAGES_PER_DISPUTE: 3,

  // Performance Tuning (Slightly lowered to prevent racing on small datasets)
  MAX_PARALLEL_INSERTS: 3,
  DATABASE_POOL_SIZE: 5,

  // Activity Level Distribution (Maintained percentages)
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

  // Geographic Distribution (Scaled counts, kept percentages)
  COUNTY_DISTRIBUTION: {
    'NAIROBI': { percentage: 0.25, users: 50, schools: 4 },
    'MOMBASA': { percentage: 0.15, users: 30, schools: 3 },
    'KIAMBU': { percentage: 0.12, users: 24, schools: 2 },
    'NAKURU': { percentage: 0.10, users: 20, schools: 2 },
    'KISUMU': { percentage: 0.08, users: 16, schools: 2 },
    'UASIN GISHU': { percentage: 0.05, users: 10, schools: 1 },
    'MACHAKOS': { percentage: 0.05, users: 10, schools: 1 },
    'KAKAMEGA': { percentage: 0.05, users: 10, schools: 1 },
    'RURAL_MIX': { percentage: 0.15, users: 30, schools: 4 },
  },

  // School Level Distribution (Same logic)
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

  // Subject Distribution (Unchanged as it is percentage-based)
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

  // Book Condition Distribution (Unchanged)
  CONDITION_DISTRIBUTION: {
    'Excellent': 0.15,
    'Very Good': 0.30,
    'Good': 0.35,
    'Fair': 0.15,
    'Poor': 0.05,
  },

  // Reliability Score Distribution (Unchanged)
  RELIABILITY_DISTRIBUTION: {
    ELITE: { min: 90, max: 100, percentage: 0.20 },
    RELIABLE: { min: 70, max: 89, percentage: 0.50 },
    AVERAGE: { min: 50, max: 69, percentage: 0.20 },
    POOR: { min: 30, max: 49, percentage: 0.07 },
    SUSPENDED: { min: 0, max: 29, percentage: 0.03 },
  },

  // Swap Matching Rules (Maintained logic for consistency)
  SWAP_MATCHING: {
    MATCH_RATE: 0.70, 
    SAME_SCHOOL_RATE: 0.40,
    SAME_COUNTY_RATE: 0.35,
    CROSS_COUNTY_RATE: 0.25,
    CYCLE_SIZES: {
      '2-way': 0.60,
      '3-way': 0.25,
      '4-way': 0.10,
      '5-way': 0.05,
    },
  },
};

// Helper functions remain identical as they rely on the object above
export function getUserCountByActivity(level: 'SUPER_ACTIVE' | 'MODERATE' | 'INACTIVE'): number {
  return Math.floor(STRESS_TEST_CONFIG.TOTAL_USERS * STRESS_TEST_CONFIG.ACTIVITY_LEVELS[level].percentage);
}

export function getListingsRange(level: 'SUPER_ACTIVE' | 'MODERATE' | 'INACTIVE'): [number, number] {
  const config = STRESS_TEST_CONFIG.ACTIVITY_LEVELS[level];
  return [config.listingsMin, config.listingsMax];
}

export function calculateExpectedListings(): number {
  let total = 0;
  Object.entries(STRESS_TEST_CONFIG.ACTIVITY_LEVELS).forEach(([level, config]) => {
    const userCount = Math.floor(STRESS_TEST_CONFIG.TOTAL_USERS * config.percentage);
    const avgListings = (config.listingsMin + config.listingsMax) / 2;
    total += userCount * avgListings;
  });
  return Math.floor(total);
}