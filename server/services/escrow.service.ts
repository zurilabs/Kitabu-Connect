import { db } from "../db";
import { escrowAccounts, transactions, users, bookListings, orders } from "../db/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import { walletService } from "./wallet.service";

export class EscrowService {
  // Platform fee percentage (e.g., 5%)
  private readonly PLATFORM_FEE_PERCENTAGE = 5;

  /**
   * Calculate platform fee
   */
  private calculatePlatformFee(amount: number): number {
    return (amount * this.PLATFORM_FEE_PERCENTAGE) / 100;
  }

  /**
   * Create an escrow account when a purchase is made
   * Note: The amount passed here should be the seller's amount (book price only)
   * The convenience fee has already been collected at purchase time
   */
  async createEscrow(params: {
    bookListingId: number;
    buyerId: string;
    sellerId: string;
    amount: number;
    orderId?: number;
  }): Promise<{ success: boolean; escrowId?: number; message?: string }> {
    try {
      // The amount passed is already the seller's portion (no fee deduction needed here)
      // Convenience fee was collected when the buyer paid
      const sellerAmount = params.amount;

      // Calculate release date (7 days from now)
      const releaseAt = new Date();
      releaseAt.setDate(releaseAt.getDate() + 7);

      // Create escrow record
      const result = await db.insert(escrowAccounts).values({
        bookListingId: params.bookListingId,
        buyerId: params.buyerId,
        sellerId: params.sellerId,
        amount: params.amount.toFixed(2),
        platformFee: "0.00", // Fee already collected at purchase
        status: "active",
        holdPeriodDays: 7,
        releaseAt,
      });

      const escrowId = result[0].insertId;

      // Create transaction record for escrow hold
      await walletService.createTransaction({
        userId: params.buyerId,
        type: "escrow_hold",
        amount: params.amount,
        status: "completed",
        description: `Funds held in escrow for book purchase`,
        bookListingId: params.bookListingId,
        metadata: {
          escrowId,
          sellerAmount,
        },
      });

      console.log(`[EscrowService] Created escrow ${escrowId} for ${params.amount}. Release at: ${releaseAt}`);

      return {
        success: true,
        escrowId,
      };
    } catch (error) {
      console.error("[EscrowService] Create escrow error:", error);
      return {
        success: false,
        message: "Failed to create escrow account",
      };
    }
  }

  /**
   * Release funds from escrow to seller
   */
  async releaseEscrow(escrowId: number): Promise<{ success: boolean; message?: string }> {
    try {
      // Get escrow details
      const escrow = await db.select().from(escrowAccounts).where(eq(escrowAccounts.id, escrowId)).limit(1);

      if (!escrow.length) {
        return { success: false, message: "Escrow account not found" };
      }

      const escrowData = escrow[0];

      // Check if already released
      if (escrowData.status === "released") {
        return { success: false, message: "Escrow already released" };
      }

      // Check if disputed
      if (escrowData.status === "disputed") {
        return { success: false, message: "Escrow is under dispute and cannot be released" };
      }

      // Release the full escrowed amount to seller
      // The convenience fee was already collected at purchase time
      const sellerAmount = parseFloat(escrowData.amount);

      // Create transaction for seller
      const txResult = await walletService.createTransaction({
        userId: escrowData.sellerId,
        type: "escrow_release",
        amount: sellerAmount,
        status: "completed",
        description: `Escrow funds released for book sale`,
        bookListingId: escrowData.bookListingId,
        metadata: {
          escrowId,
          originalAmount: escrowData.amount,
        },
      });

      if (!txResult.success || !txResult.transactionId) {
        return { success: false, message: "Failed to create release transaction" };
      }

      // Credit seller's wallet
      const creditResult = await walletService.creditWallet({
        userId: escrowData.sellerId,
        amount: sellerAmount,
        transactionId: txResult.transactionId,
        description: `Payment received for book sale`,
      });

      if (!creditResult.success) {
        return { success: false, message: "Failed to credit seller wallet" };
      }

      // Update escrow status
      await db
        .update(escrowAccounts)
        .set({
          status: "released",
          releasedAt: new Date(),
        })
        .where(eq(escrowAccounts.id, escrowId));

      // Update related order status to completed
      await db
        .update(orders)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(orders.escrowId, escrowId));

      console.log(`[EscrowService] Released escrow ${escrowId}. Amount: ${sellerAmount} to seller ${escrowData.sellerId}`);

      return {
        success: true,
        message: "Escrow funds released successfully",
      };
    } catch (error) {
      console.error("[EscrowService] Release escrow error:", error);
      return {
        success: false,
        message: "Failed to release escrow funds",
      };
    }
  }

  /**
   * Refund escrow to buyer (in case of cancellation or dispute resolution)
   */
  async refundEscrow(escrowId: number, reason?: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Get escrow details
      const escrow = await db.select().from(escrowAccounts).where(eq(escrowAccounts.id, escrowId)).limit(1);

      if (!escrow.length) {
        return { success: false, message: "Escrow account not found" };
      }

      const escrowData = escrow[0];

      // Check if already refunded
      if (escrowData.status === "refunded") {
        return { success: false, message: "Escrow already refunded" };
      }

      const refundAmount = parseFloat(escrowData.amount);

      // Create transaction for buyer refund
      const txResult = await walletService.createTransaction({
        userId: escrowData.buyerId,
        type: "refund",
        amount: refundAmount,
        status: "completed",
        description: reason || "Escrow refund",
        bookListingId: escrowData.bookListingId,
        metadata: {
          escrowId,
          reason,
        },
      });

      if (!txResult.success || !txResult.transactionId) {
        return { success: false, message: "Failed to create refund transaction" };
      }

      // Credit buyer's wallet
      const creditResult = await walletService.creditWallet({
        userId: escrowData.buyerId,
        amount: refundAmount,
        transactionId: txResult.transactionId,
        description: `Refund for cancelled order`,
      });

      if (!creditResult.success) {
        return { success: false, message: "Failed to credit buyer wallet" };
      }

      // Update escrow status
      await db
        .update(escrowAccounts)
        .set({
          status: "refunded",
          refundedAt: new Date(),
        })
        .where(eq(escrowAccounts.id, escrowId));

      // Update related order status
      await db
        .update(orders)
        .set({
          status: "refunded",
        })
        .where(eq(orders.escrowId, escrowId));

      console.log(`[EscrowService] Refunded escrow ${escrowId}. Amount: ${refundAmount} to buyer ${escrowData.buyerId}`);

      return {
        success: true,
        message: "Escrow refunded successfully",
      };
    } catch (error) {
      console.error("[EscrowService] Refund escrow error:", error);
      return {
        success: false,
        message: "Failed to refund escrow",
      };
    }
  }

  /**
   * Create a dispute for an escrow account
   */
  async createDispute(escrowId: number, reason: string): Promise<{ success: boolean; message?: string }> {
    try {
      const escrow = await db.select().from(escrowAccounts).where(eq(escrowAccounts.id, escrowId)).limit(1);

      if (!escrow.length) {
        return { success: false, message: "Escrow account not found" };
      }

      const escrowData = escrow[0];

      if (escrowData.status !== "active") {
        return { success: false, message: "Can only dispute active escrow accounts" };
      }

      // Update escrow to disputed status
      await db
        .update(escrowAccounts)
        .set({
          status: "disputed",
          disputeReason: reason,
        })
        .where(eq(escrowAccounts.id, escrowId));

      console.log(`[EscrowService] Dispute created for escrow ${escrowId}`);

      return {
        success: true,
        message: "Dispute created successfully. Our team will review it shortly.",
      };
    } catch (error) {
      console.error("[EscrowService] Create dispute error:", error);
      return {
        success: false,
        message: "Failed to create dispute",
      };
    }
  }

  /**
   * Get escrow accounts ready for automatic release
   * (7 days have passed and status is still "active")
   */
  async getEscrowsReadyForRelease(): Promise<any[]> {
    try {
      const now = new Date();

      const readyEscrows = await db
        .select()
        .from(escrowAccounts)
        .where(
          and(
            eq(escrowAccounts.status, "active"),
            lt(escrowAccounts.releaseAt, now)
          )
        );

      return readyEscrows;
    } catch (error) {
      console.error("[EscrowService] Get escrows ready for release error:", error);
      return [];
    }
  }

  /**
   * Process automatic escrow releases
   * This should be called by a scheduled job (cron)
   */
  async processAutomaticReleases(): Promise<{ released: number; failed: number }> {
    const escrows = await this.getEscrowsReadyForRelease();
    let released = 0;
    let failed = 0;

    console.log(`[EscrowService] Processing ${escrows.length} escrows for automatic release`);

    for (const escrow of escrows) {
      const result = await this.releaseEscrow(escrow.id);
      if (result.success) {
        released++;
      } else {
        failed++;
        console.error(`[EscrowService] Failed to auto-release escrow ${escrow.id}:`, result.message);
      }
    }

    console.log(`[EscrowService] Auto-release complete. Released: ${released}, Failed: ${failed}`);

    return { released, failed };
  }

  /**
   * Get user's escrow accounts (as buyer or seller)
   */
  async getUserEscrows(userId: string, role: "buyer" | "seller" = "buyer") {
    try {
      const condition = role === "buyer"
        ? eq(escrowAccounts.buyerId, userId)
        : eq(escrowAccounts.sellerId, userId);

      const escrows = await db
        .select()
        .from(escrowAccounts)
        .where(condition)
        .orderBy(sql`${escrowAccounts.createdAt} DESC`);

      return {
        success: true,
        escrows,
      };
    } catch (error) {
      console.error("[EscrowService] Get user escrows error:", error);
      return {
        success: false,
        message: "Failed to get escrow accounts",
      };
    }
  }
}

export const escrowService = new EscrowService();
