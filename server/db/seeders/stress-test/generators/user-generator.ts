/**
 * User Generator - SCALED DOWN VERSION
 * Generates 200 realistic Kenyan users distributed across selected schools
 */

import crypto from "crypto";
import { db } from "../../../../db";
import { users, userReliabilityScores } from "../../../schema";
import { STRESS_TEST_CONFIG } from "../config/test-config";
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
  childGrade: number;
  county: string;
  createdAt: Date;
}

export class UserGenerator {
  private users: GeneratedUser[] = [];
  private usersBySchool: Map<string, GeneratedUser[]> = new Map();
  private phoneNumbers: Set<string> = new Set();

  /**
   * Main entry point for user generation
   */
  async generateUsers(
    schoolsByCounty: Record<string, SelectedSchool[]>
  ): Promise<GeneratedUser[]> {
    console.log('  👥 Generating users based on county distribution...');

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

  private async generateCountyUsers(
    county: string,
    userCount: number,
    schools: SelectedSchool[]
  ): Promise<void> {
    if (schools.length === 0 || userCount === 0) return;

    // Proportional distribution based on config percentages
    const superActiveCount = Math.floor(userCount * STRESS_TEST_CONFIG.ACTIVITY_LEVELS.SUPER_ACTIVE.percentage);
    const moderateCount = Math.floor(userCount * STRESS_TEST_CONFIG.ACTIVITY_LEVELS.MODERATE.percentage);
    const inactiveCount = userCount - superActiveCount - moderateCount;

    await this.generateUserBatch(schools, superActiveCount, 'SUPER_ACTIVE', county);
    await this.generateUserBatch(schools, moderateCount, 'MODERATE', county);
    await this.generateUserBatch(schools, inactiveCount, 'INACTIVE', county);

    console.log(`  ✓ ${county}: ${userCount} users across ${schools.length} schools`);
  }

  private async generateRuralUsers(
    userCount: number,
    schoolsByCounty: Record<string, SelectedSchool[]>
  ): Promise<void> {
    const majorCounties = ['NAIROBI', 'MOMBASA', 'KIAMBU', 'NAKURU', 'KISUMU', 'UASIN GISHU', 'MACHAKOS', 'KAKAMEGA'];
    const ruralSchools: SelectedSchool[] = [];

    Object.entries(schoolsByCounty).forEach(([county, schools]) => {
      if (!majorCounties.includes(county.toUpperCase())) {
        ruralSchools.push(...schools);
      }
    });

    if (ruralSchools.length === 0) return;

    const superActiveCount = Math.floor(userCount * STRESS_TEST_CONFIG.ACTIVITY_LEVELS.SUPER_ACTIVE.percentage);
    const moderateCount = Math.floor(userCount * STRESS_TEST_CONFIG.ACTIVITY_LEVELS.MODERATE.percentage);
    const inactiveCount = userCount - superActiveCount - moderateCount;

    await this.generateUserBatch(ruralSchools, superActiveCount, 'SUPER_ACTIVE', 'RURAL');
    await this.generateUserBatch(ruralSchools, moderateCount, 'MODERATE', 'RURAL');
    await this.generateUserBatch(ruralSchools, inactiveCount, 'INACTIVE', 'RURAL');
  }

  private async generateUserBatch(
    schools: SelectedSchool[],
    count: number,
    activityLevel: 'SUPER_ACTIVE' | 'MODERATE' | 'INACTIVE',
    county: string
  ): Promise<void> {
    for (let i = 0; i < count; i++) {
      const school = schools[i % schools.length];
      const user = this.createUser(school, activityLevel, county);
      this.users.push(user);

      if (!this.usersBySchool.has(school.id)) {
        this.usersBySchool.set(school.id, []);
      }
      this.usersBySchool.get(school.id)!.push(user);
    }
  }

  private createUser(
    school: SelectedSchool,
    activityLevel: 'SUPER_ACTIVE' | 'MODERATE' | 'INACTIVE',
    county: string
  ): GeneratedUser {
    const fullName = generateFullName();
    let phoneNumber = generateKenyanPhoneNumber();
    
    // Ensure uniqueness for the phone number set
    while (this.phoneNumbers.has(phoneNumber)) {
      phoneNumber = generateKenyanPhoneNumber();
    }
    this.phoneNumbers.add(phoneNumber);

    const childGrade = school.level.toUpperCase().includes('SECONDARY') 
      ? Math.floor(Math.random() * 4) + 9 
      : Math.floor(Math.random() * 8) + 1;

    return {
      id: crypto.randomUUID(),
      fullName,
      email: generateEmail(fullName),
      phoneNumber,
      schoolId: school.id,
      schoolName: school.name,
      role: 'PARENT',
      onboardingCompleted: true,
      activityLevel,
      childGrade,
      county,
      createdAt: randomDateBetween(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), new Date()),
    };
  }

  /**
   * Save users and their reliability scores
   */
  async saveUsersToDatabase(): Promise<void> {
    const batchSize = STRESS_TEST_CONFIG.USERS_PER_BATCH; // 50
    const totalBatches = Math.ceil(this.users.length / batchSize);

    console.log(`  💾 Saving ${this.users.length} users in ${totalBatches} batches...`);

    for (let i = 0; i < totalBatches; i++) {
      const batch = this.users.slice(i * batchSize, (i + 1) * batchSize);

      // Insert User Profiles
      await db.insert(users).values(batch.map(u => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phoneNumber: u.phoneNumber,
        schoolId: u.schoolId,
        schoolName: u.schoolName,
        role: u.role,
        childGrade: u.childGrade,
        onboardingCompleted: true,
        createdAt: u.createdAt,
      })));

      // Initialize Reliability Scores (Base score of 50)
      await db.insert(userReliabilityScores).values(batch.map(u => ({
        userId: u.id,
        reliabilityScore: "50.00",
      })));

      console.log(`  ✓ Batch ${i + 1}/${totalBatches} saved`);
    }
  }

  /* Getters and helper methods (Stay the same) */
  getUsersByActivity(level: 'SUPER_ACTIVE' | 'MODERATE' | 'INACTIVE') {
    return this.users.filter((u) => u.activityLevel === level);
  }
  getStatistics() {
  const byActivity: Record<string, number> = { SUPER_ACTIVE: 0, MODERATE: 0, INACTIVE: 0 };
  const byCounty: Record<string, number> = {};

  this.users.forEach((user) => {
    byActivity[user.activityLevel] = (byActivity[user.activityLevel] || 0) + 1;
    byCounty[user.county] = (byCounty[user.county] || 0) + 1;
  });

  return {
    total: this.users.length,
    byActivity,
    byCounty
  };
}

  /**
 * Get users belonging to a specific school
 */
getUsersBySchool(schoolId: string): GeneratedUser[] {
  // Logic to filter the generated users array by schoolId
  return this.users.filter((user) => user.schoolId === schoolId);
}
}