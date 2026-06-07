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
  createOrganization,
  getOrganizationById,
  listOrganizationsByUser,
  addOrganizationMember,
  getOrganizationMembers,
  listScansByOrganization,
} from "./db";
import {
  CONTROLS,
  generateMockResults,
  computeBreakdowns,
} from "../shared/controls";
import { runRealScan } from "./engine";
import { invokeLLM } from "./_core/llm";

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
          cloudProvider: z.enum(["oci", "aws", "azure", "gcp", "sirar", "sccc"]),
          organizationId: z.number().optional(),
          configSnapshot: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scan = await createScan({
          userId: ctx.user.id,
          systemName: input.systemName,
          systemDescription: input.systemDescription ?? null,
          cloudProvider: input.cloudProvider,
          organizationId: input.organizationId ?? null,
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
        //
        // NOTE: MySQL json() columns may return a string instead of a parsed object.
        // We parse it here to ensure scanMode is accessible.
        const rawCfg = scan.configSnapshot ?? {};
        const parsedCfg: Record<string, unknown> =
          typeof rawCfg === "string"
            ? (() => { try { return JSON.parse(rawCfg); } catch { return {}; } })()
            : (rawCfg as Record<string, unknown>);

        const scanRunner = USE_REAL_ENGINE
          ? runRealScan(input.scanId, {
              systemName: scan.systemName,
              cloudProvider: scan.cloudProvider,
              configSnapshot: parsedCfg,
            })
          : runMockScan(input.scanId, (parsedCfg.scanMode as string) ?? "scenario_insecure");

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

  // ── AI Compliance Explainer ─────────────────────────────────────────────
  ai: router({
    explainControl: protectedProcedure
      .input(
        z.object({
          controlId: z.string(),
          controlTitle: z.string(),
          controlDescription: z.string(),
          pillar: z.string(),
          severity: z.string(),
          standards: z.array(z.string()),
          status: z.enum(["pass", "fail"]),
          violations: z.array(z.string()).optional(),
          remediation: z.string().optional(),
          evidenceSources: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const {
          controlId,
          controlTitle,
          controlDescription,
          pillar,
          severity,
          standards,
          status,
          violations,
          remediation,
          evidenceSources,
        } = input;

        const standardsList = standards.join(", ");
        const violationsList =
          violations && violations.length > 0
            ? violations.map((v, i) => `${i + 1}. ${v}`).join("\n")
            : "No specific violations recorded.";
        const evidenceList =
          evidenceSources && evidenceSources.length > 0
            ? evidenceSources.join(", ")
            : "Not specified";

        const systemPrompt = `You are a senior cybersecurity compliance expert specializing in Saudi healthcare regulations, including the NCA Cloud Cybersecurity Controls (CCC), Saudi Health Information Exchange (SeHE) policies, and HIPAA Technical Safeguards. You help healthcare IT teams understand compliance failures in plain, actionable language.`;

        const userPrompt = `A compliance check has been performed on a cloud-hosted healthcare system. Below are the details of a specific control that ${status === "fail" ? "FAILED" : "PASSED"}.

Control ID: ${controlId}
Control Title: ${controlTitle}
Description: ${controlDescription}
Zero Trust Pillar: ${pillar}
Severity: ${severity}
Applicable Standards: ${standardsList}
Evidence Sources: ${evidenceList}
Violations Detected:
${violationsList}
Existing Remediation Guidance: ${remediation ?? "None provided"}

Please provide a clear, structured explanation with the following sections:

1. **Why did this control ${status === "fail" ? "fail" : "pass"}?** (2-3 sentences explaining the root cause in plain language, referencing the specific regulation if applicable)
2. **What is the risk?** (1-2 sentences on what could go wrong if this is not addressed)
3. **Step-by-step remediation** (3-5 concrete, actionable steps the IT team should take to fix this)
4. **Regulatory reference** (Which specific article or section of CCC, SeHE, or HIPAA this maps to)

Keep the language professional but accessible to a healthcare IT manager who is not a cybersecurity expert.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        const explanation =
          response.choices?.[0]?.message?.content ?? "Unable to generate explanation at this time.";

        return { explanation };
      }),

    analyzePolicy: protectedProcedure
      .input(
        z.object({
          policyText: z.string().min(10),
          fileName: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { policyText, fileName } = input;

        const systemPrompt = `You are an expert in regulatory compliance, cloud security policy analysis, and Open Policy Agent (OPA) Rego language. You specialize in Saudi healthcare regulations including NCA CCC (Cloud Cybersecurity Controls), SeHE (Saudi Health Information Exchange), and HIPAA. Your task is to analyze policy documents and extract structured compliance rules, then generate executable Rego code for each rule.`;

        const userPrompt = `Analyze the following policy document and extract all compliance rules. For each rule, generate a complete OPA Rego policy.

Policy Document${fileName ? ` (${fileName})` : ""}:
---
${policyText.slice(0, 4000)}
---

Respond with a valid JSON object (no markdown, no code fences) in this exact structure:
{
  "policyName": "<name of the policy>",
  "policyType": "<NCA CCC | SeHE | HIPAA | Internal | ISO 27001 | Other>",
  "summary": "<2-3 sentence summary of the policy>",
  "totalRules": <number>,
  "rules": [
    {
      "id": "RULE-001",
      "title": "<short rule title>",
      "description": "<what this rule requires>",
      "severity": "<critical | high | medium | low>",
      "category": "<Access Control | Encryption | Logging | Network | Data Protection | Authentication | Other>",
      "regoCode": "<complete valid Rego policy code for this rule>",
      "evidenceRequired": ["<evidence type 1>", "<evidence type 2>"],
      "testCases": [
        {"description": "<test scenario>", "expected": "<pass | fail>"}
      ]
    }
  ],
  "warnings": ["<any ambiguous or unclear requirements found>"]
}

Extract between 3 and 8 rules. Make the Rego code realistic and syntactically correct using the 'data.compliance' package namespace. Each rule should use 'deny[msg]' pattern.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        const rawContent = response.choices?.[0]?.message?.content ?? "{}";

        // Strip markdown code fences if present
        const cleaned = rawContent
          .replace(/^```(?:json)?\n?/m, "")
          .replace(/\n?```$/m, "")
          .trim();

        try {
          const parsed = JSON.parse(cleaned);
          return parsed;
        } catch {
          // Fallback: return a minimal valid structure
          return {
            policyName: fileName ?? "Uploaded Policy",
            policyType: "Other",
            summary: "Policy analysis completed. Please review the extracted rules.",
            totalRules: 0,
            rules: [],
            warnings: ["AI response could not be parsed as structured JSON. Please try again with a clearer policy document."],
          };
        }
      }),
  }),

  // ── Organizations (Multi-Tenant) ─────────────────────────────────────────
  organizations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return listOrganizationsByUser(ctx.user.id);
    }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2).max(255),
          type: z.enum(["hospital", "clinic", "lab", "other"]).default("hospital"),
          city: z.string().optional(),
          licenseNumber: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const org = await createOrganization(input);
        await addOrganizationMember({
          organizationId: org.id,
          userId: ctx.user.id,
          memberRole: "owner",
        });
        return org;
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getOrganizationById(input.id);
      }),
    getMembers: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ input }) => {
        return getOrganizationMembers(input.orgId);
      }),
    listScans: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ input }) => {
        return listScansByOrganization(input.orgId);
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
