CREATE INDEX `idx_book_listings_seller` ON `book_listings` (`seller_id`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_status` ON `book_listings` (`listing_status`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_type` ON `book_listings` (`listing_type`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_created_at` ON `book_listings` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_status_created` ON `book_listings` (`listing_status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_subject` ON `book_listings` (`subject`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_grade` ON `book_listings` (`class_grade`);--> statement-breakpoint
CREATE INDEX `idx_book_photos_listing` ON `book_photos` (`listing_id`);