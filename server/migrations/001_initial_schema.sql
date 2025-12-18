-- Create users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) PRIMARY KEY,
  `phone_number` VARCHAR(20) NOT NULL UNIQUE,
  `full_name` TEXT,
  `email` VARCHAR(255),
  `role` VARCHAR(20) NOT NULL DEFAULT 'PARENT',
  `school_id` VARCHAR(36),
  `school_name` TEXT,
  `latitude` DECIMAL(10, 7),
  `longitude` DECIMAL(10, 7),
  `child_grade` INT,
  `onboarding_completed` BOOLEAN NOT NULL DEFAULT FALSE,
  `wallet_balance` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_phone_number` (`phone_number`),
  INDEX `idx_school_id` (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create otp_codes table
CREATE TABLE IF NOT EXISTS `otp_codes` (
  `id` VARCHAR(36) PRIMARY KEY,
  `phone_number` VARCHAR(20) NOT NULL,
  `code` VARCHAR(6) NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `verified` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_phone_number_code` (`phone_number`, `code`),
  INDEX `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create schools table
CREATE TABLE IF NOT EXISTS `schools` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` TEXT NOT NULL,
  `location` TEXT,
  `latitude` DECIMAL(10, 7),
  `longitude` DECIMAL(10, 7),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_name` (`name`(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial schools (Grade 1-12 schools in Thika and Murang'a regions)
INSERT INTO `schools` (`id`, `name`, `location`, `latitude`, `longitude`) VALUES
  (UUID(), 'Thika High School for the Blind', 'Thika, Kiambu County', -1.0369, 37.0898),
  (UUID(), 'St. Mary\'s School Thika', 'Thika, Kiambu County', -1.0275, 37.0985),
  (UUID(), 'Thika Primary School', 'Thika Town, Kiambu County', -1.0332, 37.0690),
  (UUID(), 'Kiandutu Primary School', 'Kiandutu, Thika', -1.0450, 37.0820),
  (UUID(), 'Gatuanyaga Secondary School', 'Gatuanyaga, Thika', -1.0158, 37.1025),
  (UUID(), 'Makongeni Primary School', 'Makongeni, Thika', -1.0410, 37.0750),
  (UUID(), 'Murang\'a High School', 'Murang\'a Town, Murang\'a County', -0.7211, 37.1526),
  (UUID(), 'Kagumo High School', 'Kagumo, Murang\'a County', -0.6945, 37.1320),
  (UUID(), 'Bishop Gatimu Ngandu Girls High School', 'Karatina, Murang\'a County', -0.4833, 37.1333),
  (UUID(), 'Murang\'a Township Primary School', 'Murang\'a Town, Murang\'a County', -0.7180, 37.1490),
  (UUID(), 'St. Joseph\'s Primary School Thika', 'Thika, Kiambu County', -1.0295, 37.0845),
  (UUID(), 'Gatanga Mixed Secondary School', 'Gatanga, Murang\'a County', -0.9167, 37.0500),
  (UUID(), 'Kihumbuini Secondary School', 'Kihumbuini, Murang\'a County', -0.7850, 37.1150),
  (UUID(), 'Kandara Girls High School', 'Kandara, Murang\'a County', -0.8333, 37.0000),
  (UUID(), 'Blue Valley Primary School', 'Blue Valley, Thika', -1.0520, 37.0980),
  (UUID(), 'Mount Kenya Academy', 'Thika, Kiambu County', -1.0245, 37.0920),
  (UUID(), 'Kahuhia Girls High School', 'Kahuhia, Murang\'a County', -0.6500, 37.2167),
  (UUID(), 'Ichagaki Secondary School', 'Ichagaki, Murang\'a County', -0.7667, 37.1833),
  (UUID(), 'Muthithi Primary School', 'Muthithi, Murang\'a County', -0.7420, 37.1620),
  (UUID(), 'Township Primary School Thika', 'Thika Town, Kiambu County', -1.0348, 37.0715);


  -- Book Listings Table (Main table for your marketplace)
CREATE TABLE book_listings (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic Book Information (from textbook centre)
    title VARCHAR(500) NOT NULL,
    isbn VARCHAR(20),
    local_code VARCHAR(50), -- Like BK00000004820
    
    -- Publisher Information
    publisher VARCHAR(255),
    author VARCHAR(255),
    edition VARCHAR(50),
    publication_year INTEGER,
    
    -- Physical Details
    language VARCHAR(50) DEFAULT 'English',
    binding_type VARCHAR(50), -- 'Paperback', 'Hardcopy', 'Hardcover'
    book_type VARCHAR(50) DEFAULT 'Hardcopy',
    number_of_pages INTEGER,
    
    -- Educational Context
    class_grade VARCHAR(50), -- 'Grade 1', 'Grade 2', 'Form 4', etc.
    subject VARCHAR(100), -- 'Mathematics', 'English', 'Science', etc.
    curriculum VARCHAR(50), -- 'CBC', '8-4-4', 'Cambridge', etc.
    age_range VARCHAR(50), -- 'Kids 0-12', 'Teens 13-17', etc.
    region VARCHAR(50) DEFAULT 'Kenyan',
    term VARCHAR(20), -- 'Term 1', 'Term 2', 'Term 3', 'All Terms'
    
    -- Condition & Pricing
    condition VARCHAR(20) NOT NULL, -- 'New', 'Like New', 'Good', 'Fair', 'Poor'
    condition_notes TEXT, -- Detailed condition description
    price DECIMAL(10, 2) NOT NULL,
    original_retail_price DECIMAL(10, 2), -- Reference price from stores
    negotiable BOOLEAN DEFAULT TRUE,
    
    -- Listing Details
    description TEXT,
    quantity_available INTEGER DEFAULT 1,
    listing_status VARCHAR(20) DEFAULT 'active', -- 'active', 'sold', 'reserved', 'expired'
    listing_type VARCHAR(20) DEFAULT 'sell', -- 'sell', 'swap', 'sell_or_swap'
    
    -- Swap preferences (if listing_type includes swap)
    willing_to_swap_for TEXT, -- Description of books they want
    
    -- Photos
    primary_photo_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sold_at TIMESTAMP,
    expires_at TIMESTAMP, -- Auto-expire after X days
    
    -- Analytics
    views_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    
    CONSTRAINT price_check CHECK (price >= 0),
    CONSTRAINT quantity_check CHECK (quantity_available >= 0)
);


-- Book Photos Table (Multiple photos per listing)
CREATE TABLE book_photos (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES book_listings(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    photo_type VARCHAR(50), -- 'cover', 'spine', 'pages', 'condition', 'other'
    display_order INTEGER DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Favorites/Watchlist Table
CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id INTEGER NOT NULL REFERENCES book_listings(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, listing_id)
);

-- ============================================
-- TRANSACTION TABLES
-- ============================================

-- Transactions Table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES book_listings(id),
    buyer_id INTEGER NOT NULL REFERENCES users(id),
    seller_id INTEGER NOT NULL REFERENCES users(id),
    
    -- Transaction Details
    transaction_type VARCHAR(20) NOT NULL, -- 'sale', 'swap', 'sale_with_swap'
    agreed_price DECIMAL(10, 2),
    
    -- Meeting Details
    meeting_location TEXT,
    meeting_latitude DECIMAL(10, 8),
    meeting_longitude DECIMAL(11, 8),
    proposed_meeting_date TIMESTAMP,
    confirmed_meeting_date TIMESTAMP,
    
    -- Status Tracking
    status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'accepted', 'meeting_scheduled', 'completed', 'cancelled', 'disputed'
    
    -- Payment Details
    payment_method VARCHAR(50), -- 'cash', 'mpesa', 'bank_transfer', 'escrow'
    payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'released', 'refunded'
    payment_proof_url TEXT,
    
    -- Handshake Verification
    buyer_confirmed BOOLEAN DEFAULT FALSE,
    seller_confirmed BOOLEAN DEFAULT FALSE,
    handshake_verified_at TIMESTAMP,
    verification_code VARCHAR(10), -- 6-digit code for both parties
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT
);

-- Swap Details (for swap transactions)
CREATE TABLE swap_details (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    swapped_listing_id INTEGER REFERENCES book_listings(id), -- Book being swapped from buyer
    cash_difference DECIMAL(10, 2) DEFAULT 0.00, -- If values don't match
    swap_notes TEXT
);

-- Reviews & Ratings Table
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id),
    reviewer_id INTEGER NOT NULL REFERENCES users(id),
    reviewed_user_id INTEGER NOT NULL REFERENCES users(id),
    
    -- Rating & Review
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    
    -- Rating Categories
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
    book_accuracy_rating INTEGER CHECK (book_accuracy_rating >= 1 AND book_accuracy_rating <= 5),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT TRUE,
    
    UNIQUE(transaction_id, reviewer_id)
);


-- ============================================
-- REFERENCE/LOOKUP TABLES
-- ============================================

-- Subjects/Categories Table
CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Classes/Grades Table
CREATE TABLE class_grades (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- 'Grade 1', 'Form 4', etc.
    curriculum VARCHAR(50), -- 'CBC', '8-4-4'
    sort_order INTEGER,
    age_range VARCHAR(50)
);

-- Publishers Table
CREATE TABLE publishers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    country VARCHAR(100),
    website_url TEXT
);


-- Reports/Flags Table
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER NOT NULL REFERENCES users(id),
    reported_user_id INTEGER REFERENCES users(id),
    reported_listing_id INTEGER REFERENCES book_listings(id),
    
    report_type VARCHAR(50) NOT NULL, -- 'fake_listing', 'inappropriate_content', 'scam', 'no_show', etc.
    description TEXT NOT NULL,
    evidence_urls TEXT[], -- Array of photo/screenshot URLs
    
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'investigating', 'resolved', 'dismissed'
    admin_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    notification_type VARCHAR(50) NOT NULL, -- 'new_message', 'offer_received', 'meeting_reminder', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Links/Context
    related_listing_id INTEGER REFERENCES book_listings(id),
    related_transaction_id INTEGER REFERENCES transactions(id),
    related_user_id INTEGER REFERENCES users(id),
    action_url TEXT,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SEARCH & ANALYTICS
-- ============================================

-- Search History (for improving search)
CREATE TABLE search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    search_query TEXT NOT NULL,
    filters_applied JSONB, -- Store filter parameters as JSON
    results_count INTEGER,
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

