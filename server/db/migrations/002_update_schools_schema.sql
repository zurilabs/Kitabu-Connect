-- Migration: Update schools table to match Kenya Ministry of Education structure
-- Date: 2025-01-22
-- Description: Restructure schools table with proper Kenyan administrative hierarchy

-- Step 1: Drop old schools table (if you want to keep existing data, use ALTER instead)
DROP TABLE IF EXISTS `schools`;

-- Step 2: Create new schools table with updated structure
CREATE TABLE `schools` (
  `id` VARCHAR(36) PRIMARY KEY,

  -- Kenya Ministry of Education fields
  `code` INT UNIQUE COMMENT 'Official school code from Ministry of Education',
  `school_name` VARCHAR(255) NOT NULL COMMENT 'Official school name',
  `level` VARCHAR(50) COMMENT 'Education level: Primary, Secondary, etc.',
  `status` VARCHAR(50) COMMENT 'School type: Public, Private, etc.',

  -- Location hierarchy (Kenya administrative structure)
  `county` VARCHAR(100) COMMENT 'County (47 counties in Kenya)',
  `district` VARCHAR(100) COMMENT 'District',
  `zone` VARCHAR(100) COMMENT 'Educational zone',
  `sub_county` VARCHAR(100) COMMENT 'Sub-county',
  `ward` VARCHAR(100) COMMENT 'Ward (smallest administrative unit)',

  -- Geographic coordinates
  `x_coord` DECIMAL(10, 7) COMMENT 'Longitude coordinate',
  `y_coord` DECIMAL(10, 7) COMMENT 'Latitude coordinate',

  -- Metadata
  `source` VARCHAR(255) COMMENT 'Data source (e.g., Ministry of Education, 2016)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes for better query performance
  INDEX `idx_schools_name` (`school_name`),
  INDEX `idx_schools_county` (`county`),
  INDEX `idx_schools_level` (`level`),
  INDEX `idx_schools_status` (`status`),
  INDEX `idx_schools_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Add sample data
-- INSERT INTO `schools` VALUES (
--   UUID(),
--   1,
--   'BAKWANIN',
--   'Primary',
--   'Public',
--   'Baringo',
--   'BARINGO CENTRAL',
--   'KABASIS',
--   'Baringo Central',
--   'Sacho',
--   35.797080,
--   0.409550,
--   'Ministry of Education, 2016',
--   CURRENT_TIMESTAMP,
--   CURRENT_TIMESTAMP
-- );
