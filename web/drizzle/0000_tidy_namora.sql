CREATE TABLE `players` (
	`user_id` text PRIMARY KEY NOT NULL,
	`cash` real DEFAULT 10000 NOT NULL,
	`portfolio_value` real DEFAULT 0 NOT NULL,
	`apartment_lease_days` integer DEFAULT 365 NOT NULL,
	`career_status` text DEFAULT 'UNEMPLOYED' NOT NULL,
	`turn` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`symbol` text NOT NULL,
	`side` text NOT NULL,
	`notional` real NOT NULL,
	`price` real NOT NULL,
	`created_at` text NOT NULL
);
