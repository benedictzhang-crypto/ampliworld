DROP INDEX `life_events_user_turn_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `life_events_user_turn_category_unique` ON `life_events` (`user_id`,`turn`,`category`);--> statement-breakpoint
DROP INDEX `work_shifts_user_turn_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `work_shifts_user_turn_unique` ON `work_shifts` (`user_id`,`turn`);