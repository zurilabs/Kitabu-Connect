// Paystack Configuration using REST API (more reliable than SDK)
import crypto from 'crypto';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

if (!PAYSTACK_SECRET_KEY) {
  console.warn('[Paystack] Warning: PAYSTACK_SECRET_KEY not set in environment variables');
}

/**
 * Verify Paystack webhook signature
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(payload)
    .digest('hex');
  return hash === signature;
}

export interface InitializePaymentParams {
  email: string;
  amount: number; // Amount in KES (will be converted to kobo)
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
 * Generate a unique payment reference
 */
export function generateReference(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `KITABU-${timestamp}-${random}`;
}

/**
 * Initialize a payment transaction
 */
export async function initializePayment(params: InitializePaymentParams) {
  try {
    const reference = params.reference || generateReference();

    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: Math.round(params.amount * 100), // Convert to kobo (smallest unit)
        reference,
        callback_url: params.callback_url,
        metadata: params.metadata,
        currency: 'KES',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error('[Paystack] Initialize failed:', data);
      return {
        success: false,
        message: data.message || 'Payment initialization failed',
      };
    }

    console.log('[Paystack] Payment initialized successfully:', reference);

    return {
      success: true,
      data: data.data,
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
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error('[Paystack] Verification failed:', data);
      return {
        success: false,
        message: data.message || 'Payment verification failed',
      };
    }

    if (data.data.status === 'success') {
      console.log('[Paystack] Payment verified successfully:', reference);
      return {
        success: true,
        data: data.data,
      };
    }

    return {
      success: false,
      message: 'Payment not successful',
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
 * Initialize transfer to recipient (for withdrawals)
 */
export async function initiateTransfer(params: {
  amount: number;
  recipient: string;
  reason?: string;
  reference?: string;
}) {
  try {
    const reference = params.reference || generateReference();

    const response = await fetch(`${PAYSTACK_BASE_URL}/transfer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: Math.round(params.amount * 100), // Convert to kobo
        recipient: params.recipient,
        reason: params.reason || 'Wallet withdrawal',
        reference,
        currency: 'KES',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error('[Paystack] Transfer failed:', data);
      return {
        success: false,
        message: data.message || 'Transfer failed',
      };
    }

    console.log('[Paystack] Transfer initiated successfully:', reference);

    return {
      success: true,
      data: data.data,
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
    const response = await fetch(`${PAYSTACK_BASE_URL}/transferrecipient`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: params.type,
        name: params.name,
        account_number: params.account_number,
        bank_code: params.bank_code,
        currency: params.currency || 'KES',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error('[Paystack] Create recipient failed:', data);
      return {
        success: false,
        message: data.message || 'Failed to create transfer recipient',
      };
    }

    console.log('[Paystack] Transfer recipient created successfully');

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error('[Paystack] Create recipient error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create transfer recipient',
    };
  }
}

/**
 * Get list of banks (for withdrawal setup)
 */
export async function getBanks() {
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/bank?currency=KES`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error('[Paystack] Get banks failed:', data);
      return {
        success: false,
        message: data.message || 'Failed to get banks',
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error('[Paystack] Get banks error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get banks',
    };
  }
}

/**
 * Verify bank account number
 */
export async function verifyBankAccount(params: {
  account_number: string;
  bank_code: string;
}) {
  try {
    const response = await fetch(
      `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${params.account_number}&bank_code=${params.bank_code}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error('[Paystack] Verify account failed:', data);
      return {
        success: false,
        message: data.message || 'Failed to verify account',
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error('[Paystack] Verify account error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify account',
    };
  }
}

/**
 * Finalize transfer (if using OTP)
 */
export async function finalizeTransfer(params: {
  transfer_code: string;
  otp: string;
}) {
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transfer/finalize_transfer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transfer_code: params.transfer_code,
        otp: params.otp,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error('[Paystack] Finalize transfer failed:', data);
      return {
        success: false,
        message: data.message || 'Failed to finalize transfer',
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error('[Paystack] Finalize transfer error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to finalize transfer',
    };
  }
}

/**
 * Get transfer details
 */
export async function getTransfer(transferCode: string) {
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transfer/${transferCode}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error('[Paystack] Get transfer failed:', data);
      return {
        success: false,
        message: data.message || 'Failed to get transfer',
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error('[Paystack] Get transfer error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get transfer',
    };
  }
}

/**
 * Resolve account number (get account name)
 */
export async function resolveAccountNumber(params: {
  account_number: string;
  bank_code: string;
}) {
  try {
    const response = await fetch(
      `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${params.account_number}&bank_code=${params.bank_code}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      return {
        success: false,
        message: data.message || 'Failed to resolve account number',
      };
    }

    return {
      success: true,
      data: data.data, // Contains: account_number, account_name, bank_id
    };
  } catch (error) {
    console.error('[Paystack] Resolve account error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to resolve account',
    };
  }
}
