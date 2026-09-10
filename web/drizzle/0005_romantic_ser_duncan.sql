CREATE TABLE `transit_trips` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`turn` integer NOT NULL,
	`from_district` text NOT NULL,
	`to_district` text NOT NULL,
	`mode` text NOT NULL,
	`fare` real NOT NULL,
	`duration_game_minutes` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `players`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `transit_trips_user_created_idx` ON `transit_trips` (`user_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `players` ADD `current_district` text DEFAULT 'STARTER_ARCOLOGY' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `starter_tower` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `starter_floor` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `starter_unit` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `transit_spend` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `transit_trips` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `metro_rides` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `taxi_rides` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `last_transit_mode` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `last_transit_fare` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `last_transit_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `players` SET
	`starter_tower` = 1 + ((random() & 2147483647) % 1000),
	`starter_floor` = 1 + ((random() & 2147483647) % 50),
	`starter_unit` = 1 + ((random() & 2147483647) % 200);
