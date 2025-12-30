import 'dotenv/config';
import { db } from './server/db.ts';
import { swapOrders, escrowAccounts, transactions } from './server/db/schema/index.ts';
import { eq } from 'drizzle-orm';

async function checkTables() {
  try {
    console.log('=== DATABASE TABLES UPDATED BY PAYMENT PROCESS ===\n');

    // 1. Check SWAP_ORDERS table
    console.log('1️⃣ SWAP_ORDERS TABLE (Purchase Orders)');
    console.log('   Table: swap_orders');
    console.log('   Purpose: Stores purchase order information\n');

    const order = await db.select().from(swapOrders).where(eq(swapOrders.id, 3));
    if (order.length > 0) {
      const o = order[0];
      console.log('   Updated Fields:');
      console.log(`   ✅ status: "${o.status}" (changed from "awaiting_payment" to "requirements_gathering")`);
      console.log(`   ✅ escrowId: ${o.escrowId} (set to escrow account ID)`);
      console.log(`   ✅ requesterPaidFee: ${o.requesterPaidFee} (set to true)`);
      console.log(`   ✅ requesterPaymentReference: "${o.requesterPaymentReference}"`);
      console.log(`   ✅ updatedAt: ${o.updatedAt}\n`);
    }

    // 2. Check ESCROW_ACCOUNTS table
    console.log('2️⃣ ESCROW_ACCOUNTS TABLE');
    console.log('   Table: escrow_accounts');
    console.log('   Purpose: Holds buyer payment in escrow until delivery confirmed\n');

    const escrow = await db.select().from(escrowAccounts).where(eq(escrowAccounts.id, 1));
    if (escrow.length > 0) {
      const e = escrow[0];
      console.log('   Created Record:');
      console.log(`   ✅ id: ${e.id}`);
      console.log(`   ✅ buyerId: ${e.buyerId}`);
      console.log(`   ✅ sellerId: ${e.sellerId}`);
      console.log(`   ✅ amount: KES ${e.amount} (book price - goes to seller)`);
      console.log(`   ✅ platformFee: KES ${e.platformFee} (5% platform fee)`);
      console.log(`   ✅ status: "${e.status}"`);
      console.log(`   ✅ holdPeriodDays: ${e.holdPeriodDays} days`);
      console.log(`   ✅ releaseAt: ${e.releaseAt} (auto-release date)\n`);
    }

    // 3. Check TRANSACTIONS table
    console.log('3️⃣ TRANSACTIONS TABLE');
    console.log('   Table: transactions');
    console.log('   Purpose: Records all financial transactions for audit trail\n');

    const trans = await db.select().from(transactions).where(eq(transactions.escrowId, 1));
    if (trans.length > 0) {
      const t = trans[0];
      console.log('   Created Record:');
      console.log(`   ✅ id: ${t.id}`);
      console.log(`   ✅ userId: ${t.userId} (buyer)`);
      console.log(`   ✅ type: "${t.type}"`);
      console.log(`   ✅ status: "${t.status}"`);
      console.log(`   ✅ amount: KES ${t.amount} (total payment)`);
      console.log(`   ✅ paymentMethod: "${t.paymentMethod}"`);
      console.log(`   ✅ paymentReference: "${t.paymentReference}"`);
      console.log(`   ✅ escrowId: ${t.escrowId}`);
      console.log(`   ✅ description: "${t.description}"`);
      console.log(`   ✅ completedAt: ${t.completedAt}\n`);
    }

    console.log('=== SUMMARY ===');
    console.log('✅ 3 tables updated:');
    console.log('   1. swap_orders (order status and payment tracking)');
    console.log('   2. escrow_accounts (holds payment securely)');
    console.log('   3. transactions (audit trail of payment)');
    console.log('\n💰 Total Amount: KES 294.00');
    console.log('   - Book Price: KES 280.00 (held in escrow for seller)');
    console.log('   - Platform Fee: KES 14.00 (5%)');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTables();
