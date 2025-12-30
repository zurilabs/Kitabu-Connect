/**
 * Manually verify a purchase order payment
 *
 * Usage: npx tsx server/scripts/verify-purchase-payment.ts <purchase_order_id> <payment_reference>
 */

import { db } from "../db";
import { swapOrders, transactions, escrowAccounts } from "../db/schema";
import { eq } from "drizzle-orm";
import { messageService } from "../services/message.service";

async function verifyPurchasePayment(purchaseOrderId: number, paymentReference: string) {
  try {
    console.log(`\n🔍 Verifying payment for Purchase Order #${purchaseOrderId}...\n`);
    console.log(`📋 Payment Reference: ${paymentReference}\n`);

    // Get the purchase order
    const [purchaseOrder] = await db
      .select()
      .from(swapOrders)
      .where(eq(swapOrders.id, purchaseOrderId))
      .limit(1);

    if (!purchaseOrder) {
      console.log("❌ Purchase order not found");
      return;
    }

    console.log("📦 Purchase Order Details:");
    console.log(`   Order Number: ${purchaseOrder.orderNumber}`);
    console.log(`   Status: ${purchaseOrder.status}`);
    console.log(`   Buyer ID: ${purchaseOrder.requesterId}`);
    console.log(`   Seller ID: ${purchaseOrder.ownerId}`);
    console.log(`   Total Amount: KES ${purchaseOrder.totalAmount}`);
    console.log(`   Book Price: KES ${purchaseOrder.bookPrice}`);
    console.log(`   Fee: KES ${purchaseOrder.convenienceFee}`);
    console.log(`   Buyer Paid: ${purchaseOrder.requesterPaidFee ? "Yes" : "No"}\n`);

    if (purchaseOrder.status !== "awaiting_payment") {
      console.log(`⚠️  Order status is "${purchaseOrder.status}", not "awaiting_payment"`);
      console.log("   This order may have already been processed or is not ready for payment.\n");

      if (purchaseOrder.requesterPaidFee) {
        console.log("✅ Payment already recorded!");
        return;
      }
    }

    const totalAmount = parseFloat(purchaseOrder.totalAmount || "0");
    const bookPrice = parseFloat(purchaseOrder.bookPrice || "0");
    const convenienceFee = parseFloat(purchaseOrder.convenienceFee || "0");

    console.log("⚠️  WARNING: This will mark the order as paid WITHOUT verifying with Paystack!");
    console.log("   Make sure the payment was actually successful before proceeding.\n");

    // Create escrow account
    console.log("🔄 Creating escrow account...");
    const [escrowAccount] = await db
      .insert(escrowAccounts)
      .values({
        bookListingId: purchaseOrder.requestedListingId,
        buyerId: purchaseOrder.requesterId,
        sellerId: purchaseOrder.ownerId,
        amount: bookPrice.toFixed(2),
        currency: "KES",
        platformFee: convenienceFee.toFixed(2),
        status: "active",
        holdPeriodDays: 7,
        releaseAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .$returningId();

    console.log(`✅ Escrow account created: #${escrowAccount.id}`);

    // Record transaction
    console.log("🔄 Recording transaction...");
    await db.insert(transactions).values({
      userId: purchaseOrder.requesterId,
      type: "purchase",
      status: "completed",
      amount: totalAmount.toFixed(2),
      currency: "KES",
      paymentMethod: "paystack",
      paymentReference: paymentReference,
      bookListingId: purchaseOrder.requestedListingId,
      escrowId: escrowAccount.id,
      description: `Purchase of book - Order #${purchaseOrder.orderNumber}`,
      metadata: JSON.stringify({
        purchaseOrderId: purchaseOrderId,
        orderNumber: purchaseOrder.orderNumber,
        bookPrice: bookPrice,
        convenienceFee: convenienceFee,
      }),
      completedAt: new Date(),
    });

    console.log("✅ Transaction recorded");

    // Update order status
    console.log("🔄 Updating order status...");
    await db
      .update(swapOrders)
      .set({
        escrowId: escrowAccount.id,
        status: "requirements_gathering",
        requesterPaidFee: true,
        requesterPaymentReference: paymentReference,
      })
      .where(eq(swapOrders.id, purchaseOrderId));

    console.log("✅ Order status updated to requirements_gathering");

    // Send system message
    console.log("🔄 Sending system message...");
    await messageService.sendSystemMessage(
      purchaseOrderId,
      `Payment of KES ${totalAmount} received and held in escrow. The buyer can now submit delivery details.`
    );

    console.log("✅ System message sent");

    console.log("\n" + "━".repeat(60));
    console.log("✨ Success! Purchase payment verified and processed.");
    console.log(`   Order #${purchaseOrder.orderNumber} is now in requirements_gathering status.`);
    console.log(`   Escrow: KES ${bookPrice} + Platform Fee: KES ${convenienceFee}`);
    console.log("━".repeat(60) + "\n");

  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Get parameters from command line
const purchaseOrderId = parseInt(process.argv[2]);
const paymentReference = process.argv[3];

if (!purchaseOrderId || isNaN(purchaseOrderId) || !paymentReference) {
  console.log("\n❌ Usage: npx tsx server/scripts/verify-purchase-payment.ts <purchase_order_id> <payment_reference>");
  console.log("\nExample: npx tsx server/scripts/verify-purchase-payment.ts 4 PUR-20251230-RNA1-1767123456789\n");
  process.exit(1);
}

verifyPurchasePayment(purchaseOrderId, paymentReference);
