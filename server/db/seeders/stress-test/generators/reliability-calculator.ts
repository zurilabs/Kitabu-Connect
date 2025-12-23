/**
 * Reliability Score Calculator
 *
 * Calculates realistic reliability scores based on swap history
 */

import { db } from "../../../../db";
import { userReliabilityScores } from "../../../schema";
import { eq } from "drizzle-orm";
import { STRESS_TEST_CONFIG } from "../config/test-config";
import type { GeneratedUser } from "./user-generator";

export interface ReliabilityUpdate {
  userId: string;
  reliabilityScore: number;
  totalSwapsCompleted: number;
  totalSwapsCancelled: number;
  totalCyclesCompleted: number;
  totalCyclesJoined: number;
  penaltyPoints: number;
  isSuspended: boolean;
}

export class ReliabilityCalculator {
  private updates: ReliabilityUpdate[] = [];

  /**
   * Calculate reliability scores based on participation history
   */
  async calculateScores(
    users: GeneratedUser[],
    participation: Map<string, { completed: number; cancelled: number; timeout: number }>
  ): Promise<ReliabilityUpdate[]> {
    console.log('  📊 Calculating reliability scores...');

    for (const user of users) {
      const stats = participation.get(user.id) || { completed: 0, cancelled: 0, timeout: 0 };
      const score = this.calculateUserScore(stats);

      this.updates.push({
        userId: user.id,
        reliabilityScore: score.score,
        totalSwapsCompleted: stats.completed,
        totalSwapsCancelled: stats.cancelled,
        totalCyclesCompleted: stats.completed,
        totalCyclesJoined: stats.completed + stats.cancelled + stats.timeout,
        penaltyPoints: score.penaltyPoints,
        isSuspended: score.score < 30,
      });
    }

    console.log(`  ✓ Reliability scores calculated for ${this.updates.length} users`);

    return this.updates;
  }

  /**
   * Calculate individual user score
   */
  private calculateUserScore(stats: {
    completed: number;
    cancelled: number;
    timeout: number;
  }): { score: number; penaltyPoints: number } {
    // Start with base score of 50
    let score = 50;
    let penaltyPoints = 0;

    // Rewards for completed swaps (+2 per completion)
    score += stats.completed * 2;

    // Penalties for cancellations (-5 per cancellation)
    score -= stats.cancelled * 5;
    penaltyPoints += stats.cancelled * 5;

    // Penalties for timeouts (-10 per timeout, more severe)
    score -= stats.timeout * 10;
    penaltyPoints += stats.timeout * 10;

    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    return { score, penaltyPoints };
  }

  /**
   * Update reliability scores in database
   */
  async updateScoresInDatabase(): Promise<void> {
    const batchSize = 200; // Process 200 users at a time
    const totalBatches = Math.ceil(this.updates.length / batchSize);

    console.log(`  💾 Updating ${this.updates.length} reliability scores in ${totalBatches} batches...`);

    for (let i = 0; i < totalBatches; i++) {
      const batch = this.updates.slice(i * batchSize, (i + 1) * batchSize);

      // Update each user's reliability score
      for (const update of batch) {
        await db
          .update(userReliabilityScores)
          .set({
            reliabilityScore: update.reliabilityScore.toFixed(2),
            totalSwapsCompleted: update.totalSwapsCompleted,
            totalSwapsCancelled: update.totalSwapsCancelled,
            totalCyclesCompleted: update.totalCyclesCompleted,
            totalCyclesJoined: update.totalCyclesJoined,
            penaltyPoints: update.penaltyPoints,
            isSuspended: update.isSuspended,
          })
          .where(eq(userReliabilityScores.userId, update.userId));
      }

      if ((i + 1) % 5 === 0 || i === totalBatches - 1) {
        console.log(`  ✓ Batch ${i + 1}/${totalBatches} updated`);
      }
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    total: number;
    byTier: Record<string, number>;
    suspended: number;
    averageScore: number;
  } {
    const byTier: Record<string, number> = {
      'Elite (90-100)': 0,
      'Reliable (70-89)': 0,
      'Average (50-69)': 0,
      'Poor (30-49)': 0,
      'Suspended (0-29)': 0,
    };

    let totalScore = 0;
    let suspended = 0;

    this.updates.forEach((update) => {
      totalScore += update.reliabilityScore;

      if (update.isSuspended) {
        suspended++;
        byTier['Suspended (0-29)']++;
      } else if (update.reliabilityScore >= 90) {
        byTier['Elite (90-100)']++;
      } else if (update.reliabilityScore >= 70) {
        byTier['Reliable (70-89)']++;
      } else if (update.reliabilityScore >= 50) {
        byTier['Average (50-69)']++;
      } else {
        byTier['Poor (30-49)']++;
      }
    });

    return {
      total: this.updates.length,
      byTier,
      suspended,
      averageScore: totalScore / this.updates.length,
    };
  }

  /**
   * Get users by reliability tier (for verification)
   */
  getUsersByTier(): {
    elite: string[];
    reliable: string[];
    average: string[];
    poor: string[];
    suspended: string[];
  } {
    const tiers = {
      elite: [] as string[],
      reliable: [] as string[],
      average: [] as string[],
      poor: [] as string[],
      suspended: [] as string[],
    };

    this.updates.forEach((update) => {
      if (update.isSuspended) {
        tiers.suspended.push(update.userId);
      } else if (update.reliabilityScore >= 90) {
        tiers.elite.push(update.userId);
      } else if (update.reliabilityScore >= 70) {
        tiers.reliable.push(update.userId);
      } else if (update.reliabilityScore >= 50) {
        tiers.average.push(update.userId);
      } else {
        tiers.poor.push(update.userId);
      }
    });

    return tiers;
  }
}
