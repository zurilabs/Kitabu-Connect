-- Create user_preferences table
CREATE TABLE IF NOT EXISTS `user_preferences` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `user_id` varchar(36) NOT NULL UNIQUE,

  -- Notification Preferences
  `email_notifications` boolean NOT NULL DEFAULT true,
  `push_notifications` boolean NOT NULL DEFAULT true,
  `sms_notifications` boolean NOT NULL DEFAULT false,

  -- Notification Types
  `notify_on_new_messages` boolean NOT NULL DEFAULT true,
  `notify_on_book_sold` boolean NOT NULL DEFAULT true,
  `notify_on_price_drops` boolean NOT NULL DEFAULT true,
  `notify_on_new_listings` boolean NOT NULL DEFAULT false,

  -- Payment Preferences
  `preferred_payment_method` varchar(50) DEFAULT 'mpesa',

  -- M-Pesa Details
  `mpesa_phone_number` varchar(20),

  -- Bank Account Details
  `bank_name` varchar(100),
  `bank_account_number` varchar(50),
  `bank_account_name` varchar(255),
  `bank_branch` varchar(100),

  -- PayPal
  `paypal_email` varchar(255),

  -- Other Preferences
  `currency` varchar(10) DEFAULT 'KES',
  `language` varchar(10) DEFAULT 'en',

  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT `user_preferences_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
