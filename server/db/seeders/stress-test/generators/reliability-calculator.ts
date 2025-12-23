/**
 * Reliability Score Calculator
 * * Calculates and persists realistic reliability scores based on participation history.
 */

import { db } from "../../../../db";
import { userReliabilityScores } from "../../../schema";
import { eq } from "drizzle-orm";
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

interface ParticipationStats {
  completed: number;
  cancelled: number;
  timeout: number;
}

export class ReliabilityCalculator {
  private updates: ReliabilityUpdate[] = [];

  /**
   * Calculate reliability scores based on participation history
   */
  async calculateScores(
    users: GeneratedUser[],
    participation: Map<string, ParticipationStats>
  ): Promise<ReliabilityUpdate[]> {
    console.log('  📊 Calculating reliability scores...');
    this.updates = []; // Reset updates array

    for (const user of users) {
      const stats = participation.get(user.id) ?? { completed: 0, cancelled: 0, timeout: 0 };
      const scoreData = this.calculateUserScore(stats);

      this.updates.push({
        userId: user.id,
        reliabilityScore: scoreData.score,
        totalSwapsCompleted: stats.completed,
        totalSwapsCancelled: stats.cancelled,
        totalCyclesCompleted: stats.completed,
        totalCyclesJoined: stats.completed + stats.cancelled + stats.timeout,
        penaltyPoints: scoreData.penaltyPoints,
        isSuspended: scoreData.score < 30,
      });
    }

    console.log(`  ✓ Reliability scores calculated for ${this.updates.length} users`);
    return this.updates;
  }

  /**
   * Internal logic for scoring algorithm
   */
  private calculateUserScore(stats: ParticipationStats): { score: number; penaltyPoints: number } {
    let score = 50; // Base score
    let penaltyPoints = 0;

    // Positive reinforcement
    score += stats.completed * 2;

    // Negative reinforcement
    const cancellationPenalty = stats.cancelled * 5;
    const timeoutPenalty = stats.timeout * 10;

    score -= (cancellationPenalty + timeoutPenalty);
    penaltyPoints = cancellationPenalty + timeoutPenalty;

    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    return { score, penaltyPoints };
  }

  /**
   * Persist updates to the database using controlled batches
   */
  async updateScoresInDatabase(): Promise<void> {
    const batchSize = 50; 
    const totalBatches = Math.ceil(this.updates.length / batchSize);

    console.log(`  💾 Persisting ${this.updates.length} reliability updates in ${totalBatches} batches...`);

    for (let i = 0; i < totalBatches; i++) {
      const batch = this.updates.slice(i * batchSize, (i + 1) * batchSize);

      // Execute updates in parallel within the batch for speed
      await Promise.all(
        batch.map((update) =>
          db
            .update(userReliabilityScores)
            .set({
              // Use string for decimal fields to satisfy Drizzle/MySQL types
              reliabilityScore: update.reliabilityScore.toFixed(2),
              totalSwapsCompleted: update.totalSwapsCompleted,
              totalSwapsCancelled: update.totalSwapsCancelled,
              totalCyclesCompleted: update.totalCyclesCompleted,
              totalCyclesJoined: update.totalCyclesJoined,
              penaltyPoints: update.penaltyPoints,
              isSuspended: update.isSuspended,
            })
            .where(eq(userReliabilityScores.userId, update.userId))
        )
      );

      if ((i + 1) % 2 === 0 || i === totalBatches - 1) {
        console.log(`  ✓ Batch ${i + 1}/${totalBatches} committed`);
      }
    }
  }

  /**
   * Generate metrics for the stress test report
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
    let suspendedCount = 0;

    for (const update of this.updates) {
      totalScore += update.reliabilityScore;

      if (update.isSuspended) {
        suspendedCount++;
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
    }

    return {
      total: this.updates.length,
      byTier,
      suspended: suspendedCount,
      averageScore: this.updates.length > 0 ? totalScore / this.updates.length : 0,
    };
  }

  /**
   * Helper for debugging or targeted testing
   */
  getUsersByTier() {
    const tiers: Record<string, string[]> = {
      elite: [],
      reliable: [],
      average: [],
      poor: [],
      suspended: [],
    };

    for (const update of this.updates) {
      if (update.isSuspended) tiers.suspended.push(update.userId);
      else if (update.reliabilityScore >= 90) tiers.elite.push(update.userId);
      else if (update.reliabilityScore >= 70) tiers.reliable.push(update.userId);
      else if (update.reliabilityScore >= 50) tiers.average.push(update.userId);
      else tiers.poor.push(update.userId);
    }

    return tiers;
  }
}