import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createScan,
  updateScan,
  getScanById,
  listScansByUser,
  listAllScans,
  deleteScan,
  saveScanResult,
  getScanResultByScanId,
  appendScanLog,
  getScanLogs,
  getUserScanStats,
  getAllUsers,
} from "./db";
import {
  CONTROLS,
  generateMockResults,
  computeBreakdowns,
} from "../shared/controls";
import { runRealScan } from "./engine";

// ── Engine Mode ───────────────────────────────────────────────────────────────
// Set USE_REAL_ENGINE=true to run the actual cloud-compliance-automation tool.
// Falls back to mock mode if the env var is not set (safe for local dev/demo).
const USE_REAL_ENGINE = process.env.USE_REAL_ENGINE === "true" ||
  process.env.COMPLIANCE_ENGINE_PATH !== undefined;

// ── Helpers ──────────────────────────────────────────────────────────────────

function requireAdmin(role: string | null | undefined) {
  if (role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
}

async function runMockScan(scanId: number) {
  const steps = [
    { level: "info" as const,    message: "🚀 Starting HealthComply compliance check..." },
    { level: "info" as const,    message: "📋 Loading configuration from target_system.yaml..." },
    { level: "info" as const,    message: "☁️  Layer 1: Connecting to cloud provider API..." },
    { level: "success" as const, message: "✅ Cloud API connection established." },
    { level: "info" as const,    message: "🔍 Collecting IAM evidence (users, roles, policies)..." },
    { level: "info" as const,    message: "🔍 Collecting network evidence (security groups, VPCs)..." },
    { level: "info" as const,    message: "🔍 Collecting storage evidence (buckets, volumes)..." },
    { level: "success" as const, message: "✅ Cloud infrastructure evidence collected (47 resources)." },
    { level: "info" as const,    message: "🏥 Layer 2: Connecting to HIS Application API..." },
    { level: "success" as const, message: "✅ HIS API connection established." },
    { level: "info" as const,    message: "🔍 Checking API authentication endpoints..." },
    { level: "info" as const,    message: "🔍 Fetching RBAC configuration..." },
    { level: "info" as const,    message: "🔍 Pulling audit log samples..." },
    { level: "success" as const, message: "✅ Application evidence collected (12 endpoints checked)." },
    { level: "info" as const,    message: "🖥️  Layer 3: Connecting to OS monitoring agents..." },
    { level: "info" as const,    message: "🔍 Collecting system configuration data..." },
    { level: "info" as const,    message: "🔍 Checking patch levels and running services..." },
    { level: "success" as const, message: "✅ OS-level evidence collected (3 hosts)." },
    { level: "info" as const,    message: "🔄 Aggregating all evidence sources..." },
    { level: "info" as const,    message: "📐 Normalising evidence to policy input schema..." },
    { level: "success" as const, message: "✅ Evidence normalised — 84 controls ready for evaluation." },
    { level: "info" as const,    message: "⚖️  Running OPA policy evaluation (Identity pillar)..." },
    { level: "info" as const,    message: "⚖️  Running OPA policy evaluation (Devices pillar)..." },
    { level: "info" as const,    message: "⚖️  Running OPA policy evaluation (Networks pillar)..." },
    { level: "info" as const,    message: "⚖️  Running OPA policy evaluation (Applications pillar)..." },
    { level: "info" as const,    message: "⚖️  Running OPA policy evaluation (Cross-Cutting pillar)..." },
    { level: "success" as const, message: "✅ Policy evaluation complete." },
    { level: "info" as const,    message: "📊 Generating compliance report..." },
    { level: "success" as const, message: "🎉 Compliance check finished successfully!" },
  ];

  for (let i = 0; i < steps.length; i++) {
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    await appendScanLog({ scanId, level: steps[i].level, message: steps[i].message });
  }

  // Generate mock results
  const controlResults = generateMockResults(0.68);
  const passed = controlResults.filter((r) => r.status === "pass").length;
  const failed = controlResults.filter((r) => r.status === "fail").length;
  const score = Math.round((passed / controlResults.length) * 100 * 10) / 10;
  const { pillarBreakdown, severityBreakdown, standardBreakdown } = computeBreakdowns(controlResults);

  await saveScanResult({
    scanId,
    overallScore: score,
    totalControls: controlResults.length,
    passedControls: passed,
    failedControls: failed,
    controlResults: controlResults as any,
    pillarBreakdown: pillarBreakdown as any,
    severityBreakdown: severityBreakdown as any,
    standardBreakdown: standardBreakdown as any,
  });

  await updateScan(scanId, {
    status: "completed",
    completedAt: new Date(),
  });

  await appendScanLog({
    scanId,
    level: "success",
    message: `📈 Overall compliance score: ${score}% (${passed}/${controlResults.length} controls passed)`,
  });
}

// ── App Router ────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Controls ──────────────────────────────────────────────────────────────
  controls: router({
    list: publicProcedure.query(() => CONTROLS),
  }),

  // ── Scans ─────────────────────────────────────────────────────────────────
  scan: router({
    create: protectedProcedure
      .input(
        z.object({
          systemName: z.string().min(1),
          systemDescription: z.string().optional(),
          cloudProvider: z.enum(["oci", "aws", "azure"]),
          configSnapshot: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scan = await createScan({
          userId: ctx.user.id,
          systemName: input.systemName,
          systemDescription: input.systemDescription ?? null,
          cloudProvider: input.cloudProvider,
          status: "pending",
          configSnapshot: (input.configSnapshot ?? {}) as any,
        });
        return scan;
      }),

    start: protectedProcedure
      .input(z.object({ scanId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const scan = await getScanById(input.scanId);
        if (!scan) throw new TRPCError({ code: "NOT_FOUND" });
        if (scan.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await updateScan(input.scanId, { status: "running", startedAt: new Date() });
        await appendScanLog({
          scanId: input.scanId,
          level: "info",
          message: `Scan initiated by ${ctx.user.name ?? ctx.user.email ?? "user"}`,
        });
        // Fire-and-forget background job
        // Use real engine when COMPLIANCE_ENGINE_PATH is set, otherwise use mock
        const scanRunner = USE_REAL_ENGINE
          ? runRealScan(input.scanId, {
              systemName: scan.systemName,
              cloudProvider: scan.cloudProvider,
              configSnapshot: (scan.configSnapshot ?? {}) as Record<string, unknown>,
            })
          : runMockScan(input.scanId);

        scanRunner.catch(async (err) => {
          await appendScanLog({ scanId: input.scanId, level: "error", message: `Fatal error: ${err.message}` });
          await updateScan(input.scanId, { status: "failed", completedAt: new Date() });
        });
        return { started: true };
      }),

    status: protectedProcedure
      .input(z.object({ scanId: z.number() }))
      .query(async ({ ctx, input }) => {
        const scan = await getScanById(input.scanId);
        if (!scan) throw new TRPCError({ code: "NOT_FOUND" });
        if (scan.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return scan;
      }),

    logs: protectedProcedure
      .input(z.object({ scanId: z.number(), afterId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const scan = await getScanById(input.scanId);
        if (!scan) throw new TRPCError({ code: "NOT_FOUND" });
        if (scan.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getScanLogs(input.scanId, input.afterId);
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return listScansByUser(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ scanId: z.number() }))
      .query(async ({ ctx, input }) => {
        const scan = await getScanById(input.scanId);
        if (!scan) throw new TRPCError({ code: "NOT_FOUND" });
        if (scan.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return scan;
      }),

    delete: protectedProcedure
      .input(z.object({ scanId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const scan = await getScanById(input.scanId);
        if (!scan) throw new TRPCError({ code: "NOT_FOUND" });
        if (scan.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await deleteScan(input.scanId);
        return { deleted: true };
      }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      return getUserScanStats(ctx.user.id);
    }),
  }),

  // ── Results ───────────────────────────────────────────────────────────────
  results: router({
    getByScanId: protectedProcedure
      .input(z.object({ scanId: z.number() }))
      .query(async ({ ctx, input }) => {
        const scan = await getScanById(input.scanId);
        if (!scan) throw new TRPCError({ code: "NOT_FOUND" });
        if (scan.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getScanResultByScanId(input.scanId);
      }),
  }),

  // ── Admin ─────────────────────────────────────────────────────────────────
  admin: router({
    listAllScans: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return listAllScans();
    }),

    listAllUsers: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return getAllUsers();
    }),
  }),
});

export type AppRouter = typeof appRouter;
