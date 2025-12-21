-- Step 1: Create table without foreign key
CREATE TABLE IF NOT EXISTS `paystack_recipients` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `recipient_code` VARCHAR(255) NOT NULL UNIQUE,
  `type` VARCHAR(20) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `account_number` VARCHAR(50) NOT NULL,
  `bank_code` VARCHAR(50) NOT NULL,
  `bank_name` VARCHAR(255),
  `currency` VARCHAR(10) NOT NULL DEFAULT 'KES',
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  `paystack_data` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_paystack_recipients_user` (`user_id`),
  INDEX `idx_paystack_recipients_account` (`account_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Add foreign key constraint (only if users table exists)
-- Run this separately if the above works but this fails
ALTER TABLE `paystack_recipients`
ADD CONSTRAINT `fk_paystack_recipients_user`
  FOREIGN KEY (`user_id`)
  REFERENCES `users`(`id`)
  ON DELETE CASCADE;
