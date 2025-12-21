import { db } from "../db";
import { users, transactions, walletTransactions, escrowAccounts, paystackRecipients } from "../db/schema";
import { eq, and, sql, lt } from "drizzle-orm";
import { walletService } from "./wallet.service";
import {
  createTransferRecipient,
  initiateTransfer,
  getBanks,
  resolveAccountNumber,
} from "../config/paystack";

export class WithdrawalService {
  /**
   * Calculate available balance for withdrawal
   * Available = Total Balance - Funds in Active Escrow (as seller)
   */
  async getAvailableBalance(userId: string): Promise<{
    success: boolean;
    totalBalance?: number;
    lockedInEscrow?: number;
    availableForWithdrawal?: number;
    pendingEscrows?: any[];
    message?: string;
  }> {
    try {
      // Get total wallet balance
      const balanceResult = await walletService.getBalance(userId);
      if (!balanceResult.success || balanceResult.balance === undefined) {
        return { success: false, message: "Failed to get wallet balance" };
      }

      const totalBalance = balanceResult.balance;

      // Get all active escrows where user is the seller
      // These funds are locked until escrow is released (7 days)
      const activeEscrows = await db
        .select()
        .from(escrowAccounts)
        .where(and(eq(escrowAccounts.sellerId, userId), eq(escrowAccounts.status, "active")));

      // Calculate total locked in escrow
      let lockedInEscrow = 0;
      const pendingEscrows = [];

      for (const escrow of activeEscrows) {
        const amount = parseFloat(escrow.amount);
        lockedInEscrow += amount;

        pendingEscrows.push({
          escrowId: escrow.id,
          amount,
          releaseAt: escrow.releaseAt,
          daysRemaining: Math.ceil(
            (new Date(escrow.releaseAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          ),
          bookListingId: escrow.bookListingId,
        });
      }

      // Available balance = Total - Locked in escrow
      const availableForWithdrawal = Math.max(0, totalBalance - lockedInEscrow);

      console.log(
        `[WithdrawalService] User ${userId} - Total: ${totalBalance}, Locked: ${lockedInEscrow}, Available: ${availableForWithdrawal}`
      );

      return {
        success: true,
        totalBalance,
        lockedInEscrow,
        availableForWithdrawal,
        pendingEscrows,
      };
    } catch (error) {
      console.error("[WithdrawalService] Get available balance error:", error);
      return { success: false, message: "Failed to calculate available balance" };
    }
  }

  /**
   * Validate withdrawal request
   */
  async validateWithdrawal(
    userId: string,
    amount: number
  ): Promise<{ success: boolean; message?: string; availableBalance?: number }> {
    try {
      // Check minimum withdrawal amount
      if (amount < 100) {
        return { success: false, message: "Minimum withdrawal amount is KES 100" };
      }

      // Check maximum withdrawal amount (anti-fraud measure)
      if (amount > 100000) {
        return {
          success: false,
          message: "Maximum withdrawal amount is KES 100,000. Please contact support for larger withdrawals.",
        };
      }

      // Get available balance
      const balanceCheck = await this.getAvailableBalance(userId);
      if (!balanceCheck.success || balanceCheck.availableForWithdrawal === undefined) {
        return { success: false, message: "Failed to check available balance" };
      }

      const availableBalance = balanceCheck.availableForWithdrawal;

      // Check if sufficient available balance
      if (availableBalance < amount) {
        const lockedAmount = balanceCheck.lockedInEscrow || 0;
        return {
          success: false,
          message:
            lockedAmount > 0
              ? `Insufficient available balance. You have KES ${lockedAmount.toLocaleString()} locked in escrow from recent sales. These funds will be available after the 7-day hold period.`
              : "Insufficient available balance for withdrawal.",
          availableBalance,
        };
      }

      return { success: true, availableBalance };
    } catch (error) {
      console.error("[WithdrawalService] Validate withdrawal error:", error);
      return { success: false, message: "Failed to validate withdrawal" };
    }
  }

  /**
   * Get or create Paystack transfer recipient
   */
  async getOrCreateRecipient(params: {
    userId: string;
    paymentMethod: "mpesa" | "bank";
    accountDetails: {
      mpesaPhone?: string;
      bankName?: string;
      accountNumber?: string;
      accountName?: string;
    };
  }): Promise<{ success: boolean; recipientCode?: string; message?: string }> {
    try {
      // Check if recipient already exists for this account
      const existing = await db
        .select()
        .from(paystackRecipients)
        .where(
          and(
            eq(paystackRecipients.userId, params.userId),
            eq(paystackRecipients.accountNumber, params.accountDetails.accountNumber || params.accountDetails.mpesaPhone || ""),
            eq(paystackRecipients.active, true)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return { success: true, recipientCode: existing[0].recipientCode };
      }

      // Create new recipient
      let type: "nuban" | "mobile_money";
      let bankCode: string;
      let accountNumber: string;
      let name: string;

      if (params.paymentMethod === "mpesa") {
        type = "mobile_money";
        bankCode = "MPESA"; // M-Pesa bank code for Kenya (uppercase as per Paystack docs)
        accountNumber = params.accountDetails.mpesaPhone!;

        // Format phone number: Keep it simple - just remove spaces and dashes
        // Paystack accepts formats like: 0712345678 or 254712345678
        accountNumber = accountNumber.replace(/[\s-]/g, "");

        name = params.accountDetails.accountName || "M-Pesa Account";
      } else {
        type = "nuban";
        // You would need to resolve bank code from bank name
        bankCode = "044"; // Example: Access Bank
        accountNumber = params.accountDetails.accountNumber!;
        name = params.accountDetails.accountName!;
      }

      const recipientResult = await createTransferRecipient({
        type,
        name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: "KES",
      });

      if (!recipientResult.success || !recipientResult.data) {
        return { success: false, message: recipientResult.message };
      }

      // Save recipient to database
      await db.insert(paystackRecipients).values({
        userId: params.userId,
        recipientCode: recipientResult.data.recipient_code,
        type: type,
        name,
        accountNumber,
        bankCode,
        bankName: params.accountDetails.bankName,
        currency: "KES",
        paystackData: JSON.stringify(recipientResult.data),
      });

      return { success: true, recipientCode: recipientResult.data.recipient_code };
    } catch (error) {
      console.error("[WithdrawalService] Get/create recipient error:", error);
      return { success: false, message: "Failed to create transfer recipient" };
    }
  }

  /**
   * Initialize withdrawal request with Paystack Transfer API
   */
  async initiateWithdrawal(params: {
    userId: string;
    amount: number;
    paymentMethod: "mpesa" | "bank" | "paypal";
    accountDetails: {
      mpesaPhone?: string;
      bankName?: string;
      accountNumber?: string;
      accountName?: string;
      paypalEmail?: string;
    };
  }): Promise<{ success: boolean; withdrawalId?: number; message?: string }> {
    try {
      // Validate withdrawal
      const validation = await this.validateWithdrawal(params.userId, params.amount);
      if (!validation.success) {
        return { success: false, message: validation.message };
      }

      // Create withdrawal transaction
      const txResult = await walletService.createTransaction({
        userId: params.userId,
        type: "withdrawal",
        amount: params.amount,
        status: "pending",
        paymentMethod: params.paymentMethod,
        description: `Withdrawal to ${params.paymentMethod.toUpperCase()}`,
        metadata: {
          accountDetails: params.accountDetails,
          requestedAt: new Date().toISOString(),
        },
      });

      if (!txResult.success || !txResult.transactionId) {
        return { success: false, message: "Failed to create withdrawal transaction" };
      }

      // Debit wallet immediately to prevent double spending
      const debitResult = await walletService.debitWallet({
        userId: params.userId,
        amount: params.amount,
        transactionId: txResult.transactionId,
        description: `Withdrawal to ${params.paymentMethod.toUpperCase()}`,
      });

      if (!debitResult.success) {
        await db
          .update(transactions)
          .set({ status: "failed" })
          .where(eq(transactions.id, txResult.transactionId));

        return { success: false, message: "Failed to process withdrawal" };
      }

      // For PayPal, mark as processing (manual)
      if (params.paymentMethod === "paypal") {
        await db
          .update(transactions)
          .set({ status: "processing" })
          .where(eq(transactions.id, txResult.transactionId));

        return {
          success: true,
          withdrawalId: txResult.transactionId,
          message: "PayPal withdrawal request submitted. Processing takes 1-3 business days.",
        };
      }

      // For M-Pesa and Bank, use Paystack Transfer API
      const recipientResult = await this.getOrCreateRecipient({
        userId: params.userId,
        paymentMethod: params.paymentMethod as "mpesa" | "bank",
        accountDetails: params.accountDetails,
      });

      if (!recipientResult.success || !recipientResult.recipientCode) {
        // Refund wallet
        await walletService.creditWallet({
          userId: params.userId,
          amount: params.amount,
          transactionId: txResult.transactionId,
          description: "Withdrawal refund - recipient creation failed",
        });

        await db
          .update(transactions)
          .set({ status: "failed" })
          .where(eq(transactions.id, txResult.transactionId));

        return { success: false, message: recipientResult.message || "Failed to create recipient" };
      }

      // Initiate Paystack transfer
      const transferResult = await initiateTransfer({
        amount: params.amount,
        recipient: recipientResult.recipientCode,
        reason: `Withdrawal to ${params.paymentMethod}`,
        reference: `WD-${txResult.transactionId}-${Date.now()}`,
      });

      if (!transferResult.success) {
        // Refund wallet
        await walletService.creditWallet({
          userId: params.userId,
          amount: params.amount,
          transactionId: txResult.transactionId,
          description: "Withdrawal refund - transfer failed",
        });

        await db
          .update(transactions)
          .set({ status: "failed" })
          .where(eq(transactions.id, txResult.transactionId));

        return { success: false, message: transferResult.message || "Transfer initiation failed" };
      }

      // Update transaction with transfer details
      await db
        .update(transactions)
        .set({
          status: "processing",
          paymentReference: transferResult.data.reference,
          metadata: JSON.stringify({
            accountDetails: params.accountDetails,
            transferCode: transferResult.data.transfer_code,
            requestedAt: new Date().toISOString(),
          }),
        })
        .where(eq(transactions.id, txResult.transactionId));

      console.log(
        `[WithdrawalService] Paystack transfer initiated for user ${params.userId}. Amount: ${params.amount}, Transfer: ${transferResult.data.transfer_code}`
      );

      return {
        success: true,
        withdrawalId: txResult.transactionId,
        message: "Withdrawal initiated successfully. You will receive your funds within 1-3 business days.",
      };
    } catch (error) {
      console.error("[WithdrawalService] Initiate withdrawal error:", error);
      return { success: false, message: "Failed to initiate withdrawal" };
    }
  }

  /**
   * Process withdrawal (Admin/Automated)
   * This would be called after successful Paystack transfer
   */
  async completeWithdrawal(
    transactionId: number,
    paymentReference?: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // Get transaction
      const tx = await db.select().from(transactions).where(eq(transactions.id, transactionId)).limit(1);

      if (!tx.length) {
        return { success: false, message: "Transaction not found" };
      }

      const transaction = tx[0];

      if (transaction.status === "completed") {
        return { success: false, message: "Withdrawal already completed" };
      }

      // Update transaction status
      await db
        .update(transactions)
        .set({
          status: "completed",
          paymentReference: paymentReference || transaction.paymentReference,
          completedAt: new Date(),
        })
        .where(eq(transactions.id, transactionId));

      console.log(`[WithdrawalService] Completed withdrawal ${transactionId} for user ${transaction.userId}`);

      return {
        success: true,
        message: "Withdrawal completed successfully",
      };
    } catch (error) {
      console.error("[WithdrawalService] Complete withdrawal error:", error);
      return { success: false, message: "Failed to complete withdrawal" };
    }
  }

  /**
   * Cancel/Fail withdrawal and refund user
   */
  async failWithdrawal(transactionId: number, reason: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Get transaction
      const tx = await db.select().from(transactions).where(eq(transactions.id, transactionId)).limit(1);

      if (!tx.length) {
        return { success: false, message: "Transaction not found" };
      }

      const transaction = tx[0];

      if (transaction.status === "completed") {
        return { success: false, message: "Cannot fail completed withdrawal" };
      }

      // Refund the amount back to user's wallet
      const refundResult = await walletService.creditWallet({
        userId: transaction.userId,
        amount: parseFloat(transaction.amount),
        transactionId,
        description: `Withdrawal refund: ${reason}`,
      });

      if (!refundResult.success) {
        return { success: false, message: "Failed to refund withdrawal" };
      }

      // Update transaction status
      await db
        .update(transactions)
        .set({
          status: "failed",
          metadata: JSON.stringify({
            ...(transaction.metadata ? JSON.parse(transaction.metadata as string) : {}),
            failureReason: reason,
            failedAt: new Date().toISOString(),
          }),
        })
        .where(eq(transactions.id, transactionId));

      console.log(`[WithdrawalService] Failed withdrawal ${transactionId}. Reason: ${reason}`);

      return {
        success: true,
        message: "Withdrawal failed and amount refunded to wallet",
      };
    } catch (error) {
      console.error("[WithdrawalService] Fail withdrawal error:", error);
      return { success: false, message: "Failed to process withdrawal failure" };
    }
  }

  /**
   * Get user's withdrawal history
   */
  async getWithdrawalHistory(userId: string, limit: number = 50) {
    try {
      const withdrawals = await db
        .select()
        .from(transactions)
        .where(and(eq(transactions.userId, userId), eq(transactions.type, "withdrawal")))
        .orderBy(sql`${transactions.createdAt} DESC`)
        .limit(limit);

      return {
        success: true,
        withdrawals: withdrawals.map((w) => ({
          id: w.id,
          amount: parseFloat(w.amount),
          status: w.status,
          paymentMethod: w.paymentMethod,
          paymentReference: w.paymentReference,
          description: w.description,
          createdAt: w.createdAt,
          completedAt: w.completedAt,
        })),
      };
    } catch (error) {
      console.error("[WithdrawalService] Get withdrawal history error:", error);
      return { success: false, message: "Failed to get withdrawal history" };
    }
  }
}

export const withdrawalService = new WithdrawalService();
