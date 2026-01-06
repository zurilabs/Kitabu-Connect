-- Migration: Add unique constraint to favorites table to prevent duplicates
-- This ensures a user can only favorite a book once

-- First, remove any existing duplicates
DELETE f1 FROM favorites f1
INNER JOIN favorites f2
WHERE f1.id > f2.id
AND f1.user_id = f2.user_id
AND f1.listing_id = f2.listing_id;

-- Add unique constraint on (user_id, listing_id)
ALTER TABLE favorites
ADD CONSTRAINT uk_user_listing UNIQUE (user_id, listing_id);

-- Add comment to the table
ALTER TABLE favorites COMMENT = 'User favorites with unique constraint on user_id and listing_id';
