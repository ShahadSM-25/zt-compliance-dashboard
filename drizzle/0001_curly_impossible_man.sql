CREATE TABLE `scan_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scanId` int NOT NULL,
	`level` enum('info','warn','error','success') NOT NULL DEFAULT 'info',
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scan_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scan_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scanId` int NOT NULL,
	`overallScore` float NOT NULL DEFAULT 0,
	`totalControls` int NOT NULL DEFAULT 0,
	`passedControls` int NOT NULL DEFAULT 0,
	`failedControls` int NOT NULL DEFAULT 0,
	`controlResults` json,
	`pillarBreakdown` json,
	`severityBreakdown` json,
	`standardBreakdown` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scan_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`systemName` varchar(255) NOT NULL,
	`systemDescription` text,
	`cloudProvider` enum('oci','aws','azure') NOT NULL,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`configSnapshot` json,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scans_id` PRIMARY KEY(`id`)
);
