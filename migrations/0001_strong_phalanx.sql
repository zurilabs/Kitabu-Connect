CREATE TABLE `wishlist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`child_id` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`publisher` varchar(255),
	`author` varchar(255),
	`isbn` varchar(20),
	`edition` varchar(50),
	`subject` varchar(100),
	`grade` varchar(50),
	`curriculum` varchar(50),
	`notes` text,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`matched_listing_id` int,
	`notified_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wishlist_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `wishlist_items` ADD CONSTRAINT `wishlist_items_child_id_children_id_fk` FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wishlist_items` ADD CONSTRAINT `wishlist_items_matched_listing_id_book_listings_id_fk` FOREIGN KEY (`matched_listing_id`) REFERENCES `book_listings`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_wishlist_items_child` ON `wishlist_items` (`child_id`);--> statement-breakpoint
CREATE INDEX `idx_wishlist_items_status` ON `wishlist_items` (`status`);--> statement-breakpoint
CREATE INDEX `idx_wishlist_items_grade_subject` ON `wishlist_items` (`grade`,`subject`);--> statement-breakpoint
CREATE INDEX `idx_wishlist_items_title` ON `wishlist_items` (`title`);