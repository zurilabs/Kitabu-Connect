/**
 * Cycle State Machine Service
 *
 * Manages state transitions for swap cycles:
 * pending_confirmation → confirmed → active → completed
 *
 * Handles:
 * - State transitions with validation
 * - Timeout detection and handling
 * - Automated notifications
 * - Reliability score updates
 */

import { db } from "../db";
import {
  swapCycles,
  cycleParticipants,
  users,
  userReliabilityScores,
  notifications,
} from "../db/schema";
import { eq, and, lt, isNull } from "drizzle-orm";
import { checkMilestones } from "./gamification.service";

/* ================================
   STATE TRANSITION LOGIC
================================ */

/**
 * Valid state transitions
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending_confirmation: ["confirmed", "timeout", "cancelled"],
  confirmed: ["active", "cancelled"],
  active: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  timeout: [],
};

/**
 * Check if state transition is valid
 */
export function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Transition cycle to new state
 */
export async function transitionCycleState(
  cycleId: string,
  newState: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get current cycle
    const [cycle] = await db
      .select()
      .from(swapCycles)
      .where(eq(swapCycles.id, cycleId))
      .limit(1);

    if (!cycle) {
      return { success: false, message: "Cycle not found" };
    }

    // Validate transition
    if (!isValidTransition(cycle.status, newState)) {
      return {
        success: false,
        message: `Invalid transition: ${cycle.status} → ${newState}`,
      };
    }

    // Update cycle status
    const updateData: any = { status: newState };

    if (newState === "confirmed") {
      updateData.confirmedAt = new Date();
    } else if (newState === "completed") {
      updateData.completedAt = new Date();
      // Update reliability scores for all participants
      await updateParticipantReliabilityScores(cycleId, "completed");
    } else if (newState === "cancelled") {
      updateData.cancelledAt = new Date();
      // Penalize participants for cancellation
      await updateParticipantReliabilityScores(cycleId, "cancelled");
    } else if (newState === "timeout") {
      updateData.cancelledAt = new Date();
      // Penalize participants who didn't confirm
      await penalizeUnconfirmedParticipants(cycleId);
    }

    await db.update(swapCycles).set(updateData).where(eq(swapCycles.id, cycleId));

    // Send notifications
    await sendStateChangeNotifications(cycleId, newState, reason);

    console.log(`✅ Cycle ${cycleId}: ${cycle.status} → ${newState}`);

    return { success: true, message: `Cycle transitioned to ${newState}` };
  } catch (error: any) {
    console.error("❌ State transition error:", error);
    return { success: false, message: error.message };
  }
}

/* ================================
   TIMEOUT DETECTION
================================ */

/**
 * Check and process cycles with expired confirmation deadlines
 */
export async function processExpiredConfirmations(): Promise<number> {
  try {
    const now = new Date();

    // Find cycles pending confirmation with expired deadlines
    const expiredCycles = await db
      .select()
      .from(swapCycles)
      .where(
        and(
          eq(swapCycles.status, "pending_confirmation"),
          lt(swapCycles.confirmationDeadline, now)
        )
      );

    console.log(`⏰ Found ${expiredCycles.length} expired confirmation cycles`);

    for (const cycle of expiredCycles) {
      await transitionCycleState(
        cycle.id,
        "timeout",
        "Confirmation deadline expired (48 hours)"
      );
    }

    return expiredCycles.length;
  } catch (error) {
    console.error("❌ Error processing expired confirmations:", error);
    return 0;
  }
}

/**
 * Check and process cycles with expired completion deadlines
 */
export async function processExpiredCompletions(): Promise<number> {
  try {
    const now = new Date();

    // Find active cycles with expired completion deadlines
    const expiredCycles = await db
      .select()
      .from(swapCycles)
      .where(
        and(
          eq(swapCycles.status, "active"),
          lt(swapCycles.completionDeadline, now)
        )
      );

    console.log(`⏰ Found ${expiredCycles.length} expired completion cycles`);

    for (const cycle of expiredCycles) {
      // Check if all participants completed
      const participants = await db
        .select()
        .from(cycleParticipants)
        .where(eq(cycleParticipants.cycleId, cycle.id));

      const allCompleted = participants.every((p) => p.bookCollected);

      if (allCompleted) {
        await transitionCycleState(cycle.id, "completed", "All books collected");
      } else {
        // Mark as late but keep active
        await db
          .update(swapCycles)
          .set({ status: "active" }) // Keep active but flag as late
          .where(eq(swapCycles.id, cycle.id));

        // Send reminder notifications
        await sendLateReminders(cycle.id, participants);
      }
    }

    return expiredCycles.length;
  } catch (error) {
    console.error("❌ Error processing expired completions:", error);
    return 0;
  }
}

/* ================================
   RELIABILITY SCORE UPDATES
================================ */

/**
 * Update reliability scores for all participants in a cycle
 */
async function updateParticipantReliabilityScores(
  cycleId: string,
  outcome: "completed" | "cancelled"
): Promise<void> {
  try {
    // Get all participants
    const participants = await db
      .select()
      .from(cycleParticipants)
      .where(eq(cycleParticipants.cycleId, cycleId));

    for (const participant of participants) {
      // Get or create reliability score
      let [score] = await db
        .select()
        .from(userReliabilityScores)
        .where(eq(userReliabilityScores.userId, participant.userId))
        .limit(1);

      if (!score) {
        // Create default score
        await db.insert(userReliabilityScores).values({
          userId: participant.userId,
          reliabilityScore: "50.00",
        });

        [score] = await db
          .select()
          .from(userReliabilityScores)
          .where(eq(userReliabilityScores.userId, participant.userId))
          .limit(1);
      }

      const updates: any = {
        totalCyclesJoined: (score.totalCyclesJoined || 0) + 1,
      };

      if (outcome === "completed") {
        // Reward for completion
        updates.totalCyclesCompleted = (score.totalCyclesCompleted || 0) + 1;
        updates.totalSwapsCompleted = (score.totalSwapsCompleted || 0) + 1;

        // Increase reliability score (max 100)
        const currentScore = Number(score.reliabilityScore);
        const newScore = Math.min(100, currentScore + 2);
        updates.reliabilityScore = newScore.toFixed(2);

        console.log(
          `✅ User ${participant.userId}: Reliability ${currentScore} → ${newScore}`
        );
      } else if (outcome === "cancelled") {
        // Penalty for cancellation
        updates.totalSwapsCancelled = (score.totalSwapsCancelled || 0) + 1;
        updates.penaltyPoints = (score.penaltyPoints || 0) + 5;

        // Decrease reliability score (min 0)
        const currentScore = Number(score.reliabilityScore);
        const newScore = Math.max(0, currentScore - 5);
        updates.reliabilityScore = newScore.toFixed(2);

        console.log(
          `⚠️ User ${participant.userId}: Reliability ${currentScore} → ${newScore} (cancelled)`
        );
      }

      await db
        .update(userReliabilityScores)
        .set(updates)
        .where(eq(userReliabilityScores.userId, participant.userId));

      // Check for milestones and badge awards after updating scores
      if (outcome === "completed") {
        await checkMilestones(participant.userId);
      }
    }
  } catch (error) {
    console.error("❌ Error updating reliability scores:", error);
  }
}

/**
 * Penalize participants who didn't confirm in time
 */
async function penalizeUnconfirmedParticipants(cycleId: string): Promise<void> {
  try {
    // Get unconfirmed participants
    const participants = await db
      .select()
      .from(cycleParticipants)
      .where(
        and(
          eq(cycleParticipants.cycleId, cycleId),
          eq(cycleParticipants.confirmed, false)
        )
      );

    for (const participant of participants) {
      // Get reliability score
      let [score] = await db
        .select()
        .from(userReliabilityScores)
        .where(eq(userReliabilityScores.userId, participant.userId))
        .limit(1);

      if (!score) {
        await db.insert(userReliabilityScores).values({
          userId: participant.userId,
          reliabilityScore: "50.00",
        });

        [score] = await db
          .select()
          .from(userReliabilityScores)
          .where(eq(userReliabilityScores.userId, participant.userId))
          .limit(1);
      }

      // Apply penalty
      const updates: any = {
        totalCyclesTimeout: (score.totalCyclesTimeout || 0) + 1,
        penaltyPoints: (score.penaltyPoints || 0) + 10,
      };

      const currentScore = Number(score.reliabilityScore);
      const newScore = Math.max(0, currentScore - 10);
      updates.reliabilityScore = newScore.toFixed(2);

      await db
        .update(userReliabilityScores)
        .set(updates)
        .where(eq(userReliabilityScores.userId, participant.userId));

      console.log(
        `⚠️ User ${participant.userId}: Reliability ${currentScore} → ${newScore} (timeout)`
      );
    }
  } catch (error) {
    console.error("❌ Error penalizing unconfirmed participants:", error);
  }
}

/* ================================
   NOTIFICATIONS
================================ */

/**
 * Send notifications for state changes
 */
async function sendStateChangeNotifications(
  cycleId: string,
  newState: string,
  reason?: string
): Promise<void> {
  try {
    // Get all participants
    const participants = await db
      .select({
        participant: cycleParticipants,
        user: users,
      })
      .from(cycleParticipants)
      .innerJoin(users, eq(cycleParticipants.userId, users.id))
      .where(eq(cycleParticipants.cycleId, cycleId));

    const [cycle] = await db
      .select()
      .from(swapCycles)
      .where(eq(swapCycles.id, cycleId))
      .limit(1);

    if (!cycle) return;

    let title = "";
    let message = "";
    let actionUrl = `/swap-cycles/${cycleId}`;

    switch (newState) {
      case "confirmed":
        title = "Swap Cycle Confirmed!";
        message = `All participants confirmed the ${cycle.cycleType} swap. Time to exchange books!`;
        break;
      case "active":
        title = "Swap Cycle Active";
        message = "Drop off your book at the designated location.";
        break;
      case "completed":
        title = "Swap Cycle Completed!";
        message = `Congratulations! Your ${cycle.cycleType} swap is complete.`;
        break;
      case "cancelled":
        title = "Swap Cycle Cancelled";
        message = reason || "The swap cycle has been cancelled.";
        break;
      case "timeout":
        title = "Swap Cycle Expired";
        message = "The confirmation deadline passed. Cycle cancelled.";
        break;
    }

    // Create notifications for all participants
    for (const { participant, user } of participants) {
      await db.insert(notifications).values({
        userId: user.id,
        type: "swap_cycle_update",
        title,
        message,
        actionUrl,
        isRead: false,
      });
    }

    console.log(`📢 Sent ${participants.length} notifications for cycle ${cycleId}`);
  } catch (error) {
    console.error("❌ Error sending notifications:", error);
  }
}

/**
 * Send late reminders to participants who haven't completed
 */
async function sendLateReminders(
  cycleId: string,
  participants: any[]
): Promise<void> {
  try {
    for (const participant of participants) {
      if (!participant.bookCollected) {
        await db.insert(notifications).values({
          userId: participant.userId,
          type: "swap_cycle_reminder",
          title: "Swap Cycle Reminder",
          message: "Please collect your book soon. The deadline has passed.",
          actionUrl: `/swap-cycles/${cycleId}`,
          isRead: false,
        });
      }
    }
  } catch (error) {
    console.error("❌ Error sending late reminders:", error);
  }
}

/**
 * Send notification when new cycle is detected
 */
export async function sendCycleDetectedNotification(
  cycleId: string
): Promise<void> {
  try {
    const participants = await db
      .select({
        participant: cycleParticipants,
        user: users,
      })
      .from(cycleParticipants)
      .innerJoin(users, eq(cycleParticipants.userId, users.id))
      .where(eq(cycleParticipants.cycleId, cycleId));

    const [cycle] = await db
      .select()
      .from(swapCycles)
      .where(eq(swapCycles.id, cycleId))
      .limit(1);

    if (!cycle) return;

    for (const { participant, user } of participants) {
      await db.insert(notifications).values({
        userId: user.id,
        type: "swap_cycle_match",
        title: "Swap Match Found!",
        message: `You're part of a ${cycle.cycleType} swap! Confirm within 48 hours.`,
        actionUrl: `/swap-cycles/${cycleId}`,
        isRead: false,
      });
    }

    console.log(`📢 Sent cycle detection notifications to ${participants.length} users`);
  } catch (error) {
    console.error("❌ Error sending cycle detected notifications:", error);
  }
}
