import { Router } from 'express';
import { verifyWebhookSignature } from '../config/paystack';
import { withdrawalService } from '../services/withdrawal.service';
import { paymentService } from '../services/payment.service';
import { notificationService } from '../services/notification.service';
import { db } from '../db';
import { transactions } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Paystack Webhook Handler
 * POST /api/webhooks/paystack
 *
 * Handles events from Paystack:
 * - charge.success: Payment completed (wallet top-up)
 * - transfer.success: Withdrawal completed
 * - transfer.failed: Withdrawal failed
 * - transfer.reversed: Withdrawal reversed
 */
router.post('/paystack', async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-paystack-signature'] as string;

    if (!signature) {
      console.error('[Webhook] Missing signature');
      return res.status(400).json({ message: 'Missing signature' });
    }

    const payload = JSON.stringify(req.body);
    const isValid = verifyWebhookSignature(payload, signature);

    if (!isValid) {
      console.error('[Webhook] Invalid signature');
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const event = req.body;
    const eventType = event.event;

    console.log(`[Webhook] Received event: ${eventType}`, {
      reference: event.data?.reference,
      transferCode: event.data?.transfer_code,
    });

    // Handle different event types
    switch (eventType) {
      case 'charge.success':
        await handleChargeSuccess(event);
        break;

      case 'transfer.success':
        await handleTransferSuccess(event);
        break;

      case 'transfer.failed':
        await handleTransferFailed(event);
        break;

      case 'transfer.reversed':
        await handleTransferReversed(event);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${eventType}`);
    }

    return res.json({ status: 'success' });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * Handle successful payment (wallet top-up)
 */
async function handleChargeSuccess(event: any) {
  try {
    const reference = event.data.reference;
    console.log(`[Webhook] Processing charge.success for reference: ${reference}`);

    // Verify and credit wallet
    await paymentService.verifyPaymentAndCreditWallet(reference);
  } catch (error) {
    console.error('[Webhook] Error handling charge.success:', error);
  }
}

/**
 * Handle successful transfer (withdrawal completed)
 */
async function handleTransferSuccess(event: any) {
  try {
    const transferData = event.data;
    const transferCode = transferData.transfer_code;
    const reference = transferData.reference;

    console.log(`[Webhook] Processing transfer.success for transfer: ${transferCode}`);

    // Find transaction by reference (format: WD-{transactionId}-{timestamp})
    const transactionId = extractTransactionIdFromReference(reference);

    if (!transactionId) {
      console.error('[Webhook] Could not extract transaction ID from reference:', reference);
      return;
    }

    // Get transaction to find user
    const txResult = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (!txResult.length) {
      console.error('[Webhook] Transaction not found:', transactionId);
      return;
    }

    const transaction = txResult[0];

    // Mark withdrawal as completed
    await withdrawalService.completeWithdrawal(transactionId, reference);

    // Send notification to user
    await notificationService.createNotification({
      userId: transaction.userId,
      type: 'withdrawal_completed',
      title: 'Withdrawal Completed',
      message: `Your withdrawal of KES ${parseFloat(transaction.amount).toLocaleString()} has been completed successfully.`,
      actionUrl: '/dashboard',
    });

    console.log(`[Webhook] Withdrawal ${transactionId} completed successfully`);
  } catch (error) {
    console.error('[Webhook] Error handling transfer.success:', error);
  }
}

/**
 * Handle failed transfer (withdrawal failed)
 */
async function handleTransferFailed(event: any) {
  try {
    const transferData = event.data;
    const transferCode = transferData.transfer_code;
    const reference = transferData.reference;
    const reason = transferData.reason || 'Transfer failed';

    console.log(`[Webhook] Processing transfer.failed for transfer: ${transferCode}, reason: ${reason}`);

    // Find transaction by reference
    const transactionId = extractTransactionIdFromReference(reference);

    if (!transactionId) {
      console.error('[Webhook] Could not extract transaction ID from reference:', reference);
      return;
    }

    // Get transaction to find user
    const txResult = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (!txResult.length) {
      console.error('[Webhook] Transaction not found:', transactionId);
      return;
    }

    const transaction = txResult[0];

    // Mark withdrawal as failed and refund
    await withdrawalService.failWithdrawal(transactionId, reason);

    // Send notification to user
    await notificationService.createNotification({
      userId: transaction.userId,
      type: 'withdrawal_failed',
      title: 'Withdrawal Failed',
      message: `Your withdrawal of KES ${parseFloat(transaction.amount).toLocaleString()} failed. The amount has been refunded to your wallet. Reason: ${reason}`,
      actionUrl: '/dashboard',
    });

    console.log(`[Webhook] Withdrawal ${transactionId} failed and refunded`);
  } catch (error) {
    console.error('[Webhook] Error handling transfer.failed:', error);
  }
}

/**
 * Handle reversed transfer (withdrawal reversed)
 */
async function handleTransferReversed(event: any) {
  try {
    const transferData = event.data;
    const transferCode = transferData.transfer_code;
    const reference = transferData.reference;
    const reason = transferData.reason || 'Transfer reversed';

    console.log(`[Webhook] Processing transfer.reversed for transfer: ${transferCode}`);

    // Find transaction by reference
    const transactionId = extractTransactionIdFromReference(reference);

    if (!transactionId) {
      console.error('[Webhook] Could not extract transaction ID from reference:', reference);
      return;
    }

    // Get transaction to find user
    const txResult = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (!txResult.length) {
      console.error('[Webhook] Transaction not found:', transactionId);
      return;
    }

    const transaction = txResult[0];

    // Mark withdrawal as failed and refund
    await withdrawalService.failWithdrawal(transactionId, reason);

    // Send notification to user
    await notificationService.createNotification({
      userId: transaction.userId,
      type: 'withdrawal_reversed',
      title: 'Withdrawal Reversed',
      message: `Your withdrawal of KES ${parseFloat(transaction.amount).toLocaleString()} was reversed. The amount has been refunded to your wallet. Reason: ${reason}`,
      actionUrl: '/dashboard',
    });

    console.log(`[Webhook] Withdrawal ${transactionId} reversed and refunded`);
  } catch (error) {
    console.error('[Webhook] Error handling transfer.reversed:', error);
  }
}

/**
 * Extract transaction ID from withdrawal reference
 * Format: WD-{transactionId}-{timestamp}
 */
function extractTransactionIdFromReference(reference: string): number | null {
  try {
    const parts = reference.split('-');
    if (parts.length >= 2 && parts[0] === 'WD') {
      return parseInt(parts[1], 10);
    }
    return null;
  } catch (error) {
    return null;
  }
}

export default router;
