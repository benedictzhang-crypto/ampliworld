CREATE TABLE `life_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`turn` integer NOT NULL,
	`activity_code` text NOT NULL,
	`category` text NOT NULL,
	`price` real NOT NULL,
	`tax` real DEFAULT 0 NOT NULL,
	`happiness_delta` integer DEFAULT 0 NOT NULL,
	`nutrition_delta` integer DEFAULT 0 NOT NULL,
	`care_points` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `players`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `life_events_user_turn_idx` ON `life_events` (`user_id`,`turn`);--> statement-breakpoint
CREATE TABLE `work_shifts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`turn` integer NOT NULL,
	`job_code` text NOT NULL,
	`pay` real NOT NULL,
	`happiness_delta` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `players`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `work_shifts_user_turn_idx` ON `work_shifts` (`user_id`,`turn`);--> statement-breakpoint
ALTER TABLE `players` ADD `nutrition` integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `care_streak` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `daily_care_points` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `last_meal_turn` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `last_wellness_turn` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `last_leisure_turn` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `trading_fee_bps` integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `last_work_turn` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `work_streak` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `lifetime_wages` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `social_mode` text DEFAULT 'PRIVATE' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `contact_coins` integer DEFAULT 0 NOT NULL;