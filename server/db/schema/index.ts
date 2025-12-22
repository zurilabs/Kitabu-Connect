import crypto from "crypto";

import {
  mysqlTable,
  varchar,
  timestamp,
  datetime,
  boolean,
  decimal,
  int,
  text,
  index,
} from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/* ================================
   USERS
================================ */
export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    phoneNumber: varchar("phone_number", { length: 20 })
      .notNull()
      .unique(),

    fullName: text("full_name"),
    email: varchar("email", { length: 255 }),
    profilePictureUrl: text("profile_picture_url"),

    role: varchar("role", { length: 20 })
      .notNull()
      .default("PARENT"),

    schoolId: varchar("school_id", { length: 36 }),
    schoolName: text("school_name"),

    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),

    childGrade: int("child_grade"),

    onboardingCompleted: boolean("onboarding_completed")
      .notNull()
      .default(false),

    walletBalance: decimal("wallet_balance", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0.00"),

    createdAt: timestamp("created_at")
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    phoneIdx: index("idx_users_phone").on(t.phoneNumber),
    schoolIdx: index("idx_users_school").on(t.schoolId),
  })
);

/* ================================
   OTP CODES
================================ */
export const otpCodes = mysqlTable(
  "otp_codes",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
    code: varchar("code", { length: 6 }).notNull(),

    expiresAt: timestamp("expires_at").notNull(),
    verified: boolean("verified").notNull().default(false),

    createdAt: timestamp("created_at")
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    phoneCodeIdx: index("idx_otp_phone_code").on(
      t.phoneNumber,
      t.code
    ),
    expiresIdx: index("idx_otp_expires").on(t.expiresAt),
  })
);

/* ================================
   SCHOOLS
================================ */
export const schools = mysqlTable(
  "schools",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    name: text("name").notNull(),
    location: text("location"),

    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),

    createdAt: timestamp("created_at")
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    nameIdx: index("idx_schools_name").on(t.name),
  })
);

/* ================================
   SUBJECTS
================================ */
export const subjects = mysqlTable("subjects", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  iconUrl: text("icon_url"),
  sortOrder: int("sort_order").default(0),
});

/* ================================
   CLASS GRADES
================================ */
export const classGrades = mysqlTable("class_grades", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  curriculum: varchar("curriculum", { length: 50 }),
  sortOrder: int("sort_order"),
  ageRange: varchar("age_range", { length: 50 }),
});

/* ================================
   PUBLISHERS
================================ */
export const publishers = mysqlTable("publishers", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  country: varchar("country", { length: 100 }),
  websiteUrl: text("website_url"),
});

/* ================================
   BOOK LISTINGS
================================ */
export const bookListings = mysqlTable("book_listings", {
  id: int("id").primaryKey().autoincrement(),

  sellerId: varchar("seller_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  title: varchar("title", { length: 500 }).notNull(),
  isbn: varchar("isbn", { length: 20 }),
  localCode: varchar("local_code", { length: 50 }),

  publisher: varchar("publisher", { length: 255 }),
  author: varchar("author", { length: 255 }),
  edition: varchar("edition", { length: 50 }),
  publicationYear: int("publication_year"),

  language: varchar("language", { length: 50 }).default("English"),
  bindingType: varchar("binding_type", { length: 50 }),
  bookType: varchar("book_type", { length: 50 }).default("Hardcopy"),

  numberOfPages: int("number_of_pages"),

  classGrade: varchar("class_grade", { length: 50 }),
  subject: varchar("subject", { length: 100 }),
  curriculum: varchar("curriculum", { length: 50 }),
  ageRange: varchar("age_range", { length: 50 }),
  region: varchar("region", { length: 50 }).default("Kenyan"),
  term: varchar("term", { length: 20 }),

  condition: varchar("condition", { length: 20 }).notNull(),
  conditionNotes: text("condition_notes"),

  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalRetailPrice: decimal("original_retail_price", { precision: 10, scale: 2 }),

  negotiable: boolean("negotiable").default(true),

  description: text("description"),
  quantityAvailable: int("quantity_available").default(1),

  listingStatus: varchar("listing_status", { length: 20 }).default("active"),
  listingType: varchar("listing_type", { length: 20 }).default("sell"),

  willingToSwapFor: text("willing_to_swap_for"),
  primaryPhotoUrl: text("primary_photo_url"),

  viewsCount: int("views_count").default(0),
  favoritesCount: int("favorites_count").default(0),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),

  soldAt: datetime("sold_at"), 
expiresAt: datetime("expires_at"),
});

/* ================================
   BOOK PHOTOS
================================ */
export const bookPhotos = mysqlTable("book_photos", {
  id: int("id").primaryKey().autoincrement(),

  listingId: int("listing_id")
    .notNull()
    .references(() => bookListings.id, { onDelete: "cascade" }),

  photoUrl: text("photo_url").notNull(),
  photoType: varchar("photo_type", { length: 50 }),
  displayOrder: int("display_order").default(0),

  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

/* ================================
   FAVORITES
================================ */
export const favorites = mysqlTable("favorites", {
  id: int("id").primaryKey().autoincrement(),

  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  listingId: int("listing_id")
    .notNull()
    .references(() => bookListings.id, { onDelete: "cascade" }),

  addedAt: timestamp("added_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_favorites_user_id").on(table.userId),
  listingIdIdx: index("idx_favorites_listing_id").on(table.listingId),
}));

/* ================================
   SWAP REQUESTS
================================ */
export const swapRequests = mysqlTable("swap_requests", {
  id: int("id").primaryKey().autoincrement(),

  // The person initiating the swap (wants the listed book)
  requesterId: varchar("requester_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // The person who listed the book for swap
  ownerId: varchar("owner_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // The book listing they want to swap for
  requestedListingId: int("requested_listing_id")
    .notNull()
    .references(() => bookListings.id, { onDelete: "cascade" }),

  // What book(s) the requester is offering
  // If the user selects an existing swap listing, this will be populated
  offeredListingId: int("offered_listing_id")
    .references(() => bookListings.id, { onDelete: "set null" }),

  // If the user manually enters book details (no existing listing)
  offeredBookTitle: varchar("offered_book_title", { length: 500 }).notNull(),
  offeredBookAuthor: varchar("offered_book_author", { length: 255 }),
  offeredBookCondition: varchar("offered_book_condition", { length: 20 }).notNull(),
  offeredBookDescription: text("offered_book_description"),
  offeredBookPhotoUrl: text("offered_book_photo_url"),

  // Message from requester
  message: text("message"),

  // Status: 'pending', 'accepted', 'rejected', 'completed', 'cancelled'
  status: varchar("status", { length: 20 }).notNull().default("pending"),

  // Commitment fee (optional - small amount both parties deposit)
  commitmentFee: decimal("commitment_fee", { precision: 10, scale: 2 }).default("0.00"),
  requesterPaid: boolean("requester_paid").default(false),
  ownerPaid: boolean("owner_paid").default(false),

  // Escrow tracking
  escrowId: int("escrow_id").references(() => escrowAccounts.id),

  // Delivery/meetup details
  meetupLocation: text("meetup_location"),
  meetupTime: timestamp("meetup_time"),
  deliveryMethod: varchar("delivery_method", { length: 50 }).default("meetup"),

  // Confirmation
  requesterConfirmed: boolean("requester_confirmed").default(false),
  ownerConfirmed: boolean("owner_confirmed").default(false),

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  acceptedAt: datetime("accepted_at"),
  completedAt: datetime("completed_at"),
  cancelledAt: datetime("cancelled_at"),
}, (table) => ({
  requesterIdx: index("idx_swap_requests_requester").on(table.requesterId),
  ownerIdx: index("idx_swap_requests_owner").on(table.ownerId),
  listingIdx: index("idx_swap_requests_listing").on(table.requestedListingId),
  statusIdx: index("idx_swap_requests_status").on(table.status),
}));

/* ================================
   NOTIFICATIONS
================================ */
export const notifications = mysqlTable("notifications", {
  id: int("id").primaryKey().autoincrement(),

  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Type: 'swap_request', 'swap_accepted', 'swap_rejected', 'swap_completed', 'book_sold', 'message', etc.
  type: varchar("type", { length: 50 }).notNull(),

  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),

  // Related entities
  relatedSwapRequestId: int("related_swap_request_id").references(() => swapRequests.id, { onDelete: "cascade" }),
  relatedBookListingId: int("related_book_listing_id").references(() => bookListings.id, { onDelete: "cascade" }),
  relatedOrderId: int("related_order_id").references(() => orders.id, { onDelete: "cascade" }),

  // Action URL (where to navigate when clicked)
  actionUrl: varchar("action_url", { length: 500 }),

  // Status
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_notifications_user_id").on(table.userId),
  isReadIdx: index("idx_notifications_is_read").on(table.isRead),
  typeIdx: index("idx_notifications_type").on(table.type),
}));

/* ================================
   USER PREFERENCES
================================ */
export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").primaryKey().autoincrement(),

  userId: varchar("user_id", { length: 36 })
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),

  // Notification Preferences
  emailNotifications: boolean("email_notifications").notNull().default(true),
  pushNotifications: boolean("push_notifications").notNull().default(true),
  smsNotifications: boolean("sms_notifications").notNull().default(false),

  // Notification Types
  notifyOnNewMessages: boolean("notify_on_new_messages").notNull().default(true),
  notifyOnBookSold: boolean("notify_on_book_sold").notNull().default(true),
  notifyOnPriceDrops: boolean("notify_on_price_drops").notNull().default(true),
  notifyOnNewListings: boolean("notify_on_new_listings").notNull().default(false),

  // Payment Preferences
  preferredPaymentMethod: varchar("preferred_payment_method", { length: 50 }).default("mpesa"),

  // M-Pesa Details
  mpesaPhoneNumber: varchar("mpesa_phone_number", { length: 20 }),

  // Bank Account Details
  bankName: varchar("bank_name", { length: 100 }),
  bankAccountNumber: varchar("bank_account_number", { length: 50 }),
  bankAccountName: varchar("bank_account_name", { length: 255 }),
  bankBranch: varchar("bank_branch", { length: 100 }),

  // PayPal
  paypalEmail: varchar("paypal_email", { length: 255 }),

  // Other Preferences
  currency: varchar("currency", { length: 10 }).default("KES"),
  language: varchar("language", { length: 10 }).default("en"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

/* ================================
   TRANSACTIONS
================================ */
export const transactions = mysqlTable("transactions", {
  id: int("id").primaryKey().autoincrement(),

  // User involved
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Transaction Type: 'topup', 'withdrawal', 'purchase', 'sale', 'refund', 'escrow_hold', 'escrow_release'
  type: varchar("type", { length: 20 }).notNull(),

  // Transaction Status: 'pending', 'processing', 'completed', 'failed', 'cancelled'
  status: varchar("status", { length: 20 }).notNull().default("pending"),

  // Amount
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("KES"),

  // Payment Details
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentReference: varchar("payment_reference", { length: 255 }),

  // Related entities
  bookListingId: int("book_listing_id").references(() => bookListings.id, { onDelete: "set null" }),
  escrowId: int("escrow_id"),

  // Metadata
  description: text("description"),
  metadata: text("metadata"), // JSON string for additional data

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: datetime("completed_at"),
});

/* ================================
   ESCROW ACCOUNTS
================================ */
export const escrowAccounts = mysqlTable("escrow_accounts", {
  id: int("id").primaryKey().autoincrement(),

  // Book listing being sold
  bookListingId: int("book_listing_id")
    .notNull()
    .references(() => bookListings.id, { onDelete: "cascade" }),

  // Buyer and Seller
  buyerId: varchar("buyer_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  sellerId: varchar("seller_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Amount held in escrow
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("KES"),

  // Platform fee (percentage or fixed amount)
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull().default("0.00"),

  // Status: 'pending', 'active', 'released', 'refunded', 'disputed'
  status: varchar("status", { length: 20 }).notNull().default("pending"),

  // Release schedule
  holdPeriodDays: int("hold_period_days").notNull().default(7),
  releaseAt: timestamp("release_at").notNull(), // Calculated: createdAt + holdPeriodDays

  // Actual release/refund
  releasedAt: datetime("released_at"),
  refundedAt: datetime("refunded_at"),

  // Dispute information
  disputeReason: text("dispute_reason"),
  disputeResolvedAt: datetime("dispute_resolved_at"),

  // Metadata
  notes: text("notes"),

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

/* ================================
   WALLET TRANSACTIONS (Detailed ledger)
================================ */
export const walletTransactions = mysqlTable("wallet_transactions", {
  id: int("id").primaryKey().autoincrement(),

  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Type: 'debit' or 'credit'
  type: varchar("type", { length: 10 }).notNull(),

  // Amount
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),

  // Balance after this transaction
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),

  // Reference to main transaction
  transactionId: int("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),

  // Description
  description: text("description").notNull(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ================================
   ORDERS
================================ */
export const orders = mysqlTable("orders", {
  id: int("id").primaryKey().autoincrement(),

  // Order reference
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),

  // Buyer and Seller
  buyerId: varchar("buyer_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  sellerId: varchar("seller_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Book listing
  bookListingId: int("book_listing_id")
    .notNull()
    .references(() => bookListings.id, { onDelete: "cascade" }),

  // Order details
  quantity: int("quantity").notNull().default(1),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sellerAmount: decimal("seller_amount", { precision: 10, scale: 2 }).notNull(),

  // Status: 'pending', 'paid', 'confirmed', 'in_transit', 'delivered', 'completed', 'cancelled', 'refunded'
  status: varchar("status", { length: 20 }).notNull().default("pending"),

  // Escrow
  escrowId: int("escrow_id").references(() => escrowAccounts.id),

  // Delivery information
  deliveryMethod: varchar("delivery_method", { length: 50 }),
  deliveryAddress: text("delivery_address"),
  trackingNumber: varchar("tracking_number", { length: 100 }),

  // Timestamps
  paidAt: timestamp("paid_at"),
  confirmedAt: datetime("confirmed_at"),
  deliveredAt: datetime("delivered_at"),
  completedAt: datetime("completed_at"),
  cancelledAt: datetime("cancelled_at"),

  // Notes
  buyerNotes: text("buyer_notes"),
  sellerNotes: text("seller_notes"),
  cancellationReason: text("cancellation_reason"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

/* ================================
   PAYSTACK TRANSFER RECIPIENTS
================================ */
export const paystackRecipients = mysqlTable("paystack_recipients", {
  id: int("id").primaryKey().autoincrement(),

  // User who owns this recipient
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Paystack recipient code
  recipientCode: varchar("recipient_code", { length: 255 }).notNull().unique(),

  // Payment method type
  type: varchar("type", { length: 20 }).notNull(), // 'nuban' (bank), 'mobile_money' (mpesa)

  // Account details
  name: varchar("name", { length: 255 }).notNull(),
  accountNumber: varchar("account_number", { length: 50 }).notNull(),
  bankCode: varchar("bank_code", { length: 50 }).notNull(),
  bankName: varchar("bank_name", { length: 255 }),
  currency: varchar("currency", { length: 10 }).notNull().default("KES"),

  // Status
  active: boolean("active").notNull().default(true),

  // Metadata from Paystack
  paystackData: text("paystack_data"), // JSON string

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

/* ================================
   VALIDATION SCHEMAS
================================ */
export const insertUserSchema = createInsertSchema(users).pick({
  phoneNumber: true,
  fullName: true,
  email: true,
});

export const sendOTPSchema = z.object({
  phoneNumber: z.string().min(10).max(20),
});

export const verifyOTPSchema = z.object({
  phoneNumber: z.string().min(10).max(20),
  code: z.string().length(6),
});

export const completeOnboardingSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  schoolId: z.string(),
  schoolName: z.string(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  childGrade: z.number().min(1).max(12),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email address").optional(),
  phoneNumber: z.string().min(10).max(20).optional(),
  schoolId: z.string().optional(),
  schoolName: z.string().optional(),
  profilePictureUrl: z.string().url().nullable().optional(),
});

export const updateNotificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  notifyOnNewMessages: z.boolean().optional(),
  notifyOnBookSold: z.boolean().optional(),
  notifyOnPriceDrops: z.boolean().optional(),
  notifyOnNewListings: z.boolean().optional(),
});

export const updatePaymentPreferencesSchema = z.object({
  preferredPaymentMethod: z.enum(["mpesa", "bank", "paypal"]).optional(),
  mpesaPhoneNumber: z.string().min(10).max(20).or(z.literal("")).nullable().optional(),
  bankName: z.string().or(z.literal("")).nullable().optional(),
  bankAccountNumber: z.string().or(z.literal("")).nullable().optional(),
  bankAccountName: z.string().or(z.literal("")).nullable().optional(),
  bankBranch: z.string().or(z.literal("")).nullable().optional(),
  paypalEmail: z.string().email().or(z.literal("")).nullable().optional(),
});
// Base schema for updates (before refinement)
const baseBookListingSchema = z.object({
  // Basic Information (Step 1)
  title: z.string().min(3, "Title must be at least 3 characters"),
  isbn: z.string().nullable().optional(),
  author: z.string().min(2, "Author name required"),
  publisher: z.string().nullable().optional(),
  edition: z.string().nullable().optional(),
  publicationYear: z.number().min(1900).max(new Date().getFullYear() + 1).nullable().optional(),

  // Classification (Step 2)
  subject: z.string().min(1, "Subject is required"),
  classGrade: z.string().min(1, "Grade/Class is required"),
  curriculum: z.string().nullable().optional(),
  term: z.string().nullable().optional(),
  language: z.string().default("English"),
  bindingType: z.string().nullable().optional(),
  region: z.string().default("Kenyan"),

  // Condition & Pricing (Step 3)
  condition: z.enum(["New", "Like New", "Good", "Fair"], {
    required_error: "Condition is required",
  }),
  conditionNotes: z.string().nullable().optional(),

  // Listing Type - "sell" or "swap"
  listingType: z.enum(["sell", "swap"]).default("sell"),

  // For sell listings
  price: z.number().min(0, "Price cannot be negative").optional(),
  originalRetailPrice: z.number().nullable().optional(),
  negotiable: z.boolean().default(true),

  // For swap listings - what books the user wants in exchange
  willingToSwapFor: z.string().nullable().optional(),

  quantityAvailable: z.number().min(1).default(1),

  // Description & Photos (Step 4)
  description: z.string().nullable().optional(),
  primaryPhotoUrl: z.string().nullable().optional(),
  additionalPhotos: z.array(z.string()).optional(),
});

// Apply refinement to createBookListingSchema
export const createBookListingSchema = baseBookListingSchema.refine((data) => {
  // If listing type is "sell", price is required and must be > 0
  if (data.listingType === "sell" && (!data.price || data.price <= 0)) {
    return false;
  }
  return true;
}, {
  message: "Price is required for sell listings",
  path: ["price"],
});

// Update schema can be partial
export const updateBookListingSchema = baseBookListingSchema.partial();

// Wallet & Transaction Schemas
export const walletTopUpSchema = z.object({
  amount: z.number().min(10, "Minimum top-up is KES 10").max(1000000, "Maximum top-up is KES 1,000,000"),
  paymentMethod: z.enum(["paystack", "mpesa", "card"]),
  email: z.string().email().optional(),
});

export const walletWithdrawalSchema = z.object({
  amount: z.number().min(100, "Minimum withdrawal is KES 100"),
  paymentMethod: z.enum(["mpesa", "bank", "paypal"]),
  accountDetails: z.object({
    mpesaPhone: z.string().optional(),
    bankAccount: z.string().optional(),
    bankName: z.string().optional(),
    paypalEmail: z.string().email().optional(),
  }),
});

export const createOrderSchema = z.object({
  bookListingId: z.number(),
  quantity: z.number().min(1).default(1),
  deliveryMethod: z.string().optional(),
  deliveryAddress: z.string().optional(),
  buyerNotes: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "paid", "confirmed", "in_transit", "delivered", "completed", "cancelled", "refunded"]),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
  cancellationReason: z.string().optional(),
});

export const createDisputeSchema = z.object({
  escrowId: z.number(),
  reason: z.string().min(10, "Please provide a detailed reason for the dispute"),
});

// Swap Request Schemas
export const createSwapRequestSchema = z.object({
  requestedListingId: z.number(),

  // Option 1: User selects an existing swap listing they own
  offeredListingId: z.number().optional(),

  // Option 2: User manually enters book details (if no existing listing)
  offeredBookTitle: z.string().min(3, "Book title is required").optional(),
  offeredBookAuthor: z.string().optional(),
  offeredBookCondition: z.enum(["New", "Like New", "Good", "Fair"]).optional(),
  offeredBookDescription: z.string().optional(),
  offeredBookPhotoUrl: z.string().optional(),

  message: z.string().optional(),
  deliveryMethod: z.enum(["meetup", "delivery"]).default("meetup"),
  meetupLocation: z.string().optional(),
}).refine((data) => {
  // Either offeredListingId OR manual book details must be provided
  if (data.offeredListingId) {
    return true; // Has existing listing
  }
  // If no existing listing, title and condition are required
  return data.offeredBookTitle && data.offeredBookCondition;
}, {
  message: "Either select an existing listing or provide book title and condition",
  path: ["offeredBookTitle"],
});

export const updateSwapRequestSchema = z.object({
  status: z.enum(["pending", "accepted", "rejected", "completed", "cancelled"]).optional(),
  meetupLocation: z.string().optional(),
  meetupTime: z.string().optional(),
  requesterConfirmed: z.boolean().optional(),
  ownerConfirmed: z.boolean().optional(),
});

/* ================================
   TYPES
================================ */
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type OTPCode = typeof otpCodes.$inferSelect;
export type School = typeof schools.$inferSelect;
export type BookListing = typeof bookListings.$inferSelect;
export type CreateBookListingInput = z.infer<typeof createBookListingSchema>;
export type UpdateBookListingInput = z.infer<typeof updateBookListingSchema>;
export type BookPhoto = typeof bookPhotos.$inferSelect;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;
export type UpdatePaymentPreferencesInput = z.infer<typeof updatePaymentPreferencesSchema>;

// Wallet & Transaction Types
export type Transaction = typeof transactions.$inferSelect;
export type EscrowAccount = typeof escrowAccounts.$inferSelect;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type PaystackRecipient = typeof paystackRecipients.$inferSelect;
export type WalletTopUpInput = z.infer<typeof walletTopUpSchema>;
export type WalletWithdrawalInput = z.infer<typeof walletWithdrawalSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

// Swap & Notification Types
export type SwapRequest = typeof swapRequests.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type CreateSwapRequestInput = z.infer<typeof createSwapRequestSchema>;
export type UpdateSwapRequestInput = z.infer<typeof updateSwapRequestSchema>;
