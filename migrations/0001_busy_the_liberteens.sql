DROP INDEX `idx_users_school` ON `users`;--> statement-breakpoint
ALTER TABLE `children` DROP COLUMN `user_id`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `school_id`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `school_name`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `latitude`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `longitude`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `child_grade`;