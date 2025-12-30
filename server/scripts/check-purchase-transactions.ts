/**
 * Check purchase order transactions and their status
 */

import { db } from "../db";
import { transactions, swapOrders } from "../db/schema";
import { eq, desc, or } from "drizzle-orm";

async function checkPurchaseTransactions() {
  try {
    console.log("\n🔍 Checking recent purchase transactions...\n");

    // Get recent purchase transactions
    const purchaseTxs = await db
      .select()
      .from(transactions)
      .where(eq(transactions.type, "purchase"))
      .orderBy(desc(transactions.createdAt))
      .limit(10);

    console.log(`Found ${purchaseTxs.length} purchase transaction(s)\n`);

    for (const tx of purchaseTxs) {
      console.log("━".repeat(60));
      console.log(`📝 Transaction ID: ${tx.id}`);
      console.log(`👤 User ID: ${tx.userId}`);
      console.log(`💰 Amount: KES ${tx.amount}`);
      console.log(`📋 Status: ${tx.status}`);
      console.log(`🔗 Payment Reference: ${tx.paymentReference}`);
      console.log(`📅 Created: ${tx.createdAt}`);
      console.log(`✅ Completed: ${tx.completedAt || "N/A"}`);

      // Parse metadata
      if (tx.metadata) {
        try {
          const metadata = JSON.parse(tx.metadata as string);
          console.log(`📦 Metadata:`, metadata);
        } catch (e) {
          console.log(`⚠️  Could not parse metadata`);
        }
      }
      console.log();
    }

    // Check swap orders for purchase type
    console.log("\n🔍 Checking recent purchase orders...\n");

    const purchaseOrders = await db
      .select()
      .from(swapOrders)
      .where(eq(swapOrders.orderType, "purchase"))
      .orderBy(desc(swapOrders.createdAt))
      .limit(10);

    console.log(`Found ${purchaseOrders.length} purchase order(s)\n`);

    for (const order of purchaseOrders) {
      console.log("━".repeat(60));
      console.log(`📦 Order ID: ${order.id}`);
      console.log(`🔢 Order Number: ${order.orderNumber}`);
      console.log(`👤 Buyer ID: ${order.requesterId}`);
      console.log(`👤 Seller ID: ${order.ownerId}`);
      console.log(`💰 Total Amount: KES ${order.totalAmount}`);
      console.log(`💰 Book Price: KES ${order.bookPrice}`);
      console.log(`💰 Fee: KES ${order.convenienceFee}`);
      console.log(`📋 Status: ${order.status}`);
      console.log(`💳 Buyer Paid: ${order.requesterPaidFee ? "Yes" : "No"}`);
      console.log(`🔗 Payment Reference: ${order.requesterPaymentReference || "N/A"}`);
      console.log(`📅 Created: ${order.createdAt}`);
      console.log();
    }

    console.log("━".repeat(60));
    console.log("✨ Check complete!");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

checkPurchaseTransactions();
