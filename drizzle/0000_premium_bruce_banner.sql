CREATE TABLE `app_config` (
	`id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `app_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `app_users` (
	`email` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`department` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `backups` (
	`id` text PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`drive_url` text DEFAULT '' NOT NULL
);
