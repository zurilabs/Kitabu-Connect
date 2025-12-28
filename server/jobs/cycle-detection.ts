/**
 * Cycle Detection Background Job
 *
 * Periodically runs the cycle detection algorithm to find new swap matches
 * Runs every 6 hours to discover new opportunities as listings are created
 *
 * Runs in a separate child process for maximum performance without blocking HTTP server
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run cycle detection in a separate Node.js process
 * This gives us both fast detection AND responsive HTTP server
 */
async function detectCycles() {
  if (isRunning) {
    console.log("⏭️ Cycle detection already running, skipping...");
    return;
  }

  isRunning = true;

  try {
    console.log("🔄 Starting automated cycle detection in separate process...");

    const startTime = Date.now();

    // Spawn a separate Node.js process to run cycle detection
    const runnerPath = path.join(__dirname, "cycle-detection-runner.ts");

    // Use tsx to run TypeScript directly
    const childProcess = spawn("npx", ["tsx", runnerPath, "5", "50"], {
      stdio: "inherit", // Inherit stdio so we see logs
      shell: true,
    });

    // Wait for process to complete
    await new Promise<void>((resolve, reject) => {
      childProcess.on("exit", (code) => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        if (code === 0) {
          console.log(`✅ Cycle detection process completed in ${duration}s`);
          console.log(`📊 Check logs above for cycle count`);
          resolve();
        } else {
          console.error(`❌ Cycle detection process failed with code ${code}`);
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      childProcess.on("error", (error) => {
        console.error("❌ Failed to start cycle detection process:", error);
        reject(error);
      });
    });
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

  // Run after 30 seconds to allow server to fully start
  setTimeout(() => {
    detectCycles();
  }, 30000);

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
