/**
 * Paystack Kenya Withdrawal/Transfer Fees Calculator
 *
 * Official Paystack Kenya Transfer Pricing:
 * Source: https://paystack.com/ke/pricing
 *
 * M-PESA Wallet Transfers:
 * - KES 1–1,500: KES 20
 * - KES 1,501–20,000: KES 40
 * - Above KES 20,001: KES 60
 *
 * Bank Account Transfers:
 * - KES 1–10,000: KES 80
 * - KES 10,001–50,000: KES 120
 * - KES 50,001–999,999: KES 140
 * - Above KES 1,000,000: KES 350
 */

export type WithdrawalMethod = 'mpesa' | 'bank';

export interface WithdrawalFeeBreakdown {
  requestedAmount: number;
  withdrawalFee: number;
  amountToReceive: number;
  method: WithdrawalMethod;
}

/**
 * Calculate M-PESA withdrawal fee based on amount
 */
function calculateMpesaWithdrawalFee(amount: number): number {
  if (amount <= 1500) {
    return 20;
  } else if (amount <= 20000) {
    return 40;
  } else {
    return 60;
  }
}

/**
 * Calculate Bank transfer fee based on amount
 */
function calculateBankWithdrawalFee(amount: number): number {
  if (amount <= 10000) {
    return 80;
  } else if (amount <= 50000) {
    return 120;
  } else if (amount <= 999999) {
    return 140;
  } else {
    return 350;
  }
}

/**
 * Calculate withdrawal fee based on method and amount
 * @param amount - The amount user wants to withdraw (in KES)
 * @param method - Withdrawal method: 'mpesa' or 'bank'
 * @returns The withdrawal fee in KES
 */
export function calculateWithdrawalFee(
  amount: number,
  method: WithdrawalMethod = 'mpesa'
): number {
  if (method === 'mpesa') {
    return calculateMpesaWithdrawalFee(amount);
  } else {
    return calculateBankWithdrawalFee(amount);
  }
}

/**
 * Calculate what user will actually receive after withdrawal fees
 * Fee is deducted from the withdrawal amount
 *
 * @param requestedAmount - Amount user wants to withdraw
 * @param method - Withdrawal method
 * @returns Breakdown showing fees and net amount
 */
export function calculateWithdrawalBreakdown(
  requestedAmount: number,
  method: WithdrawalMethod = 'mpesa'
): WithdrawalFeeBreakdown {
  const withdrawalFee = calculateWithdrawalFee(requestedAmount, method);
  const amountToReceive = requestedAmount - withdrawalFee;

  // Ensure user receives at least KES 1
  if (amountToReceive < 1) {
    throw new Error('Withdrawal amount too small to cover fees');
  }

  return {
    requestedAmount: Math.ceil(requestedAmount * 100) / 100,
    withdrawalFee: Math.ceil(withdrawalFee * 100) / 100,
    amountToReceive: Math.ceil(amountToReceive * 100) / 100,
    method: method,
  };
}

/**
 * Calculate minimum withdrawal amount for a given method
 * This ensures the user receives at least KES 1 after fees
 */
export function getMinimumWithdrawalAmount(method: WithdrawalMethod = 'mpesa'): number {
  if (method === 'mpesa') {
    return 21; // KES 20 fee + KES 1 minimum receive
  } else {
    return 81; // KES 80 fee + KES 1 minimum receive
  }
}

/**
 * Validate if withdrawal amount is sufficient
 * @param amount - Requested withdrawal amount
 * @param method - Withdrawal method
 * @returns True if amount is sufficient
 */
export function isValidWithdrawalAmount(
  amount: number,
  method: WithdrawalMethod = 'mpesa'
): boolean {
  const minAmount = getMinimumWithdrawalAmount(method);
  return amount >= minAmount;
}

/**
 * Get fee tier information for display purposes
 */
export function getWithdrawalFeeTiers(method: WithdrawalMethod): Array<{
  range: string;
  fee: number;
}> {
  if (method === 'mpesa') {
    return [
      { range: 'KES 1 - 1,500', fee: 20 },
      { range: 'KES 1,501 - 20,000', fee: 40 },
      { range: 'Above KES 20,000', fee: 60 },
    ];
  } else {
    return [
      { range: 'KES 1 - 10,000', fee: 80 },
      { range: 'KES 10,001 - 50,000', fee: 120 },
      { range: 'KES 50,001 - 999,999', fee: 140 },
      { range: 'Above KES 1,000,000', fee: 350 },
    ];
  }
}

/**
 * Calculate the amount user needs to withdraw to receive a specific amount
 * Inverse calculation: given desired receive amount, calculate withdrawal amount
 *
 * @param desiredAmount - Amount user wants to receive
 * @param method - Withdrawal method
 * @returns Amount to withdraw to receive desired amount
 */
export function calculateWithdrawalAmountForDesiredReceipt(
  desiredAmount: number,
  method: WithdrawalMethod = 'mpesa'
): number {
  // We need to find the withdrawal amount such that:
  // withdrawalAmount - fee(withdrawalAmount) = desiredAmount

  // Start with desiredAmount + estimated fee
  let estimatedWithdrawal = desiredAmount;
  let iterations = 0;
  const maxIterations = 10;

  while (iterations < maxIterations) {
    const fee = calculateWithdrawalFee(estimatedWithdrawal, method);
    const actualReceipt = estimatedWithdrawal - fee;

    if (Math.abs(actualReceipt - desiredAmount) < 0.01) {
      // Close enough
      return Math.ceil(estimatedWithdrawal * 100) / 100;
    }

    // Adjust estimate
    estimatedWithdrawal = desiredAmount + fee;
    iterations++;
  }

  // Fallback: return desiredAmount + current fee estimate
  const finalFee = calculateWithdrawalFee(estimatedWithdrawal, method);
  return Math.ceil((desiredAmount + finalFee) * 100) / 100;
}
