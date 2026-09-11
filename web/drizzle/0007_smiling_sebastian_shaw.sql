ALTER TABLE `players` ADD `daily_protein` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `daily_produce` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `work_date` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `shifts_today` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `wages_today` real DEFAULT 0 NOT NULL;