ALTER TABLE `children` ADD `school_id` varchar(36);--> statement-breakpoint
ALTER TABLE `children` ADD `school_name` text;--> statement-breakpoint
CREATE INDEX `idx_children_school` ON `children` (`school_id`);