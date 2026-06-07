-- Migration 0002: safe idempotent upgrade
-- Adds organizationId to scans, expands cloudProvider enum,
-- and creates organizations + organization_members tables.

-- ── Step 1: Drop and recreate scans table with full schema ───────────────────
-- We rename the old table, create the new one, copy data, then drop the old one.
-- This is the safest approach when ALTER TABLE enum changes may fail silently.

CREATE TABLE IF NOT EXISTS `scans_new` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `systemName` varchar(255) NOT NULL,
  `systemDescription` text,
  `cloudProvider` enum('oci','aws','azure','gcp','sirar','sccc') NOT NULL DEFAULT 'oci',
  `organizationId` int DEFAULT NULL,
  `status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
  `configSnapshot` json,
  `startedAt` timestamp NULL,
  `completedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `scans_new_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

INSERT INTO `scans_new` (`id`,`userId`,`systemName`,`systemDescription`,`cloudProvider`,`status`,`configSnapshot`,`startedAt`,`completedAt`,`createdAt`,`updatedAt`)
SELECT `id`,`userId`,`systemName`,`systemDescription`,`cloudProvider`,`status`,`configSnapshot`,`startedAt`,`completedAt`,`createdAt`,`updatedAt`
FROM `scans`;
--> statement-breakpoint

DROP TABLE `scans`;
--> statement-breakpoint

RENAME TABLE `scans_new` TO `scans`;
--> statement-breakpoint

-- ── Step 2: Create organizations table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `organizations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('hospital','clinic','lab','other') NOT NULL DEFAULT 'hospital',
  `city` varchar(100),
  `licenseNumber` varchar(100),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

-- ── Step 3: Create organization_members table ────────────────────────────────
CREATE TABLE IF NOT EXISTS `organization_members` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organizationId` int NOT NULL,
  `userId` int NOT NULL,
  `memberRole` enum('owner','admin','member') NOT NULL DEFAULT 'member',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `organization_members_id` PRIMARY KEY(`id`)
);
