CREATE TABLE `population_run_chunks` (
	`user_id` text NOT NULL,
	`revision` integer NOT NULL,
	`chunk_index` integer NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`user_id`, `revision`, `chunk_index`)
);
