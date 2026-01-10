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
CREATE TABLE `children` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parent_id` varchar(36) NOT NULL,
	`name` varchar(255),
	`grade` varchar(50) NOT NULL,
	`display_order` int NOT NULL DEFAULT 0,
	`school_id` varchar(36),
	`school_name` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `children_id` PRIMARY KEY(`id`)
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
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user1_id` varchar(36) NOT NULL,
	`user2_id` varchar(36) NOT NULL,
	`book_listing_id` int,
	`last_message_content` text,
	`last_message_at` timestamp,
	`last_message_sender_id` varchar(36),
	`user1_unread_count` int DEFAULT 0,
	`user2_unread_count` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cycle_disputes` (
	`id` varchar(36) NOT NULL,
	`cycle_id` varchar(36),
	`swap_order_id` int,
	`reporter_id` varchar(36) NOT NULL,
	`respondent_id` varchar(36),
	`dispute_type` varchar(50) NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'open',
	`priority` varchar(20) DEFAULT 'medium',
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`evidence_photo_urls` text,
	`condition_report_id` varchar(36),
	`respondent_response_deadline` datetime,
	`mediator_id` varchar(36),
	`escalated_at` datetime,
	`auto_escalated` boolean DEFAULT false,
	`resolution_deadline` datetime,
	`dispute_value` decimal(10,2),
	`resolution` text,
	`resolution_type` varchar(50),
	`resolved_by` varchar(36),
	`resolved_at` datetime,
	`enforcement_status` varchar(30),
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
CREATE TABLE `dispute_timeline` (
	`id` varchar(36) NOT NULL,
	`dispute_id` varchar(36) NOT NULL,
	`event_type` varchar(50) NOT NULL,
	`actor_id` varchar(36),
	`description` text NOT NULL,
	`metadata` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dispute_timeline_id` PRIMARY KEY(`id`)
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
	`swap_order_id` int,
	`conversation_id` int,
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
	`email` varchar(255) NOT NULL,
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
CREATE TABLE `rating_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`order_id` int,
	`swap_order_id` int,
	`cycle_id` varchar(36),
	`reminder_type` varchar(20) NOT NULL,
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	`clicked` boolean DEFAULT false,
	`rated` boolean DEFAULT false,
	CONSTRAINT `rating_reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referral_activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referral_id` int NOT NULL,
	`event_type` varchar(50) NOT NULL,
	`event_description` text,
	`ip_address` varchar(45),
	`user_agent` text,
	`metadata` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referral_activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referral_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`total_referrals` int DEFAULT 0,
	`qualified_referrals` int DEFAULT 0,
	`pending_referrals` int DEFAULT 0,
	`invalid_referrals` int DEFAULT 0,
	`referrals_this_month` int DEFAULT 0,
	`last_referral_month_reset` timestamp NOT NULL DEFAULT (now()),
	`last_referral_at` timestamp,
	`has_reduced_escrow_hold` boolean DEFAULT false,
	`has_featured_seller` boolean DEFAULT false,
	`has_priority_listing` boolean DEFAULT false,
	`has_verified_community_badge` boolean DEFAULT false,
	`school_rank` int,
	`global_rank` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referral_stats_id` PRIMARY KEY(`id`),
	CONSTRAINT `referral_stats_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referral_code` varchar(50) NOT NULL,
	`referrer_id` varchar(36) NOT NULL,
	`referee_id` varchar(36),
	`code_created_at` timestamp NOT NULL DEFAULT (now()),
	`signup_completed_at` timestamp,
	`first_transaction_at` timestamp,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`referrer_rewards_badges` text,
	`referrer_rewards_features` text,
	`referee_rewards_badges` text,
	`referee_ip_address` varchar(45),
	`referee_device_fingerprint` varchar(128),
	`referee_user_agent` text,
	`is_fraudulent` boolean DEFAULT false,
	`fraud_reason` text,
	`source` varchar(50) DEFAULT 'link',
	`utm_source` varchar(100),
	`utm_medium` varchar(100),
	`utm_campaign` varchar(100),
	`referrer_school_id` varchar(36),
	`referee_school_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`),
	CONSTRAINT `referrals_referral_code_unique` UNIQUE(`referral_code`)
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
	`order_type` varchar(20) NOT NULL DEFAULT 'swap',
	`swap_request_id` int,
	`requester_id` varchar(36) NOT NULL,
	`owner_id` varchar(36) NOT NULL,
	`requested_listing_id` int NOT NULL,
	`offered_listing_id` int,
	`book_price` decimal(10,2),
	`service_fee` decimal(10,2),
	`convenience_fee` decimal(10,2),
	`paystack_transaction_fee` decimal(10,2),
	`subtotal` decimal(10,2),
	`total_amount` decimal(10,2),
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
	`exchange_fee` decimal(10,2) DEFAULT '50.00',
	`exchange_paystack_fee` decimal(10,2),
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
CREATE TABLE `user_ratings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int,
	`swap_order_id` int,
	`cycle_id` varchar(36),
	`reviewer_id` varchar(36) NOT NULL,
	`reviewee_id` varchar(36) NOT NULL,
	`rating_type` varchar(20) NOT NULL,
	`overall_rating` int NOT NULL,
	`communication_rating` int,
	`accuracy_rating` int,
	`timeliness_rating` int,
	`condition_rating` int,
	`professionalism_rating` int,
	`review_text` text,
	`is_public` boolean DEFAULT true,
	`is_anonymous` boolean DEFAULT false,
	`is_flagged` boolean DEFAULT false,
	`flag_reason` text,
	`is_approved` boolean DEFAULT true,
	`moderated_by` varchar(36),
	`moderated_at` datetime,
	`response_text` text,
	`responded_at` datetime,
	`tags` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_ratings_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_rating_per_transaction` UNIQUE(`reviewer_id`,`reviewee_id`,`order_id`,`swap_order_id`,`cycle_id`)
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
	`email` varchar(255) NOT NULL,
	`phone_number` varchar(20),
	`full_name` text,
	`profile_picture_url` text,
	`google_id` varchar(255),
	`auth_provider` varchar(20) NOT NULL DEFAULT 'email',
	`role` varchar(20) NOT NULL DEFAULT 'PARENT',
	`onboarding_completed` boolean NOT NULL DEFAULT false,
	`wallet_balance` decimal(10,2) NOT NULL DEFAULT '0.00',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_phone_number_unique` UNIQUE(`phone_number`),
	CONSTRAINT `users_google_id_unique` UNIQUE(`google_id`)
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
ALTER TABLE `book_condition_reports` ADD CONSTRAINT `book_condition_reports_cycle_id_swap_cycles_id_fk` FOREIGN KEY (`cycle_id`) REFERENCES `swap_cycles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `book_condition_reports` ADD CONSTRAINT `book_condition_reports_participant_id_cycle_participants_id_fk` FOREIGN KEY (`participant_id`) REFERENCES `cycle_participants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `book_condition_reports` ADD CONSTRAINT `book_condition_reports_reporter_id_users_id_fk` FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `book_listings` ADD CONSTRAINT `book_listings_seller_id_users_id_fk` FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `book_photos` ADD CONSTRAINT `book_photos_listing_id_book_listings_id_fk` FOREIGN KEY (`listing_id`) REFERENCES `book_listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `children` ADD CONSTRAINT `children_parent_id_users_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_user1_id_users_id_fk` FOREIGN KEY (`user1_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_user2_id_users_id_fk` FOREIGN KEY (`user2_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_book_listing_id_book_listings_id_fk` FOREIGN KEY (`book_listing_id`) REFERENCES `book_listings`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_disputes` ADD CONSTRAINT `cycle_disputes_cycle_id_swap_cycles_id_fk` FOREIGN KEY (`cycle_id`) REFERENCES `swap_cycles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_disputes` ADD CONSTRAINT `cycle_disputes_swap_order_id_swap_orders_id_fk` FOREIGN KEY (`swap_order_id`) REFERENCES `swap_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_disputes` ADD CONSTRAINT `cycle_disputes_reporter_id_users_id_fk` FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_disputes` ADD CONSTRAINT `cycle_disputes_respondent_id_users_id_fk` FOREIGN KEY (`respondent_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_disputes` ADD CONSTRAINT `cycle_disputes_condition_report_id_book_condition_reports_id_fk` FOREIGN KEY (`condition_report_id`) REFERENCES `book_condition_reports`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_disputes` ADD CONSTRAINT `cycle_disputes_mediator_id_users_id_fk` FOREIGN KEY (`mediator_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_disputes` ADD CONSTRAINT `cycle_disputes_resolved_by_users_id_fk` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_participants` ADD CONSTRAINT `cycle_participants_cycle_id_swap_cycles_id_fk` FOREIGN KEY (`cycle_id`) REFERENCES `swap_cycles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_participants` ADD CONSTRAINT `cycle_participants_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_participants` ADD CONSTRAINT `cycle_participants_user_school_id_schools_id_fk` FOREIGN KEY (`user_school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_participants` ADD CONSTRAINT `cycle_participants_book_to_give_id_book_listings_id_fk` FOREIGN KEY (`book_to_give_id`) REFERENCES `book_listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cycle_participants` ADD CONSTRAINT `cycle_participants_book_to_receive_id_book_listings_id_fk` FOREIGN KEY (`book_to_receive_id`) REFERENCES `book_listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dispute_messages` ADD CONSTRAINT `dispute_messages_dispute_id_cycle_disputes_id_fk` FOREIGN KEY (`dispute_id`) REFERENCES `cycle_disputes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dispute_messages` ADD CONSTRAINT `dispute_messages_sender_id_users_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dispute_timeline` ADD CONSTRAINT `dispute_timeline_dispute_id_cycle_disputes_id_fk` FOREIGN KEY (`dispute_id`) REFERENCES `cycle_disputes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dispute_timeline` ADD CONSTRAINT `dispute_timeline_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `drop_points` ADD CONSTRAINT `drop_points_cycle_id_swap_cycles_id_fk` FOREIGN KEY (`cycle_id`) REFERENCES `swap_cycles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `drop_points` ADD CONSTRAINT `drop_points_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `escrow_accounts` ADD CONSTRAINT `escrow_accounts_book_listing_id_book_listings_id_fk` FOREIGN KEY (`book_listing_id`) REFERENCES `book_listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `escrow_accounts` ADD CONSTRAINT `escrow_accounts_buyer_id_users_id_fk` FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `escrow_accounts` ADD CONSTRAINT `escrow_accounts_seller_id_users_id_fk` FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_listing_id_book_listings_id_fk` FOREIGN KEY (`listing_id`) REFERENCES `book_listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_swap_order_id_swap_orders_id_fk` FOREIGN KEY (`swap_order_id`) REFERENCES `swap_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE `rating_reminders` ADD CONSTRAINT `rating_reminders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rating_reminders` ADD CONSTRAINT `rating_reminders_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rating_reminders` ADD CONSTRAINT `rating_reminders_swap_order_id_swap_orders_id_fk` FOREIGN KEY (`swap_order_id`) REFERENCES `swap_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rating_reminders` ADD CONSTRAINT `rating_reminders_cycle_id_swap_cycles_id_fk` FOREIGN KEY (`cycle_id`) REFERENCES `swap_cycles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referral_activity_log` ADD CONSTRAINT `referral_activity_log_referral_id_referrals_id_fk` FOREIGN KEY (`referral_id`) REFERENCES `referrals`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referral_stats` ADD CONSTRAINT `referral_stats_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_referrer_id_users_id_fk` FOREIGN KEY (`referrer_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_referee_id_users_id_fk` FOREIGN KEY (`referee_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_referrer_school_id_schools_id_fk` FOREIGN KEY (`referrer_school_id`) REFERENCES `schools`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_referee_school_id_schools_id_fk` FOREIGN KEY (`referee_school_id`) REFERENCES `schools`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE `user_ratings` ADD CONSTRAINT `user_ratings_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_ratings` ADD CONSTRAINT `user_ratings_swap_order_id_swap_orders_id_fk` FOREIGN KEY (`swap_order_id`) REFERENCES `swap_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_ratings` ADD CONSTRAINT `user_ratings_cycle_id_swap_cycles_id_fk` FOREIGN KEY (`cycle_id`) REFERENCES `swap_cycles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_ratings` ADD CONSTRAINT `user_ratings_reviewer_id_users_id_fk` FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_ratings` ADD CONSTRAINT `user_ratings_reviewee_id_users_id_fk` FOREIGN KEY (`reviewee_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_ratings` ADD CONSTRAINT `user_ratings_moderated_by_users_id_fk` FOREIGN KEY (`moderated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_reliability_scores` ADD CONSTRAINT `user_reliability_scores_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_transaction_id_transactions_id_fk` FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wishlist_items` ADD CONSTRAINT `wishlist_items_child_id_children_id_fk` FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wishlist_items` ADD CONSTRAINT `wishlist_items_matched_listing_id_book_listings_id_fk` FOREIGN KEY (`matched_listing_id`) REFERENCES `book_listings`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_condition_reports_cycle` ON `book_condition_reports` (`cycle_id`);--> statement-breakpoint
CREATE INDEX `idx_condition_reports_participant` ON `book_condition_reports` (`participant_id`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_seller` ON `book_listings` (`seller_id`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_status` ON `book_listings` (`listing_status`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_type` ON `book_listings` (`listing_type`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_created_at` ON `book_listings` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_status_created` ON `book_listings` (`listing_status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_subject` ON `book_listings` (`subject`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_grade` ON `book_listings` (`class_grade`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_condition` ON `book_listings` (`condition`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_price` ON `book_listings` (`price`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_views` ON `book_listings` (`views_count`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_status_type` ON `book_listings` (`listing_status`,`listing_type`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_grade_subject` ON `book_listings` (`class_grade`,`subject`);--> statement-breakpoint
CREATE INDEX `idx_book_listings_status_price` ON `book_listings` (`listing_status`,`price`);--> statement-breakpoint
CREATE INDEX `idx_book_photos_listing` ON `book_photos` (`listing_id`);--> statement-breakpoint
CREATE INDEX `idx_children_parent` ON `children` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_children_order` ON `children` (`parent_id`,`display_order`);--> statement-breakpoint
CREATE INDEX `idx_children_school` ON `children` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_conversations_user1` ON `conversations` (`user1_id`);--> statement-breakpoint
CREATE INDEX `idx_conversations_user2` ON `conversations` (`user2_id`);--> statement-breakpoint
CREATE INDEX `idx_conversations_book_listing` ON `conversations` (`book_listing_id`);--> statement-breakpoint
CREATE INDEX `idx_conversations_participants` ON `conversations` (`user1_id`,`user2_id`);--> statement-breakpoint
CREATE INDEX `idx_disputes_cycle` ON `cycle_disputes` (`cycle_id`);--> statement-breakpoint
CREATE INDEX `idx_disputes_swap_order` ON `cycle_disputes` (`swap_order_id`);--> statement-breakpoint
CREATE INDEX `idx_disputes_status` ON `cycle_disputes` (`status`);--> statement-breakpoint
CREATE INDEX `idx_disputes_reporter` ON `cycle_disputes` (`reporter_id`);--> statement-breakpoint
CREATE INDEX `idx_disputes_respondent` ON `cycle_disputes` (`respondent_id`);--> statement-breakpoint
CREATE INDEX `idx_disputes_priority` ON `cycle_disputes` (`priority`);--> statement-breakpoint
CREATE INDEX `idx_cycle_participants_cycle` ON `cycle_participants` (`cycle_id`);--> statement-breakpoint
CREATE INDEX `idx_cycle_participants_user` ON `cycle_participants` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_cycle_participants_status` ON `cycle_participants` (`status`);--> statement-breakpoint
CREATE INDEX `idx_cycle_participants_school` ON `cycle_participants` (`user_school_id`);--> statement-breakpoint
CREATE INDEX `idx_dispute_messages_dispute` ON `dispute_messages` (`dispute_id`);--> statement-breakpoint
CREATE INDEX `idx_timeline_dispute` ON `dispute_timeline` (`dispute_id`);--> statement-breakpoint
CREATE INDEX `idx_timeline_event_type` ON `dispute_timeline` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_drop_points_cycle` ON `drop_points` (`cycle_id`);--> statement-breakpoint
CREATE INDEX `idx_drop_points_school` ON `drop_points` (`school_id`);--> statement-breakpoint
CREATE INDEX `idx_drop_points_county` ON `drop_points` (`county`);--> statement-breakpoint
CREATE INDEX `idx_favorites_user_id` ON `favorites` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_favorites_listing_id` ON `favorites` (`listing_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_swap_order` ON `messages` (`swap_order_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_conversation` ON `messages` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_sender` ON `messages` (`sender_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_receiver` ON `messages` (`receiver_id`);--> statement-breakpoint
CREATE INDEX `idx_notifications_user_id` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_notifications_is_read` ON `notifications` (`is_read`);--> statement-breakpoint
CREATE INDEX `idx_notifications_type` ON `notifications` (`type`);--> statement-breakpoint
CREATE INDEX `idx_otp_email_code` ON `otp_codes` (`email`,`code`);--> statement-breakpoint
CREATE INDEX `idx_otp_expires` ON `otp_codes` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_reminders_user` ON `rating_reminders` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_activity_log_referral` ON `referral_activity_log` (`referral_id`);--> statement-breakpoint
CREATE INDEX `idx_activity_log_event_type` ON `referral_activity_log` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_referral_stats_user` ON `referral_stats` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_referral_stats_school_rank` ON `referral_stats` (`school_rank`);--> statement-breakpoint
CREATE INDEX `idx_referral_stats_global_rank` ON `referral_stats` (`global_rank`);--> statement-breakpoint
CREATE INDEX `idx_referrals_referrer` ON `referrals` (`referrer_id`);--> statement-breakpoint
CREATE INDEX `idx_referrals_referee` ON `referrals` (`referee_id`);--> statement-breakpoint
CREATE INDEX `idx_referrals_status` ON `referrals` (`status`);--> statement-breakpoint
CREATE INDEX `idx_referrals_code` ON `referrals` (`referral_code`);--> statement-breakpoint
CREATE INDEX `idx_referrals_school` ON `referrals` (`referrer_school_id`,`referee_school_id`);--> statement-breakpoint
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
CREATE INDEX `idx_ratings_reviewer` ON `user_ratings` (`reviewer_id`);--> statement-breakpoint
CREATE INDEX `idx_ratings_reviewee` ON `user_ratings` (`reviewee_id`);--> statement-breakpoint
CREATE INDEX `idx_ratings_order` ON `user_ratings` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_ratings_swap_order` ON `user_ratings` (`swap_order_id`);--> statement-breakpoint
CREATE INDEX `idx_ratings_cycle` ON `user_ratings` (`cycle_id`);--> statement-breakpoint
CREATE INDEX `idx_ratings_type` ON `user_ratings` (`rating_type`);--> statement-breakpoint
CREATE INDEX `idx_reliability_score` ON `user_reliability_scores` (`reliability_score`);--> statement-breakpoint
CREATE INDEX `idx_reliability_user` ON `user_reliability_scores` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_phone` ON `users` (`phone_number`);--> statement-breakpoint
CREATE INDEX `idx_users_google` ON `users` (`google_id`);--> statement-breakpoint
CREATE INDEX `idx_wishlist_items_child` ON `wishlist_items` (`child_id`);--> statement-breakpoint
CREATE INDEX `idx_wishlist_items_status` ON `wishlist_items` (`status`);--> statement-breakpoint
CREATE INDEX `idx_wishlist_items_grade_subject` ON `wishlist_items` (`grade`,`subject`);--> statement-breakpoint
CREATE INDEX `idx_wishlist_items_title` ON `wishlist_items` (`title`);