/**
 * School Selector Generator - SCALED DOWN VERSION
 * * Optimized to select ~20-25 schools
 */

import { db } from "../../../../db";
import { schools } from "../../../schema";
import { sql } from "drizzle-orm";
import { STRESS_TEST_CONFIG } from "../config/test-config";

export interface SelectedSchool {
  id: string;
  name: string;
  level: string;
  county: string;
  district: string;
  zone: string;
  subCounty: string;
  ward: string;
  xCoord: number;
  yCoord: number;
  address: string;
}

export class SchoolSelector {
  private selectedSchools: SelectedSchool[] = [];

  /**
   * Select schools from database based on geographic distribution
   */
  async selectSchools(): Promise<SelectedSchool[]> {
    console.log('  🔍 Querying schools database for scaled down distribution...');

    const countyTargets = STRESS_TEST_CONFIG.COUNTY_DISTRIBUTION;

    for (const [county, targets] of Object.entries(countyTargets)) {
      if (county === 'RURAL_MIX') {
        await this.selectRuralSchools(targets.schools);
      } else {
        await this.selectCountySchools(county, targets.schools);
      }
    }

    console.log(`  ✓ Total schools selected: ${this.selectedSchools.length}`);
    return this.selectedSchools;
  }

  /**
   * Select schools from a specific county (Scaled logic)
   */
  private async selectCountySchools(county: string, count: number): Promise<void> {
    if (count <= 0) return;

    // Ensure we get at least 1 secondary and 1 primary if count > 1
    const secondaryCount = count > 1 ? Math.max(1, Math.ceil(count * 0.6)) : 1;
    const primaryCount = count > 1 ? count - secondaryCount : 0;

    // Query Secondary
    const secondarySchools = await db
      .select()
      .from(schools)
      .where(
        sql`UPPER(${schools.county}) = ${county.toUpperCase()} 
            AND UPPER(${schools.level}) LIKE '%SECONDARY%'`
      )
      .limit(secondaryCount);

    // Query Primary (if needed)
    let primarySchools: any[] = [];
    if (primaryCount > 0) {
      primarySchools = await db
        .select()
        .from(schools)
        .where(
          sql`UPPER(${schools.county}) = ${county.toUpperCase()} 
              AND UPPER(${schools.level}) LIKE '%PRIMARY%'`
        )
        .limit(primaryCount);
    }

    const allSchools = [...secondarySchools, ...primarySchools];
    allSchools.forEach((school) => {
      this.selectedSchools.push(this.formatSchool(school));
    });

    console.log(`  ✓ ${county}: ${allSchools.length} schools selected`);
  }

  /**
   * Select rural schools from various counties
   */
  private async selectRuralSchools(count: number): Promise<void> {
    const excludeCounties = ['NAIROBI', 'MOMBASA', 'KIAMBU', 'NAKURU', 'KISUMU', 'UASIN GISHU', 'MACHAKOS', 'KAKAMEGA'];

    const ruralSchools = await db
      .select()
      .from(schools)
      .where(
        sql`UPPER(${schools.county}) NOT IN (${sql.join(
          excludeCounties.map((c) => sql`${c}`),
          sql`, `
        )})`
      )
      .limit(count);

    ruralSchools.forEach((school) => {
      this.selectedSchools.push(this.formatSchool(school));
    });

    console.log(`  ✓ Rural: ${ruralSchools.length} schools from mixed counties`);
  }

  /**
   * Adjusted for scaled user count
   * Threshold lowered from 20 to 5 students
   */
  getSchoolsForSameSchoolSwaps(minStudents: number = 5): SelectedSchool[] {
    // In a 200 user test, we focus swaps on major areas to ensure matches
    const majorCounties = ['NAIROBI', 'MOMBASA', 'KIAMBU'];

    return this.selectedSchools.filter((school) =>
      majorCounties.includes(school.county.toUpperCase())
    );
  }

  private formatSchool(school: any): SelectedSchool {
    return {
      id: school.id,
      name: school.name,
      level: school.level || 'SECONDARY',
      county: school.county || '',
      district: school.district || '',
      zone: school.zone || '',
      subCounty: school.subCounty || '',
      ward: school.ward || '',
      xCoord: school.xCoord || 0,
      yCoord: school.yCoord || 0,
      address: school.address || `${school.name}, ${school.county}`,
    };
  }

  /* Statistics and getter methods remain functionally the same */
  getStatistics() {
    const byCounty: Record<string, number> = {};
    this.selectedSchools.forEach((s) => {
      const c = s.county.toUpperCase();
      byCounty[c] = (byCounty[c] || 0) + 1;
    });
    return { total: this.selectedSchools.length, byCounty };
  }

  getSchoolsByCounty(): Record<string, SelectedSchool[]> {
  const grouped: Record<string, SelectedSchool[]> = {};
  this.selectedSchools.forEach((school) => {
    const county = school.county.toUpperCase();
    if (!grouped[county]) {
      grouped[county] = [];
    }
    grouped[county].push(school);
  });
  return grouped;
}
}