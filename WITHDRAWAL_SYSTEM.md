# Withdrawal System Documentation

## Overview

The Kitabu Connect withdrawal system follows the **Fiverr/Upwork escrow model**, ensuring sellers can only withdraw funds that are not locked in active escrow accounts. This protects buyers during the 7-day escrow period while allowing sellers to withdraw their available balance.

## Key Concepts

### Available Balance vs Total Balance

- **Total Balance**: The entire amount in the user's wallet
- **Locked in Escrow**: Funds from recent sales held in escrow (7 days)
- **Available for Withdrawal**: Total Balance - Locked in Escrow

### Example Scenario

**User's Wallet:**
- Deposited funds: KES 5,000 (from top-ups)
- Recent sale (2 days ago): KES 3,000 (locked in escrow)
- Recent sale (5 days ago): KES 2,000 (locked in escrow)

**Balances:**
- Total Balance: KES 10,000
- Locked in Escrow: KES 5,000 (both sales still within 7-day period)
- **Available for Withdrawal: KES 5,000**

The user can withdraw up to KES 5,000 immediately. The remaining KES 5,000 will become available after the respective escrow periods end.

## Escrow Logic (Following Fiverr Model)

### For Deposited Funds (Top-ups)
✅ **Immediately available for withdrawal**
- Money added via Paystack top-up
- Can be withdrawn anytime
- No escrow restrictions

### For Sales Revenue
⏳ **Locked for 7 days in escrow**
- When you sell a book, payment goes into escrow
- Held for 7 days to protect the buyer
- After 7 days, automatically released to your wallet
- Once released, becomes available for withdrawal

### Escrow States

```
┌─────────────────────────────────────────────────────┐
│ BUYER PURCHASES BOOK                                │
│ Pays: KES 1,050 (Book: 1,000 + Fee: 50)            │
└─────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ ESCROW CREATED                                       │
│ Amount: KES 1,000 (seller's portion)                │
│ Status: ACTIVE                                       │
│ Release Date: Now + 7 days                          │
│ ❌ NOT available for withdrawal                     │
└─────────────────────────────────────────────────────┘
                     │
                     │ (7 days pass)
                     ▼
┌─────────────────────────────────────────────────────┐
│ ESCROW RELEASED (Automatic)                         │
│ Seller wallet: +KES 1,000                           │
│ Status: RELEASED                                     │
│ ✅ NOW available for withdrawal                     │
└─────────────────────────────────────────────────────┘
```

## Withdrawal Flow

### 1. User Initiates Withdrawal

**Frontend**:
- User clicks "Withdraw" in dashboard
- Dialog opens and fetches available balance
- Shows locked escrow amount (if any)
- User enters amount and payment details

**API Call**:
```
GET /api/wallet/withdrawal/available
```

**Response**:
```json
{
  "totalBalance": 10000,
  "lockedInEscrow": 5000,
  "availableForWithdrawal": 5000,
  "pendingEscrows": [
    {
      "escrowId": 123,
      "amount": 3000,
      "releaseAt": "2024-01-15T10:30:00Z",
      "daysRemaining": 5
    },
    {
      "escrowId": 124,
      "amount": 2000,
      "releaseAt": "2024-01-13T08:20:00Z",
      "daysRemaining": 3
    }
  ]
}
```

### 2. Validation

**Client-side validation**:
- Minimum: KES 100
- Maximum: KES 100,000
- Amount ≤ Available Balance
- Payment method details provided

**Server-side validation**:
- Check available balance (excluding locked escrow)
- Verify payment method details
- Prevent duplicate requests

### 3. Withdrawal Processing

**API Call**:
```
POST /api/wallet/withdrawal/initiate
```

**Request Body**:
```json
{
  "amount": 5000,
  "paymentMethod": "mpesa",
  "accountDetails": {
    "mpesaPhone": "0712345678"
  }
}
```

**What Happens**:
1. Create withdrawal transaction (status: `pending`)
2. **Immediately debit wallet** (prevents double-spending)
3. Update transaction to `processing`
4. In production: Trigger Paystack Transfer API
5. Return success response

**Response**:
```json
{
  "success": true,
  "withdrawalId": 456,
  "message": "Withdrawal request submitted successfully. Processing typically takes 1-3 business days."
}
```

### 4. Completion

**When Paystack transfer succeeds**:
- Transaction status: `processing` → `completed`
- Add payment reference
- User notified

**If transfer fails**:
- Refund amount to wallet
- Transaction status: `processing` → `failed`
- User notified with reason

## Payment Methods

### M-Pesa
```json
{
  "paymentMethod": "mpesa",
  "accountDetails": {
    "mpesaPhone": "0712345678"
  }
}
```

### Bank Transfer
```json
{
  "paymentMethod": "bank",
  "accountDetails": {
    "accountName": "John Doe",
    "bankName": "Equity Bank",
    "accountNumber": "1234567890"
  }
}
```

### PayPal
```json
{
  "paymentMethod": "paypal",
  "accountDetails": {
    "paypalEmail": "user@example.com"
  }
}
```

## API Endpoints

### Get Available Balance
```
GET /api/wallet/withdrawal/available
```
Returns total, locked, and available balances with escrow details.

### Initiate Withdrawal
```
POST /api/wallet/withdrawal/initiate
```
Creates withdrawal request and debits wallet.

### Get Withdrawal History
```
GET /api/wallet/withdrawal/history?limit=50
```
Returns user's withdrawal transactions.

## Database Schema

### Transactions Table
```sql
-- Withdrawal transaction example
INSERT INTO transactions (
  user_id,
  type,              -- 'withdrawal'
  status,            -- 'pending' → 'processing' → 'completed'/'failed'
  amount,            -- Withdrawal amount
  payment_method,    -- 'mpesa', 'bank', 'paypal'
  description,       -- 'Withdrawal to M-PESA'
  metadata           -- JSON: { accountDetails, requestedAt }
)
```

### Wallet Transactions Table
```sql
-- Debit entry when withdrawal initiated
INSERT INTO wallet_transactions (
  user_id,
  type,              -- 'debit'
  amount,            -- Withdrawal amount
  balance_after,     -- New balance after debit
  transaction_id,    -- Links to transactions table
  description        -- 'Withdrawal to M-PESA'
)
```

### Escrow Accounts Table
```sql
-- Active escrows lock funds from withdrawal
SELECT * FROM escrow_accounts
WHERE seller_id = 'user-123'
  AND status = 'active'
  AND release_at > NOW();

-- These amounts are subtracted from available balance
```

## Code Implementation

### Backend Service

**[server/services/withdrawal.service.ts](server/services/withdrawal.service.ts)**

Key methods:
- `getAvailableBalance(userId)` - Calculate withdrawable amount
- `validateWithdrawal(userId, amount)` - Check escrow locks
- `initiateWithdrawal(params)` - Create and process request
- `completeWithdrawal(transactionId)` - Mark as completed
- `failWithdrawal(transactionId, reason)` - Refund on failure

### API Routes

**[server/routes/wallet.ts](server/routes/wallet.ts)**

Endpoints:
- `GET /api/wallet/withdrawal/available`
- `POST /api/wallet/withdrawal/initiate`
- `GET /api/wallet/withdrawal/history`

### Frontend Component

**[client/src/components/wallet/WithdrawDialog.tsx](client/src/components/wallet/WithdrawDialog.tsx)**

Features:
- Real-time available balance calculation
- Escrow lock warnings
- Payment method forms
- Error handling and validation

## Security Features

### Prevent Double-Spending
- Wallet debited **immediately** when request created
- If processing fails, amount is refunded
- Transaction status prevents duplicate processing

### Amount Limits
- Minimum: KES 100 (prevent micro-transactions)
- Maximum: KES 100,000 per transaction (anti-fraud)
- Larger amounts require manual review

### Escrow Protection
- Sellers cannot withdraw funds in active escrow
- Protects buyers during 7-day review period
- Automatic release after hold period

## User Experience

### Deposited Funds Scenario
```
User tops up KES 10,000
→ Total Balance: KES 10,000
→ Locked in Escrow: KES 0
→ Available: KES 10,000
✅ Can withdraw KES 10,000 immediately
```

### Recent Sale Scenario
```
User sells book for KES 5,000 (3 days ago)
→ Total Balance: KES 5,000
→ Locked in Escrow: KES 5,000
→ Available: KES 0
❌ Cannot withdraw yet
⏳ Can withdraw after 4 more days
```

### Mixed Funds Scenario
```
User has:
- Top-up: KES 8,000
- Sale (2 days ago): KES 3,000
- Sale (8 days ago - released): KES 2,000

→ Total Balance: KES 13,000
→ Locked in Escrow: KES 3,000
→ Available: KES 10,000
✅ Can withdraw up to KES 10,000
```

## Error Messages

### Insufficient Balance
```
"Insufficient available balance. You have KES 3,000 locked in escrow
from recent sales. These funds will be available after the 7-day hold period."
```

### Below Minimum
```
"Minimum withdrawal amount is KES 100"
```

### Above Maximum
```
"Maximum withdrawal amount is KES 100,000. Please contact support
for larger withdrawals."
```

### Missing Payment Details
```
"Please enter your M-Pesa phone number"
"Please fill in all bank account details"
```

## Future Enhancements

### Paystack Transfer Integration
Currently withdrawals are marked as "processing" and require manual completion. To automate:

1. **Integrate Paystack Transfer API**:
```typescript
// In withdrawal.service.ts
const transferResult = await paystackTransferAPI.initiate({
  amount: params.amount * 100, // Convert to kobo
  recipient: recipientCode,
  reason: "Wallet withdrawal",
  currency: "KES"
});
```

2. **Create Transfer Recipients**:
```typescript
const recipient = await paystackTransferAPI.createRecipient({
  type: "mobile_money", // or "nuban" for bank
  name: accountName,
  account_number: mpesaPhone,
  bank_code: "mpesa" // or actual bank code
});
```

3. **Webhook for Completion**:
```typescript
app.post("/api/webhooks/paystack-transfer", async (req, res) => {
  const event = req.body;
  if (event.event === "transfer.success") {
    await withdrawalService.completeWithdrawal(
      transactionId,
      event.data.reference
    );
  }
});
```

### Additional Features
- Withdrawal limits per day/week
- Withdrawal fee calculation
- Instant withdrawals for verified users
- Withdrawal scheduling
- Multi-currency support

## Testing

### Test Scenarios

1. **Withdraw with no escrow locks**:
   - Top up KES 1,000
   - Withdraw KES 500
   - ✅ Should succeed

2. **Withdraw with active escrow**:
   - Make a sale for KES 1,000
   - Try to withdraw KES 1,000
   - ❌ Should fail with escrow lock message

3. **Withdraw after escrow release**:
   - Wait 7 days after sale
   - Try to withdraw
   - ✅ Should succeed

4. **Partial withdrawal with escrow**:
   - Top up KES 2,000
   - Make sale for KES 1,000
   - Try to withdraw KES 2,000
   - ✅ Should succeed (deposited funds available)

5. **Below minimum**:
   - Try to withdraw KES 50
   - ❌ Should fail with minimum error

## Summary

The withdrawal system ensures:
- ✅ **Deposited funds** are always withdrawable
- ⏳ **Sales revenue** locked for 7 days in escrow
- 🔒 **Buyer protection** during review period
- 💰 **Seller flexibility** with available balance
- 🛡️ **Security** against double-spending

This follows industry best practices from platforms like Fiverr and Upwork, balancing buyer protection with seller liquidity.

---

**Last Updated**: 2024
**Status**: Fully implemented (pending Paystack Transfer API integration for automation)
