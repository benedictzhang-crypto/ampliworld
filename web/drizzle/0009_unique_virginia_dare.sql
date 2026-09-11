ALTER TABLE `players` ADD `current_station_id` text DEFAULT 'M0' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `world_x` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `world_z` real DEFAULT 71 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `world_heading` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transit_trips` ADD `station_id` text;--> statement-breakpoint
UPDATE `players`
SET `current_station_id` = CASE
      WHEN `current_district` = 'CBD' THEN 'M4'
      ELSE 'M0'
    END,
    `world_x` = 0,
    `world_z` = CASE
      WHEN `current_district` = 'CBD' THEN 25
      ELSE 71
    END,
    `world_heading` = 3.141592653589793;
