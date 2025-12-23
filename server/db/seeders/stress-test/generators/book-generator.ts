/**
 * Book Listing Generator - SCALED DOWN VERSION
 * Generates book listings with intentional swap matches and reporting stats
 */

import { db } from "../../../../db";
import { bookListings } from "../../../schema";
import { STRESS_TEST_CONFIG } from "../config/test-config";
import {
  getRandomBookTitle,
  getRandomPublisher,
  getConditionDescription,
  getRandomSwapReason,
  getSubjectsForGrade,
  randomDateBetween,
} from "../config/data-templates";
import type { GeneratedUser } from "./user-generator";

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
  willingToSwapFor: string;
  schoolId: string;
  county: string;
  createdAt: Date;
  matchGroup?: string;
  matchType?: 'SAME_SCHOOL' | 'SAME_COUNTY' | 'CROSS_COUNTY'; // Added for stats
}

export class BookGenerator {
  private listings: GeneratedListing[] = [];
  private listingId: number = 1;
  private matchGroups: Map<string, GeneratedListing[]> = new Map();

  async generateListings(
    users: GeneratedUser[],
    usersBySchool: Map<string, GeneratedUser[]>
  ): Promise<GeneratedListing[]> {
    console.log('  📚 Generating book listings for 200 users...');
    this.listings = []; // Reset listings

    const superActive = users.filter((u) => u.activityLevel === 'SUPER_ACTIVE');
    const moderate = users.filter((u) => u.activityLevel === 'MODERATE');
    const inactive = users.filter((u) => u.activityLevel === 'INACTIVE');

    // 1. Intentional Matches
    await this.generateSameSchoolMatches(usersBySchool);
    await this.generateSameCountyMatches(users);
    await this.generateCrossCountyMatches(users);

    // 2. Fill remaining target count with random listings
    await this.generateRemainingListings(superActive, moderate, inactive);

    console.log(`  ✓ Total listings: ${this.listings.length}`);
    return this.listings;
  }

  /**
   * STATISTICS METHOD - Required by Orchestrator
   */
  getStatistics() {
    const byMatchType: Record<string, number> = {
      'SAME_SCHOOL': 0,
      'SAME_COUNTY': 0,
      'CROSS_COUNTY': 0
    };

    this.listings.forEach(l => {
      if (l.matchType) {
        byMatchType[l.matchType]++;
      }
    });

    return {
      total: this.listings.length,
      matchGroups: this.matchGroups.size,
      byMatchType
    };
  }

  private async generateSameSchoolMatches(usersBySchool: Map<string, GeneratedUser[]>): Promise<void> {
    for (const [schoolId, schoolUsers] of Array.from(usersBySchool.entries())) {
      if (schoolUsers.length < 3) continue;
      const matchGroupsForSchool = Math.min(2, Math.floor(schoolUsers.length / 3));

      for (let i = 0; i < matchGroupsForSchool; i++) {
        const participants = this.selectRandomUsers(schoolUsers, 2);
        const matchGroupId = `SCHOOL_${schoolId}_${i}`;
        this.createCycleMatch(participants, matchGroupId, 'SAME_SCHOOL');
      }
    }
  }

  private async generateSameCountyMatches(users: GeneratedUser[]): Promise<void> {
    const usersByCounty = new Map<string, GeneratedUser[]>();
    users.forEach(u => {
      if (!usersByCounty.has(u.county)) usersByCounty.set(u.county, []);
      usersByCounty.get(u.county)!.push(u);
    });

    for (const [county, countyUsers] of Array.from(usersByCounty.entries())) {
      if (countyUsers.length < 5) continue;
      const participants = this.selectUsersDifferentSchools(countyUsers, 2);
      if (participants.length === 2) {
        this.createCycleMatch(participants, `COUNTY_${county}_${participants[0].id.substring(0,4)}`, 'SAME_COUNTY');
      }
    }
  }

  private async generateCrossCountyMatches(users: GeneratedUser[]): Promise<void> {
    for (let i = 0; i < 5; i++) {
      const participants = this.selectUsersDifferentCounties(users, 2);
      if (participants.length === 2) {
        this.createCycleMatch(participants, `CROSS_${i}`, 'CROSS_COUNTY');
      }
    }
  }

  private createCycleMatch(participants: GeneratedUser[], matchGroupId: string, matchType: any): void {
    const subjects = this.selectCycleSubjects(participants.length, participants[0].childGrade);
    const groupListings: GeneratedListing[] = [];

    for (let i = 0; i < participants.length; i++) {
      const user = participants[i];
      const hasSubject = subjects[i];
      const wantsSubject = subjects[(i + 1) % subjects.length];
      const listing = this.createListing(user, hasSubject, wantsSubject, matchGroupId);
      listing.matchType = matchType; // Assign match type for stats
      
      groupListings.push(listing);
      this.listings.push(listing);
    }
    this.matchGroups.set(matchGroupId, groupListings);
  }

  private createListing(user: GeneratedUser, subject: string, wantsSubject: string, matchGroupId?: string): GeneratedListing {
    const condition = this.getRandomCondition();
    return {
      id: this.listingId++,
      sellerId: user.id,
      title: getRandomBookTitle(subject),
      author: 'KIE / Various Authors',
      publisher: getRandomPublisher(),
      subject,
      classGrade: user.childGrade >= 9 ? `Form ${user.childGrade - 8}` : `Class ${user.childGrade}`,
      condition,
      description: `${getConditionDescription(condition)}. ${getRandomSwapReason()}.`,
      listingType: 'swap',
      listingStatus: 'active',
      willingToSwapFor: wantsSubject,
      schoolId: user.schoolId,
      county: user.county,
      createdAt: randomDateBetween(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()),
      matchGroup: matchGroupId,
    };
  }

  private async generateRemainingListings(superActive: GeneratedUser[], moderate: GeneratedUser[], inactive: GeneratedUser[]): Promise<void> {
    const remaining = STRESS_TEST_CONFIG.TARGET_LISTINGS - this.listings.length;
    if (remaining <= 0) return;

    this.generateRandomListings(superActive, Math.floor(remaining * 0.4));
    this.generateRandomListings(moderate, Math.floor(remaining * 0.5));
    this.generateRandomListings(inactive, Math.max(0, remaining - Math.floor(remaining * 0.9)));
  }

  private generateRandomListings(users: GeneratedUser[], count: number): void {
    if (users.length === 0) return;
    for (let i = 0; i < count; i++) {
      const user = users[i % users.length];
      const subjects = getSubjectsForGrade(user.childGrade);
      this.listings.push(this.createListing(user, subjects[0], subjects[Math.min(1, subjects.length - 1)]));
    }
  }

  private getRandomCondition(): string {
    const rand = Math.random();
    const dist = STRESS_TEST_CONFIG.CONDITION_DISTRIBUTION;
    if (rand < dist['Excellent']) return 'Excellent';
    if (rand < dist['Excellent'] + dist['Very Good']) return 'Very Good';
    if (rand < dist['Excellent'] + dist['Very Good'] + dist['Good']) return 'Good';
    if (rand < 0.9) return 'Fair';
    return 'Poor';
  }

  async saveListingsToDatabase(): Promise<void> {
    const batchSize = STRESS_TEST_CONFIG.LISTINGS_PER_BATCH || 50;
    const totalBatches = Math.ceil(this.listings.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const batch = this.listings.slice(i * batchSize, (i + 1) * batchSize);
      await db.insert(bookListings).values(batch.map(l => ({
        sellerId: l.sellerId,
        title: l.title,
        author: l.author,
        publisher: l.publisher,
        subject: l.subject,
        classGrade: l.classGrade,
        condition: l.condition,
        description: l.description,
        listingType: l.listingType,
        listingStatus: l.listingStatus,
        willingToSwapFor: l.willingToSwapFor,
        price: "0.00",
        createdAt: l.createdAt,
      })));
    }
  }

  /* Utility Selection Methods */
  private selectRandomUsers(users: GeneratedUser[], count: number) {
    return [...users].sort(() => Math.random() - 0.5).slice(0, count);
  }

  private selectUsersDifferentSchools(users: GeneratedUser[], count: number) {
    const selected: GeneratedUser[] = [];
    const usedSchools = new Set<string>();
    for (const u of [...users].sort(() => Math.random() - 0.5)) {
      if (!usedSchools.has(u.schoolId)) {
        selected.push(u);
        usedSchools.add(u.schoolId);
      }
      if (selected.length === count) break;
    }
    return selected;
  }

  private selectUsersDifferentCounties(users: GeneratedUser[], count: number) {
    const selected: GeneratedUser[] = [];
    const usedCounties = new Set<string>();
    for (const u of [...users].sort(() => Math.random() - 0.5)) {
      if (!usedCounties.has(u.county)) {
        selected.push(u);
        usedCounties.add(u.county);
      }
      if (selected.length === count) break;
    }
    return selected;
  }

  private selectCycleSubjects(count: number, grade: number): string[] {
    const available = getSubjectsForGrade(grade);
    return [...available].sort(() => Math.random() - 0.5).slice(0, count);
  }
}