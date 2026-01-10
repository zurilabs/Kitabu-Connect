/**
 * Paystack Fee Calculator
 *
 * Official Paystack Kenya Pricing (as of 2026):
 * - M-PESA Transactions: 1.5% (no flat fee, no cap)
 * - Card Transactions: 2.9% (local cards) or 3.8% (international cards)
 *
 * Source: https://paystack.com/ke/pricing
 *
 * Note: We primarily use M-PESA for local transactions (1.5%)
 */

export type PaymentMethod = 'mpesa' | 'card_local' | 'card_international';

export interface PaystackFeeBreakdown {
  amountBeforeFees: number;
  paystackFee: number;
  totalAmount: number;
  percentageFee: number;
  paymentMethod: PaymentMethod;
}

/**
 * Get the Paystack percentage fee for a payment method
 */
function getPaystackPercentage(paymentMethod: PaymentMethod): number {
  switch (paymentMethod) {
    case 'mpesa':
      return 0.015; // 1.5%
    case 'card_local':
      return 0.029; // 2.9%
    case 'card_international':
      return 0.038; // 3.8%
    default:
      return 0.015; // Default to M-PESA
  }
}

/**
 * Calculate Paystack transaction fee based on payment method
 * @param amount - The amount being charged (in KES)
 * @param paymentMethod - Payment method: 'mpesa' (1.5%), 'card_local' (2.9%), 'card_international' (3.8%)
 * @returns The Paystack fee in KES
 */
export function calculatePaystackFee(
  amount: number,
  paymentMethod: PaymentMethod = 'mpesa'
): number {
  const percentageFee = getPaystackPercentage(paymentMethod);
  const fee = amount * percentageFee;
  return Math.ceil(fee); // Round up to avoid underpayment
}

/**
 * Calculate the total amount a customer needs to pay including Paystack fees
 *
 * Formula: customerPays = amountToReceive / (1 - paystackPercentage)
 *
 * This ensures that after Paystack deducts their percentage,
 * we receive exactly the amountToReceive.
 *
 * @param amountToReceive - The amount you want to receive after fees
 * @param paymentMethod - Payment method (default: mpesa at 1.5%)
 * @returns Total amount customer should pay
 */
export function calculateAmountWithPaystackFees(
  amountToReceive: number,
  paymentMethod: PaymentMethod = 'mpesa'
): number {
  const percentageFee = getPaystackPercentage(paymentMethod);

  // Calculate what customer needs to pay so that after Paystack deducts their fee,
  // we receive the exact amountToReceive
  // Formula: customerPays = amountToReceive / (1 - percentageFee)
  const customerPays = amountToReceive / (1 - percentageFee);

  return Math.ceil(customerPays); // Round up to avoid underpayment
}

/**
 * Get detailed breakdown of Paystack fees
 * @param amountToReceive - The amount you want to receive
 * @param paymentMethod - Payment method (default: mpesa)
 * @returns Detailed fee breakdown
 */
export function getPaystackFeeBreakdown(
  amountToReceive: number,
  paymentMethod: PaymentMethod = 'mpesa'
): PaystackFeeBreakdown {
  const totalAmount = calculateAmountWithPaystackFees(amountToReceive, paymentMethod);
  const paystackFee = totalAmount - amountToReceive;
  const percentageFee = getPaystackPercentage(paymentMethod);

  return {
    amountBeforeFees: amountToReceive,
    paystackFee: Math.ceil(paystackFee),
    totalAmount: Math.ceil(totalAmount),
    percentageFee: Math.ceil(totalAmount * percentageFee),
    paymentMethod: paymentMethod,
  };
}

/**
 * Calculate fees for a purchase order
 * @param bookPrice - The price of the book
 * @param serviceFeePercentage - Platform service fee percentage (default 5% = 0.05)
 * @param paymentMethod - Payment method (default: mpesa)
 * @returns Fee breakdown
 */
export function calculatePurchaseOrderFees(
  bookPrice: number,
  serviceFeePercentage: number = 0.05,
  paymentMethod: PaymentMethod = 'mpesa'
): {
  bookPrice: number;
  serviceFee: number;
  subtotal: number;
  paystackFee: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
} {
  const serviceFee = bookPrice * serviceFeePercentage;
  const subtotal = bookPrice + serviceFee; // Amount before Paystack fees

  // Calculate total amount customer pays (including Paystack fees)
  const totalAmount = calculateAmountWithPaystackFees(subtotal, paymentMethod);
  const paystackFee = totalAmount - subtotal;

  return {
    bookPrice: Math.ceil(bookPrice * 100) / 100, // Round to 2 decimals
    serviceFee: Math.ceil(serviceFee * 100) / 100,
    subtotal: Math.ceil(subtotal * 100) / 100,
    paystackFee: Math.ceil(paystackFee * 100) / 100,
    totalAmount: Math.ceil(totalAmount * 100) / 100,
    paymentMethod: paymentMethod,
  };
}

/**
 * Calculate fees for a swap/exchange order
 * @param exchangeFeePerParty - Exchange fee per party (default KES 50)
 * @param paymentMethod - Payment method (default: mpesa)
 * @returns Fee breakdown
 */
export function calculateSwapOrderFees(
  exchangeFeePerParty: number = 50,
  paymentMethod: PaymentMethod = 'mpesa'
): {
  exchangeFee: number;
  paystackFee: number;
  totalPerParty: number;
  paymentMethod: PaymentMethod;
} {
  // Each party pays exchange fee + Paystack fee
  const totalPerParty = calculateAmountWithPaystackFees(exchangeFeePerParty, paymentMethod);
  const paystackFee = totalPerParty - exchangeFeePerParty;

  return {
    exchangeFee: Math.ceil(exchangeFeePerParty * 100) / 100,
    paystackFee: Math.ceil(paystackFee * 100) / 100,
    totalPerParty: Math.ceil(totalPerParty * 100) / 100,
    paymentMethod: paymentMethod,
  };
}

/**
 * Validate that the amount received matches what we expect after Paystack deducts fees
 * @param amountReceived - Amount received from Paystack (after their fee deduction)
 * @param expectedAmount - Amount we expected to receive
 * @param tolerance - Acceptable difference (default KES 1 for rounding)
 * @returns True if amounts match within tolerance
 */
export function validatePaystackAmount(
  amountReceived: number,
  expectedAmount: number,
  tolerance: number = 1
): boolean {
  const difference = Math.abs(amountReceived - expectedAmount);
  return difference <= tolerance;
}

/**
 * Calculate the actual amount that will be received after Paystack deducts their fee
 * Useful for verification and reconciliation
 *
 * @param customerPaid - The total amount the customer paid
 * @param paymentMethod - Payment method used
 * @returns Amount that will be received after Paystack fee deduction
 */
export function calculateAmountAfterPaystackFees(
  customerPaid: number,
  paymentMethod: PaymentMethod = 'mpesa'
): number {
  const percentageFee = getPaystackPercentage(paymentMethod);
  const paystackFee = customerPaid * percentageFee;
  const amountReceived = customerPaid - paystackFee;

  return Math.floor(amountReceived * 100) / 100; // Round down to 2 decimals
}
