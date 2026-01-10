# Withdrawal Fees Implementation Summary

## Overview

Implemented a comprehensive withdrawal fees system that passes Paystack's withdrawal/transfer costs to users. The system provides transparent fee breakdown and real-time fee preview during withdrawal.

**Implementation Date**: 2026-01-10

---

## Paystack Kenya Withdrawal Fees

### M-PESA Wallet Transfers
- **KES 1–1,500**: KES 20
- **KES 1,501–20,000**: KES 40
- **Above KES 20,001**: KES 60

### Bank Account Transfers
- **KES 1–10,000**: KES 80
- **KES 10,001–50,000**: KES 120
- **KES 50,001–999,999**: KES 140
- **Above KES 1,000,000**: KES 350

**Source**: [Paystack Kenya Pricing](https://paystack.com/ke/pricing)

---

## What Was Implemented

### 1. Backend Utilities

#### [server/utils/withdrawalFees.ts](server/utils/withdrawalFees.ts)
Complete withdrawal fee calculation utility with the following functions:

- **`calculateWithdrawalFee(amount, method)`**
  - Calculates the withdrawal fee based on amount and method (M-PESA or Bank)
  - Returns the fee amount in KES

- **`calculateWithdrawalBreakdown(requestedAmount, method)`**
  - Returns detailed breakdown showing:
    - Requested amount
    - Withdrawal fee
    - Net amount user receives (requestedAmount - fee)
  - Throws error if amount is too small to cover fees

- **`getMinimumWithdrawalAmount(method)`**
  - Returns minimum withdrawal amount for each method
  - M-PESA: KES 21 (KES 20 fee + KES 1 minimum receive)
  - Bank: KES 81 (KES 80 fee + KES 1 minimum receive)

- **`isValidWithdrawalAmount(amount, method)`**
  - Validates if withdrawal amount meets minimum requirements

- **`getWithdrawalFeeTiers(method)`**
  - Returns fee tier structure for display in UI
  - Helps users understand the fee brackets

- **`calculateWithdrawalAmountForDesiredReceipt(desiredAmount, method)`**
  - Inverse calculation: given desired receive amount, calculate withdrawal amount
  - Useful for "I want to receive X" scenarios

### 2. Backend Service Updates

#### [server/services/withdrawal.service.ts](server/services/withdrawal.service.ts)

**New Methods:**

- **`previewWithdrawalFees(amount, method)`**
  - Previews withdrawal fees without performing withdrawal
  - Returns breakdown and fee tiers
  - Used by frontend for real-time fee preview

**Updated Methods:**

- **`validateWithdrawal(userId, amount, method)`**
  - Now validates minimum amounts based on withdrawal method
  - Uses dynamic minimum amounts from withdrawalFees utility

- **`initiateWithdrawal(params)`**
  - Calculates withdrawal fees before processing
  - Stores fee breakdown in transaction metadata
  - Sends net amount (after fees) to user via Paystack
  - Returns detailed breakdown in response
  - Updated description to show fee and net amount

**Example Transaction Flow:**

```
User requests: KES 1,000 via M-PESA
Withdrawal fee: KES 20
Net sent to user: KES 980

Transaction metadata includes:
- requestedAmount: 1000
- withdrawalFee: 20
- amountToReceive: 980
- method: "mpesa"
```

### 3. API Endpoints

#### [server/routes/wallet.ts](server/routes/wallet.ts)

**New Endpoint:**

```
GET /api/wallet/withdrawal/preview?amount=1000&method=mpesa
```

**Parameters:**
- `amount` (required): Withdrawal amount to preview
- `method` (optional): 'mpesa' or 'bank' (defaults to 'mpesa')

**Response:**
```json
{
  "success": true,
  "breakdown": {
    "requestedAmount": 1000,
    "withdrawalFee": 20,
    "amountToReceive": 980,
    "method": "mpesa"
  },
  "feeTiers": [
    { "range": "KES 1 - 1,500", "fee": 20 },
    { "range": "KES 1,501 - 20,000", "fee": 40 },
    { "range": "Above KES 20,000", "fee": 60 }
  ]
}
```

### 4. Frontend Component Updates

#### [client/src/components/wallet/WithdrawDialog.tsx](client/src/components/wallet/WithdrawDialog.tsx)

**New Features:**

1. **Real-time Fee Preview**
   - Automatically fetches fee breakdown as user types amount
   - Updates when payment method changes
   - Shows loading state during calculation

2. **Fee Breakdown Display**
   - Clear breakdown showing:
     - Requested amount
     - Withdrawal fee (highlighted in red)
     - Net amount to receive (highlighted in green)
   - Color-coded for easy understanding

3. **Fee Tiers Information**
   - Displays fee tier structure for selected method
   - Helps users understand how fees are calculated
   - Updates dynamically based on payment method selection

4. **Enhanced Validation**
   - Uses dynamic minimum amounts based on method
   - Clear error messages referencing minimum amounts

**UI Example:**

```
┌─────────────────────────────────────┐
│ Withdrawal Breakdown                │
├─────────────────────────────────────┤
│ Requested Amount:    KES 1,000      │
│ Withdrawal Fee (MPESA): - KES 20   │
│ ────────────────────────────────    │
│ You will receive:    KES 980        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ MPESA Withdrawal Fee Tiers:         │
│ • KES 1 - 1,500: KES 20            │
│ • KES 1,501 - 20,000: KES 40       │
│ • Above KES 20,000: KES 60         │
└─────────────────────────────────────┘
```

---

## Fee Calculation Examples

### Example 1: M-PESA Withdrawal (Small Amount)
```
Requested: KES 1,000
Fee: KES 20 (1-1,500 tier)
User receives: KES 980
```

### Example 2: M-PESA Withdrawal (Medium Amount)
```
Requested: KES 5,000
Fee: KES 40 (1,501-20,000 tier)
User receives: KES 4,960
```

### Example 3: M-PESA Withdrawal (Large Amount)
```
Requested: KES 50,000
Fee: KES 60 (above 20,000 tier)
User receives: KES 49,940
```

### Example 4: Bank Withdrawal
```
Requested: KES 8,000
Fee: KES 80 (1-10,000 tier)
User receives: KES 7,920
```

### Example 5: Large Bank Withdrawal
```
Requested: KES 100,000
Fee: KES 140 (50,001-999,999 tier)
User receives: KES 99,860
```

---

## Key Features

### ✅ Transparent Fee Structure
- Users see exact fees before confirming withdrawal
- Real-time calculation as they type
- Clear breakdown of all charges

### ✅ Method-Based Calculation
- Different fee structures for M-PESA vs Bank
- Automatic tier selection based on amount
- Dynamic minimum amounts per method

### ✅ Error Prevention
- Validates minimum withdrawal amounts
- Prevents withdrawals that can't cover fees
- Clear error messages with actionable guidance

### ✅ User Experience
- Live fee preview (no surprises)
- Fee tier information for transparency
- Color-coded breakdown for clarity
- Loading states during calculation

### ✅ Technical Excellence
- Type-safe TypeScript implementation
- Comprehensive error handling
- Efficient query caching
- Transaction metadata tracking

---

## How It Works

### User Flow

1. **User Opens Withdrawal Dialog**
   - Sees available balance
   - Selects payment method (M-PESA or Bank)

2. **User Enters Amount**
   - System immediately calculates fees
   - Displays breakdown in real-time
   - Shows applicable fee tier

3. **User Reviews Breakdown**
   - Sees requested amount
   - Sees withdrawal fee (method-specific)
   - Sees net amount to receive
   - Can adjust amount if needed

4. **User Confirms Withdrawal**
   - System validates amount covers fees
   - Creates transaction with fee metadata
   - Initiates Paystack transfer with net amount
   - User receives confirmation with breakdown

### Backend Processing

```
1. User submits withdrawal request: KES 1,000 (M-PESA)

2. System calculates:
   - Withdrawal fee: KES 20
   - Net amount: KES 980

3. System debits wallet: KES 1,000
   (Full requested amount)

4. System initiates Paystack transfer: KES 980
   (Net amount after fee)

5. User receives: KES 980 in M-PESA
   Platform retains: KES 20 (covers Paystack fee)
```

---

## Revenue Impact

### Platform Perspective

The withdrawal fees are **cost-neutral** for the platform:

- **User pays**: Full withdrawal amount + fee
- **Platform sends**: Net amount via Paystack
- **Paystack charges**: Withdrawal fee (covered by user)
- **Platform cost**: KES 0 (fees passed to user)

### Example Transaction
```
User requests withdrawal: KES 10,000 (M-PESA)
Withdrawal fee: KES 40
Platform debits from user wallet: KES 10,000
Platform sends to user via Paystack: KES 9,960
Paystack charges platform: KES 40
Net platform cost: KES 0
```

---

## Testing Checklist

- [x] Test M-PESA withdrawal with small amount (KES 500)
- [x] Test M-PESA withdrawal with medium amount (KES 5,000)
- [x] Test M-PESA withdrawal with large amount (KES 30,000)
- [x] Test Bank withdrawal with small amount (KES 5,000)
- [x] Test Bank withdrawal with large amount (KES 80,000)
- [x] Verify fee preview updates when amount changes
- [x] Verify fee preview updates when method changes
- [x] Test minimum amount validation for M-PESA (KES 21)
- [x] Test minimum amount validation for Bank (KES 81)
- [x] Verify transaction metadata stores fee breakdown
- [x] Test withdrawal with amount below minimum (should fail)
- [x] Verify user receives correct net amount
- [x] Check fee tier display accuracy
- [x] Test with insufficient balance

---

## Database Impact

Withdrawal transactions now store comprehensive metadata:

```json
{
  "accountDetails": { ... },
  "requestedAt": "2026-01-10T...",
  "withdrawalFee": 20,
  "amountToReceive": 980,
  "requestedAmount": 1000,
  "method": "mpesa",
  "transferCode": "TRF_..."
}
```

This enables:
- Detailed transaction history
- Fee analytics and reporting
- Dispute resolution with clear records
- Audit trail for compliance

---

## API Documentation

### Preview Withdrawal Fees

**Endpoint:** `GET /api/wallet/withdrawal/preview`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| amount | number | Yes | Withdrawal amount in KES |
| method | string | No | 'mpesa' or 'bank' (default: 'mpesa') |

**Response (Success - 200):**
```json
{
  "success": true,
  "breakdown": {
    "requestedAmount": 1000,
    "withdrawalFee": 20,
    "amountToReceive": 980,
    "method": "mpesa"
  },
  "feeTiers": [
    { "range": "KES 1 - 1,500", "fee": 20 },
    { "range": "KES 1,501 - 20,000", "fee": 40 },
    { "range": "Above KES 20,000", "fee": 60 }
  ]
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Minimum withdrawal amount for MPESA is KES 21"
}
```

### Initiate Withdrawal

**Endpoint:** `POST /api/wallet/withdrawal/initiate`

**Updated Response:**
```json
{
  "success": true,
  "withdrawalId": 123,
  "breakdown": {
    "requestedAmount": 1000,
    "withdrawalFee": 20,
    "amountToReceive": 980,
    "method": "mpesa"
  },
  "message": "Withdrawal initiated successfully. You will receive KES 980 (after KES 20 withdrawal fee) within 1-3 business days."
}
```

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Withdrawal Volume by Method**
   ```sql
   SELECT
     JSON_EXTRACT(metadata, '$.method') as method,
     COUNT(*) as withdrawal_count,
     SUM(amount) as total_requested,
     SUM(JSON_EXTRACT(metadata, '$.withdrawalFee')) as total_fees,
     SUM(JSON_EXTRACT(metadata, '$.amountToReceive')) as total_sent
   FROM transactions
   WHERE type = 'withdrawal'
     AND status = 'completed'
   GROUP BY method;
   ```

2. **Average Fee by Tier**
   ```sql
   SELECT
     CASE
       WHEN amount <= 1500 THEN 'Tier 1 (≤1,500)'
       WHEN amount <= 20000 THEN 'Tier 2 (1,501-20,000)'
       ELSE 'Tier 3 (>20,000)'
     END as tier,
     COUNT(*) as count,
     AVG(JSON_EXTRACT(metadata, '$.withdrawalFee')) as avg_fee
   FROM transactions
   WHERE type = 'withdrawal'
     AND JSON_EXTRACT(metadata, '$.method') = 'mpesa'
   GROUP BY tier;
   ```

3. **Monthly Withdrawal Fees Collected**
   ```sql
   SELECT
     DATE_FORMAT(completed_at, '%Y-%m') as month,
     SUM(JSON_EXTRACT(metadata, '$.withdrawalFee')) as total_fees_collected
   FROM transactions
   WHERE type = 'withdrawal'
     AND status = 'completed'
   GROUP BY month
   ORDER BY month DESC;
   ```

---

## Future Enhancements

### Potential Improvements

1. **Volume Discounts**
   - Offer reduced fees for high-volume users
   - Implement loyalty tiers (e.g., 10% off after 10 withdrawals)

2. **Fee Waivers**
   - First withdrawal free for new users
   - Special promotions during campaigns
   - Waive fees for amounts below certain threshold

3. **Bulk Withdrawals**
   - Allow scheduling multiple withdrawals
   - Batch processing for better rates
   - Combined fee calculation

4. **Analytics Dashboard**
   - Show users their withdrawal history
   - Display total fees paid over time
   - Suggest optimal withdrawal amounts to minimize fees

5. **Smart Suggestions**
   - Recommend consolidating small withdrawals
   - Notify when nearing next tier threshold
   - Suggest best timing for withdrawals

---

## Troubleshooting

### Common Issues

**Issue**: "Minimum withdrawal amount for MPESA is KES 21"
- **Cause**: Amount too small to cover withdrawal fee
- **Solution**: Increase withdrawal amount or switch to bank transfer for larger amounts

**Issue**: Fee preview not loading
- **Cause**: Network issue or invalid amount
- **Solution**: Check amount is positive number, refresh page, or try again

**Issue**: Withdrawal fee seems high
- **Cause**: User in higher fee tier or using bank transfer
- **Solution**: Explain fee tiers, suggest M-PESA for lower amounts, bank for higher amounts

**Issue**: User expected full amount but received less
- **Cause**: User didn't notice fee breakdown
- **Solution**: Fee breakdown is prominently displayed during withdrawal - refer to transaction details

---

## Support & Documentation

### User-Facing Documentation

**What users should know:**

1. **Withdrawal fees are separate from the withdrawal amount**
   - If you request KES 1,000, you'll receive less after fees
   - Fees are clearly shown before you confirm

2. **Fees vary by method and amount**
   - M-PESA has 3 fee tiers based on amount
   - Bank transfers have different fee structure
   - Check fee tiers before withdrawing

3. **Minimum withdrawal amounts**
   - M-PESA: KES 21 minimum
   - Bank: KES 81 minimum
   - This ensures you receive at least KES 1

4. **How to minimize fees**
   - Consolidate withdrawals instead of multiple small ones
   - Use M-PESA for amounts under KES 20,000
   - Use bank for larger amounts when KES 140 fee is acceptable

### Developer Documentation

- **Utility Reference**: [server/utils/withdrawalFees.ts](server/utils/withdrawalFees.ts)
- **Service Reference**: [server/services/withdrawal.service.ts](server/services/withdrawal.service.ts)
- **API Endpoint**: [server/routes/wallet.ts](server/routes/wallet.ts)
- **UI Component**: [client/src/components/wallet/WithdrawDialog.tsx](client/src/components/wallet/WithdrawDialog.tsx)

---

## Deployment Checklist

- [x] Create withdrawalFees.ts utility
- [x] Update withdrawal.service.ts with fee calculations
- [x] Add fee preview API endpoint
- [x] Update WithdrawDialog component with live preview
- [x] Test all fee tiers for M-PESA
- [x] Test all fee tiers for Bank
- [x] Verify transaction metadata storage
- [x] Create documentation

**Ready for Deployment**: ✅ YES

---

## Summary

The withdrawal fees implementation is **complete and production-ready**. It provides:

1. **Transparent Fee Structure** - Users see fees before confirming
2. **Real-time Preview** - Live calculation as users type
3. **Method-Specific Fees** - Accurate M-PESA and Bank fee tiers
4. **Error Prevention** - Validates minimum amounts
5. **Cost Neutral** - Fees passed to users, not absorbed by platform
6. **Comprehensive Tracking** - Full metadata for analytics and support

The system handles all withdrawal fee scenarios according to Paystack Kenya's official pricing and provides an excellent user experience with complete transparency.

---

**Implementation Complete**: 2026-01-10
**Status**: ✅ Ready for Production
**Tested**: ✅ All scenarios verified
**Documented**: ✅ Comprehensive documentation provided
