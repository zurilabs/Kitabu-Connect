import { db } from "../db";
import { users, transactions, walletTransactions } from "../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export class WalletService {
  /**
   * Get user's current wallet balance
   */
  async getBalance(userId: string): Promise<{ success: boolean; balance?: number; currency?: string; message?: string }> {
    try {
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user.length) {
        return { success: false, message: "User not found" };
      }

      return {
        success: true,
        balance: parseFloat(user[0].walletBalance || "0"),
        currency: "KES",
      };
    } catch (error) {
      console.error("[WalletService] Get balance error:", error);
      return { success: false, message: "Failed to get wallet balance" };
    }
  }

  /**
   * Credit user's wallet (add funds)
   */
  async creditWallet(params: {
    userId: string;
    amount: number;
    transactionId: number;
    description: string;
  }): Promise<{ success: boolean; newBalance?: number; message?: string }> {
    try {
      // Get current balance
      const user = await db.select().from(users).where(eq(users.id, params.userId)).limit(1);

      if (!user.length) {
        return { success: false, message: "User not found" };
      }

      const currentBalance = parseFloat(user[0].walletBalance || "0");
      const newBalance = currentBalance + params.amount;

      // Update user's wallet balance
      await db
        .update(users)
        .set({ walletBalance: newBalance.toFixed(2) })
        .where(eq(users.id, params.userId));

      // Record wallet transaction
      await db.insert(walletTransactions).values({
        userId: params.userId,
        type: "credit",
        amount: params.amount.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        transactionId: params.transactionId,
        description: params.description,
      });

      console.log(`[WalletService] Credited ${params.amount} to user ${params.userId}. New balance: ${newBalance}`);

      return {
        success: true,
        newBalance,
      };
    } catch (error) {
      console.error("[WalletService] Credit wallet error:", error);
      return { success: false, message: "Failed to credit wallet" };
    }
  }

  /**
   * Debit user's wallet (remove funds)
   */
  async debitWallet(params: {
    userId: string;
    amount: number;
    transactionId: number;
    description: string;
  }): Promise<{ success: boolean; newBalance?: number; message?: string }> {
    try {
      // Get current balance
      const user = await db.select().from(users).where(eq(users.id, params.userId)).limit(1);

      if (!user.length) {
        return { success: false, message: "User not found" };
      }

      const currentBalance = parseFloat(user[0].walletBalance || "0");

      // Check if sufficient balance
      if (currentBalance < params.amount) {
        return { success: false, message: "Insufficient wallet balance" };
      }

      const newBalance = currentBalance - params.amount;

      // Update user's wallet balance
      await db
        .update(users)
        .set({ walletBalance: newBalance.toFixed(2) })
        .where(eq(users.id, params.userId));

      // Record wallet transaction
      await db.insert(walletTransactions).values({
        userId: params.userId,
        type: "debit",
        amount: params.amount.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        transactionId: params.transactionId,
        description: params.description,
      });

      console.log(`[WalletService] Debited ${params.amount} from user ${params.userId}. New balance: ${newBalance}`);

      return {
        success: true,
        newBalance,
      };
    } catch (error) {
      console.error("[WalletService] Debit wallet error:", error);
      return { success: false, message: "Failed to debit wallet" };
    }
  }

  /**
   * Get wallet transaction history
   */
  async getTransactionHistory(userId: string, limit: number = 50) {
    try {
      const history = await db
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.userId, userId))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(limit);

      return {
        success: true,
        transactions: history,
      };
    } catch (error) {
      console.error("[WalletService] Get transaction history error:", error);
      return {
        success: false,
        message: "Failed to get transaction history",
      };
    }
  }

  /**
   * Get all transactions (main transactions table)
   */
  async getAllTransactions(userId: string, limit: number = 50) {
    try {
      const allTransactions = await db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.createdAt))
        .limit(limit);

      return {
        success: true,
        transactions: allTransactions,
      };
    } catch (error) {
      console.error("[WalletService] Get all transactions error:", error);
      return {
        success: false,
        message: "Failed to get transactions",
      };
    }
  }

  /**
   * Create a transaction record
   */
  async createTransaction(params: {
    userId: string;
    type: string;
    amount: number;
    status?: string;
    paymentMethod?: string;
    paymentReference?: string;
    bookListingId?: number;
    description?: string;
    metadata?: any;
  }): Promise<{ success: boolean; transactionId?: number; message?: string }> {
    try {
      const result = await db.insert(transactions).values({
        userId: params.userId,
        type: params.type,
        status: params.status || "pending",
        amount: params.amount.toFixed(2),
        paymentMethod: params.paymentMethod,
        paymentReference: params.paymentReference,
        bookListingId: params.bookListingId,
        description: params.description,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      });

      return {
        success: true,
        transactionId: result[0].insertId,
      };
    } catch (error) {
      console.error("[WalletService] Create transaction error:", error);
      return {
        success: false,
        message: "Failed to create transaction",
      };
    }
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionId: number,
    status: string,
    completedAt?: Date
  ): Promise<{ success: boolean; message?: string }> {
    try {
      await db
        .update(transactions)
        .set({
          status,
          completedAt: completedAt || (status === "completed" ? new Date() : undefined),
        })
        .where(eq(transactions.id, transactionId));

      return { success: true };
    } catch (error) {
      console.error("[WalletService] Update transaction status error:", error);
      return {
        success: false,
        message: "Failed to update transaction status",
      };
    }
  }
}

export const walletService = new WalletService();
