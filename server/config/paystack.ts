import Paystack from 'paystack-node';

// Initialize Paystack with secret key from environment
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';

if (!PAYSTACK_SECRET_KEY) {
  console.warn('[Paystack] Warning: PAYSTACK_SECRET_KEY not set in environment variables');
}

const paystack = new Paystack(PAYSTACK_SECRET_KEY, process.env.NODE_ENV || 'development');

export default paystack;

/**
 * Paystack Helper Functions
 */

export interface InitializePaymentParams {
  email: string;
  amount: number; // Amount in kobo (multiply by 100)
  reference?: string;
  callback_url?: string;
  metadata?: Record<string, any>;
}

export interface VerifyPaymentResponse {
  success: boolean;
  data?: any;
  message?: string;
}

/**
 * Initialize a payment transaction
 */
export async function initializePayment(params: InitializePaymentParams) {
  try {
    const response = await paystack.transaction.initialize({
      email: params.email,
      amount: Math.round(params.amount * 100), // Convert to kobo
      reference: params.reference || generateReference(),
      callback_url: params.callback_url,
      metadata: params.metadata,
    });

    return {
      success: true,
      data: response.body.data,
    };
  } catch (error) {
    console.error('[Paystack] Initialize payment error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Payment initialization failed',
    };
  }
}

/**
 * Verify a payment transaction
 */
export async function verifyPayment(reference: string): Promise<VerifyPaymentResponse> {
  try {
    const response = await paystack.transaction.verify({
      reference,
    });

    if (response.body.data.status === 'success') {
      return {
        success: true,
        data: response.body.data,
      };
    }

    return {
      success: false,
      message: 'Payment verification failed',
    };
  } catch (error) {
    console.error('[Paystack] Verify payment error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Payment verification failed',
    };
  }
}

/**
 * Generate a unique payment reference
 */
export function generateReference(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `KITABU-${timestamp}-${random}`;
}

/**
 * Initialize transfer to recipient (for withdrawals)
 */
export async function initiateTransfer(params: {
  amount: number;
  recipient: string;
  reason?: string;
  reference?: string;
}) {
  try {
    const response = await paystack.transfer.create({
      source: 'balance',
      amount: Math.round(params.amount * 100), // Convert to kobo
      recipient: params.recipient,
      reason: params.reason || 'Wallet withdrawal',
      reference: params.reference || generateReference(),
    });

    return {
      success: true,
      data: response.body.data,
    };
  } catch (error) {
    console.error('[Paystack] Transfer error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Transfer failed',
    };
  }
}

/**
 * Create transfer recipient (for first-time withdrawals)
 */
export async function createTransferRecipient(params: {
  type: 'nuban' | 'mobile_money';
  name: string;
  account_number: string;
  bank_code: string;
  currency?: string;
}) {
  try {
    const response = await paystack.transferRecipient.create({
      type: params.type,
      name: params.name,
      account_number: params.account_number,
      bank_code: params.bank_code,
      currency: params.currency || 'KES',
    });

    return {
      success: true,
      data: response.body.data,
    };
  } catch (error) {
    console.error('[Paystack] Create recipient error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create transfer recipient',
    };
  }
}
