import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  float,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Scans ────────────────────────────────────────────────────────────────────
export const scans = mysqlTable("scans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  systemName: varchar("systemName", { length: 255 }).notNull(),
  systemDescription: text("systemDescription"),
  cloudProvider: mysqlEnum("cloudProvider", ["oci", "aws", "azure"]).notNull(),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"])
    .default("pending")
    .notNull(),
  // Serialised config (no secrets — only structural metadata)
  configSnapshot: json("configSnapshot"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Scan = typeof scans.$inferSelect;
export type InsertScan = typeof scans.$inferInsert;

// ── Scan Results ─────────────────────────────────────────────────────────────
export const scanResults = mysqlTable("scan_results", {
  id: int("id").autoincrement().primaryKey(),
  scanId: int("scanId").notNull(),
  overallScore: float("overallScore").notNull().default(0),
  totalControls: int("totalControls").notNull().default(0),
  passedControls: int("passedControls").notNull().default(0),
  failedControls: int("failedControls").notNull().default(0),
  // Full JSON snapshot of all control results
  controlResults: json("controlResults"),
  // Aggregated breakdown snapshots
  pillarBreakdown: json("pillarBreakdown"),
  severityBreakdown: json("severityBreakdown"),
  standardBreakdown: json("standardBreakdown"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScanResult = typeof scanResults.$inferSelect;
export type InsertScanResult = typeof scanResults.$inferInsert;

// ── Scan Logs ────────────────────────────────────────────────────────────────
export const scanLogs = mysqlTable("scan_logs", {
  id: int("id").autoincrement().primaryKey(),
  scanId: int("scanId").notNull(),
  level: mysqlEnum("level", ["info", "warn", "error", "success"]).default("info").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScanLog = typeof scanLogs.$inferSelect;
export type InsertScanLog = typeof scanLogs.$inferInsert;
