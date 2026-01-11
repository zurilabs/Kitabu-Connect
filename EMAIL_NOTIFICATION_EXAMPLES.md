# Email Notification Integration Examples

Quick reference guide for adding email support to existing notifications.

## Quick Setup

```bash
# 1. Install Resend
npm install resend

# 2. Add to .env
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=Kitabu Connect <noreply@kitabuconnect.com>
FRONTEND_URL=http://localhost:5000
```

## Before & After Examples

### Example 1: Wishlist Match (bookListing.service.ts:1021)

**Before:**
```typescript
await notificationService.createNotification({
  userId: wishlistItem.parent.id,
  type: "wishlist_match",
  title: notificationTitle,
  message: notificationMessage,
  relatedBookListingId: listing.id,
  actionUrl: `/book/${listing.id}`,
});
```

**After (with email):**
```typescript
await notificationService.createNotification({
  userId: wishlistItem.parent.id,
  type: "wishlist_match",
  title: notificationTitle,
  message: notificationMessage,
  relatedBookListingId: listing.id,
  actionUrl: `/book/${listing.id}`,
  emailData: {
    bookTitle: listing.title,
    bookUrl: `${process.env.FRONTEND_URL}/book/${listing.id}`,
    matchQuality: matchQuality, // "excellent", "good", or "fair"
    childName: wishlistItem.child.name,
  },
});
```

---

### Example 2: Purchase Order Created (swapOrder.service.ts:115)

**Before:**
```typescript
await notificationService.createNotification({
  userId: sellerId,
  type: "purchase_order_created",
  title: "🛒 New Purchase Order!",
  message: `${buyerName} ordered your book "${bookTitle}"`,
  relatedOrderId: orderId,
  actionUrl: `/orders/${orderId}/messages`,
});
```

**After (with email):**
```typescript
await notificationService.createNotification({
  userId: sellerId,
  type: "purchase_order_created",
  title: "🛒 New Purchase Order!",
  message: `${buyerName} ordered your book "${bookTitle}"`,
  relatedOrderId: orderId,
  actionUrl: `/orders/${orderId}/messages`,
  emailData: {
    buyerName: buyerName,
    bookTitle: bookTitle,
    orderAmount: totalAmount.toLocaleString(),
    orderUrl: `${process.env.FRONTEND_URL}/orders/${orderId}/messages`,
  },
});
```

---

### Example 3: Payment Received (webhooks.ts:129)

**Before:**
```typescript
await notificationService.createNotification({
  userId: sellerId,
  type: "payment_received",
  title: "💰 Payment Received!",
  message: `Payment confirmed for ${bookTitle}. The book is ready to ship.`,
  relatedOrderId: orderId,
  actionUrl: `/orders/${orderId}/messages`,
});
```

**After (with email):**
```typescript
await notificationService.createNotification({
  userId: sellerId,
  type: "payment_received",
  title: "💰 Payment Received!",
  message: `Payment confirmed for ${bookTitle}. The book is ready to ship.`,
  relatedOrderId: orderId,
  actionUrl: `/orders/${orderId}/messages`,
  emailData: {
    bookTitle: bookTitle,
    orderAmount: amount.toLocaleString(),
    orderUrl: `${process.env.FRONTEND_URL}/orders/${orderId}/messages`,
  },
});
```

---

### Example 4: New Message (message.service.ts:78)

**Before:**
```typescript
await notificationService.createNotification({
  userId: recipientId,
  type: "new_message",
  title: `💬 New message from ${senderName}`,
  message: messageText.substring(0, 100),
  actionUrl: `/orders/${orderId}/messages`,
});
```

**After (with email):**
```typescript
await notificationService.createNotification({
  userId: recipientId,
  type: "new_message",
  title: `💬 New message from ${senderName}`,
  message: messageText.substring(0, 100),
  actionUrl: `/orders/${orderId}/messages`,
  emailData: {
    senderName: senderName,
    messagePreview: messageText.substring(0, 100),
    conversationUrl: `${process.env.FRONTEND_URL}/orders/${orderId}/messages`,
  },
});
```

---

### Example 5: Swap Request Received (swapRequest.service.ts:164)

**Before:**
```typescript
await notificationService.createNotification({
  userId: ownerId,
  type: "swap_request_received",
  title: "📖 New Swap Request!",
  message: `${requesterName} wants to swap "${offeredBook.title}" for your "${requestedBook.title}"`,
  relatedSwapRequestId: swapRequestId,
  actionUrl: `/swap-requests/${swapRequestId}`,
});
```

**After (with email):**
```typescript
await notificationService.createNotification({
  userId: ownerId,
  type: "swap_request_received",
  title: "📖 New Swap Request!",
  message: `${requesterName} wants to swap "${offeredBook.title}" for your "${requestedBook.title}"`,
  relatedSwapRequestId: swapRequestId,
  actionUrl: `/swap-requests/${swapRequestId}`,
  emailData: {
    requesterName: requesterName,
    offeredBookTitle: offeredBook.title,
    requestedBookTitle: requestedBook.title,
    swapRequestUrl: `${process.env.FRONTEND_URL}/swap-requests/${swapRequestId}`,
  },
});
```

---

### Example 6: Swap Request Approved (swapRequest.service.ts:456)

**Before:**
```typescript
await notificationService.createNotification({
  userId: requesterId,
  type: "swap_request_approved",
  title: "✅ Swap Request Approved!",
  message: `${ownerName} approved your swap request for "${bookTitle}"`,
  relatedSwapRequestId: swapRequestId,
  actionUrl: `/swap-requests/${swapRequestId}`,
});
```

**After (with email):**
```typescript
await notificationService.createNotification({
  userId: requesterId,
  type: "swap_request_approved",
  title: "✅ Swap Request Approved!",
  message: `${ownerName} approved your swap request for "${bookTitle}"`,
  relatedSwapRequestId: swapRequestId,
  actionUrl: `/swap-requests/${swapRequestId}`,
  emailData: {
    ownerName: ownerName,
    bookTitle: bookTitle,
    swapRequestUrl: `${process.env.FRONTEND_URL}/swap-requests/${swapRequestId}`,
  },
});
```

---

### Example 7: Book Shipped (swapOrder.service.ts:1379)

**Before:**
```typescript
await notificationService.createNotification({
  userId: buyerId,
  type: "book_shipped",
  title: "📦 Your Book Has Been Shipped!",
  message: `${sellerName} has shipped your book${trackingNumber ? ` (Tracking: ${trackingNumber})` : ''}`,
  relatedOrderId: orderId,
  actionUrl: `/orders/${orderId}/messages`,
});
```

**After (with email):**
```typescript
await notificationService.createNotification({
  userId: buyerId,
  type: "book_shipped",
  title: "📦 Your Book Has Been Shipped!",
  message: `${sellerName} has shipped your book${trackingNumber ? ` (Tracking: ${trackingNumber})` : ''}`,
  relatedOrderId: orderId,
  actionUrl: `/orders/${orderId}/messages`,
  emailData: {
    sellerName: sellerName,
    bookTitle: bookTitle,
    trackingNumber: trackingNumber || undefined,
    orderUrl: `${process.env.FRONTEND_URL}/orders/${orderId}/messages`,
  },
});
```

---

### Example 8: Referral Signup (referral.service.ts:601)

**Before:**
```typescript
await notificationService.createNotification({
  userId: referrerId,
  type: "referral_signup",
  title: "🎉 Referral Bonus Earned!",
  message: `${referredName} signed up using your referral code. You earned KES ${bonusAmount}!`,
  actionUrl: "/dashboard",
});
```

**After (with email):**
```typescript
await notificationService.createNotification({
  userId: referrerId,
  type: "referral_signup",
  title: "🎉 Referral Bonus Earned!",
  message: `${referredName} signed up using your referral code. You earned KES ${bonusAmount}!`,
  actionUrl: "/dashboard",
  emailData: {
    referredName: referredName,
    bonusAmount: bonusAmount.toLocaleString(),
  },
});
```

---

### Example 9: Withdrawal Completed (withdrawal.service.ts)

**After withdrawal is processed:**
```typescript
await notificationService.createNotification({
  userId: userId,
  type: "withdrawal_completed",
  title: "✅ Withdrawal Processed",
  message: `Your withdrawal of KES ${netAmount} has been processed successfully.`,
  actionUrl: "/dashboard",
  emailData: {
    amount: requestedAmount.toLocaleString(),
    fee: withdrawalFee.toLocaleString(),
    netAmount: netAmount.toLocaleString(),
    method: method, // "mpesa" or "bank"
  },
});
```

---

### Example 10: Welcome Email (routes.ts - After signup)

**Add after user registration:**
```typescript
// After creating user account
await notificationService.createNotification({
  userId: newUser.id,
  type: "welcome",
  title: "🎉 Welcome to Kitabu Connect!",
  message: "Start buying and selling textbooks today",
  actionUrl: "/browse",
  emailData: {
    userName: newUser.fullName || "there",
    referralCode: referralCode || undefined,
  },
});
```

---

## Template Data Reference

### All Available Templates and Their Required Data

```typescript
// Wishlist Match
{
  bookTitle: string;
  bookUrl: string;
  matchQuality: "excellent" | "good" | "fair";
  childName: string;
}

// Swap Request Received
{
  requesterName: string;
  offeredBookTitle: string;
  requestedBookTitle: string;
  swapRequestUrl: string;
}

// Swap Request Approved
{
  ownerName: string;
  bookTitle: string;
  swapRequestUrl: string;
}

// Swap Request Rejected
{
  ownerName: string;
  bookTitle: string;
}

// Purchase Order Created
{
  buyerName: string;
  bookTitle: string;
  orderAmount: string;
  orderUrl: string;
}

// Payment Received
{
  bookTitle: string;
  orderAmount: string;
  orderUrl: string;
}

// Book Shipped
{
  sellerName: string;
  bookTitle: string;
  trackingNumber?: string;
  orderUrl: string;
}

// Order Delivered
{
  bookTitle: string;
  orderUrl: string;
}

// Order Completed
{
  bookTitle: string;
  amount: string;
  orderUrl: string;
}

// Wallet Top-Up
{
  amount: string;
  newBalance: string;
}

// Withdrawal Completed
{
  amount: string;
  fee: string;
  netAmount: string;
  method: "mpesa" | "bank";
}

// New Message
{
  senderName: string;
  messagePreview: string;
  conversationUrl: string;
}

// Referral Signup
{
  referredName: string;
  bonusAmount: string;
}

// Referral Purchase
{
  referredName: string;
  bonusAmount: string;
}

// Dispute Opened
{
  bookTitle: string;
  reason: string;
  disputeUrl: string;
}

// Dispute Resolved
{
  bookTitle: string;
  resolution: string;
  disputeUrl: string;
}

// New Rating
{
  raterName: string;
  rating: number; // 1-5
  bookTitle: string;
  comment?: string;
}

// Rating Reminder
{
  sellerName: string;
  bookTitle: string;
  orderUrl: string;
}

// Escrow Released
{
  bookTitle: string;
  amount: string;
}

// Welcome
{
  userName: string;
  referralCode?: string;
}
```

---

## Testing Checklist

After adding `emailData` to notifications:

- [ ] Import statements updated
- [ ] `emailData` object includes all required fields
- [ ] URLs are absolute (include `process.env.FRONTEND_URL`)
- [ ] Currency values are formatted with `.toLocaleString()`
- [ ] User names/titles are available in scope
- [ ] Optional fields use `|| undefined` for proper typing
- [ ] Test notification is triggered successfully
- [ ] Check console logs for email sending status
- [ ] Verify email received (if Resend configured)

---

## Quick Migration Script

Search for all notification calls and add emailData:

```bash
# Find all notification calls
grep -r "notificationService.createNotification" server/

# Then update each one following the patterns above
```

---

## Files to Update

Based on current notification usage:

1. ✅ `server/services/notification.service.ts` - Already updated
2. ✅ `server/services/email.service.ts` - Already created
3. ⏳ `server/routes.ts` (lines 200, 225) - Add welcome email
4. ⏳ `server/services/payment.service.ts` (line 178) - Add wallet top-up email
5. ⏳ `server/services/bookListing.service.ts` (line 1021) - Add wishlist match email
6. ⏳ `server/services/referral.service.ts` (lines 601, 638) - Add referral emails
7. ⏳ `server/services/message.service.ts` (line 78) - Add new message email
8. ⏳ `server/services/swapRequest.service.ts` (lines 164, 456, 465, 474, 482) - Add swap emails
9. ⏳ `server/services/swapOrder.service.ts` (multiple locations) - Add order emails
10. ⏳ `server/routes/webhooks.ts` (lines 129, 181, 233) - Add payment emails
11. ⏳ `server/services/dispute.service.ts` (multiple locations) - Add dispute emails
12. ⏳ `server/services/rating.service.ts` (lines 144, 504) - Add rating emails
13. ⏳ `server/services/withdrawal.service.ts` - Add withdrawal emails

---

**Total Notifications**: ~40 notification calls across codebase
**Priority**: High-value notifications first (payments, orders, swaps)
**Time Estimate**: 1-2 hours to update all notifications
