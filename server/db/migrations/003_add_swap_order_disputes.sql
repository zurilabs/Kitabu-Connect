-- Add swapOrderId column to cycle_disputes table
-- This allows disputes to be created for swap orders (not just swap cycles)

ALTER TABLE cycle_disputes
  ADD COLUMN swap_order_id INT NULL AFTER cycle_id,
  ADD INDEX idx_disputes_swap_order (swap_order_id),
  ADD CONSTRAINT fk_disputes_swap_order
    FOREIGN KEY (swap_order_id) REFERENCES swap_orders(id) ON DELETE CASCADE;

-- Make cycleId nullable since disputes can now be on swap orders
ALTER TABLE cycle_disputes
  MODIFY COLUMN cycle_id VARCHAR(36) NULL;
