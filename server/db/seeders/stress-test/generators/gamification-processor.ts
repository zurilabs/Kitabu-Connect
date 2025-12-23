/**
 * Gamification Processor - SCALED DOWN VERSION
 * * Awards badges and processes achievements for 200 users
 * Adjusted logging intervals for better visibility
 */

import { checkAndAwardBadges } from "../../../../services/gamification.service";
import type { GeneratedUser } from "./user-generator";
import type { ReliabilityUpdate } from "./reliability-calculator";

export class GamificationProcessor {
  private badgeAwards: Map<string, string[]> = new Map();
  private totalBadgesAwarded: number = 0;

  /**
   * Process gamification for all users
   */
  async processGamification(
    users: GeneratedUser[],
    reliabilityUpdates: ReliabilityUpdate[]
  ): Promise<void> {
    console.log('  🏆 Processing gamification for 200 users...');

    let processed = 0;

    for (const user of users) {
      try {
        // Check and award badges for this user
        const newBadges = await checkAndAwardBadges(user.id);

        if (newBadges.length > 0) {
          this.badgeAwards.set(user.id, newBadges);
          this.totalBadgesAwarded += newBadges.length;
        }

        processed++;

        // SCALED LOGGING: Log progress every 20 users instead of 200
        // This ensures you see movement on your screen every few seconds
        if (processed % 20 === 0 || processed === users.length) {
          console.log(`  ✓ Processed ${processed}/${users.length} users`);
        }
      } catch (error) {
        console.error(`  ⚠️  Error for user ${user.id}:`, error);
      }
    }

    console.log(`  ✓ Total badges awarded: ${this.totalBadgesAwarded}`);
    console.log(`  ✓ Users with badges: ${this.badgeAwards.size}`);
  }

  /**
   * Get statistics (Remains same logic)
   */
  getStatistics(): {
    totalBadgesAwarded: number;
    usersWithBadges: number;
    badgeDistribution: Record<string, number>;
  } {
    const badgeDistribution: Record<string, number> = {};
    this.badgeAwards.forEach((badges) => {
      badges.forEach((badge) => {
        badgeDistribution[badge] = (badgeDistribution[badge] || 0) + 1;
      });
    });

    return {
      totalBadgesAwarded: this.totalBadgesAwarded,
      usersWithBadges: this.badgeAwards.size,
      badgeDistribution,
    };
  }

  /**
   * Verify badge awards
   */
  async verifyBadgeAwards(): Promise<{
    verified: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // Check if at least some users got badges
    if (this.badgeAwards.size === 0) {
      issues.push('No badges were awarded to any users');
    }

    // Optional: Add a check for "Super Active" users specifically 
    // since we expect them to have badges in a 200-user sample.

    return {
      verified: issues.length === 0,
      issues,
    };
  }
}