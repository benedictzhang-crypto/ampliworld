CREATE TABLE `game_world` (
	`id` text PRIMARY KEY NOT NULL,
	`market_seed` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `game_world` (`id`, `market_seed`, `created_at`, `updated_at`)
VALUES (
	'MAIN',
	lower(hex(randomblob(16))),
	strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
	strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
