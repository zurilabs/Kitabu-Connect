/**
 * Cycle Detection Background Job
 *
 * Periodically runs the cycle detection algorithm to find new swap matches
 * Runs every 6 hours to discover new opportunities as listings are created
 */

import { cycleDetector } from "../services/swapCycle.service";

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

/**
 * Run cycle detection
 */
async function detectCycles() {
  if (isRunning) {
    console.log("⏭️ Cycle detection already running, skipping...");
    return;
  }

  isRunning = true;

  try {
    console.log("🔄 Starting automated cycle detection...");

    const startTime = Date.now();

    // Run detection with standard parameters
    const count = await cycleDetector.detectAndSave(5, 50);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ Automated cycle detection completed:`);
    console.log(`   - Cycles found: ${count}`);
    console.log(`   - Duration: ${duration}s`);

    // Log stats
    if (count > 0) {
      console.log(`📊 New swap opportunities created for users`);
    }
  } catch (error) {
    console.error("❌ Error in automated cycle detection:", error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the cycle detection scheduler
 * Runs every 6 hours
 */
export function startCycleDetectionScheduler() {
  if (intervalId) {
    console.log("⚠️ Cycle detection scheduler already running");
    return;
  }

  console.log("🚀 Starting cycle detection scheduler (every 6 hours)");

  // Run immediately on start
  detectCycles();

  // Then run every 6 hours
  intervalId = setInterval(
    () => {
      detectCycles();
    },
    6 * 60 * 60 * 1000
  ); // 6 hours
}

/**
 * Stop the cycle detection scheduler
 */
export function stopCycleDetectionScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("⏸️ Cycle detection scheduler stopped");
  }
}

/**
 * Manually trigger cycle detection (for testing)
 */
export function triggerCycleDetection() {
  return detectCycles();
}
