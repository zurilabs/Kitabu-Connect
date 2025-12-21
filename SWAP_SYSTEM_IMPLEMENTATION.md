# 📚 Book Swap System - Complete Implementation Guide

## Overview

This document explains how the book swapping system works in Kitabu Connect, including how escrow ensures trust even without money being exchanged.

## 🔄 How the Swap Process Works

### Phase 1: Discover & Request
1. User browses marketplace and finds a swap listing
2. Clicks "Initiate Swap" button
3. If not logged in → redirects to login/register
4. Fills out swap request form:
   - What book they're offering
   - Book condition
   - Optional photo
   - Message to owner

### Phase 2: Notification & Response
1. Book owner receives in-app notification
2. Owner reviews the swap offer
3. Owner can:
   - **Accept**: Agree to swap
   - **Reject**: Decline the offer
   - **Ignore**: Leave as pending

### Phase 3: Commitment (Optional)
When both parties accept, they can opt into a commitment fee system:
- **Small deposit**: KES 50-100 each
- **Held in escrow**: Both fees locked
- **Purpose**: Ensures both parties show up

### Phase 4: Exchange
1. Agree on meetup location/time
2. Meet and exchange books
3. Both confirm receipt in app
4. Escrow releases funds back to both parties

## 💰 How Escrow Works for Swaps (Without Money)

### The Problem Escrow Solves
- **No-shows**: One person doesn't show up
- **Fake listings**: Someone lists a book they don't have
- **Last-minute backing out**: Changes mind after agreement

### The Solution: Commitment Fees

```
┌────────────────────────────────────────────────────────┐
│ SCENARIO 1: Both parties reliable (Normal case)       │
├────────────────────────────────────────────────────────┤
│ User A deposits:        KES 50                         │
│ User B deposits:        KES 50                         │
│ ─────────────────────────────────────────────────      │
│ Escrow holds:           KES 100                        │
│                                                         │
│ After successful swap:                                 │
│ User A gets back:       KES 50 ✓                      │
│ User B gets back:       KES 50 ✓                      │
│ Cost to both:           KES 0  (Free swap!)            │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ SCENARIO 2: One party doesn't show up                 │
├────────────────────────────────────────────────────────┤
│ User A deposits:        KES 50                         │
│ User B deposits:        KES 50                         │
│ ─────────────────────────────────────────────────      │
│ User A shows up ✓                                      │
│ User B doesn't show up ✗                               │
│                                                         │
│ Result:                                                 │
│ User A gets:            KES 100 (50 + 50 penalty)      │
│ User B gets:            KES 0   (Lost deposit)         │
│ User B flagged in system                               │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ SCENARIO 3: Both parties don't show up                │
├────────────────────────────────────────────────────────┤
│ After 48 hours with no confirmation:                   │
│ Both fees returned:     KES 50 + KES 50               │
│ Swap marked as:         "Cancelled"                    │
└────────────────────────────────────────────────────────┘
```

### Benefits of This System
✅ **Low risk**: Only KES 50 at stake
✅ **Refundable**: Get it back after successful swap
✅ **Accountability**: Penalties for no-shows
✅ **Trust building**: Users with good swap history are prioritized
✅ **Optional**: Can skip commitment fee if both parties agree

## 📊 Database Schema

### swap_requests Table
```sql
CREATE TABLE swap_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  requester_id VARCHAR(36) NOT NULL,        -- Who wants the book
  owner_id VARCHAR(36) NOT NULL,            -- Who owns the book
  requested_listing_id INT NOT NULL,        -- Book they want

  -- What requester is offering
  offered_book_title VARCHAR(500) NOT NULL,
  offered_book_author VARCHAR(255),
  offered_book_condition VARCHAR(20) NOT NULL,
  offered_book_description TEXT,
  offered_book_photo_url TEXT,

  message TEXT,                             -- Personal message
  status VARCHAR(20) DEFAULT 'pending',     -- pending/accepted/rejected/completed/cancelled

  -- Commitment tracking
  commitment_fee DECIMAL(10,2) DEFAULT 0.00,
  requester_paid BOOLEAN DEFAULT FALSE,
  owner_paid BOOLEAN DEFAULT FALSE,
  escrow_id INT,                            -- Links to escrow_accounts

  -- Meetup details
  meetup_location TEXT,
  meetup_time TIMESTAMP,
  delivery_method VARCHAR(50) DEFAULT 'meetup',

  -- Confirmation
  requester_confirmed BOOLEAN DEFAULT FALSE,
  owner_confirmed BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  accepted_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,

  INDEX idx_requester (requester_id),
  INDEX idx_owner (owner_id),
  INDEX idx_listing (requested_listing_id),
  INDEX idx_status (status)
);
```

### notifications Table
```sql
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL,                -- swap_request/swap_accepted/etc
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,

  -- Related entities
  related_swap_request_id INT,
  related_book_listing_id INT,
  related_order_id INT,

  action_url VARCHAR(500),                  -- Where to navigate on click
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_user (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_type (type)
);
```

## 🛠️ Implementation Status

### ✅ Completed
- [x] Database schema (swap_requests, notifications)
- [x] Swap request service (`swapRequest.service.ts`)
- [x] Notification service (`notification.service.ts`)
- [x] Zod validation schemas

### 📝 TODO (Next Steps)

#### Backend
1. **Create database migration**
   ```bash
   # Create migration file
   touch server/db/migrations/create-swap-system.ts
   ```

2. **Add API routes** (`server/routes/swaps.ts`)
   - POST /api/swaps - Create swap request
   - GET /api/swaps - Get user's swap requests
   - GET /api/swaps/:id - Get specific swap request
   - PUT /api/swaps/:id/accept - Accept swap request
   - PUT /api/swaps/:id/reject - Reject swap request
   - PUT /api/swaps/:id/confirm - Confirm receipt
   - DELETE /api/swaps/:id - Cancel swap request

3. **Add notification routes** (`server/routes/notifications.ts`)
   - GET /api/notifications - Get user notifications
   - GET /api/notifications/unread-count - Get unread count
   - PUT /api/notifications/:id/read - Mark as read
   - PUT /api/notifications/read-all - Mark all as read
   - DELETE /api/notifications/:id - Delete notification

4. **Register routes** in `server/routes.ts`

#### Frontend

1. **Update Book Details Page** (`client/src/pages/book-details.tsx`)
   - Add "Initiate Swap" button for swap listings
   - Show different UI for swap vs sell
   - Display "willingToSwapFor" information

2. **Create Swap Request Dialog** (`client/src/components/swaps/SwapRequestDialog.tsx`)
   - Form to fill swap details
   - Book offer fields
   - Photo upload
   - Message input

3. **Create Swaps Page** (`client/src/pages/swaps.tsx`)
   - Tabs: Incoming / Outgoing
   - List of swap requests
   - Accept/Reject buttons
   - Status badges

4. **Create Notifications**
   - Bell icon in navbar with unread count
   - Dropdown to show recent notifications
   - Notification list page
   - Mark as read functionality

5. **Add Swap Details Page** (`client/src/pages/swap-details.tsx`)
   - Full swap information
   - Chat/messaging
   - Meetup location/time
   - Confirm receipt button

## 🔌 API Endpoints Reference

### Swap Requests

```typescript
// Create swap request
POST /api/swaps
Body: {
  requestedListingId: number,
  offeredBookTitle: string,
  offeredBookAuthor?: string,
  offeredBookCondition: "New" | "Like New" | "Good" | "Fair",
  offeredBookDescription?: string,
  offeredBookPhotoUrl?: string,
  message?: string,
  deliveryMethod?: "meetup" | "delivery",
  meetupLocation?: string
}

// Get user's swap requests
GET /api/swaps?type=incoming|outgoing

// Get specific swap request
GET /api/swaps/:id

// Accept swap request
PUT /api/swaps/:id/accept
Body: { meetupLocation?: string, meetupTime?: string }

// Reject swap request
PUT /api/swaps/:id/reject

// Confirm receipt
PUT /api/swaps/:id/confirm

// Cancel swap request
DELETE /api/swaps/:id
```

### Notifications

```typescript
// Get notifications
GET /api/notifications?limit=50&offset=0

// Get unread count
GET /api/notifications/unread-count

// Mark as read
PUT /api/notifications/:id/read

// Mark all as read
PUT /api/notifications/read-all

// Delete notification
DELETE /api/notifications/:id
```

## 🎨 UI/UX Flow

### 1. Book Details Page (Swap Listing)

```tsx
// Show swap badge
<Badge className="bg-blue-500">SWAP</Badge>

// Show what owner wants
<div className="mt-4 p-4 bg-blue-50 rounded-lg">
  <h3 className="font-semibold">Looking to swap for:</h3>
  <p>{listing.willingToSwapFor}</p>
</div>

// Show appropriate CTA
{listingType === 'swap' ? (
  <Button onClick={openSwapDialog}>
    <ArrowLeftRight className="mr-2" />
    Initiate Swap
  </Button>
) : (
  <Button onClick={handleBuyNow}>
    <ShoppingCart className="mr-2" />
    Buy Now
  </Button>
)}
```

### 2. Navbar Notifications

```tsx
<DropdownMenu>
  <DropdownMenuTrigger>
    <Bell className="w-5 h-5" />
    {unreadCount > 0 && (
      <Badge className="absolute -top-1 -right-1 bg-red-500">
        {unreadCount}
      </Badge>
    )}
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    {notifications.map(notif => (
      <NotificationItem key={notif.id} notification={notif} />
    ))}
  </DropdownMenuContent>
</DropdownMenu>
```

### 3. Swap Request Card

```tsx
<Card>
  <CardHeader>
    <div className="flex items-center gap-3">
      <Avatar src={requester.profilePictureUrl} />
      <div>
        <h3>{requester.fullName}</h3>
        <p className="text-sm text-muted-foreground">
          {requester.schoolName}
        </p>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    <p className="font-semibold">Offering: {offeredBookTitle}</p>
    <p>Condition: {offeredBookCondition}</p>
    <p className="text-sm">{message}</p>
  </CardContent>
  <CardFooter>
    <Button onClick={acceptSwap}>Accept</Button>
    <Button variant="outline" onClick={rejectSwap}>Decline</Button>
  </CardFooter>
</Card>
```

## 🚀 Quick Start Guide

### Step 1: Run Database Migration

```bash
# Create migration script
npm run db:migrate
```

### Step 2: Add Routes

```typescript
// In server/routes.ts
import swapRoutes from "./routes/swaps";
import notificationRoutes from "./routes/notifications";

app.use("/api/swaps", authenticateToken, swapRoutes);
app.use("/api/notifications", authenticateToken, notificationRoutes);
```

### Step 3: Update Book Details Page

```typescript
// Check if listing is for swap
const isSwap = listing.listingType === 'swap';

// Show appropriate button
{isSwap ? (
  <Button onClick={() => setShowSwapDialog(true)}>
    Initiate Swap
  </Button>
) : (
  <Button onClick={handleBuyNow}>
    Buy Now
  </Button>
)}
```

### Step 4: Create Swap Request Dialog

See `client/src/components/swaps/SwapRequestDialog.tsx` (to be created)

### Step 5: Add Notifications to Navbar

See `client/src/components/layout/NotificationBell.tsx` (to be created)

## 📈 Future Enhancements

1. **Commitment Fee System**
   - Integrate with wallet/escrow
   - Automatic fee holds and releases
   - Penalty system for no-shows

2. **Messaging System**
   - Real-time chat between swap partners
   - Share photos/details
   - Coordinate meetup

3. **Reputation System**
   - Swap success rate
   - User ratings
   - Trust badges

4. **Smart Matching**
   - "You both want each other's books!"
   - AI-suggested swaps
   - School-based matching

5. **Swap History**
   - Track all completed swaps
   - Export swap records
   - Analytics dashboard

## 🤝 Support

For questions or issues with the swap system:
1. Check this documentation
2. Review the service code in `server/services/swapRequest.service.ts`
3. Check API routes in `server/routes/swaps.ts`
4. Test endpoints with Postman/Thunder Client

---

**Note**: The basic swap functionality is implemented in the backend. You need to:
1. Run database migrations to create tables
2. Create the frontend components
3. Wire up the API endpoints
4. Test the full flow

The system is designed to be flexible - you can start with basic swaps (no commitment fees) and add the escrow/commitment system later.
