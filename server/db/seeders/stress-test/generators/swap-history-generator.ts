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
  participants: GeneratedUser[];
  createdAt: Date;
  completedAt?: Date;
}

export class SwapHistoryGenerator {
  private historicalCycles: HistoricalCycle[] = [];

  getStatistics() {
    const byStatus: Record<string, number> = { completed: 0, cancelled: 0, timeout: 0 };
    let totalParticipants = 0;
    this.historicalCycles.forEach((cycle) => {
      byStatus[cycle.status] = (byStatus[cycle.status] || 0) + 1;
      totalParticipants += cycle.participants.length;
    });
    return { total: this.historicalCycles.length, byStatus, totalParticipants };
  }

  async generateHistory(users: GeneratedUser[]): Promise<HistoricalCycle[]> {
    this.historicalCycles = [];
    const statuses = ['completed', 'cancelled', 'timeout'];
    for (const status of statuses) {
      const count = STRESS_TEST_CONFIG[`${status.toUpperCase()}_CYCLES` as keyof typeof STRESS_TEST_CONFIG] as number || 5;
      for (let i = 0; i < count; i++) {
        const participants = this.selectRandomUsers(users, Math.random() < 0.7 ? 2 : 3);
        if (participants.length >= 2) this.historicalCycles.push(this.createHistoricalCycle(participants, status));
      }
    }
    return this.historicalCycles;
  }

  private createHistoricalCycle(participants: GeneratedUser[], status: string): HistoricalCycle {
    const createdAt = randomDateBetween(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), new Date());
    return {
      id: crypto.randomUUID(),
      cycleType: `${participants.length}-way`,
      status,
      priorityScore: "75.00",
      primaryCounty: participants[0].county,
      totalLogisticsCost: (participants.length * 100).toFixed(2),
      avgCostPerParticipant: "100.00",
      participants,
      createdAt,
      completedAt: status === 'completed' ? new Date() : undefined,
    };
  }

  async saveCyclesToDatabase(listings: GeneratedListing[]): Promise<void> {
    // Map users to their actual generated book IDs
    const userBookMap = new Map<string, number[]>();
    listings.forEach(l => {
      if (!userBookMap.has(l.sellerId)) userBookMap.set(l.sellerId, []);
      userBookMap.get(l.sellerId)!.push(l.id);
    });

    for (const cycle of this.historicalCycles) {
      await db.insert(swapCycles).values({
        id: cycle.id,
        cycleType: cycle.cycleType,
        status: cycle.status,
        priorityScore: cycle.priorityScore,
        primaryCounty: cycle.primaryCounty,
        totalParticipantsCount: cycle.participants.length,
        createdAt: cycle.createdAt,
      });

      const participantInserts = cycle.participants.map((user, index) => {
        const nextUser = cycle.participants[(index + 1) % cycle.participants.length];
        const giveIds = userBookMap.get(user.id) || [1]; 
        const receiveIds = userBookMap.get(nextUser.id) || [1];

        return {
          cycleId: cycle.id,
          userId: user.id,
          userSchoolId: user.schoolId,
          positionInCycle: index,
          bookToGiveId: giveIds[0], // REAL ID from Phase 3
          bookToReceiveId: receiveIds[0], // REAL ID from Phase 3
          status: cycle.status,
          logisticsCost: "100.00",
          confirmed: cycle.status === 'completed',
        };
      });
      await db.insert(cycleParticipants).values(participantInserts);
    }
  }

  getUserParticipation() {
    const map = new Map();
    this.historicalCycles.forEach(c => c.participants.forEach(p => {
      const s = map.get(p.id) || { completed: 0, cancelled: 0, timeout: 0 };
      s[c.status as keyof typeof s]++;
      map.set(p.id, s);
    }));
    return map;
  }

  private selectRandomUsers(users: GeneratedUser[], count: number) {
    return [...users].sort(() => Math.random() - 0.5).slice(0, count);
  }
}