import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  scans,
  scanResults,
  scanLogs,
  InsertScan,
  InsertScanResult,
  InsertScanLog,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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
