/**
 * Cycle Timeout Scheduler
 *
 * Periodically checks for:
 * - Expired confirmation deadlines (48 hours)
 * - Expired completion deadlines (7 days)
 * - Late participants needing reminders
 *
 * Runs every 30 minutes
 */

import {
  processExpiredConfirmations,
  processExpiredCompletions,
} from "../services/cycleStateMachine.service";

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

/**
 * Run timeout checks
 */
async function checkTimeouts() {
  if (isRunning) {
    console.log("⏭️ Timeout check already running, skipping...");
    return;
  }

  isRunning = true;

  try {
    console.log("⏰ Starting cycle timeout check...");

    // Check expired confirmations
    const expiredConfirmations = await processExpiredConfirmations();
    console.log(`✅ Processed ${expiredConfirmations} expired confirmations`);

    // Check expired completions
    const expiredCompletions = await processExpiredCompletions();
    console.log(`✅ Processed ${expiredCompletions} expired completions`);

    console.log("✅ Cycle timeout check completed");
  } catch (error) {
    console.error("❌ Error in timeout check:", error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the timeout scheduler
 * Runs every 30 minutes
 */
export function startCycleTimeoutScheduler() {
  if (intervalId) {
    console.log("⚠️ Cycle timeout scheduler already running");
    return;
  }

  console.log("🚀 Starting cycle timeout scheduler (every 30 minutes)");

  // Run immediately on start
  checkTimeouts();

  // Then run every 30 minutes
  intervalId = setInterval(
    () => {
      checkTimeouts();
    },
    30 * 60 * 1000
  ); // 30 minutes
}

/**
 * Stop the timeout scheduler
 */
export function stopCycleTimeoutScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("⏸️ Cycle timeout scheduler stopped");
  }
}

/**
 * Manually trigger timeout check (for testing)
 */
export function triggerTimeoutCheck() {
  return checkTimeouts();
}
