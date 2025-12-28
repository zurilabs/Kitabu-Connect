#!/usr/bin/env tsx
/**
 * Standalone Cycle Detection Runner
 *
 * This script runs as a separate process to perform cycle detection
 * without blocking the main HTTP server
 */

import "dotenv/config";
import { cycleDetector } from "../services/swapCycle.service";

async function run() {
  try {
    console.log("🔄 [Standalone] Starting cycle detection...");
    const startTime = Date.now();

    // Get parameters from command line or use defaults
    const maxCycleSize = parseInt(process.argv[2] || "5");
    const topN = parseInt(process.argv[3] || "50");

    const count = await cycleDetector.detectAndSave(maxCycleSize, topN);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ [Standalone] Cycle detection completed:`);
    console.log(`   - Cycles found: ${count}`);
    console.log(`   - Duration: ${duration}s`);

    // Exit with success
    process.exit(0);
  } catch (error) {
    console.error("❌ [Standalone] Error in cycle detection:", error);
    process.exit(1);
  }
}

run();
