CREATE TABLE `holdings` (
	`user_id` text NOT NULL,
	`symbol` text NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`average_price` real NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `symbol`),
	FOREIGN KEY (`user_id`) REFERENCES `players`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `holdings_user_idx` ON `holdings` (`user_id`);--> statement-breakpoint
CREATE TABLE `inventory` (
	`user_id` text NOT NULL,
	`item_code` text NOT NULL,
	`display_name` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price` real NOT NULL,
	`tax_paid` real DEFAULT 0 NOT NULL,
	`acquired_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `item_code`),
	FOREIGN KEY (`user_id`) REFERENCES `players`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `inventory_user_idx` ON `inventory` (`user_id`);--> statement-breakpoint
ALTER TABLE `players` ADD `realized_pnl` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `unrealized_pnl` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `happiness` integer DEFAULT 52 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `city_tax_paid` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `last_operation_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `created_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_trades` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`symbol` text NOT NULL,
	`side` text NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`notional` real NOT NULL,
	`price` real NOT NULL,
	`fee` real DEFAULT 0 NOT NULL,
	`tax` real DEFAULT 0 NOT NULL,
	`realized_pnl` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `players`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_trades`("id", "user_id", "symbol", "side", "quantity", "notional", "price", "fee", "tax", "realized_pnl", "created_at") SELECT "id", "user_id", "symbol", "side", CASE WHEN "price" > 0 THEN "notional" / "price" ELSE 0 END, "notional", "price", 0, 0, 0, "created_at" FROM `trades`;--> statement-breakpoint
DROP TABLE `trades`;--> statement-breakpoint
ALTER TABLE `__new_trades` RENAME TO `trades`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `trades_user_created_idx` ON `trades` (`user_id`,`created_at`);
