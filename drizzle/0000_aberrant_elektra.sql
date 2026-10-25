CREATE TABLE `tournament_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`at` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`body` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tournament_chunks` (
	`generation` text NOT NULL,
	`position` integer NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`generation`, `position`)
);
--> statement-breakpoint
CREATE TABLE `tournament_commands` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`digest` text NOT NULL,
	`response` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tournament_state` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`generation` text NOT NULL
);
