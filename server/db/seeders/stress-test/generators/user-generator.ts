/**
 * User Generator
 *
 * Generates 2000 realistic Kenyan users with proper distribution
 */

import crypto from "crypto";
import { db } from "../../../../db";
import { users, userReliabilityScores } from "../../../schema";
import { STRESS_TEST_CONFIG, getUserCountByActivity } from "../config/test-config";
import {
  generateFullName,
  generateEmail,
  generateKenyanPhoneNumber,
  randomDateBetween,
} from "../config/data-templates";
import type { SelectedSchool } from "./school-selector";

export interface GeneratedUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  schoolId: string;
  schoolName: string;
  role: string;
  onboardingCompleted: boolean;
  activityLevel: 'SUPER_ACTIVE' | 'MODERATE' | 'INACTIVE';
  childGrade: number; // Changed from grade (string) to childGrade (number)
  county: string;
  createdAt: Date;
}

export class UserGenerator {
  private users: GeneratedUser[] = [];
  private usersBySchool: Map<string, GeneratedUser[]> = new Map();
  private phoneNumbers: Set<string> = new Set(); // Track unique phone numbers

  /**
   * Generate users based on school distribution
   */
  async generateUsers(
    schoolsByCounty: Record<string, SelectedSchool[]>
  ): Promise<GeneratedUser[]> {
    console.log('  👥 Generating users across counties...');

    // Generate users for each county based on distribution
    for (const [county, config] of Object.entries(STRESS_TEST_CONFIG.COUNTY_DISTRIBUTION)) {
      if (county === 'RURAL_MIX') {
        await this.generateRuralUsers(config.users, schoolsByCounty);
      } else {
        await this.generateCountyUsers(county, config.users, schoolsByCounty[county] || []);
      }
    }

    console.log(`  ✓ Total users generated: ${this.users.length}`);
    return this.users;
  }

  /**
   * Generate users for a specific county
   */
  private async generateCountyUsers(
    county: string,
    userCount: number,
    schools: SelectedSchool[]
  ): Promise<void> {
    if (schools.length === 0) {
      console.log(`  ⚠️  No schools found for ${county}, skipping users`);
      return;
    }

    // Distribute users across activity levels
    const superActiveCount = Math.floor(userCount * STRESS_TEST_CONFIG.ACTIVITY_LEVELS.SUPER_ACTIVE.percentage);
    const moderateCount = Math.floor(userCount * STRESS_TEST_CONFIG.ACTIVITY_LEVELS.MODERATE.percentage);
    const inactiveCount = userCount - superActiveCount - moderateCount;

    // Generate users
    await this.generateUserBatch(schools, superActiveCount, 'SUPER_ACTIVE', county);
    await this.generateUserBatch(schools, moderateCount, 'MODERATE', county);
    await this.generateUserBatch(schools, inactiveCount, 'INACTIVE', county);

    console.log(`  ✓ ${county}: ${userCount} users (${schools.length} schools)`);
  }

  /**
   * Generate rural users across multiple counties
   */
  private async generateRuralUsers(
    userCount: number,
    schoolsByCounty: Record<string, SelectedSchool[]>
  ): Promise<void> {
    // Get all rural schools (exclude major counties)
    const majorCounties = ['NAIROBI', 'MOMBASA', 'KIAMBU', 'NAKURU', 'KISUMU', 'UASIN GISHU', 'MACHAKOS', 'KAKAMEGA'];
    const ruralSchools: SelectedSchool[] = [];

    Object.entries(schoolsByCounty).forEach(([county, schools]) => {
      if (!majorCounties.includes(county.toUpperCase())) {
        ruralSchools.push(...schools);
      }
    });

    if (ruralSchools.length === 0) return;

    // Distribute activity levels
    const superActiveCount = Math.floor(userCount * STRESS_TEST_CONFIG.ACTIVITY_LEVELS.SUPER_ACTIVE.percentage);
    const moderateCount = Math.floor(userCount * STRESS_TEST_CONFIG.ACTIVITY_LEVELS.MODERATE.percentage);
    const inactiveCount = userCount - superActiveCount - moderateCount;

    await this.generateUserBatch(ruralSchools, superActiveCount, 'SUPER_ACTIVE', 'RURAL');
    await this.generateUserBatch(ruralSchools, moderateCount, 'MODERATE', 'RURAL');
    await this.generateUserBatch(ruralSchools, inactiveCount, 'INACTIVE', 'RURAL');

    console.log(`  ✓ Rural: ${userCount} users (${ruralSchools.length} schools)`);
  }

  /**
   * Generate batch of users
   */
  private async generateUserBatch(
    schools: SelectedSchool[],
    count: number,
    activityLevel: 'SUPER_ACTIVE' | 'MODERATE' | 'INACTIVE',
    county: string
  ): Promise<void> {
    // Distribute users evenly across schools
    const usersPerSchool = Math.ceil(count / schools.length);

    for (let i = 0; i < count; i++) {
      const school = schools[i % schools.length];
      const user = this.createUser(school, activityLevel, county);
      this.users.push(user);

      // Track users by school
      if (!this.usersBySchool.has(school.id)) {
        this.usersBySchool.set(school.id, []);
      }
      this.usersBySchool.get(school.id)!.push(user);
    }
  }

  /**
   * Create individual user
   */
  private createUser(
    school: SelectedSchool,
    activityLevel: 'SUPER_ACTIVE' | 'MODERATE' | 'INACTIVE',
    county: string
  ): GeneratedUser {
    const fullName = generateFullName();
    const email = generateEmail(fullName);

    // Generate unique phone number
    let phoneNumber = generateKenyanPhoneNumber();
    while (this.phoneNumbers.has(phoneNumber)) {
      phoneNumber = generateKenyanPhoneNumber();
    }
    this.phoneNumbers.add(phoneNumber);

    // Assign child's grade based on school level
    const childGrade = this.getRandomGrade(school.level);

    // Create user with backdated createdAt (simulate gradual adoption over 2 months)
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const createdAt = randomDateBetween(twoMonthsAgo, new Date());

    return {
      id: crypto.randomUUID(),
      fullName,
      email,
      phoneNumber,
      schoolId: school.id,
      schoolName: school.name,
      role: 'PARENT',
      onboardingCompleted: true,
      activityLevel,
      childGrade,
      county,
      createdAt,
    };
  }

  /**
   * Get random grade based on school level
   */
  private getRandomGrade(level: string): number {
    if (level.toUpperCase().includes('SECONDARY')) {
      // Secondary: Forms 1-4 → Grades 9-12
      return Math.floor(Math.random() * 4) + 9;
    } else {
      // Primary: Grades 1-8
      return Math.floor(Math.random() * 8) + 1;
    }
  }

  /**
   * Save users to database in batches
   */
  async saveUsersToDatabase(): Promise<void> {
    const batchSize = STRESS_TEST_CONFIG.USERS_PER_BATCH;
    const totalBatches = Math.ceil(this.users.length / batchSize);

    console.log(`  💾 Saving ${this.users.length} users in ${totalBatches} batches...`);

    for (let i = 0; i < totalBatches; i++) {
      const batch = this.users.slice(i * batchSize, (i + 1) * batchSize);

      const userRecords = batch.map((user) => ({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        schoolId: user.schoolId,
        schoolName: user.schoolName,
        role: user.role,
        childGrade: user.childGrade,
        onboardingCompleted: user.onboardingCompleted,
        createdAt: user.createdAt,
      }));

      await db.insert(users).values(userRecords);

      // Also create default reliability scores
      const scoreRecords = batch.map((user) => ({
        userId: user.id,
        reliabilityScore: "50.00", // Default starting score
      }));

      await db.insert(userReliabilityScores).values(scoreRecords);

      if ((i + 1) % 5 === 0 || i === totalBatches - 1) {
        console.log(`  ✓ Batch ${i + 1}/${totalBatches} saved (${(i + 1) * batchSize} users)`);
      }
    }
  }

  /**
   * Get users by activity level
   */
  getUsersByActivity(level: 'SUPER_ACTIVE' | 'MODERATE' | 'INACTIVE'): GeneratedUser[] {
    return this.users.filter((u) => u.activityLevel === level);
  }

  /**
   * Get users by school
   */
  getUsersBySchool(schoolId: string): GeneratedUser[] {
    return this.usersBySchool.get(schoolId) || [];
  }

  /**
   * Get random user
   */
  getRandomUser(): GeneratedUser {
    return this.users[Math.floor(Math.random() * this.users.length)];
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    total: number;
    byActivity: Record<string, number>;
    byCounty: Record<string, number>;
    byGrade: Record<string, number>;
  } {
    const byActivity: Record<string, number> = {};
    const byCounty: Record<string, number> = {};
    const byGrade: Record<string, number> = {};

    this.users.forEach((user) => {
      byActivity[user.activityLevel] = (byActivity[user.activityLevel] || 0) + 1;
      byCounty[user.county] = (byCounty[user.county] || 0) + 1;
      byGrade[`Grade ${user.childGrade}`] = (byGrade[`Grade ${user.childGrade}`] || 0) + 1;
    });

    return {
      total: this.users.length,
      byActivity,
      byCounty,
      byGrade,
    };
  }
}
