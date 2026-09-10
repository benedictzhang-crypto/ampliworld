CREATE TABLE `game_idempotency` (
	`user_id` text NOT NULL,
	`request_id` text NOT NULL,
	`action` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`completed_at` text,
	PRIMARY KEY(`user_id`, `request_id`),
	FOREIGN KEY (`user_id`) REFERENCES `players`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `game_idempotency_user_created_idx` ON `game_idempotency` (`user_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `players` ADD `market_seed` text DEFAULT '' NOT NULL;
--> statement-breakpoint
UPDATE `players` SET `market_seed` = lower(hex(randomblob(16))) WHERE `market_seed` = '';
--> statement-breakpoint
UPDATE `players` SET `created_at` = `updated_at` WHERE `created_at` = '';
--> statement-breakpoint
PRAGMA optimize;
