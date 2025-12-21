# Convenience Fee Structure

## Overview

The Kitabu Connect platform charges a **5% convenience fee** on all book purchases. Buyers handle their own logistics, so there are no logistics or shipping fees charged by the platform.

## Fee Breakdown

### When a Buyer Purchases a Book:

**Example: Book listed at KSh 1,000**

- **Book Price**: KSh 1,000
- **Convenience Fee (5%)**: KSh 50
- **Total Charged to Buyer**: KSh 1,050

### What Happens to the Money:

1. **Buyer pays**: KSh 1,050 (from wallet)
2. **Platform keeps**: KSh 50 (convenience fee)
3. **Escrow holds**: KSh 1,000 (book price only)
4. **Seller receives** (after 7 days): KSh 1,000 (full book price)

## Payment Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. BUYER INITIATES PURCHASE                                 │
│    Book Price: KSh 1,000                                     │
│    Convenience Fee: KSh 50 (5%)                              │
│    Total: KSh 1,050                                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. WALLET DEBIT                                              │
│    Buyer's wallet: -KSh 1,050                                │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. FEE COLLECTION & ESCROW CREATION                          │
│    Platform keeps: KSh 50                                    │
│    Escrow holds: KSh 1,000 (for 7 days)                      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. AFTER 7 DAYS (Automatic Release)                         │
│    Escrow releases: KSh 1,000                                │
│    Seller's wallet: +KSh 1,000                               │
└─────────────────────────────────────────────────────────────┘
```

## Key Points

### For Buyers:
- ✅ Pay book price + 5% convenience fee
- ✅ Arrange and handle own logistics/delivery with seller
- ✅ No additional shipping or delivery fees from platform
- ✅ Funds protected in escrow for 7 days
- ✅ Can request refund within 7-day escrow period if needed

### For Sellers:
- ✅ Receive full book listing price (100%)
- ✅ No fees deducted from book price
- ✅ Payment held safely in escrow for 7 days
- ✅ Automatic release after 7 days
- ✅ Coordinate delivery directly with buyer

### For Platform:
- ✅ Earns 5% convenience fee on each transaction
- ✅ Fee collected at purchase time (not from escrow)
- ✅ Provides escrow protection service
- ✅ Manages dispute resolution

## Database Schema

### Orders Table
```sql
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  buyer_id VARCHAR(36) NOT NULL,
  seller_id VARCHAR(36) NOT NULL,
  book_listing_id INT NOT NULL,
  quantity INT DEFAULT 1,

  -- Pricing breakdown
  total_amount DECIMAL(10,2) NOT NULL,      -- Book price + convenience fee (what buyer pays)
  platform_fee DECIMAL(10,2) NOT NULL,      -- 5% convenience fee
  seller_amount DECIMAL(10,2) NOT NULL,     -- Book price only (what seller gets)

  status VARCHAR(20) DEFAULT 'pending',
  escrow_id INT,
  -- ... other fields
);
```

### Escrow Accounts Table
```sql
CREATE TABLE escrow_accounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  book_listing_id INT NOT NULL,
  buyer_id VARCHAR(36) NOT NULL,
  seller_id VARCHAR(36) NOT NULL,

  -- Amount in escrow (seller's portion only)
  amount DECIMAL(10,2) NOT NULL,            -- Book price (seller_amount from order)
  platform_fee DECIMAL(10,2) DEFAULT 0.00,  -- Always 0, fee collected at purchase

  status VARCHAR(20) DEFAULT 'active',
  hold_period_days INT DEFAULT 7,
  release_at TIMESTAMP NOT NULL,
  -- ... other fields
);
```

## Example Calculations

### Example 1: Single Book Purchase

**Book**: Mathematics Textbook
- **Listed Price**: KSh 800
- **Convenience Fee**: KSh 40 (5%)
- **Buyer Pays**: KSh 840
- **Platform Keeps**: KSh 40
- **Seller Gets**: KSh 800

### Example 2: Multiple Quantity

**Book**: Science Workbook (x3)
- **Unit Price**: KSh 500
- **Subtotal**: KSh 1,500
- **Convenience Fee**: KSh 75 (5%)
- **Buyer Pays**: KSh 1,575
- **Platform Keeps**: KSh 75
- **Seller Gets**: KSh 1,500

### Example 3: High-Value Book

**Book**: Complete Encyclopedia Set
- **Listed Price**: KSh 5,000
- **Convenience Fee**: KSh 250 (5%)
- **Buyer Pays**: KSh 5,250
- **Platform Keeps**: KSh 250
- **Seller Gets**: KSh 5,000

## Code Implementation

### Frontend (Book Details Page)

```typescript
const bookPrice = Number(book.price);
const convenienceFee = bookPrice * 0.05; // 5% convenience fee
const totalPrice = bookPrice + convenienceFee;
```

### Backend (Order Service)

```typescript
const bookAmount = parseFloat(book.price) * quantity;
const convenienceFee = (bookAmount * 5) / 100;
const totalAmount = bookAmount + convenienceFee;  // Charged to buyer
const sellerAmount = bookAmount;                  // Seller receives
```

### Backend (Escrow Service)

```typescript
// Only escrow the seller's amount (book price)
// Convenience fee already collected at purchase
const escrowResult = await escrowService.createEscrow({
  amount: sellerAmount,  // Book price only, not total
  // ... other params
});
```

## Logistics Handling

### Old System (Removed):
- ❌ Platform charged fixed logistics fee (KSh 1,500)
- ❌ Platform responsible for delivery coordination
- ❌ Additional cost burden on buyers

### New System (Current):
- ✅ Buyers and sellers arrange delivery directly
- ✅ No logistics fees from platform
- ✅ Only 5% convenience fee charged
- ✅ Lower costs for buyers
- ✅ Direct communication between buyer and seller

### Delivery Options (Buyer's Choice):
1. **Meet-up**: Buyer and seller meet in person
2. **Courier**: Buyer arranges and pays courier directly
3. **School Pickup**: Collection from seller's school/location
4. **Personal Delivery**: Seller delivers (if agreed)

*All logistics arrangements and costs are between buyer and seller*

## Refund Policy

### Within 7-Day Escrow Period:
- Buyer can request refund
- If approved:
  - Escrow amount (KSh 1,000) refunded to buyer
  - Convenience fee (KSh 50) NOT refunded (platform keeps)
  - Book status updated to available

### After 7 Days:
- Escrow automatically released to seller
- Transaction completed
- Refunds handled through dispute resolution

## Summary

The **5% convenience fee** covers:
- ✅ Platform maintenance and development
- ✅ Escrow service and payment protection
- ✅ Transaction processing
- ✅ Dispute resolution support
- ✅ User verification and security

**Benefits of this model:**
- Lower costs compared to fixed logistics fees
- Sellers receive full book price
- Buyers control delivery method and cost
- Transparent fee structure
- Fair for all parties

---

**Last Updated**: 2024
**Fee Rate**: 5% (subject to change with user notification)
