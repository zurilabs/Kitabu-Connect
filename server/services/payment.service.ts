import { initializePayment, verifyPayment, generateReference } from "../config/paystack";
import { walletService } from "./wallet.service";
import { notificationService } from "./notification.service";

/**
 * Get callback URL from environment or default to localhost
 */
function getCallbackUrl(path: string = '/dashboard'): string {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
  return `${baseUrl}${path}`;
}

export class PaymentService {
  /**
   * Initialize wallet top-up via Paystack
   */
  async initializeWalletTopUp(params: {
    userId: string;
    amount: number;
    email: string;
    callbackUrl?: string;
  }): Promise<{ success: boolean; authorizationUrl?: string; reference?: string; message?: string }> {
    try {
      // Validate amount
      if (params.amount < 10) {
        return { success: false, message: "Minimum top-up amount is KES 10" };
      }

      if (params.amount > 1000000) {
        return { success: false, message: "Maximum top-up amount is KES 1,000,000" };
      }

      const reference = generateReference();

      // Create pending transaction
      const txResult = await walletService.createTransaction({
        userId: params.userId,
        type: "topup",
        amount: params.amount,
        status: "pending",
        paymentMethod: "paystack",
        paymentReference: reference,
        description: `Wallet top-up via Paystack`,
        metadata: {
          email: params.email,
        },
      });

      if (!txResult.success) {
        return { success: false, message: "Failed to create transaction record" };
      }

      // Initialize Paystack payment
      const paystackResult = await initializePayment({
        email: params.email,
        amount: params.amount,
        reference,
        callback_url: params.callbackUrl || getCallbackUrl('/dashboard'),
        metadata: {
          userId: params.userId,
          transactionId: txResult.transactionId,
          type: "wallet_topup",
        },
      });

      if (!paystackResult.success) {
        return {
          success: false,
          message: paystackResult.message || "Failed to initialize payment",
        };
      }

      console.log(`[PaymentService] Initialized top-up for user ${params.userId}. Amount: ${params.amount}, Reference: ${reference}`);

      return {
        success: true,
        authorizationUrl: paystackResult.data.authorization_url,
        reference,
      };
    } catch (error) {
      console.error("[PaymentService] Initialize wallet top-up error:", error);
      return {
        success: false,
        message: "Failed to initialize payment",
      };
    }
  }

  /**
   * Verify Paystack payment and credit wallet
   */
  async verifyPaymentAndCreditWallet(reference: string): Promise<{ success: boolean; amount?: number; message?: string }> {
    try {
      // Verify payment with Paystack
      const verificationResult = await verifyPayment(reference);

      if (!verificationResult.success || !verificationResult.data) {
        console.error(`[PaymentService] Payment verification failed for reference: ${reference}`);
        return {
          success: false,
          message: "Payment verification failed",
        };
      }

      const paymentData = verificationResult.data;

      // Get transaction metadata
      const metadata = paymentData.metadata || {};
      const userId = metadata.userId;
      const transactionId = metadata.transactionId;

      if (!userId || !transactionId) {
        console.error(`[PaymentService] Missing metadata for reference ${reference}. UserId: ${userId}, TransactionId: ${transactionId}`);
        return {
          success: false,
          message: "Invalid payment metadata",
        };
      }

      // Check if transaction exists and get its current status
      const existingTransaction = await walletService.getTransactionById(transactionId);

      if (!existingTransaction.success || !existingTransaction.transaction) {
        console.error(`[PaymentService] Transaction ${transactionId} not found for reference: ${reference}`);
        return {
          success: false,
          message: "Transaction not found",
        };
      }

      // Prevent duplicate processing - check if already completed
      if (existingTransaction.transaction.status === "completed") {
        console.warn(`[PaymentService] Transaction ${transactionId} already completed. Skipping duplicate credit for reference: ${reference}`);
        return {
          success: true,
          amount: parseFloat(existingTransaction.transaction.amount),
          message: "Payment already processed",
        };
      }

      // Convert amount from kobo to naira/kes
      const amount = paymentData.amount / 100;

      // Verify amount matches
      const expectedAmount = parseFloat(existingTransaction.transaction.amount);
      if (Math.abs(amount - expectedAmount) > 0.01) {
        console.error(`[PaymentService] Amount mismatch for transaction ${transactionId}. Expected: ${expectedAmount}, Got: ${amount}`);
        return {
          success: false,
          message: "Payment amount mismatch",
        };
      }

      // Update transaction status
      await walletService.updateTransactionStatus(transactionId, "completed", new Date());

      // Credit user's wallet
      const creditResult = await walletService.creditWallet({
        userId,
        amount,
        transactionId,
        description: `Wallet top-up via Paystack (${reference})`,
      });

      if (!creditResult.success) {
        console.error(`[PaymentService] Failed to credit wallet for transaction ${transactionId}. Error: ${creditResult.message}`);
        // Revert transaction status back to pending
        await walletService.updateTransactionStatus(transactionId, "failed", new Date());
        return {
          success: false,
          message: "Payment verified but failed to credit wallet. Please contact support.",
        };
      }

      console.log(`[PaymentService] Payment verified and wallet credited. User: ${userId}, Amount: ${amount}, Reference: ${reference}`);

      // Send notification to user
      await notificationService.createNotification({
        userId,
        type: "wallet_topup",
        title: "Wallet Top-up Successful",
        message: `Your wallet has been credited with KES ${amount.toLocaleString()}. Your new balance is KES ${creditResult.newBalance?.toLocaleString()}.`,
        actionUrl: "/dashboard",
      });

      return {
        success: true,
        amount,
        message: "Wallet topped up successfully",
      };
    } catch (error) {
      console.error("[PaymentService] Verify payment error:", error);
      return {
        success: false,
        message: "Failed to verify payment",
      };
    }
  }

  /**
   * Handle Paystack webhook for payment notifications
   */
  async handlePaystackWebhook(event: any): Promise<{ success: boolean; message?: string }> {
    try {
      const eventType = event.event;

      if (eventType === "charge.success") {
        const reference = event.data.reference;
        console.log(`[PaymentService] Webhook received for successful charge: ${reference}`);

        // Verify and credit wallet
        return await this.verifyPaymentAndCreditWallet(reference);
      }

      return { success: true, message: "Event processed" };
    } catch (error) {
      console.error("[PaymentService] Handle webhook error:", error);
      return {
        success: false,
        message: "Failed to handle webhook",
      };
    }
  }
}

export const paymentService = new PaymentService();
