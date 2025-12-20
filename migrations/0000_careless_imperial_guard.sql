CREATE TABLE `book_listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seller_id` varchar(36) NOT NULL,
	`title` varchar(500) NOT NULL,
	`isbn` varchar(20),
	`local_code` varchar(50),
	`publisher` varchar(255),
	`author` varchar(255),
	`edition` varchar(50),
	`publication_year` int,
	`language` varchar(50) DEFAULT 'English',
	`binding_type` varchar(50),
	`book_type` varchar(50) DEFAULT 'Hardcopy',
	`number_of_pages` int,
	`class_grade` varchar(50),
	`subject` varchar(100),
	`curriculum` varchar(50),
	`age_range` varchar(50),
	`region` varchar(50) DEFAULT 'Kenyan',
	`term` varchar(20),
	`condition` varchar(20) NOT NULL,
	`condition_notes` text,
	`price` decimal(10,2) NOT NULL,
	`original_retail_price` decimal(10,2),
	`negotiable` boolean DEFAULT true,
	`description` text,
	`quantity_available` int DEFAULT 1,
	`listing_status` varchar(20) DEFAULT 'active',
	`listing_type` varchar(20) DEFAULT 'sell',
	`willing_to_swap_for` text,
	`primary_photo_url` text,
	`views_count` int DEFAULT 0,
	`favorites_count` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`sold_at` datetime,
	`expires_at` datetime,
	CONSTRAINT `book_listings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `book_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listing_id` int NOT NULL,
	`photo_url` text NOT NULL,
	`photo_type` varchar(50),
	`display_order` int DEFAULT 0,
	`uploaded_at` timestamp DEFAULT (now()),
	CONSTRAINT `book_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `class_grades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`curriculum` varchar(50),
	`sort_order` int,
	`age_range` varchar(50),
	CONSTRAINT `class_grades_id` PRIMARY KEY(`id`),
	CONSTRAINT `class_grades_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`listing_id` int NOT NULL,
	`added_at` timestamp DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `otp_codes` (
	`id` varchar(36) NOT NULL,
	`phone_number` varchar(20) NOT NULL,
	`code` varchar(6) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`verified` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `otp_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `publishers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`country` varchar(100),
	`website_url` text,
	CONSTRAINT `publishers_id` PRIMARY KEY(`id`),
	CONSTRAINT `publishers_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `schools` (
	`id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`location` text,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `schools_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`icon_url` text,
	`sort_order` int DEFAULT 0,
	CONSTRAINT `subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `subjects_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`phone_number` varchar(20) NOT NULL,
	`full_name` text,
	`email` varchar(255),
	`role` varchar(20) NOT NULL DEFAULT 'PARENT',
	`school_id` varchar(36),
	`school_name` text,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`child_grade` int,
	`onboarding_completed` boolean NOT NULL DEFAULT false,
	`wallet_balance` decimal(10,2) NOT NULL DEFAULT '0.00',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_phone_number_unique` UNIQUE(`phone_number`)
);
--> statement-breakpoint
ALTER TABLE `book_listings` ADD CONSTRAINT `book_listings_seller_id_users_id_fk` FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `book_photos` ADD CONSTRAINT `book_photos_listing_id_book_listings_id_fk` FOREIGN KEY (`listing_id`) REFERENCES `book_listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_listing_id_book_listings_id_fk` FOREIGN KEY (`listing_id`) REFERENCES `book_listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_otp_phone_code` ON `otp_codes` (`phone_number`,`code`);--> statement-breakpoint
CREATE INDEX `idx_otp_expires` ON `otp_codes` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_schools_name` ON `schools` (`name`);--> statement-breakpoint
CREATE INDEX `idx_users_phone` ON `users` (`phone_number`);--> statement-breakpoint
CREATE INDEX `idx_users_school` ON `users` (`school_id`);