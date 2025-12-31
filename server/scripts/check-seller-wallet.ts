/**
 * Check if sellers received payment from completed orders
 *
 * Usage: npx tsx server/scripts/check-seller-wallet.ts <seller_user_id>
 */

import { db } from "../db";
import { users, transactions, walletTransactions, swapOrders } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

async function checkSellerWallet(sellerId?: string) {
  try {
    if (sellerId) {
      console.log(`\n🔍 Checking wallet for seller: ${sellerId}...\n`);

      // Get seller info
      const [seller] = await db
        .select()
        .from(users)
        .where(eq(users.id, sellerId))
        .limit(1);

      if (!seller) {
        console.log("❌ Seller not found");
        return;
      }

      console.log("👤 Seller Details:");
      console.log(`   Name: ${seller.fullName}`);
      console.log(`   Email: ${seller.email}`);
      console.log(`   💰 Wallet Balance: KES ${parseFloat(seller.walletBalance || "0").toLocaleString()}\n`);

      // Get sale transactions for this seller
      const saleTransactions = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, sellerId),
            eq(transactions.type, "sale")
          )
        )
        .orderBy(desc(transactions.createdAt))
        .limit(10);

      console.log(`📊 Sale Transactions: ${saleTransactions.length}\n`);

      for (const tx of saleTransactions) {
        console.log("━".repeat(60));
        console.log(`💳 Transaction ID: ${tx.id}`);
        console.log(`   Amount: KES ${parseFloat(tx.amount).toLocaleString()}`);
        console.log(`   Status: ${tx.status}`);
        console.log(`   Payment Ref: ${tx.paymentReference}`);
        console.log(`   Description: ${tx.description}`);
        console.log(`   Created: ${tx.createdAt}`);
        console.log(`   Completed: ${tx.completedAt || "N/A"}`);

        if (tx.metadata) {
          try {
            const metadata = JSON.parse(tx.metadata as string);
            console.log(`   Metadata:`, metadata);
          } catch (e) {
            console.log(`   Metadata: ${tx.metadata}`);
          }
        }
        console.log();
      }

      // Get wallet transactions
      const walletTxs = await db
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.userId, sellerId))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(10);

      console.log(`\n💼 Wallet Transactions: ${walletTxs.length}\n`);

      for (const wtx of walletTxs) {
        console.log("━".repeat(60));
        console.log(`🔖 Wallet Transaction ID: ${wtx.id}`);
        console.log(`   Type: ${wtx.type}`);
        console.log(`   Amount: KES ${parseFloat(wtx.amount).toLocaleString()}`);
        console.log(`   Balance After: KES ${parseFloat(wtx.balanceAfter).toLocaleString()}`);
        console.log(`   Description: ${wtx.description}`);
        console.log(`   Created: ${wtx.createdAt}`);
        console.log();
      }

      // Get completed orders where this user is the seller
      const completedOrders = await db
        .select()
        .from(swapOrders)
        .where(
          and(
            eq(swapOrders.ownerId, sellerId),
            eq(swapOrders.status, "completed")
          )
        )
        .orderBy(desc(swapOrders.createdAt))
        .limit(10);

      console.log(`\n📦 Completed Orders (as seller): ${completedOrders.length}\n`);

      for (const order of completedOrders) {
        console.log("━".repeat(60));
        console.log(`📦 Order ID: ${order.id}`);
        console.log(`   Order Number: ${order.orderNumber}`);
        console.log(`   Order Type: ${order.orderType}`);
        console.log(`   Book Price: KES ${parseFloat(order.bookPrice || "0").toLocaleString()}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Completed: ${order.completedAt || "N/A"}`);
        console.log(`   Escrow ID: ${order.escrowId || "N/A"}`);
        console.log();
      }

    } else {
      // Show all sellers with completed orders
      console.log("\n🔍 Checking all sellers with completed orders...\n");

      const completedOrders = await db
        .select({
          order: swapOrders,
          seller: users,
        })
        .from(swapOrders)
        .innerJoin(users, eq(swapOrders.ownerId, users.id))
        .where(
          and(
            eq(swapOrders.status, "completed"),
            eq(swapOrders.orderType, "purchase")
          )
        )
        .orderBy(desc(swapOrders.completedAt))
        .limit(20);

      console.log(`Found ${completedOrders.length} completed purchase order(s)\n`);

      for (const { order, seller } of completedOrders) {
        console.log("━".repeat(60));
        console.log(`📦 Order #${order.orderNumber}`);
        console.log(`   👤 Seller: ${seller.fullName} (${seller.id})`);
        console.log(`   📚 Book Price: KES ${parseFloat(order.bookPrice || "0").toLocaleString()}`);
        console.log(`   💰 Seller Wallet: KES ${parseFloat(seller.walletBalance || "0").toLocaleString()}`);
        console.log(`   ✅ Completed: ${order.completedAt}`);
        console.log();
      }
    }

    console.log("━".repeat(60));
    console.log("✨ Check complete!\n");
  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Get seller ID from command line
const sellerId = process.argv[2];

checkSellerWallet(sellerId);
