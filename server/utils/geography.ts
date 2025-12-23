/**
 * Geography Utilities for Swap Cycle Matching
 *
 * Leverages Kenya's school location data to optimize swap matching:
 * - xCoord/yCoord: GPS coordinates for distance calculations
 * - county/district/zone/subCounty/ward: Administrative hierarchy for clustering
 * - level: Primary/Secondary for book compatibility
 */

import type { School } from "../db/schema";

/* ================================
   HAVERSINE DISTANCE CALCULATION
================================ */

/**
 * Calculate distance between two geographic points using Haversine formula
 *
 * @param lat1 Latitude of point 1 (yCoord from schools table)
 * @param lon1 Longitude of point 1 (xCoord from schools table)
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers, rounded to 2 decimal places
 *
 * @example
 * // Calculate distance between two Nairobi schools
 * const distance = calculateDistance(-1.2921, 36.8219, -1.3028, 36.8156);
 * // Returns: 1.45 km
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two schools using their coordinates
 *
 * @param school1 First school with xCoord/yCoord
 * @param school2 Second school with xCoord/yCoord
 * @returns Distance in kilometers, or Infinity if coordinates missing
 *
 * @example
 * const school1 = { xCoord: "36.8219", yCoord: "-1.2921", ... };
 * const school2 = { xCoord: "36.8156", yCoord: "-1.3028", ... };
 * const distance = calculateSchoolDistance(school1, school2);
 */
export function calculateSchoolDistance(
  school1: Partial<School>,
  school2: Partial<School>
): number {
  if (!school1.xCoord || !school1.yCoord || !school2.xCoord || !school2.yCoord) {
    return Infinity; // No coordinates available
  }

  return calculateDistance(
    Number(school1.yCoord), // Latitude
    Number(school1.xCoord), // Longitude
    Number(school2.yCoord),
    Number(school2.xCoord)
  );
}

/* ================================
   GEOGRAPHIC PRIORITY SCORING
================================ */

/**
 * Calculate geographic priority score based on Kenya's administrative hierarchy
 *
 * Priority levels (highest to lowest):
 * - Same school: 100 points (FREE logistics)
 * - Same ward: 90 points
 * - Same zone: 80 points
 * - Same sub-county: 70 points
 * - Same district: 60 points
 * - Same county: 50 points
 * - Different county: 20 points
 *
 * @param school1 First school with location data
 * @param school2 Second school with location data
 * @param school1Id School 1 unique ID
 * @param school2Id School 2 unique ID
 * @returns Priority score 0-100
 *
 * @example
 * const priority = calculateGeographicPriority(school1, school2, "id1", "id2");
 * // Returns: 90 (same ward)
 */
export function calculateGeographicPriority(
  school1: Partial<School>,
  school2: Partial<School>,
  school1Id: string,
  school2Id: string
): number {
  // Same school = highest priority (FREE logistics)
  if (school1Id === school2Id) return 100;

  // Same ward = very high priority
  if (school1.ward && school2.ward && school1.ward === school2.ward) {
    return 90;
  }

  // Same zone = high priority
  if (school1.zone && school2.zone && school1.zone === school2.zone) {
    return 80;
  }

  // Same sub-county = good priority
  if (school1.subCounty && school2.subCounty && school1.subCounty === school2.subCounty) {
    return 70;
  }

  // Same district = moderate priority
  if (school1.district && school2.district && school1.district === school2.district) {
    return 60;
  }

  // Same county = acceptable priority
  if (school1.county && school2.county && school1.county === school2.county) {
    return 50;
  }

  // Different county = low priority
  return 20;
}

/**
 * Calculate average geographic priority for a swap cycle
 * Compares all pairs of schools in the cycle
 *
 * @param schools Array of schools with their IDs
 * @returns Average priority score 0-100
 */
export function calculateCycleGeographicScore(
  schools: Array<{ school: Partial<School>; schoolId: string }>
): number {
  if (schools.length < 2) return 0;

  let totalScore = 0;
  let comparisons = 0;

  // Compare each pair of schools in the cycle
  for (let i = 0; i < schools.length; i++) {
    for (let j = i + 1; j < schools.length; j++) {
      totalScore += calculateGeographicPriority(
        schools[i].school,
        schools[j].school,
        schools[i].schoolId,
        schools[j].schoolId
      );
      comparisons++;
    }
  }

  return comparisons > 0 ? Math.round((totalScore / comparisons) * 100) / 100 : 0;
}

/* ================================
   LOGISTICS COST CALCULATION
================================ */

/**
 * Calculate logistics cost based on school proximity
 *
 * Cost tiers:
 * - Same school: KES 0 (FREE - students exchange in person)
 * - Within 5km: KES 50 (nearby schools, easy delivery)
 * - Within 20km: KES 100 (same zone/district)
 * - Within 50km: KES 200 (same county)
 * - Over 50km: KES 300 (different counties, courier required)
 *
 * Falls back to administrative hierarchy if coordinates unavailable
 *
 * @param school1 First school
 * @param school2 Second school
 * @param school1Id School 1 unique ID
 * @param school2Id School 2 unique ID
 * @returns Logistics cost in KES
 *
 * @example
 * const cost = calculateLogisticsCost(school1, school2, "id1", "id2");
 * // Returns: 50 (schools are 3km apart)
 */
export function calculateLogisticsCost(
  school1: Partial<School>,
  school2: Partial<School>,
  school1Id: string,
  school2Id: string
): number {
  // Same school = FREE
  if (school1Id === school2Id) return 0;

  // Calculate distance if coordinates available
  const distance = calculateSchoolDistance(school1, school2);

  // If we have coordinates, use distance-based pricing
  if (distance !== Infinity) {
    if (distance <= 5) return 50;    // Within 5km
    if (distance <= 20) return 100;  // Within 20km
    if (distance <= 50) return 200;  // Within 50km
    return 300;                       // Over 50km
  }

  // Fallback to administrative hierarchy if no coordinates
  if (school1.ward === school2.ward) return 50;
  if (school1.zone === school2.zone) return 100;
  if (school1.county === school2.county) return 200;

  return 300; // Different counties
}

/**
 * Calculate total logistics cost for a swap cycle
 *
 * @param participants Array of cycle participants with their schools
 * @returns Cost breakdown object
 */
export function calculateCycleCost(
  participants: Array<{
    school: Partial<School>;
    schoolId: string;
    nextParticipantSchool: Partial<School>;
    nextParticipantSchoolId: string;
  }>
): {
  totalCost: number;
  avgCostPerParticipant: number;
  costBreakdown: number[];
} {
  const costs = participants.map((p) =>
    calculateLogisticsCost(
      p.school,
      p.nextParticipantSchool,
      p.schoolId,
      p.nextParticipantSchoolId
    )
  );

  const totalCost = costs.reduce((sum, cost) => sum + cost, 0);
  const avgCostPerParticipant = totalCost / participants.length;

  return {
    totalCost,
    avgCostPerParticipant: Math.round(avgCostPerParticipant * 100) / 100,
    costBreakdown: costs,
  };
}

/* ================================
   SCHOOL LEVEL COMPATIBILITY
================================ */

/**
 * Check if a book is appropriate for a school level
 *
 * Kenya Education System:
 * - Primary: Grades 1-8
 * - Secondary: Forms 1-4
 * - Universal: Books that work for all levels (dictionaries, atlases, etc.)
 *
 * @param bookGrade Grade/class specified in book listing
 * @param schoolLevel School level ("Primary" or "Secondary")
 * @returns true if book is compatible with school level
 *
 * @example
 * isBookCompatibleWithSchoolLevel("Grade 5", "Primary"); // true
 * isBookCompatibleWithSchoolLevel("Form 2", "Primary");  // false
 * isBookCompatibleWithSchoolLevel("Dictionary", "Secondary"); // true (universal)
 */
export function isBookCompatibleWithSchoolLevel(
  bookGrade: string,
  schoolLevel: string
): boolean {
  const primaryGrades = [
    "1", "2", "3", "4", "5", "6", "7", "8",
    "Grade 1", "Grade 2", "Grade 3", "Grade 4",
    "Grade 5", "Grade 6", "Grade 7", "Grade 8",
    "PP1", "PP2", // Pre-Primary
  ];

  const secondaryGrades = [
    "Form 1", "Form 2", "Form 3", "Form 4",
    "F1", "F2", "F3", "F4",
  ];

  const universalGrades = [
    "All Grades", "General", "Universal",
    "Dictionary", "Atlas", "Reference",
  ];

  // Universal books work for everyone
  if (universalGrades.some((grade) => bookGrade.includes(grade))) {
    return true;
  }

  // Primary school
  if (schoolLevel.toLowerCase().includes("primary")) {
    return primaryGrades.some((grade) => bookGrade.includes(grade));
  }

  // Secondary school
  if (schoolLevel.toLowerCase().includes("secondary")) {
    return secondaryGrades.some((grade) => bookGrade.includes(grade));
  }

  return true; // Default to compatible if level unclear
}

/**
 * Check if two books are compatible for swapping
 * Considers subject, grade level, and condition
 *
 * @param book1Grade Grade of first book
 * @param book2Grade Grade of second book
 * @param book1Subject Subject of first book
 * @param book2Subject Subject of second book
 * @param book1Condition Condition of first book
 * @param book2Condition Condition of second book
 * @returns true if books are compatible for swap
 */
export function areBooksCompatible(
  book1Grade: string,
  book2Grade: string,
  book1Subject?: string | null,
  book2Subject?: string | null,
  book1Condition?: string,
  book2Condition?: string
): boolean {
  // Subject compatibility (must match if both specified)
  if (book1Subject && book2Subject && book1Subject !== book2Subject) {
    return false;
  }

  // Grade compatibility (should be within 1-2 grades)
  const grade1 = extractGradeNumber(book1Grade);
  const grade2 = extractGradeNumber(book2Grade);

  if (grade1 && grade2 && Math.abs(grade1 - grade2) > 2) {
    return false;
  }

  // Condition compatibility (don't swap "New" for "Fair")
  if (book1Condition && book2Condition) {
    const conditionRanks: Record<string, number> = {
      "New": 4,
      "Like New": 3,
      "Good": 2,
      "Fair": 1,
    };

    const rank1 = conditionRanks[book1Condition] || 0;
    const rank2 = conditionRanks[book2Condition] || 0;

    if (Math.abs(rank1 - rank2) > 2) {
      return false;
    }
  }

  return true;
}

/**
 * Extract numeric grade from grade string
 *
 * @example
 * extractGradeNumber("Grade 5"); // 5
 * extractGradeNumber("Form 2");  // 2
 */
function extractGradeNumber(gradeStr: string): number | null {
  const match = gradeStr.match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

/* ================================
   CYCLE CLUSTERING HELPERS
================================ */

/**
 * Check if all participants in a cycle are from the same county
 */
export function isCycleSameCounty(schools: Array<Partial<School>>): boolean {
  if (schools.length < 2) return true;
  const counties = [...new Set(schools.map((s) => s.county).filter(Boolean))];
  return counties.length === 1;
}

/**
 * Check if all participants in a cycle are from the same zone
 */
export function isCycleSameZone(schools: Array<Partial<School>>): boolean {
  if (schools.length < 2) return true;
  const zones = [...new Set(schools.map((s) => s.zone).filter(Boolean))];
  return zones.length === 1;
}

/**
 * Get the primary (most common) county for a cycle
 */
export function getPrimaryCounty(schools: Array<Partial<School>>): string | null {
  const countyCounts: Record<string, number> = {};

  schools.forEach((school) => {
    if (school.county) {
      countyCounts[school.county] = (countyCounts[school.county] || 0) + 1;
    }
  });

  // Find county with most occurrences
  let maxCount = 0;
  let primaryCounty: string | null = null;

  Object.entries(countyCounts).forEach(([county, count]) => {
    if (count > maxCount) {
      maxCount = count;
      primaryCounty = county;
    }
  });

  return primaryCounty;
}

/**
 * Calculate maximum distance in a cycle
 */
export function getMaxCycleDistance(
  schools: Array<Partial<School>>
): number {
  if (schools.length < 2) return 0;

  let maxDistance = 0;

  for (let i = 0; i < schools.length; i++) {
    for (let j = i + 1; j < schools.length; j++) {
      const distance = calculateSchoolDistance(schools[i], schools[j]);
      if (distance !== Infinity && distance > maxDistance) {
        maxDistance = distance;
      }
    }
  }

  return Math.round(maxDistance * 100) / 100;
}

/**
 * Calculate average distance between consecutive schools in a cycle
 */
export function getAvgCycleDistance(
  schools: Array<Partial<School>>
): number {
  if (schools.length < 2) return 0;

  const distances: number[] = [];

  for (let i = 0; i < schools.length; i++) {
    const nextIndex = (i + 1) % schools.length;
    const distance = calculateSchoolDistance(schools[i], schools[nextIndex]);
    if (distance !== Infinity) {
      distances.push(distance);
    }
  }

  if (distances.length === 0) return 0;

  const avg = distances.reduce((sum, d) => sum + d, 0) / distances.length;
  return Math.round(avg * 100) / 100;
}
