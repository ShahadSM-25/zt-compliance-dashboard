import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  scans,
  scanResults,
  scanLogs,
  organizations,
  organizationMembers,
  InsertScan,
  InsertScanResult,
  InsertScanLog,
  InsertOrganization,
  InsertOrganizationMember,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

import mysql from "mysql2/promise";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── Schema Patches (safe ALTER TABLE upgrades applied on every boot) ─────────
// These run AFTER migrations and are idempotent — safe to run multiple times.
export async function applySchemaPatches(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const conn = await mysql.createConnection(process.env.DATABASE_URL);

    // Patch 1: Add organizationId column to scans if missing
    try {
      await conn.execute(`ALTER TABLE \`scans\` ADD COLUMN \`organizationId\` int DEFAULT NULL`);
      console.log("[Database] ✅ Patch: added organizationId to scans");
    } catch (e: any) {
      if (!e.message?.includes("Duplicate column") && !e.message?.includes("already exists")) {
        console.warn("[Database] organizationId patch:", e.message);
      }
    }

    // Patch 2: Expand cloudProvider enum to include gcp, sirar, sccc
    try {
      await conn.execute(`ALTER TABLE \`scans\` MODIFY COLUMN \`cloudProvider\` enum('oci','aws','azure','gcp','sirar','sccc') NOT NULL`);
      console.log("[Database] ✅ Patch: expanded cloudProvider enum");
    } catch (e: any) {
      console.warn("[Database] cloudProvider enum patch:", e.message);
    }

    // Patch 3: Create organizations table if missing
    try {
      await conn.execute(`CREATE TABLE IF NOT EXISTS \`organizations\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`type\` enum('hospital','clinic','lab','other') NOT NULL DEFAULT 'hospital',
        \`city\` varchar(100),
        \`licenseNumber\` varchar(100),
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`organizations_id\` PRIMARY KEY(\`id\`)
      )`);
    } catch (e: any) {
      if (!e.message?.includes("already exists")) console.warn("[Database] organizations table patch:", e.message);
    }

    // Patch 4: Create organization_members table if missing
    try {
      await conn.execute(`CREATE TABLE IF NOT EXISTS \`organization_members\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`organizationId\` int NOT NULL,
        \`userId\` int NOT NULL,
        \`memberRole\` enum('owner','admin','member') NOT NULL DEFAULT 'member',
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        CONSTRAINT \`organization_members_id\` PRIMARY KEY(\`id\`)
      )`);
    } catch (e: any) {
      if (!e.message?.includes("already exists")) console.warn("[Database] organization_members table patch:", e.message);
    }

    await conn.end();
    console.log("[Database] ✅ Schema patches applied.");
  } catch (err: any) {
    console.warn("[Database] ⚠️  Schema patches failed:", err.message);
  }
}

export async function runMigrations(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.warn("[Database] No DATABASE_URL set, skipping migrations.");
    return;
  }
  try {
    const conn = await mysql.createConnection(process.env.DATABASE_URL);
    // Find migration SQL files relative to this file
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    // Try multiple possible paths (dev vs production build)
    const possiblePaths = [
      path.resolve(__dirname, "../../drizzle"),
      path.resolve(__dirname, "../drizzle"),
      path.resolve(process.cwd(), "drizzle"),
    ];
    let migrationDir: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) { migrationDir = p; break; }
    }
    if (!migrationDir) {
      console.warn("[Database] Could not find drizzle migration directory.");
      await conn.end();
      return;
    }
    const sqlFiles = fs.readdirSync(migrationDir)
      .filter(f => f.endsWith(".sql"))
      .sort();
    for (const file of sqlFiles) {
      const sql = fs.readFileSync(path.join(migrationDir, file), "utf-8");
      // Split by --> statement-breakpoint or semicolons
      const statements = sql
        .split(/-->\s*statement-breakpoint|;\s*\n/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith("--"));
      for (const stmt of statements) {
        try {
          await conn.execute(stmt);
        } catch (err: any) {
          // Ignore "already exists" errors (idempotent)
          if (!err.message?.includes("already exists") && !err.message?.includes("Duplicate")) {
            console.warn(`[Database] Migration warning in ${file}:`, err.message);
          }
        }
      }
    }
    await conn.end();
    console.log("[Database] ✅ Migrations applied successfully.");
  } catch (err: any) {
    console.warn("[Database] ⚠️  Migration failed:", err.message);
  }
}

// ── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

// ── Scans ────────────────────────────────────────────────────────────────────

export async function createScan(data: InsertScan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(scans).values(data);
  const insertId = (result as any).insertId as number;
  const rows = await db.select().from(scans).where(eq(scans.id, insertId)).limit(1);
  return rows[0];
}

export async function updateScan(id: number, data: Partial<InsertScan>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scans).set(data).where(eq(scans.id, id));
}

export async function getScanById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(scans).where(eq(scans.id, id)).limit(1);
  return rows[0];
}

export async function listScansByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scans).where(eq(scans.userId, userId)).orderBy(desc(scans.createdAt));
}

export async function listAllScans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scans).orderBy(desc(scans.createdAt));
}

export async function deleteScan(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(scanLogs).where(eq(scanLogs.scanId, id));
  await db.delete(scanResults).where(eq(scanResults.scanId, id));
  await db.delete(scans).where(eq(scans.id, id));
}

// ── Scan Results ─────────────────────────────────────────────────────────────

export async function saveScanResult(data: InsertScanResult) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(scanResults).values(data);
  const insertId = (result as any).insertId as number;
  const rows = await db.select().from(scanResults).where(eq(scanResults.id, insertId)).limit(1);
  return rows[0];
}

export async function getScanResultByScanId(scanId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(scanResults).where(eq(scanResults.scanId, scanId)).limit(1);
  return rows[0];
}

// ── Scan Logs ────────────────────────────────────────────────────────────────

export async function appendScanLog(data: InsertScanLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(scanLogs).values(data);
}

export async function getScanLogs(scanId: number, afterId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (afterId !== undefined) {
    return db
      .select()
      .from(scanLogs)
      .where(and(eq(scanLogs.scanId, scanId), sql`${scanLogs.id} > ${afterId}`))
      .orderBy(scanLogs.id);
  }
  return db.select().from(scanLogs).where(eq(scanLogs.scanId, scanId)).orderBy(scanLogs.id);
}

export async function getUserScanStats(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, completed: 0, failed: 0, running: 0 };
  const rows = await db.select().from(scans).where(eq(scans.userId, userId));
  return {
    total: rows.length,
    completed: rows.filter((r) => r.status === "completed").length,
    failed: rows.filter((r) => r.status === "failed").length,
    running: rows.filter((r) => r.status === "running").length,
  };
}

// ── Organizations (Multi-Tenant) ────────────────────────────────────────────────────────────────────
export async function createOrganization(data: InsertOrganization) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(organizations).values(data);
  const insertId = (result as any).insertId as number;
  const rows = await db.select().from(organizations).where(eq(organizations.id, insertId)).limit(1);
  return rows[0];
}

export async function getOrganizationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return rows[0];
}

export async function listOrganizationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const members = await db
    .select({ orgId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));
  if (members.length === 0) return [];
  const orgIds = members.map((m) => m.orgId);
  return db
    .select()
    .from(organizations)
    .where(sql`${organizations.id} IN (${sql.join(orgIds.map((id) => sql`${id}`), sql`, `)})`);
}

export async function addOrganizationMember(data: InsertOrganizationMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(organizationMembers).values(data);
}

export async function getOrganizationMembers(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, orgId));
}

export async function listScansByOrganization(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(scans)
    .where(eq(scans.organizationId, orgId))
    .orderBy(desc(scans.createdAt));
}
