/**
 * Backfill platform revenue for completed orders
 * This credits the platform account with fees from orders that completed before we started tracking
 *
 * Usage: npx tsx server/scripts/backfill-platform-revenue.ts
 */

import { db } from "../db";
import { swapOrders, escrowAccounts, transactions, users, walletTransactions } from "../db/schema";
import { eq, and } from "drizzle-orm";

const PLATFORM_USER_ID = "platform-000000-0000-0000-0000-000000000001";
const PLATFORM_EMAIL = "platform@kitabuconnect.com";

async function backfillPlatformRevenue() {
  try {
    console.log("\n💰 Backfilling Platform Revenue...\n");

    // Get platform account by email (in case ID was auto-generated)
    const [platformUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, PLATFORM_EMAIL))
      .limit(1);

    if (!platformUser) {
      console.log("❌ Platform account not found! Please run create-platform-account.ts first.");
      return;
    }

    const actualPlatformId = platformUser.id;
    console.log(`🏢 Platform Account: ${platformUser.email} (ID: ${actualPlatformId})`);
    console.log(`   Current Balance: KES ${parseFloat(platformUser.walletBalance || "0").toLocaleString()}\n`);

    // Get all completed purchase orders
    const completedOrders = await db
      .select()
      .from(swapOrders)
      .where(
        and(
          eq(swapOrders.status, "completed"),
          eq(swapOrders.orderType, "purchase")
        )
      );

    console.log(`📦 Found ${completedOrders.length} completed purchase orders\n`);

    if (completedOrders.length === 0) {
      console.log("✅ No orders to backfill.\n");
      return;
    }

    let totalFeesCollected = 0;
    let ordersProcessed = 0;
    let ordersSkipped = 0;

    for (const order of completedOrders) {
      // Check if we already have a platform revenue transaction for this order
      const [existingRevenue] = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, actualPlatformId),
            eq(transactions.type, "platform_revenue"),
            eq(transactions.paymentReference, order.requesterPaymentReference || "")
          )
        )
        .limit(1);

      if (existingRevenue) {
        console.log(`⏭️  Skipping Order #${order.orderNumber} (already processed)`);
        ordersSkipped++;
        continue;
      }

      const convenienceFee = parseFloat(order.convenienceFee || "0");

      if (convenienceFee === 0) {
        console.log(`⏭️  Skipping Order #${order.orderNumber} (no fee)`);
        ordersSkipped++;
        continue;
      }

      console.log(`\n━`.repeat(30));
      console.log(`📝 Processing Order #${order.orderNumber}`);
      console.log(`   Book Price: KES ${parseFloat(order.bookPrice || "0").toLocaleString()}`);
      console.log(`   Convenience Fee: KES ${convenienceFee.toLocaleString()}`);

      // Get current platform balance
      const [currentPlatformUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, actualPlatformId))
        .limit(1);

      const currentBalance = parseFloat(currentPlatformUser!.walletBalance || "0");
      const newBalance = currentBalance + convenienceFee;

      // Create platform revenue transaction
      const [platformRevenueResult] = await db.insert(transactions).values({
        userId: actualPlatformId,
        type: "platform_revenue",
        status: "completed",
        amount: convenienceFee.toFixed(2),
        currency: "KES",
        paymentMethod: "paystack",
        paymentReference: order.requesterPaymentReference,
        bookListingId: order.requestedListingId,
        escrowId: order.escrowId,
        description: `Platform fee from Order #${order.orderNumber} (backfilled)`,
        metadata: JSON.stringify({
          purchaseOrderId: order.id,
          orderNumber: order.orderNumber,
          sellerId: order.ownerId,
          buyerId: order.requesterId,
          bookPrice: parseFloat(order.bookPrice || "0"),
          backfilled: true,
          backfilledAt: new Date().toISOString(),
        }),
        completedAt: order.completedAt || new Date(),
        createdAt: order.completedAt || new Date(), // Set to order completion time
      }).$returningId();

      // Update platform wallet balance
      await db
        .update(users)
        .set({
          walletBalance: newBalance.toFixed(2),
        })
        .where(eq(users.id, actualPlatformId));

      // Record wallet transaction for platform
      await db.insert(walletTransactions).values({
        userId: actualPlatformId,
        type: "credit",
        amount: convenienceFee.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        transactionId: platformRevenueResult.id,
        description: `Platform fee collected - Order #${order.orderNumber} (backfilled)`,
        createdAt: order.completedAt || new Date(), // Set to order completion time
      });

      totalFeesCollected += convenienceFee;
      ordersProcessed++;

      console.log(`   ✅ Credited platform: KES ${convenienceFee.toFixed(2)}`);
      console.log(`   📊 New platform balance: KES ${newBalance.toFixed(2)}`);
    }

    console.log(`\n${"━".repeat(60)}`);
    console.log("\n✨ Backfill Complete!\n");
    console.log(`📊 Summary:`);
    console.log(`   Orders Processed: ${ordersProcessed}`);
    console.log(`   Orders Skipped: ${ordersSkipped}`);
    console.log(`   Total Fees Collected: KES ${totalFeesCollected.toFixed(2)}`);

    // Get final platform balance
    const [finalPlatformUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, actualPlatformId))
      .limit(1);

    console.log(`   Final Platform Balance: KES ${parseFloat(finalPlatformUser!.walletBalance || "0").toLocaleString()}\n`);
    console.log(`${"━".repeat(60)}\n`);

  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

backfillPlatformRevenue();
