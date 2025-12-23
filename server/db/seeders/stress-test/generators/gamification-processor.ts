/**
 * Gamification Processor
 *
 * Awards badges and processes achievements for all users
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
    console.log('  🏆 Processing gamification and awarding badges...');

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

        // Log progress every 200 users
        if (processed % 200 === 0) {
          console.log(`  ✓ Processed ${processed}/${users.length} users`);
        }
      } catch (error) {
        console.error(`  ⚠️  Error processing gamification for user ${user.id}:`, error);
      }
    }

    console.log(`  ✓ Total badges awarded: ${this.totalBadgesAwarded}`);
    console.log(`  ✓ Users with badges: ${this.badgeAwards.size}`);
  }

  /**
   * Get statistics
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
   * Get users by badge
   */
  getUsersByBadge(badgeId: string): string[] {
    const users: string[] = [];

    this.badgeAwards.forEach((badges, userId) => {
      if (badges.includes(badgeId)) {
        users.push(userId);
      }
    });

    return users;
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

    // Check if elite users got appropriate badges
    // (This would require cross-referencing with reliability scores)

    return {
      verified: issues.length === 0,
      issues,
    };
  }
}
