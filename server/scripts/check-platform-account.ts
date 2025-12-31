/**
 * Check platform account status and revenue
 * Usage: npx tsx server/scripts/check-platform-account.ts
 */

import { db } from "../db";
import { users, transactions, walletTransactions } from "../db/schema";
import { eq } from "drizzle-orm";

const PLATFORM_EMAIL = "platform@kitabuconnect.com";

async function checkPlatformAccount() {
  try {
    console.log("\n🏢 Platform Account Status\n");

    // Get platform account
    const [platformUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, PLATFORM_EMAIL))
      .limit(1);

    if (!platformUser) {
      console.log("❌ Platform account not found!");
      return;
    }

    console.log(`Email: ${platformUser.email}`);
    console.log(`ID: ${platformUser.id}`);
    console.log(`Name: ${platformUser.fullName}`);
    console.log(`Wallet Balance: KES ${parseFloat(platformUser.walletBalance || "0").toLocaleString()}\n`);

    // Get platform revenue transactions
    const revenueTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, platformUser.id));

    console.log("=".repeat(60));
    console.log(`\n💰 Platform Revenue Transactions (${revenueTransactions.length})\n`);

    let totalRevenue = 0;
    for (const txn of revenueTransactions) {
      const amount = parseFloat(txn.amount || "0");
      totalRevenue += amount;

      console.log(`${txn.type.toUpperCase()}: KES ${amount.toFixed(2)}`);
      console.log(`  Status: ${txn.status}`);
      console.log(`  Reference: ${txn.paymentReference || "N/A"}`);
      console.log(`  Description: ${txn.description || "N/A"}`);
      console.log(`  Created: ${txn.createdAt}`);
      console.log();
    }

    console.log("=".repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`  Total Revenue Collected: KES ${totalRevenue.toFixed(2)}`);
    console.log(`  Current Balance: KES ${parseFloat(platformUser.walletBalance || "0").toFixed(2)}`);
    console.log(`  Transactions Count: ${revenueTransactions.length}\n`);
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

checkPlatformAccount();
