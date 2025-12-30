import { db } from './server/db.ts';
import { swapOrders } from './server/db/schema/index.ts';
import { eq } from 'drizzle-orm';

async function checkOrder() {
  try {
    // Check purchase order status (stored in swapOrders table)
    const order = await db.select().from(swapOrders).where(eq(swapOrders.id, 3));
    console.log('=== Purchase Order 3 Status ===');
    console.log(JSON.stringify(order, null, 2));

    if (order.length > 0) {
      const orderData = order[0];
      console.log('\n=== Key Information ===');
      console.log('Order Type:', orderData.orderType);
      console.log('Status:', orderData.status);
      console.log('Total Amount:', orderData.totalAmount);
      console.log('Requester Payment Reference:', orderData.requesterPaymentReference);
      console.log('Requirements Submitted:', orderData.requirementsSubmitted);
      console.log('Requirements Approved:', orderData.requirementsApproved);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking order:', error);
    process.exit(1);
  }
}

checkOrder();
