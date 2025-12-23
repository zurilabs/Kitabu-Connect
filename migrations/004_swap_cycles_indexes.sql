-- Swap Cycles Performance Indexes
-- Optimizes queries for cycle detection, retrieval, and state management

-- ================================
-- SWAP CYCLES INDEXES
-- ================================

-- Status-based queries (most common filter)
CREATE INDEX IF NOT EXISTS idx_swap_cycles_status
  ON swap_cycles(status);

-- Priority-based sorting
CREATE INDEX IF NOT EXISTS idx_swap_cycles_priority
  ON swap_cycles(priority_score DESC);

-- User participation queries (compound index for user + status)
CREATE INDEX IF NOT EXISTS idx_swap_cycles_user_status
  ON swap_cycles(status, created_at DESC);

-- Deadline-based queries for timeout jobs
CREATE INDEX IF NOT EXISTS idx_swap_cycles_confirmation_deadline
  ON swap_cycles(confirmation_deadline)
  WHERE status = 'pending_confirmation';

CREATE INDEX IF NOT EXISTS idx_swap_cycles_completion_deadline
  ON swap_cycles(completion_deadline)
  WHERE status = 'active';

-- Geographic clustering queries
CREATE INDEX IF NOT EXISTS idx_swap_cycles_county
  ON swap_cycles(primary_county, is_same_county);

-- ================================
-- CYCLE PARTICIPANTS INDEXES
-- ================================

-- Cycle lookup (most frequent)
CREATE INDEX IF NOT EXISTS idx_cycle_participants_cycle
  ON cycle_participants(cycle_id);

-- User participation lookup
CREATE INDEX IF NOT EXISTS idx_cycle_participants_user
  ON cycle_participants(user_id);

-- Compound index for user + confirmation status
CREATE INDEX IF NOT EXISTS idx_cycle_participants_user_confirmed
  ON cycle_participants(user_id, confirmed);

-- Book tracking queries
CREATE INDEX IF NOT EXISTS idx_cycle_participants_books
  ON cycle_participants(book_to_give_id, book_to_receive_id);

-- Status-based queries
CREATE INDEX IF NOT EXISTS idx_cycle_participants_status
  ON cycle_participants(status);

-- School-based queries for geographic matching
CREATE INDEX IF NOT EXISTS idx_cycle_participants_school
  ON cycle_participants(user_school_id, school_county);

-- ================================
-- RELIABILITY SCORES INDEXES
-- ================================

-- Score-based queries for leaderboards
CREATE INDEX IF NOT EXISTS idx_reliability_score
  ON user_reliability_scores(reliability_score DESC);

-- User lookup (already exists but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_reliability_user
  ON user_reliability_scores(user_id);

-- Suspended users
CREATE INDEX IF NOT EXISTS idx_reliability_suspended
  ON user_reliability_scores(is_suspended)
  WHERE is_suspended = TRUE;

-- ================================
-- QUALITY CONTROL INDEXES
-- ================================

-- Condition reports by cycle
CREATE INDEX IF NOT EXISTS idx_condition_reports_cycle
  ON book_condition_reports(cycle_id);

-- Condition reports by participant
CREATE INDEX IF NOT EXISTS idx_condition_reports_participant
  ON book_condition_reports(participant_id);

-- Mismatched conditions for quality monitoring
CREATE INDEX IF NOT EXISTS idx_condition_reports_mismatch
  ON book_condition_reports(condition_match)
  WHERE condition_match = FALSE;

-- Disputes by cycle
CREATE INDEX IF NOT EXISTS idx_disputes_cycle
  ON cycle_disputes(cycle_id);

-- Disputes by status (for admin dashboard)
CREATE INDEX IF NOT EXISTS idx_disputes_status
  ON cycle_disputes(status);

-- Disputes by reporter
CREATE INDEX IF NOT EXISTS idx_disputes_reporter
  ON cycle_disputes(reporter_id);

-- Open disputes (most accessed)
CREATE INDEX IF NOT EXISTS idx_disputes_open
  ON cycle_disputes(status, created_at DESC)
  WHERE status IN ('open', 'investigating');

-- Dispute messages by dispute
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute
  ON dispute_messages(dispute_id, created_at);

-- ================================
-- DROP POINTS INDEXES
-- ================================

-- Active drop points
CREATE INDEX IF NOT EXISTS idx_drop_points_active
  ON drop_points(is_active)
  WHERE is_active = TRUE;

-- Geographic lookup
CREATE INDEX IF NOT EXISTS idx_drop_points_location
  ON drop_points(county, zone);

-- School association
CREATE INDEX IF NOT EXISTS idx_drop_points_school
  ON drop_points(school_id)
  WHERE school_id IS NOT NULL;

-- ================================
-- BOOK LISTINGS INDEXES (for cycle detection)
-- ================================

-- Active swap listings (critical for graph construction)
CREATE INDEX IF NOT EXISTS idx_book_listings_swap_active
  ON book_listings(listing_type, listing_status)
  WHERE listing_type = 'swap' AND listing_status = 'active';

-- School-based matching
CREATE INDEX IF NOT EXISTS idx_book_listings_school
  ON book_listings(seller_id)
  WHERE listing_type = 'swap';

-- Subject + grade matching
CREATE INDEX IF NOT EXISTS idx_book_listings_subject_grade
  ON book_listings(subject, class_grade)
  WHERE listing_type = 'swap' AND listing_status = 'active';

-- ================================
-- STATISTICS
-- ================================

-- Show index usage stats (run manually to check performance)
-- SELECT
--   table_name,
--   index_name,
--   cardinality,
--   index_type
-- FROM information_schema.statistics
-- WHERE table_schema = DATABASE()
--   AND table_name LIKE '%cycle%'
-- ORDER BY table_name, index_name;
