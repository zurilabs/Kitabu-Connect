-- ================================
-- QUALITY CONTROL TABLES
-- ================================

-- Book Condition Reports
CREATE TABLE IF NOT EXISTS `book_condition_reports` (
  `id` VARCHAR(36) PRIMARY KEY,
  `cycle_id` VARCHAR(36) NOT NULL,
  `participant_id` VARCHAR(36) NOT NULL,
  `reporter_id` VARCHAR(36) NOT NULL,
  `report_type` VARCHAR(20) NOT NULL COMMENT 'drop_off or collection',

  -- Book details
  `book_id` INT NOT NULL,
  `book_title` VARCHAR(255) NOT NULL,

  -- Condition assessment
  `expected_condition` VARCHAR(50) NOT NULL,
  `actual_condition` VARCHAR(50) NOT NULL,
  `condition_match` BOOLEAN NOT NULL,

  -- Detailed assessment
  `has_missing_pages` BOOLEAN DEFAULT FALSE,
  `has_water_damage` BOOLEAN DEFAULT FALSE,
  `has_writing` BOOLEAN DEFAULT FALSE,
  `has_torn_pages` BOOLEAN DEFAULT FALSE,
  `cover_condition` VARCHAR(50),

  -- Photos (JSON array)
  `photo_urls` TEXT,

  -- Additional info
  `notes` TEXT,
  `rating` INT COMMENT '1-5 stars',

  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (`cycle_id`) REFERENCES `swap_cycles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`participant_id`) REFERENCES `cycle_participants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cycle Disputes
CREATE TABLE IF NOT EXISTS `cycle_disputes` (
  `id` VARCHAR(36) PRIMARY KEY,
  `cycle_id` VARCHAR(36) NOT NULL,
  `reporter_id` VARCHAR(36) NOT NULL,
  `respondent_id` VARCHAR(36),

  -- Dispute details
  `dispute_type` VARCHAR(50) NOT NULL COMMENT 'book_condition, missing_book, wrong_book, damage, other',
  `status` VARCHAR(30) NOT NULL DEFAULT 'open' COMMENT 'open, investigating, resolved, escalated, closed',
  `priority` VARCHAR(20) DEFAULT 'medium' COMMENT 'low, medium, high, urgent',

  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,

  -- Evidence
  `evidence_photo_urls` TEXT COMMENT 'JSON array',
  `condition_report_id` VARCHAR(36),

  -- Resolution
  `resolution` TEXT,
  `resolution_type` VARCHAR(50) COMMENT 'refund, replacement, penalty, no_action, escalated',
  `resolved_by` VARCHAR(36),
  `resolved_at` DATETIME,

  `admin_notes` TEXT,

  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`cycle_id`) REFERENCES `swap_cycles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`respondent_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`condition_report_id`) REFERENCES `book_condition_reports`(`id`),
  FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dispute Messages
CREATE TABLE IF NOT EXISTS `dispute_messages` (
  `id` VARCHAR(36) PRIMARY KEY,
  `dispute_id` VARCHAR(36) NOT NULL,
  `sender_id` VARCHAR(36) NOT NULL,

  `message` TEXT NOT NULL,
  `is_admin_message` BOOLEAN DEFAULT FALSE,
  `attachment_urls` TEXT COMMENT 'JSON array',

  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (`dispute_id`) REFERENCES `cycle_disputes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- PERFORMANCE INDEXES
-- ================================

-- Swap Cycles Indexes
CREATE INDEX IF NOT EXISTS `idx_swap_cycles_status` ON `swap_cycles`(`status`);
CREATE INDEX IF NOT EXISTS `idx_swap_cycles_priority` ON `swap_cycles`(`priority_score` DESC);
CREATE INDEX IF NOT EXISTS `idx_swap_cycles_confirmation_deadline` ON `swap_cycles`(`confirmation_deadline`) WHERE `status` = 'pending_confirmation';
CREATE INDEX IF NOT EXISTS `idx_swap_cycles_completion_deadline` ON `swap_cycles`(`completion_deadline`) WHERE `status` = 'active';
CREATE INDEX IF NOT EXISTS `idx_swap_cycles_county` ON `swap_cycles`(`primary_county`, `is_same_county`);
CREATE INDEX IF NOT EXISTS `idx_swap_cycles_created` ON `swap_cycles`(`created_at` DESC);

-- Cycle Participants Indexes
CREATE INDEX IF NOT EXISTS `idx_cycle_participants_cycle` ON `cycle_participants`(`cycle_id`);
CREATE INDEX IF NOT EXISTS `idx_cycle_participants_user` ON `cycle_participants`(`user_id`);
CREATE INDEX IF NOT EXISTS `idx_cycle_participants_user_confirmed` ON `cycle_participants`(`user_id`, `confirmed`);
CREATE INDEX IF NOT EXISTS `idx_cycle_participants_books` ON `cycle_participants`(`book_to_give_id`, `book_to_receive_id`);
CREATE INDEX IF NOT EXISTS `idx_cycle_participants_status` ON `cycle_participants`(`status`);
CREATE INDEX IF NOT EXISTS `idx_cycle_participants_school` ON `cycle_participants`(`user_school_id`, `school_county`);

-- Reliability Scores Indexes
CREATE INDEX IF NOT EXISTS `idx_reliability_score` ON `user_reliability_scores`(`reliability_score` DESC);
CREATE INDEX IF NOT EXISTS `idx_reliability_user` ON `user_reliability_scores`(`user_id`);
CREATE INDEX IF NOT EXISTS `idx_reliability_suspended` ON `user_reliability_scores`(`is_suspended`) WHERE `is_suspended` = TRUE;

-- Quality Control Indexes
CREATE INDEX IF NOT EXISTS `idx_condition_reports_cycle` ON `book_condition_reports`(`cycle_id`);
CREATE INDEX IF NOT EXISTS `idx_condition_reports_participant` ON `book_condition_reports`(`participant_id`);
CREATE INDEX IF NOT EXISTS `idx_condition_reports_mismatch` ON `book_condition_reports`(`condition_match`) WHERE `condition_match` = FALSE;

CREATE INDEX IF NOT EXISTS `idx_disputes_cycle` ON `cycle_disputes`(`cycle_id`);
CREATE INDEX IF NOT EXISTS `idx_disputes_status` ON `cycle_disputes`(`status`);
CREATE INDEX IF NOT EXISTS `idx_disputes_reporter` ON `cycle_disputes`(`reporter_id`);
CREATE INDEX IF NOT EXISTS `idx_disputes_open` ON `cycle_disputes`(`status`, `created_at` DESC) WHERE `status` IN ('open', 'investigating');

CREATE INDEX IF NOT EXISTS `idx_dispute_messages_dispute` ON `dispute_messages`(`dispute_id`, `created_at`);

-- Drop Points Indexes
CREATE INDEX IF NOT EXISTS `idx_drop_points_active` ON `drop_points`(`is_active`) WHERE `is_active` = TRUE;
CREATE INDEX IF NOT EXISTS `idx_drop_points_location` ON `drop_points`(`county`, `zone`);
CREATE INDEX IF NOT EXISTS `idx_drop_points_school` ON `drop_points`(`school_id`) WHERE `school_id` IS NOT NULL;

-- Book Listings Indexes (for cycle detection optimization)
CREATE INDEX IF NOT EXISTS `idx_book_listings_swap_active` ON `book_listings`(`listing_type`, `listing_status`) WHERE `listing_type` = 'swap' AND `listing_status` = 'active';
CREATE INDEX IF NOT EXISTS `idx_book_listings_subject_grade` ON `book_listings`(`subject`, `class_grade`) WHERE `listing_type` = 'swap' AND `listing_status` = 'active';

-- ================================
-- STATISTICS AND MONITORING
-- ================================

-- Enable query performance monitoring
-- Run manually: SHOW INDEX FROM swap_cycles;
-- Run manually: SHOW INDEX FROM cycle_participants;
-- Run manually: ANALYZE TABLE swap_cycles, cycle_participants, user_reliability_scores;
