/**
 * Book Listing Generator
 *
 * Generates 5000+ book listings with intentional swap matches
 * Creates realistic swap cycles by design
 */

import crypto from "crypto";
import { db } from "../../../../db";
import { bookListings } from "../../../schema";
import { STRESS_TEST_CONFIG, getListingsRange } from "../config/test-config";
import {
  getRandomBookTitle,
  getRandomPublisher,
  getConditionDescription,
  getRandomSwapReason,
  getSubjectsForGrade,
  randomDateBetween,
} from "../config/data-templates";
import type { GeneratedUser } from "./user-generator";
import type { SelectedSchool } from "./school-selector";

export interface GeneratedListing {
  id: number;
  sellerId: string;
  title: string;
  author: string;
  publisher: string;
  subject: string;
  classGrade: string;
  condition: string;
  description: string;
  listingType: string;
  listingStatus: string;
  willingToSwapFor: string; // Comma-separated subjects for swap matching
  schoolId: string;
  county: string;
  createdAt: Date;
  matchGroup?: string; // For tracking intentional matches
}

export class BookGenerator {
  private listings: GeneratedListing[] = [];
  private listingId: number = 1;
  private matchGroups: Map<string, GeneratedListing[]> = new Map();

  /**
   * Generate book listings for all users
   */
  async generateListings(
    users: GeneratedUser[],
    usersBySchool: Map<string, GeneratedUser[]>
  ): Promise<GeneratedListing[]> {
    console.log('  📚 Generating book listings with swap matches...');

    // Group users by activity level
    const superActive = users.filter((u) => u.activityLevel === 'SUPER_ACTIVE');
    const moderate = users.filter((u) => u.activityLevel === 'MODERATE');
    const inactive = users.filter((u) => u.activityLevel === 'INACTIVE');

    // Generate listings with intentional matches
    await this.generateSameSchoolMatches(usersBySchool);
    await this.generateSameCountyMatches(users);
    await this.generateCrossCountyMatches(users);

    // Fill remaining quota with random listings
    await this.generateRemainingListings(superActive, moderate, inactive);

    console.log(`  ✓ Total listings generated: ${this.listings.length}`);
    console.log(`  ✓ Match groups created: ${this.matchGroups.size}`);

    return this.listings;
  }

  /**
   * Generate same-school swap matches (highest priority, FREE cost)
   */
  private async generateSameSchoolMatches(
    usersBySchool: Map<string, GeneratedUser[]>
  ): Promise<void> {
    let matchGroupsCreated = 0;

    // For each school with 10+ students, create 2-way and 3-way matches
    for (const [schoolId, schoolUsers] of Array.from(usersBySchool.entries())) {
      if (schoolUsers.length < 10) continue;

      // Create multiple match groups per school
      const matchGroupsForSchool = Math.min(5, Math.floor(schoolUsers.length / 4));

      for (let i = 0; i < matchGroupsForSchool; i++) {
        const cycleSize = Math.random() < 0.7 ? 2 : 3; // 70% 2-way, 30% 3-way
        const participants = this.selectRandomUsers(schoolUsers, cycleSize);

        if (participants.length === cycleSize) {
          const matchGroupId = `SAME_SCHOOL_${schoolId}_${i}`;
          this.createCycleMatch(participants, matchGroupId, 'same-school');
          matchGroupsCreated++;
        }
      }
    }

    console.log(`  ✓ Same-school matches created: ${matchGroupsCreated} groups`);
  }

  /**
   * Generate same-county swap matches (medium priority, KES 50-100 cost)
   */
  private async generateSameCountyMatches(users: GeneratedUser[]): Promise<void> {
    const usersByCounty: Map<string, GeneratedUser[]> = new Map();

    // Group users by county
    users.forEach((user) => {
      if (!usersByCounty.has(user.county)) {
        usersByCounty.set(user.county, []);
      }
      usersByCounty.get(user.county)!.push(user);
    });

    let matchGroupsCreated = 0;

    // Create county-level matches
    for (const [county, countyUsers] of Array.from(usersByCounty.entries())) {
      if (countyUsers.length < 20) continue;

      const matchGroupsForCounty = Math.min(10, Math.floor(countyUsers.length / 10));

      for (let i = 0; i < matchGroupsForCounty; i++) {
        // Mix of 2-way, 3-way, and 4-way
        const rand = Math.random();
        const cycleSize = rand < 0.5 ? 2 : rand < 0.8 ? 3 : 4;

        // Select users from DIFFERENT schools in same county
        const participants = this.selectUsersDifferentSchools(countyUsers, cycleSize);

        if (participants.length === cycleSize) {
          const matchGroupId = `SAME_COUNTY_${county}_${i}`;
          this.createCycleMatch(participants, matchGroupId, 'same-county');
          matchGroupsCreated++;
        }
      }
    }

    console.log(`  ✓ Same-county matches created: ${matchGroupsCreated} groups`);
  }

  /**
   * Generate cross-county swap matches (lower priority, KES 200-300 cost)
   */
  private async generateCrossCountyMatches(users: GeneratedUser[]): Promise<void> {
    let matchGroupsCreated = 0;
    const totalGroups = 20; // Create 20 cross-county match groups

    for (let i = 0; i < totalGroups; i++) {
      // Select users from different counties
      const cycleSize = Math.random() < 0.3 ? 3 : Math.random() < 0.7 ? 4 : 5;
      const participants = this.selectUsersDifferentCounties(users, cycleSize);

      if (participants.length === cycleSize) {
        const matchGroupId = `CROSS_COUNTY_${i}`;
        this.createCycleMatch(participants, matchGroupId, 'cross-county');
        matchGroupsCreated++;
      }
    }

    console.log(`  ✓ Cross-county matches created: ${matchGroupsCreated} groups`);
  }

  /**
   * Create a swap cycle match group
   */
  private createCycleMatch(
    participants: GeneratedUser[],
    matchGroupId: string,
    matchType: string
  ): void {
    if (participants.length === 0) {
      console.log(`  ⚠️  No participants for match group ${matchGroupId}, skipping...`);
      return;
    }

    // Select subjects that will form a cycle
    const subjects = this.selectCycleSubjects(participants.length, participants[0].childGrade);

    // Create listings for each participant
    const groupListings: GeneratedListing[] = [];

    for (let i = 0; i < participants.length; i++) {
      const user = participants[i];
      const hasSubject = subjects[i];
      const wantsSubject = subjects[(i + 1) % subjects.length]; // Cycle: A→B, B→C, C→A

      const listing = this.createListing(
        user,
        hasSubject,
        wantsSubject,
        matchGroupId
      );

      groupListings.push(listing);
      this.listings.push(listing);
    }

    this.matchGroups.set(matchGroupId, groupListings);
  }

  /**
   * Select subjects that form a valid cycle
   */
  private selectCycleSubjects(count: number, grade: number): string[] {
    const availableSubjects = getSubjectsForGrade(grade);
    const selected: string[] = [];

    // Randomly select unique subjects
    while (selected.length < count) {
      const subject = availableSubjects[Math.floor(Math.random() * availableSubjects.length)];
      if (!selected.includes(subject)) {
        selected.push(subject);
      }
    }

    return selected;
  }

  /**
   * Create individual book listing
   */
  private createListing(
    user: GeneratedUser,
    subject: string,
    wantsSubject: string,
    matchGroupId?: string
  ): GeneratedListing {
    const title = getRandomBookTitle(subject);
    const publisher = getRandomPublisher();
    const condition = this.getRandomCondition();
    const description = `${getConditionDescription(condition)}. ${getRandomSwapReason()}.`;

    // Create listing with backdated createdAt
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const createdAt = randomDateBetween(oneMonthAgo, new Date());

    return {
      id: this.listingId++,
      sellerId: user.id,
      title,
      author: 'Kenya Institute of Education',
      publisher,
      subject,
      classGrade: this.gradeToString(user.childGrade),
      condition,
      description,
      listingType: 'swap',
      listingStatus: 'active',
      willingToSwapFor: wantsSubject, // Single subject for clean matching
      schoolId: user.schoolId,
      county: user.county,
      createdAt,
      matchGroup: matchGroupId,
    };
  }

  /**
   * Generate remaining listings to reach target quota
   */
  private async generateRemainingListings(
    superActive: GeneratedUser[],
    moderate: GeneratedUser[],
    inactive: GeneratedUser[]
  ): Promise<void> {
    const currentCount = this.listings.length;
    const targetCount = STRESS_TEST_CONFIG.TARGET_LISTINGS;
    const remaining = targetCount - currentCount;

    if (remaining <= 0) return;

    console.log(`  ✓ Generating ${remaining} additional random listings...`);

    // Distribute remaining across activity levels
    const superActiveRemaining = Math.floor(remaining * 0.4);
    const moderateRemaining = Math.floor(remaining * 0.5);
    const inactiveRemaining = remaining - superActiveRemaining - moderateRemaining;

    this.generateRandomListings(superActive, superActiveRemaining);
    this.generateRandomListings(moderate, moderateRemaining);
    this.generateRandomListings(inactive, inactiveRemaining);
  }

  /**
   * Generate random listings (may not match)
   */
  private generateRandomListings(users: GeneratedUser[], count: number): void {
    if (users.length === 0) {
      console.log(`  ⚠️  No users available for generating ${count} listings, skipping...`);
      return;
    }

    for (let i = 0; i < count; i++) {
      const user = users[i % users.length];
      const subjects = getSubjectsForGrade(user.childGrade);
      const hasSubject = subjects[Math.floor(Math.random() * subjects.length)];
      const wantsSubject = subjects[Math.floor(Math.random() * subjects.length)];

      const listing = this.createListing(user, hasSubject, wantsSubject);
      this.listings.push(listing);
    }
  }

  /**
   * Convert numeric grade to string format
   */
  private gradeToString(grade: number): string {
    if (grade >= 9 && grade <= 12) {
      // Secondary: Form 1-4
      return `Form ${grade - 8}`;
    } else {
      // Primary: Class 1-8
      return `Class ${grade}`;
    }
  }

  /**
   * Select random users from list
   */
  private selectRandomUsers(users: GeneratedUser[], count: number): GeneratedUser[] {
    const shuffled = [...users].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Select users from different schools
   */
  private selectUsersDifferentSchools(users: GeneratedUser[], count: number): GeneratedUser[] {
    const selected: GeneratedUser[] = [];
    const usedSchools = new Set<string>();

    const shuffled = [...users].sort(() => Math.random() - 0.5);

    for (const user of shuffled) {
      if (!usedSchools.has(user.schoolId)) {
        selected.push(user);
        usedSchools.add(user.schoolId);

        if (selected.length === count) break;
      }
    }

    return selected;
  }

  /**
   * Select users from different counties
   */
  private selectUsersDifferentCounties(users: GeneratedUser[], count: number): GeneratedUser[] {
    const selected: GeneratedUser[] = [];
    const usedCounties = new Set<string>();

    const shuffled = [...users].sort(() => Math.random() - 0.5);

    for (const user of shuffled) {
      if (!usedCounties.has(user.county)) {
        selected.push(user);
        usedCounties.add(user.county);

        if (selected.length === count) break;
      }
    }

    return selected;
  }

  /**
   * Get random book condition
   */
  private getRandomCondition(): string {
    const rand = Math.random();
    const dist = STRESS_TEST_CONFIG.CONDITION_DISTRIBUTION;

    if (rand < dist['Excellent']) return 'Excellent';
    if (rand < dist['Excellent'] + dist['Very Good']) return 'Very Good';
    if (rand < dist['Excellent'] + dist['Very Good'] + dist['Good']) return 'Good';
    if (rand < 1 - dist['Poor']) return 'Fair';
    return 'Poor';
  }

  /**
   * Save listings to database in batches
   */
  async saveListingsToDatabase(): Promise<void> {
    const batchSize = STRESS_TEST_CONFIG.LISTINGS_PER_BATCH;
    const totalBatches = Math.ceil(this.listings.length / batchSize);

    console.log(`  💾 Saving ${this.listings.length} listings in ${totalBatches} batches...`);

    for (let i = 0; i < totalBatches; i++) {
      const batch = this.listings.slice(i * batchSize, (i + 1) * batchSize);

      const listingRecords = batch.map((listing) => ({
        sellerId: listing.sellerId,
        title: listing.title,
        author: listing.author,
        publisher: listing.publisher,
        subject: listing.subject,
        classGrade: listing.classGrade,
        condition: listing.condition,
        description: listing.description,
        listingType: listing.listingType,
        listingStatus: listing.listingStatus,
        willingToSwapFor: listing.willingToSwapFor,
        price: "0.00", // Swap listings have no price
        createdAt: listing.createdAt,
      }));

      await db.insert(bookListings).values(listingRecords);

      if ((i + 1) % 10 === 0 || i === totalBatches - 1) {
        console.log(`  ✓ Batch ${i + 1}/${totalBatches} saved`);
      }
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    total: number;
    matchGroups: number;
    byMatchType: Record<string, number>;
    bySubject: Record<string, number>;
    byCondition: Record<string, number>;
  } {
    const byMatchType: Record<string, number> = {};
    const bySubject: Record<string, number> = {};
    const byCondition: Record<string, number> = {};

    this.listings.forEach((listing) => {
      if (listing.matchGroup) {
        const type = listing.matchGroup.split('_')[0] + '_' + listing.matchGroup.split('_')[1];
        byMatchType[type] = (byMatchType[type] || 0) + 1;
      }

      bySubject[listing.subject] = (bySubject[listing.subject] || 0) + 1;
      byCondition[listing.condition] = (byCondition[listing.condition] || 0) + 1;
    });

    return {
      total: this.listings.length,
      matchGroups: this.matchGroups.size,
      byMatchType,
      bySubject,
      byCondition,
    };
  }
}
