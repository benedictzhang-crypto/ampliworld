CREATE TABLE `margin_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`turn` integer NOT NULL,
	`event_type` text NOT NULL,
	`symbol` text,
	`daily_pnl` real DEFAULT 0 NOT NULL,
	`account_equity` real DEFAULT 0 NOT NULL,
	`maintenance_required` real DEFAULT 0 NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `players`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `margin_events_user_turn_idx` ON `margin_events` (`user_id`,`turn`);--> statement-breakpoint
ALTER TABLE `holdings` ADD `leverage` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `holdings` ADD `margin_posted` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `holdings` ADD `borrowed_amount` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `holdings` ADD `last_mark_price` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `holdings` ADD `maintenance_margin_rate` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `margin_used` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `gross_exposure` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `borrowed_exposure` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `maintenance_margin_required` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `liquidation_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `account_status` text DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `relief_claims` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `last_relief_turn` integer DEFAULT -100000 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `last_settlement_turn` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `trades` ADD `leverage` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `trades` ADD `margin_required` real DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `holdings` SET `margin_posted` = `quantity` * `average_price`, `last_mark_price` = `average_price` WHERE `leverage` = 1 AND `margin_posted` = 0;--> statement-breakpoint
UPDATE `trades` SET `margin_required` = `notional` WHERE `leverage` = 1 AND `margin_required` = 0;
