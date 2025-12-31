/**
 * Create platform account for tracking revenue
 *
 * Usage: npx tsx server/scripts/create-platform-account.ts
 */

import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const PLATFORM_USER_ID = "platform-000000-0000-0000-0000-000000000001";
const PLATFORM_EMAIL = "platform@kitabuconnect.com";

async function createPlatformAccount() {
  try {
    console.log("\n🏢 Creating Platform Account...\n");

    // Check if platform account already exists
    const [existingAccount] = await db
      .select()
      .from(users)
      .where(eq(users.email, PLATFORM_EMAIL))
      .limit(1);

    if (existingAccount) {
      console.log("✅ Platform account already exists!");
      console.log(`   ID: ${existingAccount.id}`);
      console.log(`   Email: ${existingAccount.email}`);
      console.log(`   Balance: KES ${parseFloat(existingAccount.walletBalance || "0").toLocaleString()}`);
      console.log("\n━".repeat(60));
      return;
    }

    // Create platform account with specific ID
    await db.insert(users).values({
      id: PLATFORM_USER_ID,
      email: PLATFORM_EMAIL,
      fullName: "Kitabu Connect Platform",
      phoneNumber: "+254700000000",
      role: "admin", // Special role for platform
      walletBalance: "0.00",
      onboardingCompleted: true,
    });

    // Get the actual created account
    const [createdAccount] = await db
      .select()
      .from(users)
      .where(eq(users.email, PLATFORM_EMAIL))
      .limit(1);

    console.log("✅ Platform account created successfully!");
    console.log(`   ID: ${createdAccount.id}`);
    console.log(`   Email: ${createdAccount.email}`);
    console.log(`   Purpose: Track platform revenue from convenience fees`);
    console.log("\n━".repeat(60));
    console.log("\n📝 Next Steps:");
    console.log("   1. Run backfill script to credit existing completed orders");
    console.log("   2. Platform will automatically collect fees on new orders");
    console.log("   3. Check platform balance in dashboard\n");

  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

createPlatformAccount();
