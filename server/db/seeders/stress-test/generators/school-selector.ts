/**
 * School Selector Generator
 *
 * Selects 150-200 schools from the 40k+ Kenya MOE database
 * with proper geographic distribution
 */

import { db } from "../../../../db";
import { schools, type School } from "../../../schema";
import { eq, inArray, sql } from "drizzle-orm";
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
    console.log('  🔍 Querying schools database...');

    // Get target counties distribution
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
   * Select schools from a specific county
   */
  private async selectCountySchools(county: string, count: number): Promise<void> {
    // Get both primary and secondary schools
    const secondaryCount = Math.ceil(count * 0.6);
    const primaryCount = count - secondaryCount;

    // Select secondary schools
    const secondarySchools = await db
      .select()
      .from(schools)
      .where(
        sql`UPPER(${schools.county}) = ${county.toUpperCase()}
            AND UPPER(${schools.level}) IN ('SECONDARY', 'SECONDARY SCHOOL')`
      )
      .limit(secondaryCount);

    // Select primary schools
    const primarySchools = await db
      .select()
      .from(schools)
      .where(
        sql`UPPER(${schools.county}) = ${county.toUpperCase()}
            AND UPPER(${schools.level}) IN ('PRIMARY', 'PRIMARY SCHOOL')`
      )
      .limit(primaryCount);

    const allSchools = [...secondarySchools, ...primarySchools];

    allSchools.forEach((school) => {
      this.selectedSchools.push(this.formatSchool(school));
    });

    console.log(`  ✓ ${county}: ${allSchools.length} schools (${secondaryCount} Secondary, ${primaryCount} Primary)`);
  }

  /**
   * Select rural schools from various counties
   */
  private async selectRuralSchools(count: number): Promise<void> {
    // Counties to exclude (already selected above)
    const excludeCounties = [
      'NAIROBI',
      'MOMBASA',
      'KIAMBU',
      'NAKURU',
      'KISUMU',
      'UASIN GISHU',
      'MACHAKOS',
      'KAKAMEGA',
    ];

    // Select random schools from other counties
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

    console.log(`  ✓ Rural schools: ${ruralSchools.length} from various counties`);
  }

  /**
   * Format school object
   */
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

  /**
   * Get schools grouped by county
   */
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

  /**
   * Get schools by level
   */
  getSchoolsByLevel(): Record<string, SelectedSchool[]> {
    const grouped: Record<string, SelectedSchool[]> = {
      SECONDARY: [],
      PRIMARY: [],
    };

    this.selectedSchools.forEach((school) => {
      const level = school.level.toUpperCase().includes('SECONDARY') ? 'SECONDARY' : 'PRIMARY';
      grouped[level].push(school);
    });

    return grouped;
  }

  /**
   * Get random school
   */
  getRandomSchool(): SelectedSchool {
    const index = Math.floor(Math.random() * this.selectedSchools.length);
    return this.selectedSchools[index];
  }

  /**
   * Get random school from specific county
   */
  getRandomSchoolFromCounty(county: string): SelectedSchool | null {
    const countySchools = this.selectedSchools.filter(
      (s) => s.county.toUpperCase() === county.toUpperCase()
    );

    if (countySchools.length === 0) return null;

    const index = Math.floor(Math.random() * countySchools.length);
    return countySchools[index];
  }

  /**
   * Get random schools for same-school swaps
   */
  getSchoolsForSameSchoolSwaps(minStudents: number = 20): SelectedSchool[] {
    // Return schools that will have enough students for intra-school swaps
    // For simplicity, we'll return schools from major counties
    const majorCounties = ['NAIROBI', 'MOMBASA', 'KIAMBU', 'NAKURU'];

    return this.selectedSchools.filter((school) =>
      majorCounties.includes(school.county.toUpperCase())
    );
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    total: number;
    byCounty: Record<string, number>;
    byLevel: Record<string, number>;
  } {
    const byCounty: Record<string, number> = {};
    const byLevel: Record<string, number> = {};

    this.selectedSchools.forEach((school) => {
      // Count by county
      const county = school.county.toUpperCase();
      byCounty[county] = (byCounty[county] || 0) + 1;

      // Count by level
      const level = school.level.toUpperCase().includes('SECONDARY') ? 'SECONDARY' : 'PRIMARY';
      byLevel[level] = (byLevel[level] || 0) + 1;
    });

    return {
      total: this.selectedSchools.length,
      byCounty,
      byLevel,
    };
  }
}
