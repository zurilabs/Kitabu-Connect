-- Wallet and Escrow System Migration
-- Creates: transactions, escrow_accounts, wallet_transactions, orders tables

-- ================================
-- TRANSACTIONS TABLE
-- ================================
CREATE TABLE `transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `type` VARCHAR(20) NOT NULL COMMENT 'topup, withdrawal, purchase, sale, refund, escrow_hold, escrow_release',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending, processing, completed, failed, cancelled',
  `amount` DECIMAL(10, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'KES',
  `payment_method` VARCHAR(50),
  `payment_reference` VARCHAR(255),
  `book_listing_id` INT,
  `escrow_id` INT,
  `description` TEXT,
  `metadata` TEXT COMMENT 'JSON string for additional data',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`book_listing_id`) REFERENCES `book_listings`(`id`) ON DELETE SET NULL,
  INDEX `idx_transactions_user` (`user_id`),
  INDEX `idx_transactions_type` (`type`),
  INDEX `idx_transactions_status` (`status`),
  INDEX `idx_transactions_reference` (`payment_reference`)
);

-- ================================
-- ESCROW ACCOUNTS TABLE
-- ================================
CREATE TABLE `escrow_accounts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `book_listing_id` INT NOT NULL,
  `buyer_id` VARCHAR(36) NOT NULL,
  `seller_id` VARCHAR(36) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'KES',
  `platform_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending, active, released, refunded, disputed',
  `hold_period_days` INT NOT NULL DEFAULT 7,
  `release_at` TIMESTAMP NOT NULL,
  `released_at` TIMESTAMP NULL,
  `refunded_at` TIMESTAMP NULL,
  `dispute_reason` TEXT,
  `dispute_resolved_at` TIMESTAMP NULL,
  `notes` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`book_listing_id`) REFERENCES `book_listings`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_escrow_buyer` (`buyer_id`),
  INDEX `idx_escrow_seller` (`seller_id`),
  INDEX `idx_escrow_status` (`status`),
  INDEX `idx_escrow_release_at` (`release_at`)
);

-- ================================
-- WALLET TRANSACTIONS TABLE (Detailed ledger)
-- ================================
CREATE TABLE `wallet_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `type` VARCHAR(10) NOT NULL COMMENT 'debit or credit',
  `amount` DECIMAL(10, 2) NOT NULL,
  `balance_after` DECIMAL(10, 2) NOT NULL,
  `transaction_id` INT NOT NULL,
  `description` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE CASCADE,
  INDEX `idx_wallet_transactions_user` (`user_id`),
  INDEX `idx_wallet_transactions_created` (`created_at`)
);

-- ================================
-- ORDERS TABLE
-- ================================
CREATE TABLE `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_number` VARCHAR(50) NOT NULL UNIQUE,
  `buyer_id` VARCHAR(36) NOT NULL,
  `seller_id` VARCHAR(36) NOT NULL,
  `book_listing_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `total_amount` DECIMAL(10, 2) NOT NULL,
  `platform_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `seller_amount` DECIMAL(10, 2) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending, paid, confirmed, in_transit, delivered, completed, cancelled, refunded',
  `escrow_id` INT,
  `delivery_method` VARCHAR(50),
  `delivery_address` TEXT,
  `tracking_number` VARCHAR(100),
  `paid_at` TIMESTAMP NULL,
  `confirmed_at` TIMESTAMP NULL,
  `delivered_at` TIMESTAMP NULL,
  `completed_at` TIMESTAMP NULL,
  `cancelled_at` TIMESTAMP NULL,
  `buyer_notes` TEXT,
  `seller_notes` TEXT,
  `cancellation_reason` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`book_listing_id`) REFERENCES `book_listings`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`escrow_id`) REFERENCES `escrow_accounts`(`id`),
  INDEX `idx_orders_buyer` (`buyer_id`),
  INDEX `idx_orders_seller` (`seller_id`),
  INDEX `idx_orders_status` (`status`),
  INDEX `idx_orders_number` (`order_number`)
);
