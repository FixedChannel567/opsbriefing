CREATE TABLE `daily_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_date` text NOT NULL,
	`event_id` text NOT NULL,
	`headline` text NOT NULL,
	`source_names` text NOT NULL,
	`article_urls` text NOT NULL,
	`source_count` integer NOT NULL,
	`location_label` text NOT NULL,
	`captured_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `daily_snapshots_date_idx` ON `daily_snapshots` (`snapshot_date`);--> statement-breakpoint
CREATE INDEX `daily_snapshots_event_idx` ON `daily_snapshots` (`event_id`);