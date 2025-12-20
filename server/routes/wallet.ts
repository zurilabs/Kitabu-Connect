import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { walletService } from '../services/wallet.service';
import { paymentService } from '../services/payment.service';
import { escrowService } from '../services/escrow.service';
import { orderService } from '../services/order.service';
import {
  walletTopUpSchema,
  createOrderSchema,
  updateOrderStatusSchema,
  createDisputeSchema,
} from '../db/schema';
import { fromZodError } from 'zod-validation-error';

/**
 * Get callback URL from environment or default to localhost
 */
function getCallbackUrl(path: string = '/dashboard'): string {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
  return `${baseUrl}${path}`;
}

const router = Router();

/* ================================
   WALLET ROUTES
================================ */

/**
 * Get wallet balance
 * GET /api/wallet/balance
 */
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const result = await walletService.getBalance(userId);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({
      success: true,
      balance: result.balance,
      currency: result.currency,
    });
  } catch (error) {
    console.error('[Wallet] Get balance error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * Get wallet transaction history
 * GET /api/wallet/transactions
 */
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const result = await walletService.getTransactionHistory(userId, limit);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({
      success: true,
      transactions: result.transactions,
    });
  } catch (error) {
    console.error('[Wallet] Get transactions error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * Get all transactions (main transactions table)
 * GET /api/wallet/all-transactions
 */
router.get('/all-transactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const result = await walletService.getAllTransactions(userId, limit);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({
      success: true,
      transactions: result.transactions,
    });
  } catch (error) {
    console.error('[Wallet] Get all transactions error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * Initialize wallet top-up via Paystack
 * POST /api/wallet/topup/initialize
 */
router.post('/topup/initialize', authenticateToken, async (req, res) => {
  try {
    const validation = walletTopUpSchema.safeParse(req.body);

    if (!validation.success) {
      const zodError = fromZodError(validation.error);
      return res.status(400).json({ message: zodError.message });
    }

    const userId = req.user!.id;
    const { amount, email } = validation.data;
    const userEmail = email || req.user!.email;

    if (!userEmail) {
      return res.status(400).json({ message: 'Email is required for payment' });
    }

    const result = await paymentService.initializeWalletTopUp({
      userId,
      amount,
      email: userEmail,
      callbackUrl: getCallbackUrl('/dashboard'),
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({
      success: true,
      authorizationUrl: result.authorizationUrl,
      reference: result.reference,
    });
  } catch (error) {
    console.error('[Wallet] Initialize top-up error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * Verify payment and credit wallet
 * GET /api/wallet/topup/verify/:reference
 */
router.get('/topup/verify/:reference', authenticateToken, async (req, res) => {
  try {
    const { reference } = req.params;

    const result = await paymentService.verifyPaymentAndCreditWallet(reference);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({
      success: true,
      amount: result.amount,
      message: result.message,
    });
  } catch (error) {
    console.error('[Wallet] Verify payment error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/* ================================
   ESCROW ROUTES
================================ */

/**
 * Get user's escrow accounts
 * GET /api/wallet/escrow?role=buyer|seller
 */
router.get('/escrow', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const role = (req.query.role as "buyer" | "seller") || "buyer";

    const result = await escrowService.getUserEscrows(userId, role);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({
      success: true,
      escrows: result.escrows,
    });
  } catch (error) {
    console.error('[Wallet] Get escrows error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * Create dispute for escrow
 * POST /api/wallet/escrow/dispute
 */
router.post('/escrow/dispute', authenticateToken, async (req, res) => {
  try {
    const validation = createDisputeSchema.safeParse(req.body);

    if (!validation.success) {
      const zodError = fromZodError(validation.error);
      return res.status(400).json({ message: zodError.message });
    }

    const { escrowId, reason } = validation.data;

    const result = await escrowService.createDispute(escrowId, reason);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('[Wallet] Create dispute error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/* ================================
   ORDER ROUTES
================================ */

/**
 * Create a new order
 * POST /api/wallet/orders
 */
router.post('/orders', authenticateToken, async (req, res) => {
  try {
    const validation = createOrderSchema.safeParse(req.body);

    if (!validation.success) {
      const zodError = fromZodError(validation.error);
      return res.status(400).json({ message: zodError.message });
    }

    const buyerId = req.user!.id;
    const result = await orderService.createOrder({
      ...validation.data,
      buyerId,
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(201).json({
      success: true,
      orderId: result.orderId,
      order: result.order,
    });
  } catch (error) {
    console.error('[Wallet] Create order error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * Pay for an order using wallet balance
 * POST /api/wallet/orders/:orderId/pay
 */
router.post('/orders/:orderId/pay', authenticateToken, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const buyerId = req.user!.id;

    const result = await orderService.processPayment(orderId, buyerId);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('[Wallet] Process payment error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * Update order status
 * PUT /api/wallet/orders/:orderId/status
 */
router.put('/orders/:orderId/status', authenticateToken, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const userId = req.user!.id;

    const validation = updateOrderStatusSchema.safeParse(req.body);

    if (!validation.success) {
      const zodError = fromZodError(validation.error);
      return res.status(400).json({ message: zodError.message });
    }

    const { status, trackingNumber, notes, cancellationReason } = validation.data;

    const result = await orderService.updateOrderStatus(orderId, userId, status, {
      trackingNumber,
      notes,
      cancellationReason,
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('[Wallet] Update order status error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * Get user's orders
 * GET /api/wallet/orders?role=buyer|seller
 */
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const role = (req.query.role as "buyer" | "seller") || "buyer";

    const result = await orderService.getUserOrders(userId, role);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({
      success: true,
      orders: result.orders,
    });
  } catch (error) {
    console.error('[Wallet] Get orders error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * Get single order details
 * GET /api/wallet/orders/:orderId
 */
router.get('/orders/:orderId', authenticateToken, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const userId = req.user!.id;

    const result = await orderService.getOrderById(orderId, userId);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({
      success: true,
      order: result.order,
    });
  } catch (error) {
    console.error('[Wallet] Get order error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
