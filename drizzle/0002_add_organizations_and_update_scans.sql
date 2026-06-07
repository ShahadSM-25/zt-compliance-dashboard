-- Migration: Add organizations, organization_members tables
-- and update scans table with new columns (organizationId, gcp/sirar/sccc providers)

-- ── Step 1: Alter scans.cloudProvider enum to include new providers ──────────
ALTER TABLE `scans`
  MODIFY COLUMN `cloudProvider` enum('oci','aws','azure','gcp','sirar','sccc') NOT NULL;

-- ── Step 2: Add organizationId column to scans ───────────────────────────────
ALTER TABLE `scans`
  ADD COLUMN `organizationId` int DEFAULT NULL;

-- ── Step 3: Create organizations table ──────────────────────────────────────
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

-- ── Step 4: Create organization_members table ────────────────────────────────
CREATE TABLE IF NOT EXISTS `organization_members` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organizationId` int NOT NULL,
  `userId` int NOT NULL,
  `memberRole` enum('owner','admin','member') NOT NULL DEFAULT 'member',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `organization_members_id` PRIMARY KEY(`id`)
);
