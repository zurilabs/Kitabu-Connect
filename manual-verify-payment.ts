import 'dotenv/config';
import { db } from './server/db.ts';
import { swapOrders, escrowAccounts, transactions } from './server/db/schema/index.ts';
import { eq } from 'drizzle-orm';
import { verifyPayment } from './server/config/paystack.ts';

const PURCHASE_ORDER_ID = 3;
// Try both reference formats (with and without double PUR-)
const PAYMENT_REFERENCES_TO_TRY = [
  "PUR-PUR-20251230-ITXR-1767114508053", // From user's manual attempt
  "PUR-20251230-ITXR-1767114508053", // Without double prefix
  "KITABU-1735589308053-114508053", // Alternative format
];

async function manuallyVerifyPayment() {
  try {
    console.log('=== Manual Payment Verification ===');
    console.log(`Order ID: ${PURCHASE_ORDER_ID}\n`);

    // Step 1: Get the purchase order
    const [purchaseOrder] = await db
      .select()
      .from(swapOrders)
      .where(eq(swapOrders.id, PURCHASE_ORDER_ID))
      .limit(1);

    if (!purchaseOrder) {
      console.error('❌ Purchase order not found');
      process.exit(1);
    }

    console.log('📦 Purchase Order Found:');
    console.log(`  - Order Number: ${purchaseOrder.orderNumber}`);
    console.log(`  - Status: ${purchaseOrder.status}`);
    console.log(`  - Total Amount: KES ${purchaseOrder.totalAmount}`);
    console.log(`  - Buyer ID: ${purchaseOrder.requesterId}`);
    console.log(`  - Seller ID: ${purchaseOrder.ownerId}\n`);

    // Step 2: Try verifying payment with different reference formats
    console.log('🔍 Trying to verify payment with Paystack...');
    let verificationResult: any;
    let paymentData: any;
    let PAYMENT_REFERENCE: string = '';

    for (const ref of PAYMENT_REFERENCES_TO_TRY) {
      console.log(`  Trying reference: ${ref}`);
      verificationResult = await verifyPayment(ref);

      if (verificationResult.success && verificationResult.data) {
        PAYMENT_REFERENCE = ref;
        paymentData = verificationResult.data;
        console.log(`  ✅ Success with reference: ${ref}\n`);
        break;
      } else {
        console.log(`  ❌ Failed: ${verificationResult.message}`);
      }
    }

    if (!PAYMENT_REFERENCE || !verificationResult.success || !verificationResult.data) {
      console.error('\n❌ All payment reference formats failed');
      console.error('Payment may not exist on Paystack or has a different reference.');
      console.error('\nPlease check Paystack dashboard at: https://dashboard.paystack.com/#/transactions');
      process.exit(1);
    }
    console.log('✅ Paystack verification successful!');
    console.log(`  - Status: ${paymentData.status}`);
    console.log(`  - Amount: ${paymentData.amount / 100} KES`);
    console.log(`  - Customer Email: ${paymentData.customer?.email}`);
    console.log(`  - Paid At: ${paymentData.paid_at}\n`);

    // Step 3: Check if payment already processed
    if (purchaseOrder.requesterPaymentReference === PAYMENT_REFERENCE) {
      console.log('⚠️ Payment already processed for this order');
      console.log(`Current status: ${purchaseOrder.status}`);
      process.exit(0);
    }

    // Step 4: Process the payment
    console.log('💰 Processing payment...');

    const totalAmount = parseFloat(purchaseOrder.totalAmount || "0");
    const bookPrice = parseFloat(purchaseOrder.bookPrice || "0");
    const convenienceFee = parseFloat(purchaseOrder.convenienceFee || "0");

    // Create escrow account
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

    console.log(`✅ Escrow account created: ID ${escrowAccount.id}`);

    // Record transaction
    await db.insert(transactions).values({
      userId: purchaseOrder.requesterId,
      type: "purchase",
      status: "completed",
      amount: totalAmount.toFixed(2),
      currency: "KES",
      paymentMethod: "paystack",
      paymentReference: PAYMENT_REFERENCE,
      bookListingId: purchaseOrder.requestedListingId,
      escrowId: escrowAccount.id,
      description: `Purchase of book - Order #${purchaseOrder.orderNumber}`,
      metadata: JSON.stringify({
        purchaseOrderId: PURCHASE_ORDER_ID,
        orderNumber: purchaseOrder.orderNumber,
        bookPrice: bookPrice,
        convenienceFee: convenienceFee,
      }),
      completedAt: new Date(),
    });

    console.log('✅ Transaction recorded');

    // Update purchase order
    await db
      .update(swapOrders)
      .set({
        escrowId: escrowAccount.id,
        status: "requirements_gathering",
        requesterPaidFee: true,
        requesterPaymentReference: PAYMENT_REFERENCE,
      })
      .where(eq(swapOrders.id, PURCHASE_ORDER_ID));

    console.log('✅ Purchase order updated');
    console.log('\n🎉 Payment verification complete!');
    console.log(`\nThe order status is now: requirements_gathering`);
    console.log(`The buyer can now submit delivery details at: http://localhost:5000/orders/${PURCHASE_ORDER_ID}/messages`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

manuallyVerifyPayment();
