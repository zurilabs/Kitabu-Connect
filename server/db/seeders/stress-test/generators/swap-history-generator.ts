/**
 * Swap History Generator
 *
 * Simulates 650 historical swap cycles:
 * - 500 completed cycles
 * - 100 cancelled cycles
 * - 50 timed-out cycles
 */

import crypto from "crypto";
import { db } from "../../../../db";
import { swapCycles, cycleParticipants } from "../../../schema";
import { STRESS_TEST_CONFIG } from "../config/test-config";
import { randomDateBetween } from "../config/data-templates";
import type { GeneratedUser } from "./user-generator";
import type { GeneratedListing } from "./book-generator";

export interface HistoricalCycle {
  id: string;
  cycleType: string;
  status: string;
  priorityScore: string;
  primaryCounty: string;
  totalLogisticsCost: string;
  avgCostPerParticipant: string;
  participants: GeneratedUser[]; // full user objects
  createdAt: Date;
  completedAt?: Date;
}

export class SwapHistoryGenerator {
  private historicalCycles: HistoricalCycle[] = [];

  /**
   * Generate historical swap cycles
   */
  async generateHistory(users: GeneratedUser[]): Promise<HistoricalCycle[]> {
    console.log('  🔄 Generating historical swap cycles...');

    // Generate completed cycles (80% success rate is realistic)
    await this.generateCompletedCycles(users, STRESS_TEST_CONFIG.COMPLETED_CYCLES);

    // Generate cancelled cycles
    await this.generateCancelledCycles(users, STRESS_TEST_CONFIG.CANCELLED_CYCLES);

    // Generate timed-out cycles
    await this.generateTimedOutCycles(users, STRESS_TEST_CONFIG.TIMEOUT_CYCLES);

    console.log(`  ✓ Total historical cycles: ${this.historicalCycles.length}`);

    return this.historicalCycles;
  }

  /**
   * Generate completed cycles
   */
  private async generateCompletedCycles(users: GeneratedUser[], count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      const cycleSize = this.getRandomCycleSize();
      const participants = this.selectRandomUsers(users, cycleSize);

      if (participants.length !== cycleSize) continue;

      const cycle = this.createHistoricalCycle(participants, 'completed');
      this.historicalCycles.push(cycle);
    }

    console.log(`  ✓ Completed cycles generated: ${count}`);
  }

  /**
   * Generate cancelled cycles
   */
  private async generateCancelledCycles(users: GeneratedUser[], count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      const cycleSize = this.getRandomCycleSize();
      const participants = this.selectRandomUsers(users, cycleSize);

      if (participants.length !== cycleSize) continue;

      const cycle = this.createHistoricalCycle(participants, 'cancelled');
      this.historicalCycles.push(cycle);
    }

    console.log(`  ✓ Cancelled cycles generated: ${count}`);
  }

  /**
   * Generate timed-out cycles
   */
  private async generateTimedOutCycles(users: GeneratedUser[], count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      const cycleSize = this.getRandomCycleSize();
      const participants = this.selectRandomUsers(users, cycleSize);

      if (participants.length !== cycleSize) continue;

      const cycle = this.createHistoricalCycle(participants, 'timeout');
      this.historicalCycles.push(cycle);
    }

    console.log(`  ✓ Timed-out cycles generated: ${count}`);
  }

  /**
   * Create a historical cycle
   */
  private createHistoricalCycle(participants: GeneratedUser[], status: string): HistoricalCycle {
    const cycleType = `${participants.length}-way`;
    const primaryCounty = participants[0].county;

    // Calculate realistic costs based on county spread
    const isSameCounty = participants.every((p) => p.county === primaryCounty);
    const avgCost = isSameCounty ? 50 : 150; // Simplified cost calculation
    const totalCost = avgCost * participants.length;

    // Priority score (higher for same county, completed cycles)
    const baseScore = isSameCounty ? 80 : 60;
    const statusBonus = status === 'completed' ? 10 : 0;
    const priorityScore = baseScore + statusBonus;

    // Backdate creation (1-2 months ago)
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const createdAt = randomDateBetween(twoMonthsAgo, oneWeekAgo);

    // Completion date (if completed)
    let completedAt: Date | undefined;
    if (status === 'completed') {
      const completionTime = new Date(createdAt);
      completionTime.setDate(completionTime.getDate() + Math.floor(Math.random() * 5 + 2)); // 2-7 days later
      completedAt = completionTime;
    }

    return {
      id: crypto.randomUUID(),
      cycleType,
      status,
      priorityScore: priorityScore.toFixed(2),
      primaryCounty,
      totalLogisticsCost: totalCost.toFixed(2),
      avgCostPerParticipant: avgCost.toFixed(2),
      participants, // full user objects
      createdAt,
      completedAt,
    };
  }

  /**
   * Get random cycle size based on distribution
   */
  private getRandomCycleSize(): number {
    const rand = Math.random();
    const dist = STRESS_TEST_CONFIG.SWAP_MATCHING.CYCLE_SIZES;

    if (rand < dist['2-way']) return 2;
    if (rand < dist['2-way'] + dist['3-way']) return 3;
    if (rand < dist['2-way'] + dist['3-way'] + dist['4-way']) return 4;
    return 5;
  }

  /**
   * Select random users (ensuring uniqueness)
   */
  private selectRandomUsers(users: GeneratedUser[], count: number): GeneratedUser[] {
    const shuffled = [...users].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Save historical cycles to database
   */
  async saveCyclesToDatabase(): Promise<void> {
    const batchSize = STRESS_TEST_CONFIG.CYCLES_PER_BATCH;
    const totalBatches = Math.ceil(this.historicalCycles.length / batchSize);

    console.log(`  💾 Saving ${this.historicalCycles.length} cycles in ${totalBatches} batches...`);

    for (let i = 0; i < totalBatches; i++) {
      const batch = this.historicalCycles.slice(i * batchSize, (i + 1) * batchSize);

      // Insert cycle records
      for (const cycle of batch) {
        const confirmationDeadline = new Date(cycle.createdAt);
        confirmationDeadline.setHours(confirmationDeadline.getHours() + 48);

        const completionDeadline = new Date(cycle.createdAt);
        completionDeadline.setDate(completionDeadline.getDate() + 7);

        await db.insert(swapCycles).values({
          id: cycle.id,
          cycleType: cycle.cycleType,
          status: cycle.status,
          priorityScore: cycle.priorityScore,
          primaryCounty: cycle.primaryCounty,
          isSameCounty: cycle.participants.length > 0,
          isSameZone: false,
          totalLogisticsCost: cycle.totalLogisticsCost,
          avgCostPerParticipant: cycle.avgCostPerParticipant,
          maxDistanceKm: "50.00",
          avgDistanceKm: "25.00",
          confirmationDeadline,
          completionDeadline,
          totalParticipantsCount: cycle.participants.length,
          confirmedParticipantsCount: cycle.status === 'completed' ? cycle.participants.length : 0,
          createdAt: cycle.createdAt,
        });

        // Insert participant records
        for (let j = 0; j < cycle.participants.length; j++) {
          const user = cycle.participants[j];
          const nextUser = cycle.participants[(j + 1) % cycle.participants.length];

          const participantStatus =
            cycle.status === 'completed'
              ? 'completed'
              : cycle.status === 'cancelled'
              ? 'cancelled'
              : 'timeout';

          await db.insert(cycleParticipants).values({
            cycleId: cycle.id,
            userId: user.id,
            userSchoolId: user.schoolId, // Add the missing field
            positionInCycle: j,
            bookToGiveId: Math.floor(Math.random() * 5000) + 1, // Random book ID
            bookToReceiveId: Math.floor(Math.random() * 5000) + 1,
            schoolCounty: user.county,
            schoolZone: '',
            schoolName: user.schoolName,
            schoolCoordinatesX: "0",
            schoolCoordinatesY: "0",
            logisticsCost: cycle.avgCostPerParticipant,
            status: participantStatus,
            confirmed: cycle.status === 'completed',
            confirmedAt: cycle.status === 'completed' ? cycle.createdAt : null,
            bookDroppedOff: cycle.status === 'completed',
            bookCollected: cycle.status === 'completed',
            collectedAt: cycle.completedAt,
            collectionQrCode: `HIST-${cycle.id}-${user.id}`,
          });
        }
      }

      if ((i + 1) % 5 === 0 || i === totalBatches - 1) {
        console.log(`  ✓ Batch ${i + 1}/${totalBatches} saved`);
      }
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    total: number;
    byStatus: Record<string, number>;
    byCycleSize: Record<string, number>;
    totalParticipants: number;
  } {
    const byStatus: Record<string, number> = {};
    const byCycleSize: Record<string, number> = {};
    let totalParticipants = 0;

    this.historicalCycles.forEach((cycle) => {
      byStatus[cycle.status] = (byStatus[cycle.status] || 0) + 1;
      byCycleSize[cycle.cycleType] = (byCycleSize[cycle.cycleType] || 0) + 1;
      totalParticipants += cycle.participants.length;
    });

    return {
      total: this.historicalCycles.length,
      byStatus,
      byCycleSize,
      totalParticipants,
    };
  }

  /**
   * Get user participation map (for reliability calculation)
   */
  getUserParticipation(): Map<string, { completed: number; cancelled: number; timeout: number }> {
    const participation = new Map<
      string,
      { completed: number; cancelled: number; timeout: number }
    >();

    this.historicalCycles.forEach((cycle) => {
      cycle.participants.forEach((user) => {
        if (!participation.has(user.id)) {
          participation.set(user.id, { completed: 0, cancelled: 0, timeout: 0 });
        }

        const stats = participation.get(user.id)!;
        if (cycle.status === 'completed') stats.completed++;
        else if (cycle.status === 'cancelled') stats.cancelled++;
        else if (cycle.status === 'timeout') stats.timeout++;
      });
    });

    return participation;
  }
}
