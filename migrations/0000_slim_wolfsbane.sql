CREATE TABLE `book_condition_reports` (
	`id` varchar(36) NOT NULL,
	`cycle_id` varchar(36) NOT NULL,
	`participant_id` int NOT NULL,
	`reporter_id` varchar(36) NOT NULL,
	`report_type` varchar(20) NOT NULL,
	`book_id` int NOT NULL,
	`book_title` varchar(255) NOT NULL,
	`expected_condition` varchar(50) NOT NULL,
	`actual_condition` varchar(50) NOT NULL,
	`condition_match` boolean NOT NULL,
	`has_missing_pages` boolean DEFAULT false,
	`has_water_damage` boolean DEFAULT false,
	`has_writing` boolean DEFAULT false,
	`has_torn_pages` boolean DEFAULT false,
	`cover_condition` varchar(50),
	`photo_urls` text,
	`notes` text,
	`rating` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `book_condition_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `cycle_disputes` (
	`id` varchar(36) NOT NULL,
	`cycle_id` varchar(36) NOT NULL,
	`reporter_id` varchar(36) NOT NULL,
	`respondent_id` varchar(36),
	`dispute_type` varchar(50) NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'open',
	`priority` varchar(20) DEFAULT 'medium',
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`evidence_photo_urls` text,
	`condition_report_id` varchar(36),
	`resolution` text,
	`resolution_type` varchar(50),
	`resolved_by` varchar(36),
	`resolved_at` datetime,
	`admin_notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cycle_disputes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cycle_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cycle_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`user_school_id` varchar(36) NOT NULL,
	`position_in_cycle` int NOT NULL,
	`book_to_give_id` int NOT NULL,
	`book_to_receive_id` int NOT NULL,
	`school_county` varchar(100),
	`school_zone` varchar(100),
	`school_name` varchar(255),
	`school_coordinates_x` decimal(10,7),
	`school_coordinates_y` decimal(10,7),
	`assigned_drop_point_id` int,
	`assigned_collection_point_id` int,
	`logistics_cost` decimal(10,2) DEFAULT '0.00',
	`status` varchar(30) DEFAULT 'pending',
	`confirmed` boolean DEFAULT false,
	`confirmed_at` datetime,
	`book_dropped` boolean DEFAULT false,
	`dropped_at` datetime,
	`drop_verification_photo_url` text,
	`book_collected` boolean DEFAULT false,
	`collected_at` datetime,
	`collection_verification_photo_url` text,
	`collection_qr_code` varchar(100),
	`condition_verified` boolean DEFAULT false,
	`condition_dispute` boolean DEFAULT false,
	`dispute_reason` text,
	CONSTRAINT `cycle_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dispute_messages` (
	`id` varchar(36) NOT NULL,
	`dispute_id` varchar(36) NOT NULL,
	`sender_id` varchar(36) NOT NULL,
	`message` text NOT NULL,
	`is_admin_message` boolean DEFAULT false,
	`attachment_urls` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dispute_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drop_points` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cycle_id` varchar(36) NOT NULL,
	`school_id` varchar(36),
	`school_name` varchar(255),
	`county` varchar(100),
	`district` varchar(100),
	`zone` varchar(100),
	`address_line` text,
	`coordinates_x` decimal(10,7),
	`coordinates_y` decimal(10,7),
	`point_type` varchar(30),
	`serving_participant_ids` text,
	`operating_hours` varchar(100),
	`contact_person` varchar(255),
	`contact_phone` varchar(20),
	`active` boolean DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `drop_points_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `escrow_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`book_listing_id` int NOT NULL,
	`buyer_id` varchar(36) NOT NULL,
	`seller_id` varchar(36) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'KES',
	`platform_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`hold_period_days` int NOT NULL DEFAULT 7,
	`release_at` timestamp NOT NULL,
	`released_at` datetime,
	`refunded_at` datetime,
	`dispute_reason` text,
	`dispute_resolved_at` datetime,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `escrow_accounts_id` PRIMARY KEY(`id`)
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
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`swap_order_id` int NOT NULL,
	`sender_id` varchar(36) NOT NULL,
	`receiver_id` varchar(36) NOT NULL,
	`content` text NOT NULL,
	`message_type` varchar(20) NOT NULL DEFAULT 'text',
	`attachment_url` text,
	`attachment_type` varchar(50),
	`is_system_message` boolean DEFAULT false,
	`is_read` boolean DEFAULT false,
	`read_at` timestamp,
	`metadata` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`related_swap_request_id` int,
	`related_book_listing_id` int,
	`related_order_id` int,
	`action_url` varchar(500),
	`is_read` boolean NOT NULL DEFAULT false,
	`read_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_number` varchar(50) NOT NULL,
	`buyer_id` varchar(36) NOT NULL,
	`seller_id` varchar(36) NOT NULL,
	`book_listing_id` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`total_amount` decimal(10,2) NOT NULL,
	`platform_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
	`seller_amount` decimal(10,2) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`escrow_id` int,
	`delivery_method` varchar(50),
	`delivery_address` text,
	`tracking_number` varchar(100),
	`paid_at` timestamp,
	`confirmed_at` datetime,
	`delivered_at` datetime,
	`completed_at` datetime,
	`cancelled_at` datetime,
	`buyer_notes` text,
	`seller_notes` text,
	`cancellation_reason` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_order_number_unique` UNIQUE(`order_number`)
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
CREATE TABLE `paystack_recipients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`recipient_code` varchar(255) NOT NULL,
	`type` varchar(20) NOT NULL,
	`name` varchar(255) NOT NULL,
	`account_number` varchar(50) NOT NULL,
	`bank_code` varchar(50) NOT NULL,
	`bank_name` varchar(255),
	`currency` varchar(10) NOT NULL DEFAULT 'KES',
	`active` boolean NOT NULL DEFAULT true,
	`paystack_data` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paystack_recipients_id` PRIMARY KEY(`id`),
	CONSTRAINT `paystack_recipients_recipient_code_unique` UNIQUE(`recipient_code`)
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
	`code` int,
	`school_name` varchar(255) NOT NULL,
	`level` varchar(50),
	`status` varchar(50),
	`county` varchar(100),
	`district` varchar(100),
	`zone` varchar(100),
	`sub_county` varchar(100),
	`ward` varchar(100),
	`x_coord` decimal(10,7),
	`y_coord` decimal(10,7),
	`source` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
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
CREATE TABLE `swap_cycles` (
	`id` varchar(36) NOT NULL,
	`cycle_type` varchar(20) NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'pending_confirmation',
	`priority_score` decimal(5,2) NOT NULL,
	`primary_county` varchar(100),
	`is_same_county` boolean DEFAULT false,
	`is_same_zone` boolean DEFAULT false,
	`total_logistics_cost` decimal(10,2),
	`avg_cost_per_participant` decimal(10,2),
	`max_distance_km` decimal(10,2),
	`avg_distance_km` decimal(10,2),
	`confirmation_deadline` datetime,
	`completion_deadline` datetime,
	`confirmed_participants_count` int DEFAULT 0,
	`total_participants_count` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`confirmed_at` datetime,
	`completed_at` datetime,
	`cancelled_at` datetime,
	CONSTRAINT `swap_cycles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `swap_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_number` varchar(50) NOT NULL,
	`swap_request_id` int NOT NULL,
	`requester_id` varchar(36) NOT NULL,
	`owner_id` varchar(36) NOT NULL,
	`requested_listing_id` int NOT NULL,
	`offered_listing_id` int,
	`status` varchar(30) NOT NULL DEFAULT 'requirements_gathering',
	`requirements_submitted` boolean DEFAULT false,
	`requirements_approved` boolean DEFAULT false,
	`delivery_method` varchar(50) DEFAULT 'meetup',
	`meetup_location` text,
	`meetup_time` timestamp,
	`requester_shipped` boolean DEFAULT false,
	`owner_shipped` boolean DEFAULT false,
	`requester_received_book` boolean DEFAULT false,
	`owner_received_book` boolean DEFAULT false,
	`commitment_fee` decimal(10,2) DEFAULT '50.00',
	`escrow_id` int,
	`requester_paid_fee` boolean DEFAULT false,
	`owner_paid_fee` boolean DEFAULT false,
	`requester_payment_reference` varchar(255),
	`owner_payment_reference` varchar(255),
	`revisions_allowed` int DEFAULT 1,
	`revisions_used` int DEFAULT 0,
	`delivery_deadline` datetime,
	`is_late` boolean DEFAULT false,
	`auto_complete_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`started_at` datetime,
	`delivered_at` datetime,
	`completed_at` datetime,
	`cancelled_at` datetime,
	`cancellation_reason` text,
	`cancelled_by` varchar(36),
	`dispute_reason` text,
	CONSTRAINT `swap_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `swap_orders_order_number_unique` UNIQUE(`order_number`)
);
--> statement-breakpoint
CREATE TABLE `swap_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requester_id` varchar(36) NOT NULL,
	`owner_id` varchar(36) NOT NULL,
	`requested_listing_id` int NOT NULL,
	`offered_listing_id` int,
	`offered_book_title` varchar(500) NOT NULL,
	`offered_book_author` varchar(255),
	`offered_book_condition` varchar(20) NOT NULL,
	`offered_book_description` text,
	`offered_book_photo_url` text,
	`message` text,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`commitment_fee` decimal(10,2) DEFAULT '0.00',
	`requester_paid` boolean DEFAULT false,
	`owner_paid` boolean DEFAULT false,
	`escrow_id` int,
	`meetup_location` text,
	`meetup_time` timestamp,
	`delivery_method` varchar(50) DEFAULT 'meetup',
	`requester_confirmed` boolean DEFAULT false,
	`owner_confirmed` boolean DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`accepted_at` datetime,
	`completed_at` datetime,
	`cancelled_at` datetime,
	CONSTRAINT `swap_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`type` varchar(20) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'KES',
	`payment_method` varchar(50),
	`payment_reference` varchar(255),
	`book_listing_id` int,
	`escrow_id` int,
	`description` text,
	`metadata` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` datetime,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`email_notifications` boolean NOT NULL DEFAULT true,
	`push_notifications` boolean NOT NULL DEFAULT true,
	`sms_notifications` boolean NOT NULL DEFAULT false,
	`notify_on_new_messages` boolean NOT NULL DEFAULT true,
	`notify_on_book_sold` boolean NOT NULL DEFAULT true,
	`notify_on_price_drops` boolean NOT NULL DEFAULT true,
	`notify_on_new_listings` boolean NOT NULL DEFAULT false,
	`preferred_payment_method` varchar(50) DEFAULT 'mpesa',
	`mpesa_phone_number` varchar(20),
	`bank_name` varchar(100),
	`bank_account_number` varchar(50),
	`bank_account_name` varchar(255),
	`bank_branch` varchar(100),
	`paypal_email` varchar(255),
	`currency` varchar(10) DEFAULT 'KES',
	`language` varchar(10) DEFAULT 'en',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_preferences_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `user_reliability_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`reliability_score` decimal(5,2) DEFAULT '50.00',
	`total_swaps_completed` int DEFAULT 0,
	`total_swaps_cancelled` int DEFAULT 0,
	`total_swaps_disputed` int DEFAULT 0,
	`total_cycles_joined` int DEFAULT 0,
	`total_cycles_completed` int DEFAULT 0,
	`total_cycles_timeout` int DEFAULT 0,
	`avg_confirmation_time_hours` decimal(6,2),
	`avg_drop_off_time_hours` decimal(6,2),
	`on_time_delivery_rate` decimal(5,2),
	`book_condition_accuracy_rate` decimal(5,2),
	`badges` text,
	`penalty_points` int DEFAULT 0,
	`is_suspended` boolean DEFAULT false,
	`suspension_reason` text,
	`suspended_until` datetime,
	`last_updated` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_reliability_scores_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_reliability_scores_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`phone_number` varchar(20) NOT NULL,
	`full_name` text,
	`email` varchar(255),
	`profile_picture_url` text,
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
CREATE TABLE `wallet_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`type` varchar(10) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`balance_after` decimal(10,2) NOT NULL,
	`transaction_id` int NOT NULL,
	`description` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wallet_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `book_condition_reports` ADD CONSTRAINT `book_condition_reports_cycle_id_swap_cycles_id_fk` FOREIGN KEY (`cycle_id`) REFERENCES `swap_cycles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `book_condition_reports` ADD CONSTRAINT `book_condition_reports_participant_id_cycle_participants_id_fk` FOREIGN KEY (`participant_id`) REFERENCES `cycle_participants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `book_condition_reports` ADD CONSTRAINT `book_condition_reports_reporter_id_users_id_fk` FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `book_listings` ADD CONSTRAINT `book_listings_seller_id_users_id_fk` FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `book_photos` ADD CONSTRAINT `book_photos_listing_id_book_listings_id_fk` FOREIGN KEY (`listing_id`) REFERENCES `book_listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_disputes` ADD CONSTRAINT `cycle_disputes_cycle_id_swap_cycles_id_fk` FOREIGN KEY (`cycle_id`) REFERENCES `swap_cycles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_disputes` ADD CONSTRAINT `cycle_disputes_reporter_id_users_id_fk` FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_disputes` ADD CONSTRAINT `cycle_disputes_respondent_id_users_id_fk` FOREIGN KEY (`respondent_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_disputes` ADD CONSTRAINT `cycle_disputes_condition_report_id_book_condition_reports_id_fk` FOREIGN KEY (`condition_report_id`) REFERENCES `book_condition_reports`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_disputes` ADD CONSTRAINT `cycle_disputes_resolved_by_users_id_fk` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_participants` ADD CONSTRAINT `cycle_participants_cycle_id_swap_cycles_id_fk` FOREIGN KEY (`cycle_id`) REFERENCES `swap_cycles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_participants` ADD CONSTRAINT `cycle_participants_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_participants` ADD CONSTRAINT `cycle_participants_user_school_id_schools_id_fk` FOREIGN KEY (`user_school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_participants` ADD CONSTRAINT `cycle_participants_book_to_give_id_book_listings_id_fk` FOREIGN KEY (`book_to_give_id`) REFERENCES `book_listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_participants` ADD CONSTRAINT `cycle_participants_book_to_receive_id_book_listings_id_fk` FOREIGN KEY (`book_to_receive_id`) REFERENCES `book_listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dispute_messages` ADD CONSTRAINT `dispute_messages_dispute_id_cycle_disputes_id_fk` FOREIGN KEY (`dispute_id`) REFERENCES `cycle_disputes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dispute_messages` ADD CONSTRAINT `dispute_messages_sender_id_users_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `drop_points` ADD CONSTRAINT `drop_points_cycle_id_swap_cycles_id_fk` FOREIGN KEY (`cycle_id`) REFERENCES `swap_cycles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `drop_points` ADD CONSTRAINT `drop_points_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `escrow_accounts` ADD CONSTRAINT `escrow_accounts_book_listing_id_book_listings_id_fk` FOREIGN KEY (`book_listing_id`) REFERENCES `book_listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `escrow_accounts` ADD CONSTRAINT `escrow_accounts_buyer_id_users_id_fk` FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `escrow_accounts` ADD CONSTRAINT `escrow_accounts_seller_id_users_id_fk` FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_listing_id_book_listings_id_fk` FOREIGN KEY (`listing_id`) REFERENCES `book_listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_swap_order_id_swap_orders_id_fk` FOREIGN KEY (`swap_order_id`) REFERENCES `swap_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_id_users_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_receiver_id_users_id_fk` FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_related_swap_request_id_swap_requests_id_fk` FOREIGN KEY (`related_swap_request_id`) REFERENCES `swap_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_related_book_listing_id_book_listings_id_fk` FOREIGN KEY (`related_book_listing_id`) REFERENCES `book_listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_related_order_id_orders_id_fk` FOREIGN KEY (`related_order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_buyer_id_users_id_fk` FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_seller_id_users_id_fk` FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_book_listing_id_book_listings_id_fk` FOREIGN KEY (`book_listing_id`) REFERENCES `book_listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_escrow_id_escrow_accounts_id_fk` FOREIGN KEY (`escrow_id`) REFERENCES `escrow_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `paystack_recipients` ADD CONSTRAINT `paystack_recipients_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `swap_orders` ADD CONSTRAINT `swap_orders_swap_request_id_swap_requests_id_fk` FOREIGN KEY (`swap_request_id`) REFERENCES `swap_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `swap_orders` ADD CONSTRAINT `swap_orders_requester_id_users_id_fk` FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `swap_orders` ADD CONSTRAINT `swap_orders_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `swap_orders` ADD CONSTRAINT `swap_orders_requested_listing_id_book_listings_id_fk` FOREIGN KEY (`requested_listing_id`) REFERENCES `book_listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `swap_orders` ADD CONSTRAINT `swap_orders_offered_listing_id_book_listings_id_fk` FOREIGN KEY (`offered_listing_id`) REFERENCES `book_listings`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `swap_orders` ADD CONSTRAINT `swap_orders_escrow_id_escrow_accounts_id_fk` FOREIGN KEY (`escrow_id`) REFERENCES `escrow_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `swap_requests` ADD CONSTRAINT `swap_requests_requester_id_users_id_fk` FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `swap_requests` ADD CONSTRAINT `swap_requests_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `swap_requests` ADD CONSTRAINT `swap_requests_requested_listing_id_book_listings_id_fk` FOREIGN KEY (`requested_listing_id`) REFERENCES `book_listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `swap_requests` ADD CONSTRAINT `swap_requests_offered_listing_id_book_listings_id_fk` FOREIGN KEY (`offered_listing_id`) REFERENCES `book_listings`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `swap_requests` ADD CONSTRAINT `swap_requests_escrow_id_escrow_accounts_id_fk` FOREIGN KEY (`escrow_id`) REFERENCES `escrow_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_book_listing_id_book_listings_id_fk` FOREIGN KEY (`book_listing_id`) REFERENCES `book_listings`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD CONSTRAINT `user_preferences_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_reliability_scores` ADD CONSTRAINT `user_reliability_scores_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_transaction_id_transactions_id_fk` FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_condition_reports_cycle` ON `book_condition_reports` (`cycle_id`);--> statement-breakpoint
CREATE INDEX `idx_condition_reports_participant` ON `book_condition_reports` (`participant_id`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_seller` ON `book_listings` (`seller_id`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_status` ON `book_listings` (`listing_status`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_type` ON `book_listings` (`listing_type`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_created_at` ON `book_listings` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_status_created` ON `book_listings` (`listing_status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_subject` ON `book_listings` (`subject`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_grade` ON `book_listings` (`class_grade`);--> statement-breakpoint
CREATE INDEX `idx_book_photos_listing` ON `book_photos` (`listing_id`);--> statement-breakpoint
CREATE INDEX `idx_disputes_cycle` ON `cycle_disputes` (`cycle_id`);--> statement-breakpoint
CREATE INDEX `idx_disputes_status` ON `cycle_disputes` (`status`);--> statement-breakpoint
CREATE INDEX `idx_disputes_reporter` ON `cycle_disputes` (`reporter_id`);--> statement-breakpoint
CREATE INDEX `idx_cycle_participants_cycle` ON `cycle_participants` (`cycle_id`);--> statement-breakpoint
CREATE INDEX `idx_cycle_participants_user` ON `cycle_participants` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_cycle_participants_status` ON `cycle_participants` (`status`);--> statement-breakpoint
CREATE INDEX `idx_cycle_participants_school` ON `cycle_participants` (`user_school_id`);--> statement-breakpoint
CREATE INDEX `idx_dispute_messages_dispute` ON `dispute_messages` (`dispute_id`);--> statement-breakpoint
CREATE INDEX `idx_drop_points_cycle` ON `drop_points` (`cycle_id`);--> statement-breakpoint
CREATE INDEX `idx_drop_points_school` ON `drop_points` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_drop_points_county` ON `drop_points` (`county`);--> statement-breakpoint
CREATE INDEX `idx_favorites_user_id` ON `favorites` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_favorites_listing_id` ON `favorites` (`listing_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_swap_order` ON `messages` (`swap_order_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_sender` ON `messages` (`sender_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_receiver` ON `messages` (`receiver_id`);--> statement-breakpoint
CREATE INDEX `idx_notifications_user_id` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_notifications_is_read` ON `notifications` (`is_read`);--> statement-breakpoint
CREATE INDEX `idx_notifications_type` ON `notifications` (`type`);--> statement-breakpoint
CREATE INDEX `idx_otp_phone_code` ON `otp_codes` (`phone_number`,`code`);--> statement-breakpoint
CREATE INDEX `idx_otp_expires` ON `otp_codes` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_schools_name` ON `schools` (`school_name`);--> statement-breakpoint
CREATE INDEX `idx_schools_county` ON `schools` (`county`);--> statement-breakpoint
CREATE INDEX `idx_schools_level` ON `schools` (`level`);--> statement-breakpoint
CREATE INDEX `idx_schools_status` ON `schools` (`status`);--> statement-breakpoint
CREATE INDEX `idx_schools_code` ON `schools` (`code`);--> statement-breakpoint
CREATE INDEX `idx_swap_cycles_status` ON `swap_cycles` (`status`);--> statement-breakpoint
CREATE INDEX `idx_swap_cycles_county` ON `swap_cycles` (`primary_county`);--> statement-breakpoint
CREATE INDEX `idx_swap_cycles_priority` ON `swap_cycles` (`priority_score`);--> statement-breakpoint
CREATE INDEX `idx_swap_cycles_confirmation_deadline` ON `swap_cycles` (`confirmation_deadline`);--> statement-breakpoint
CREATE INDEX `idx_swap_orders_swap_request` ON `swap_orders` (`swap_request_id`);--> statement-breakpoint
CREATE INDEX `idx_swap_orders_requester` ON `swap_orders` (`requester_id`);--> statement-breakpoint
CREATE INDEX `idx_swap_orders_owner` ON `swap_orders` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_swap_orders_status` ON `swap_orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_swap_requests_requester` ON `swap_requests` (`requester_id`);--> statement-breakpoint
CREATE INDEX `idx_swap_requests_owner` ON `swap_requests` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_swap_requests_listing` ON `swap_requests` (`requested_listing_id`);--> statement-breakpoint
CREATE INDEX `idx_swap_requests_status` ON `swap_requests` (`status`);--> statement-breakpoint
CREATE INDEX `idx_reliability_score` ON `user_reliability_scores` (`reliability_score`);--> statement-breakpoint
CREATE INDEX `idx_reliability_user` ON `user_reliability_scores` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_users_phone` ON `users` (`phone_number`);--> statement-breakpoint
CREATE INDEX `idx_users_school` ON `users` (`school_id`);