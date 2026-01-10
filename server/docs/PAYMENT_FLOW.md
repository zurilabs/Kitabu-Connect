# Payment Flow Documentation

## Overview

This document describes the payment structure for Kitabu Connect's marketplace, covering both **Purchase Orders** (buying books) and **Swap Orders** (exchanging books).

Last Updated: 2026-01-10

---

## Payment Structure

### 1. Purchase Orders (Buying Books)

When a buyer purchases a book, they pay the following:

| Fee Component | Description | Calculation | Goes To |
|---------------|-------------|-------------|---------|
| **Book Price** | The seller's asking price | Set by seller | Seller |
| **Service Fee** | Platform commission | 5% of book price | Platform |
| **Paystack Transaction Fee** | Payment processing fee | 1.5% + KES 100 (capped at KES 2,500) | Paystack |
| **Total** | What buyer pays | Book Price + Service Fee + Paystack Fee | - |

#### Example: Purchasing a KES 1,000 Book

```
Book Price:                 KES 1,000.00
Service Fee (5%):           KES    50.00
Subtotal:                   KES 1,050.00
Paystack Fee:               KES   100.00 (flat fee for amounts ≤ KES 2,500)
─────────────────────────────────────────
Total Buyer Pays:           KES 1,150.00
```

**Breakdown of where money goes:**
- Seller receives: KES 1,000.00 (book price)
- Platform receives: KES 50.00 (service fee)
- Paystack receives: KES 100.00 (transaction fee)

---

### 2. Swap Orders (Book Exchanges)

When two parties swap books, each party pays:

| Fee Component | Description | Calculation | Goes To |
|---------------|-------------|-------------|---------|
| **Exchange Fee** | Platform fee for facilitating swap | KES 50 per party | Platform |
| **Paystack Transaction Fee** | Payment processing fee | 1.5% + KES 100 (capped at KES 2,500) | Paystack |
| **Total per Party** | What each swapper pays | Exchange Fee + Paystack Fee | - |

#### Example: Swapping Books

```
Exchange Fee:               KES  50.00
Paystack Transaction Fee:   KES 100.00 (flat for small amounts)
─────────────────────────────────────────
Total per Swapper:          KES 152.00
```

**Breakdown of where money goes (per party):**
- Platform receives: KES 50.00 (exchange fee)
- Paystack receives: KES 102.00 (transaction fee calculated dynamically)

**Total platform revenue from one swap:** KES 100.00 (KES 50 × 2 parties)

---

## Paystack Fee Calculation

Paystack Kenya charges: **1.5% + KES 100, capped at KES 2,500**

### Dynamic Fee Calculation

The fee calculation ensures the platform receives the exact amount after Paystack deducts their fee:

```typescript
// For amounts where cap doesn't apply
customerPays = (amountToReceive + 100) / (1 - 0.015)

// For amounts where cap applies (> KES 160,000)
customerPays = amountToReceive + 2500
```

### Fee Examples

| Amount to Receive | Paystack Fee | Customer Pays | Notes |
|-------------------|--------------|---------------|-------|
| KES 50 | KES 102 | KES 152 | Exchange fee scenario |
| KES 1,000 | KES 115 | KES 1,115 | Small purchase |
| KES 5,000 | KES 176 | KES 5,176 | Medium purchase |
| KES 10,000 | KES 252 | KES 10,252 | Large purchase |
| KES 100,000 | KES 1,616 | KES 101,616 | Very large purchase |
| KES 200,000 | KES 2,500 | KES 202,500 | Cap applied |

---

## Implementation Details

### Database Schema

The `swap_orders` table stores fee breakdown:

```sql
-- Purchase order fields
book_price DECIMAL(10, 2)                    -- Seller's price
service_fee DECIMAL(10, 2)                   -- Platform service fee (5%)
paystack_transaction_fee DECIMAL(10, 2)      -- Paystack fee
subtotal DECIMAL(10, 2)                      -- Book price + service fee
total_amount DECIMAL(10, 2)                  -- Final total including all fees

-- Swap order fields
exchange_fee DECIMAL(10, 2) DEFAULT 50.00    -- Exchange fee per party
exchange_paystack_fee DECIMAL(10, 2)         -- Paystack fee per party
commitment_fee DECIMAL(10, 2)                -- DEPRECATED: Total per party (for backward compatibility)
```

### Fee Calculation Utility

Location: `server/utils/paystackFees.ts`

Key functions:
- `calculatePurchaseOrderFees(bookPrice, serviceFeePercentage)` - Returns full fee breakdown for purchases
- `calculateSwapOrderFees(exchangeFeePerParty)` - Returns fee breakdown for swaps
- `calculatePaystackFee(amount)` - Calculates Paystack fee for any amount
- `getPaystackFeeBreakdown(amount)` - Returns detailed fee breakdown with cap information

### Service Integration

**SwapOrderService** (`server/services/swapOrder.service.ts`):
- `createPurchaseOrder()` - Calculates and stores all fees when creating purchase order
- `createSwapOrder()` - Calculates and stores exchange fees when creating swap order
- `payPurchaseOrder()` - Processes payment and creates escrow with fee breakdown
- `payCommitmentFee()` - Processes exchange fee payment for swaps
- `confirmDelivery()` - Releases funds to seller and platform, handling fee distribution

---

## Money Flow

### Purchase Order Flow

1. **Order Creation**: Buyer clicks "Buy Now"
   - System calculates: Book Price + Service Fee + Paystack Fee = Total
   - Order created with status `pending`

2. **Seller Acceptance**: Seller accepts the purchase request
   - Status changes to `awaiting_payment`

3. **Payment**: Buyer pays via Paystack
   - Paystack receives: Total Amount
   - Paystack deducts their fee immediately
   - Remaining amount held in escrow

4. **Escrow Hold**: Funds split between two escrow accounts
   - Seller's escrow: Book Price
   - Platform escrow: Service Fee

5. **Delivery**: Books are shipped/exchanged

6. **Confirmation**: Buyer confirms receipt
   - Seller's escrow released → Seller's wallet: Book Price
   - Platform escrow released → Platform wallet: Service Fee

### Swap Order Flow

1. **Swap Request**: Requester proposes a swap
   - Status: `pending`

2. **Acceptance**: Owner accepts the swap
   - Swap order created with status `requirements_gathering`
   - Exchange fees calculated: KES 50 + Paystack fee per party

3. **Requirements**: Both parties agree on meetup details
   - Status changes to `awaiting_payment`

4. **Payment**: Each party pays their exchange fee
   - Party 1 pays: KES 152 (KES 50 + KES 102 Paystack)
   - Party 2 pays: KES 152 (KES 50 + KES 102 Paystack)
   - Total collected: KES 304
   - Platform receives: KES 100 (after Paystack deductions)
   - Status changes to `in_progress`

5. **Exchange**: Books are swapped at meetup

6. **Confirmation**: Both parties confirm receipt
   - Exchange fees released to platform
   - Status: `completed`

---

## Fee Transparency

### User-Facing Messages

**Purchase Order:**
```
🛒 Purchase request created!

Book: [Title]
Book Price: KES 1,000.00
Service Fee (5%): KES 50.00
Paystack Transaction Fee: KES 100.00
───────────────────────
Total: KES 1,150.00

Waiting for seller to accept your purchase request.
```

**Swap Order:**
```
✅ Requirements approved! Both parties need to pay an exchange fee to proceed.

Exchange Fee: KES 50
Paystack Transaction Fee: KES 102
───────────────────────
Total per party: KES 152

This fee goes to the platform for facilitating the swap.
```

---

## Configuration

### Fee Settings

Current configuration (can be adjusted):

```typescript
// Purchase orders
const SERVICE_FEE_PERCENTAGE = 0.05; // 5%

// Swap orders
const EXCHANGE_FEE_PER_PARTY = 50; // KES 50

// Paystack (Kenya)
const PAYSTACK_PERCENTAGE = 0.015; // 1.5%
const PAYSTACK_FLAT_FEE = 100; // KES 100
const PAYSTACK_CAP = 2500; // KES 2,500
```

### Adjusting Fees

To change fees, update:
1. Constants in `server/utils/paystackFees.ts`
2. Default values in database schema
3. Service method parameters in `swapOrder.service.ts`

---

## Revenue Model

### Platform Revenue Sources

1. **Purchase Service Fees**
   - 5% of every book sale
   - Example: KES 50 from a KES 1,000 book sale

2. **Exchange Fees**
   - KES 50 per party (KES 100 per swap)
   - Covers platform costs for facilitating swaps

### Revenue Tracking

Platform revenue is tracked in:
- `transactions` table with type `platform_revenue`
- Platform user wallet balance
- Escrow accounts with `platformFee` field

---

## Testing

### Test Scenarios

1. **Small Purchase (< KES 2,500)**
   - Book: KES 500
   - Expected: Service Fee KES 25, Paystack KES 100
   - Total: KES 625

2. **Large Purchase (> KES 160,000)**
   - Book: KES 200,000
   - Expected: Service Fee KES 10,000, Paystack KES 2,500 (capped)
   - Total: KES 212,500

3. **Standard Swap**
   - Exchange Fee: KES 50
   - Paystack: KES 102
   - Per party: KES 152

### Edge Cases

- Order cancellation before payment: No fees charged
- Order cancellation after payment: Full refund (platform absorbs Paystack fee)
- Partial completion: Fees distributed based on completion state

---

## Migration Guide

### Upgrading from Old System

1. **Database Migration**
   ```bash
   # Run migration script
   mysql -u root -p kitabu_connect < server/db/migrations/005_add_payment_fee_breakdown.sql
   ```

2. **Backward Compatibility**
   - Old fields (`convenience_fee`, `commitment_fee`) retained
   - New code reads from new fields first, falls back to old fields
   - Old records automatically updated with migration

3. **Testing**
   - Test new purchase orders
   - Test new swap orders
   - Verify old orders still display correctly

---

## Support & Troubleshooting

### Common Issues

**Issue**: Paystack fee seems incorrect
- **Solution**: Verify calculation using `getPaystackFeeBreakdown()` utility
- Check if amount triggers cap (> KES 160,000)

**Issue**: Platform not receiving service fees
- **Solution**: Check escrow release logic in `confirmDelivery()`
- Verify platform user account exists

**Issue**: Fee totals don't match
- **Solution**: Ensure using `calculateAmountWithPaystackFees()` not manual calculation
- Rounding differences acceptable up to KES 1

---

## Future Enhancements

Potential improvements:
- [ ] Volume discounts for high-value sellers
- [ ] Promotional fee waivers
- [ ] Dynamic service fee based on book category
- [ ] Subscription model with reduced fees
- [ ] Bulk transaction discounts

---

## References

- Paystack Kenya Pricing: https://paystack.com/ke/pricing
- Database Schema: `server/db/schema/index.ts`
- Fee Utilities: `server/utils/paystackFees.ts`
- Service Logic: `server/services/swapOrder.service.ts`
