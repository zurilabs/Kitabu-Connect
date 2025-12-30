/**
 * Manually credit a pending topup transaction
 *
 * Usage: npx tsx server/scripts/manually-credit-topup.ts <transaction_id>
 *
 * WARNING: This script bypasses Paystack verification and directly credits the wallet.
 * Only use this if you've manually confirmed the payment was successful with Paystack.
 */

import { db } from "../db";
import { transactions, users, walletTransactions, notifications } from "../db/schema";
import { eq } from "drizzle-orm";

async function manuallyCreditTopup(transactionId: number) {
  try {
    console.log(`\n🔍 Looking for transaction ID: ${transactionId}...\n`);

    // Find the transaction
    const txResult = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (!txResult.length) {
      console.log("❌ Transaction not found");
      return;
    }

    const tx = txResult[0];

    console.log("📝 Transaction Details:");
    console.log(`   ID: ${tx.id}`);
    console.log(`   User ID: ${tx.userId}`);
    console.log(`   Type: ${tx.type}`);
    console.log(`   Amount: KES ${tx.amount}`);
    console.log(`   Status: ${tx.status}`);
    console.log(`   Payment Reference: ${tx.paymentReference}`);
    console.log(`   Created: ${tx.createdAt}\n`);

    if (tx.status === "completed") {
      console.log("✅ Transaction already completed!");
      return;
    }

    if (tx.type !== "topup") {
      console.log(`❌ This is not a topup transaction (type: ${tx.type})`);
      return;
    }

    // Get user current balance
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, tx.userId))
      .limit(1);

    if (!userResult.length) {
      console.log("❌ User not found");
      return;
    }

    const user = userResult[0];
    const currentBalance = parseFloat(user.walletBalance || "0");
    const creditAmount = parseFloat(tx.amount);
    const newBalance = currentBalance + creditAmount;

    console.log("💳 Balance Update:");
    console.log(`   Current balance: KES ${currentBalance.toFixed(2)}`);
    console.log(`   Credit amount: KES ${creditAmount.toFixed(2)}`);
    console.log(`   New balance: KES ${newBalance.toFixed(2)}\n`);

    console.log("⚠️  WARNING: This will credit the wallet WITHOUT verifying with Paystack!");
    console.log("   Make sure you have manually confirmed the payment was successful.\n");

    // In a production script, you'd want confirmation here
    // For now, we'll proceed automatically

    console.log("🔄 Processing credit...\n");

    // Update user balance
    await db
      .update(users)
      .set({ walletBalance: newBalance.toFixed(2) })
      .where(eq(users.id, tx.userId));

    console.log("✅ User balance updated");

    // Create wallet transaction record
    await db.insert(walletTransactions).values({
      userId: tx.userId,
      type: "credit",
      amount: creditAmount.toFixed(2),
      balanceAfter: newBalance.toFixed(2),
      transactionId: tx.id,
      description: `Wallet top-up via Paystack (${tx.paymentReference}) - Manually verified`,
    });

    console.log("✅ Wallet transaction recorded");

    // Update transaction status
    await db
      .update(transactions)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(transactions.id, tx.id));

    console.log("✅ Transaction marked as completed");

    // Send notification to user
    await db.insert(notifications).values({
      userId: tx.userId,
      type: "wallet_topup",
      title: "Wallet Top-up Successful",
      message: `Your wallet has been credited with KES ${creditAmount.toLocaleString()}. Your new balance is KES ${newBalance.toLocaleString()}.`,
      actionUrl: "/dashboard",
      isRead: false,
    });

    console.log("✅ Notification sent to user");

    console.log("\n" + "━".repeat(60));
    console.log("✨ Success! Wallet has been credited.");
    console.log(`   User ${tx.userId} now has KES ${newBalance.toFixed(2)}`);
    console.log("━".repeat(60) + "\n");
  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Get transaction ID from command line
const txId = parseInt(process.argv[2]);

if (!txId || isNaN(txId)) {
  console.log("\n❌ Please provide a transaction ID");
  console.log("\nUsage: npx tsx server/scripts/manually-credit-topup.ts <transaction_id>");
  console.log("Example: npx tsx server/scripts/manually-credit-topup.ts 3\n");
  process.exit(1);
} else {
  manuallyCreditTopup(txId);
}
