import cron from 'node-cron';
import { escrowService } from '../services/escrow.service';

/**
 * Cron job to automatically release escrow funds after 7 days
 * Runs every hour
 */
export function startEscrowReleaseScheduler() {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('[Escrow Scheduler] Running automatic escrow release check...');

    try {
      const result = await escrowService.processAutomaticReleases();

      console.log(`[Escrow Scheduler] Processed ${result.released + result.failed} escrows.`);
      console.log(`[Escrow Scheduler] Successfully released: ${result.released}`);

      if (result.failed > 0) {
        console.error(`[Escrow Scheduler] Failed to release: ${result.failed}`);
      }
    } catch (error) {
      console.error('[Escrow Scheduler] Error during automatic release:', error);
    }
  });

  console.log('[Escrow Scheduler] Automatic escrow release scheduler started (runs hourly)');
}

/**
 * Manual trigger for testing
 */
export async function triggerEscrowRelease() {
  console.log('[Escrow Scheduler] Manual trigger initiated...');
  return await escrowService.processAutomaticReleases();
}
