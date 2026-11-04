CREATE TABLE `entities` (
	`id` text PRIMARY KEY NOT NULL,
	`chain_id` integer NOT NULL,
	`address` text NOT NULL,
	`type` text NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entities_chain_address_idx` ON `entities` (`chain_id`,`address`);--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`investigation_id` text NOT NULL,
	`type` text NOT NULL,
	`classification` text NOT NULL,
	`data` text NOT NULL,
	`source` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`investigation_id`) REFERENCES `investigations`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "evidence_classification_check" CHECK("evidence"."classification" IN ('confirmed','inferred','unknown'))
);
--> statement-breakpoint
CREATE INDEX `evidence_investigation_idx` ON `evidence` (`investigation_id`);--> statement-breakpoint
CREATE TABLE `investigations` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`type` text NOT NULL,
	`target` text NOT NULL,
	`chain_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`result` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "investigations_status_check" CHECK("investigations"."status" IN ('pending','running','complete','failed'))
);
--> statement-breakpoint
CREATE INDEX `investigations_session_idx` ON `investigations` (`session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `investigations_target_idx` ON `investigations` (`chain_id`,`target`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "messages_role_check" CHECK("messages"."role" IN ('user','assistant','system','tool'))
);
--> statement-breakpoint
CREATE INDEX `messages_session_idx` ON `messages` (`session_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text DEFAULT 'New conversation' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
