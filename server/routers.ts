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

// ── Scenario-based deterministic results (derived from real OPA evaluation) ──
// These sets reflect the actual OPA evaluation results for each scenario.
const SCENARIO_FAILED_CONTROLS: Record<string, Set<string>> = {
  scenario_secure: new Set([
    "CCC-29", "CCC-31", "TC-15",
  ]),
  scenario_insecure: new Set([
    "TC-01","TC-02","TC-03","TC-05","TC-06","TC-07","TC-08","TC-09","TC-10",
    "TC-11","TC-12","TC-13","TC-14","SC-01","SC-02","SC-03","SC-04","SC-05",
    "SC-06","SC-07","SC-08","SC-09","SC-10","SC-11","SC-12","SC-13","SC-14",
    "SC-15","SC-16","SC-17","SC-18","SC-19","SC-20","SC-21","SC-22","SC-23",
    "SC-24","CCC-01","CCC-02","CCC-03","CCC-04","CCC-05","CCC-06","CCC-07",
    "CCC-08","CCC-09","CCC-10","CCC-11","CCC-12","CCC-13","CCC-14","CCC-15",
    "CCC-16","CCC-17","CCC-18","CCC-19","CCC-20","CCC-21","CCC-22","CCC-23",
    "CCC-24","CCC-25","CCC-26","CCC-27","CCC-28","CCC-29","CCC-30","CCC-33",
    "CCC-37","CCC-38","CCC-40","CCC-43","CCC-44","CCC-45","CCC-46","CCC-47",
    "CCC-48","CCC-49","CCC-51","CCC-31","TC-15",
  ]),
  scenario_mixed: new Set([
    "TC-02","TC-03","TC-09","SC-02","SC-09","SC-11","CCC-04","CCC-05","CCC-06",
    "CCC-14","CCC-17","CCC-21","CCC-22","CCC-29","CCC-30","CCC-37","CCC-31","TC-15",
  ]),
};

function generateScenarioResults(scanMode: string) {
  const failedSet = SCENARIO_FAILED_CONTROLS[scanMode] ?? SCENARIO_FAILED_CONTROLS["scenario_insecure"];
  return CONTROLS.map((control) => {
    const isFailed = failedSet.has(control.id);
    return {
      ...control,
      status: isFailed ? ("fail" as const) : ("pass" as const),
      violations: isFailed
        ? [`${control.id} violation detected: ${control.title} is non-compliant`]
        : [],
    };
  });
}

async function runMockScan(scanId: number, scanMode = "scenario_insecure") {
  const scenarioLabels: Record<string, string> = {
    scenario_secure:   "✅ Secure Environment (fully hardened HIS)",
    scenario_insecure: "⚠️  Insecure Environment (misconfigured HIS)",
    scenario_mixed:    "🔀 Mixed Environment (partially hardened HIS)",
  };
  const label = scenarioLabels[scanMode] ?? scenarioLabels["scenario_insecure"];

  const steps = [
    { level: "info" as const,    message: `🚀 Starting HealthComply compliance check...` },
    { level: "info" as const,    message: `🎭 Test scenario: ${label}` },
    { level: "info" as const,    message: "📋 Loading pre-defined evidence for selected scenario..." },
    { level: "info" as const,    message: "☁️  Layer 1: Loading cloud infrastructure evidence..." },
    { level: "success" as const, message: "✅ Cloud evidence loaded (47 resources)." },
    { level: "info" as const,    message: "🏥 Layer 2: Loading HIS Application evidence..." },
    { level: "success" as const, message: "✅ HIS evidence loaded (12 endpoints)." },
    { level: "info" as const,    message: "🖥️  Layer 3: Loading OS-level evidence..." },
    { level: "success" as const, message: "✅ OS evidence loaded (3 hosts)." },
    { level: "info" as const,    message: "📐 Normalising evidence to policy input schema..." },
    { level: "success" as const, message: "✅ Evidence normalised — 98 controls ready for evaluation." },
    { level: "info" as const,    message: "⚖️  Running OPA policy evaluation (Identity pillar)..." },
    { level: "info" as const,    message: "⚖️  Running OPA policy evaluation (Devices pillar)..." },
    { level: "info" as const,    message: "⚖️  Running OPA policy evaluation (Networks pillar)..." },
    { level: "info" as const,    message: "⚖️  Running OPA policy evaluation (Applications & Workloads pillar)..." },
    { level: "info" as const,    message: "⚖️  Running OPA policy evaluation (Visibility & Analytics pillar)..." },
    { level: "info" as const,    message: "⚖️  Running OPA policy evaluation (Data pillar)..." },
    { level: "success" as const, message: "✅ Policy evaluation complete." },
    { level: "info" as const,    message: "📊 Generating compliance report..." },
    { level: "success" as const, message: "🎉 Compliance check finished successfully!" },
  ];

  for (let i = 0; i < steps.length; i++) {
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 300));
    await appendScanLog({ scanId, level: steps[i].level, message: steps[i].message });
  }

  // Generate deterministic results based on selected scenario
  const controlResults = generateScenarioResults(scanMode);
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
          : runMockScan(input.scanId, (scan.configSnapshot as any)?.scanMode ?? "scenario_insecure");

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
