-- Add profile_picture_url column to users table
ALTER TABLE `users` ADD COLUMN `profile_picture_url` TEXT NULL AFTER `email`;
