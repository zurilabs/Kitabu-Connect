/**
 * Manual script to verify and complete pending topup transactions
 *
 * Usage: npx tsx server/scripts/verify-pending-topup.ts <payment_reference>
 *
 * This script will:
 * 1. Find the pending transaction by payment reference
 * 2. Verify the payment with Paystack
 * 3. Credit the user's wallet if payment was successful
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { db } from "../db";
import { transactions, users, walletTransactions } from "../db/schema";
import { eq } from "drizzle-orm";
import { verifyPayment } from "../config/paystack";

async function verifyPendingTopup(paymentReference?: string) {
  try {
    console.log("🔍 Searching for pending topup transactions...\n");

    // Find pending topup transactions
    let pendingTransactions;

    if (paymentReference) {
      pendingTransactions = await db
        .select()
        .from(transactions)
        .where(eq(transactions.paymentReference, paymentReference))
        .limit(1);
    } else {
      pendingTransactions = await db
        .select()
        .from(transactions)
        .where(eq(transactions.type, "topup"))
        .orderBy(transactions.createdAt)
        .limit(10);
    }

    if (!pendingTransactions.length) {
      console.log("❌ No pending topup transactions found");
      if (paymentReference) {
        console.log(`   Payment reference: ${paymentReference}`);
      }
      return;
    }

    console.log(`✅ Found ${pendingTransactions.length} transaction(s)\n`);

    for (const tx of pendingTransactions) {
      console.log("━".repeat(60));
      console.log(`📝 Transaction ID: ${tx.id}`);
      console.log(`👤 User ID: ${tx.userId}`);
      console.log(`💰 Amount: KES ${tx.amount}`);
      console.log(`📋 Status: ${tx.status}`);
      console.log(`🔗 Payment Reference: ${tx.paymentReference}`);
      console.log(`📅 Created: ${tx.createdAt}`);

      if (tx.status === "completed") {
        console.log("✅ Already completed - skipping\n");
        continue;
      }

      if (!tx.paymentReference) {
        console.log("❌ No payment reference - cannot verify\n");
        continue;
      }

      // Verify with Paystack
      console.log("\n🔄 Verifying payment with Paystack...");
      const verification = await verifyPayment(tx.paymentReference);

      if (!verification.success) {
        console.log(`❌ Verification failed: ${verification.message}\n`);
        continue;
      }

      const paymentData = verification.data;
      console.log(`✅ Payment verified`);
      console.log(`   Status: ${paymentData.status}`);
      console.log(`   Amount: ${paymentData.amount / 100} KES`);

      if (paymentData.status !== "success") {
        console.log(`⚠️  Payment not successful - status: ${paymentData.status}\n`);
        continue;
      }

      // Get user current balance
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, tx.userId))
        .limit(1);

      if (!user.length) {
        console.log("❌ User not found\n");
        continue;
      }

      const currentBalance = parseFloat(user[0].walletBalance || "0");
      const creditAmount = parseFloat(tx.amount);
      const newBalance = currentBalance + creditAmount;

      console.log(`\n💳 Current balance: KES ${currentBalance}`);
      console.log(`➕ Credit amount: KES ${creditAmount}`);
      console.log(`💰 New balance: KES ${newBalance}`);

      // Update user balance
      await db
        .update(users)
        .set({ walletBalance: newBalance.toFixed(2) })
        .where(eq(users.id, tx.userId));

      // Create wallet transaction record
      await db.insert(walletTransactions).values({
        userId: tx.userId,
        type: "credit",
        amount: creditAmount.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        transactionId: tx.id,
        description: `Wallet top-up via Paystack (${tx.paymentReference})`,
      });

      // Update transaction status
      await db
        .update(transactions)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(transactions.id, tx.id));

      console.log("✅ Wallet credited successfully!");
      console.log("✅ Transaction marked as completed");
      console.log("✅ Wallet transaction recorded\n");
    }

    console.log("━".repeat(60));
    console.log("✨ Processing complete!");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Get payment reference from command line args
const paymentReference = process.argv[2];

if (paymentReference) {
  console.log(`🔍 Verifying specific payment: ${paymentReference}\n`);
  verifyPendingTopup(paymentReference);
} else {
  console.log("📋 Showing recent pending topup transactions\n");
  console.log("💡 Tip: Run with a payment reference to verify a specific transaction:");
  console.log("   npx tsx server/scripts/verify-pending-topup.ts KITABU-xxxxx-xxxxx\n");
  verifyPendingTopup();
}
