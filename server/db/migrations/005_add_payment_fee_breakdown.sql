-- Migration: Add payment fee breakdown fields
-- Date: 2026-01-10
-- Description: Adds separate fields for Service Fee, Exchange Fee, and Paystack Transaction Fees

-- Add new fields to swap_orders table for purchase orders
ALTER TABLE swap_orders
ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10, 2) COMMENT 'Platform service fee (5% of book price for purchases)',
ADD COLUMN IF NOT EXISTS paystack_transaction_fee DECIMAL(10, 2) COMMENT 'Paystack transaction fee (1.5% + KES 100, capped at KES 2,500)',
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2) COMMENT 'Book price + service fee (before Paystack fees)';

-- Add new fields for swap/exchange orders
ALTER TABLE swap_orders
ADD COLUMN IF NOT EXISTS exchange_fee DECIMAL(10, 2) DEFAULT 50.00 COMMENT 'Exchange fee per party for swaps (KES 50)',
ADD COLUMN IF NOT EXISTS exchange_paystack_fee DECIMAL(10, 2) COMMENT 'Paystack fee for exchange payment (per party)';

-- Update existing records to populate new fields from old fields
-- For purchase orders: service_fee = convenience_fee (if not null)
UPDATE swap_orders
SET service_fee = convenience_fee,
    subtotal = COALESCE(book_price, 0) + COALESCE(convenience_fee, 0)
WHERE order_type = 'purchase'
  AND service_fee IS NULL
  AND convenience_fee IS NOT NULL;

-- For swap orders: set default exchange_fee if not set
UPDATE swap_orders
SET exchange_fee = 50.00
WHERE order_type = 'swap'
  AND exchange_fee IS NULL;

-- Add comment to deprecated field
ALTER TABLE swap_orders
MODIFY COLUMN convenience_fee DECIMAL(10, 2) COMMENT 'DEPRECATED: Use service_fee instead. Kept for backward compatibility.';

ALTER TABLE swap_orders
MODIFY COLUMN commitment_fee DECIMAL(10, 2) DEFAULT 50.00 COMMENT 'DEPRECATED: Use exchange_fee instead. Total amount per party including Paystack (for backward compatibility).';

-- Add index on new fee fields for reporting queries
CREATE INDEX IF NOT EXISTS idx_swap_orders_service_fee ON swap_orders(service_fee);
CREATE INDEX IF NOT EXISTS idx_swap_orders_exchange_fee ON swap_orders(exchange_fee);
