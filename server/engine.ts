/**
 * Compliance Engine Bridge
 * ========================
 * This module bridges the zt-compliance-dashboard with the
 * cloud-compliance-automation tool.
 *
 * It replaces the mock scan runner with a real execution that:
 *  1. Writes the scan config to target_system.yaml
 *  2. Runs the compliance check scripts (via Docker or direct Python)
 *  3. Reads the resulting compliance_results.json
 *  4. Maps the results to the Dashboard's ControlResult schema
 *  5. Saves everything to the database
 */

import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import {
  appendScanLog,
  updateScan,
  saveScanResult,
} from "./db.js";
import { CONTROLS, computeBreakdowns } from "../shared/controls.js";
import type { ControlResult } from "../shared/controls.js";

// ── Configuration ─────────────────────────────────────────────────────────────

/**
 * Path to the cloud-compliance-automation repo.
 * In Docker Compose, this is mounted as a volume at /engine.
 * In local dev, set COMPLIANCE_ENGINE_PATH env var.
 */
const ENGINE_PATH = process.env.COMPLIANCE_ENGINE_PATH ||
  path.resolve(process.cwd(), "../cloud-compliance-automation");

const RESULTS_FILE = path.join(ENGINE_PATH, "dashboard", "data", "compliance_results.json");
const CONFIG_FILE  = path.join(ENGINE_PATH, "config", "target_system.yaml");

// HIS Mock URL — in Docker Compose, the nginx service proxies to his-mock
const HIS_MOCK_URL = process.env.HIS_MOCK_URL || "http://nginx:8080";

// Node Exporter URL — optional, only when monitoring profile is active
const NODE_EXPORTER_URL = process.env.NODE_EXPORTER_URL || "";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScanConfig {
  systemName: string;
  cloudProvider: "oci" | "aws" | "azure";
  configSnapshot?: Record<string, unknown>;
}

interface EngineControlResult {
  control_id: string;
  framework: string;
  pillar: string;
  severity: string;
  status: "pass" | "fail" | "error";
  violations: Array<{ message: string; resource?: string; severity?: string }>;
  enforcement_mode?: string;
  policy_reference?: string;
}

interface EngineOutput {
  evaluated_at: string;
  total_controls: number;
  statistics: {
    overall_compliance: number;
    passed: number;
    failed: number;
    errors: number;
  };
  controls: EngineControlResult[];
  scenarios?: Record<string, {
    statistics: { overall_compliance: number; passed: number; failed: number };
    controls: EngineControlResult[];
  }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Write the scan configuration to target_system.yaml so the engine can read it.
 */
function writeTargetConfig(config: ScanConfig): void {
  const existingConfig = fs.existsSync(CONFIG_FILE)
    ? (yaml.load(fs.readFileSync(CONFIG_FILE, "utf-8")) as Record<string, unknown>)
    : {};

  const snapshot = (config.configSnapshot ?? {}) as Record<string, unknown>;

  const targetConfig = {
    ...existingConfig,
    system_name: config.systemName,
    cloud: {
      provider: config.cloudProvider,
      ...(snapshot.cloud as object ?? {}),
    },
    application: snapshot.application ?? existingConfig.application ?? {
      // Use HIS_MOCK_URL env var (nginx proxy in Docker, or direct in local dev)
      base_url: HIS_MOCK_URL,
      authentication: {
        method: "none",
      },
      endpoints: {
        health: "/health",
        audit_log: "/administration/audit/events",
      },
    },
    // Hosts for OS-level evidence (Node Exporter).
    // - If NODE_EXPORTER_URL is set: the collector will override the URL automatically.
    // - If not set: point to the node-exporter Docker service (only active with --profile monitoring).
    // - If no monitoring profile: collect_os_evidence.py will fail gracefully (non-fatal).
    hosts: snapshot.hosts ?? existingConfig.hosts ?? (
      NODE_EXPORTER_URL
        ? [{
            name: "node-exporter",
            ip: "node-exporter",
            agent_port: 9100,
            agent_type: "node_exporter",
          }]
        : [] // No hosts = OS collection skipped gracefully
    ),
    global: { evidence_output_dir: "/app/evidence" },
  };

  fs.writeFileSync(CONFIG_FILE, yaml.dump(targetConfig, { lineWidth: 120 }), "utf-8");
}

/**
 * Run a shell command inside the engine directory, streaming stdout/stderr
 * as scan logs to the database.
 */
function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
  scanId: number,
  env?: Record<string, string>
): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const handleLine = async (line: string, level: "info" | "error" | "success") => {
      const trimmed = line.trim();
      if (!trimmed) return;
      // Detect success/error lines from the engine output
      const detectedLevel =
        trimmed.startsWith("✅") || trimmed.startsWith("🎉") ? "success"
        : trimmed.startsWith("❌") ? "error"
        : trimmed.startsWith("⚠️") ? "warn" as "info"
        : level;
      await appendScanLog({ scanId, level: detectedLevel, message: trimmed });
    };

    let stdoutBuf = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      stdoutBuf += chunk.toString();
      const lines = stdoutBuf.split("\n");
      stdoutBuf = lines.pop() ?? "";
      lines.forEach((l) => handleLine(l, "info").catch(console.error));
    });

    let stderrBuf = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      stderrBuf += chunk.toString();
      const lines = stderrBuf.split("\n");
      stderrBuf = lines.pop() ?? "";
      lines.forEach((l) => handleLine(l, "error").catch(console.error));
    });

    proc.on("close", (code) => {
      if (stdoutBuf.trim()) handleLine(stdoutBuf, "info").catch(console.error);
      if (stderrBuf.trim()) handleLine(stderrBuf, "error").catch(console.error);
      resolve(code ?? 0);
    });

    proc.on("error", reject);
  });
}

// ── Data Mapper ───────────────────────────────────────────────────────────────

/**
 * Maps the engine's compliance_results.json output to the Dashboard's
 * ControlResult[] schema, merging with the CONTROLS metadata.
 *
 * The engine uses TC-/SC-/CCC- IDs (from Policy_Catalog_Architecture.yaml).
 * The CONTROLS list uses the same IDs (generated from the same catalog).
 */
function mapEngineResultsToDashboard(engineOutput: EngineOutput): ControlResult[] {
  // Build a lookup: control_id (e.g. "TC-01") → engine result
  const engineLookup = new Map<string, EngineControlResult>();
  for (const r of engineOutput.controls) {
    engineLookup.set(r.control_id, r);
  }

  return CONTROLS.map((control) => {
    const engineResult = engineLookup.get(control.id);

    if (!engineResult) {
      // Control not evaluated by engine — mark as skipped
      return {
        ...control,
        status: "skipped" as const,
        violations: [],
      };
    }

    const violations = engineResult.violations.map((v) =>
      typeof v === "string" ? v : v.message ?? JSON.stringify(v)
    );

    return {
      ...control,
      status: engineResult.status === "pass" ? "pass"
            : engineResult.status === "error" ? "fail"
            : "fail",
      violations,
    };
  });
}

// ── Main Real Scan Runner ─────────────────────────────────────────────────────

/**
 * Runs the real compliance check using cloud-compliance-automation.
 * This replaces `runMockScan` in routers.ts.
 */
export async function runRealScan(scanId: number, config: ScanConfig): Promise<void> {
  const log = (level: "info" | "success" | "error" | "warn", message: string) =>
    appendScanLog({ scanId, level, message });

  try {
    await log("info", "🚀 Starting HealthComply real compliance check...");
    await log("info", `📋 Engine path: ${ENGINE_PATH}`);
    await log("info", `🏥 HIS Mock URL: ${HIS_MOCK_URL}`);
    if (NODE_EXPORTER_URL) {
      await log("info", `🖥️  Node Exporter URL: ${NODE_EXPORTER_URL}`);
    } else {
      await log("info", "🖥️  Node Exporter: disabled (set NODE_EXPORTER_URL to enable)");
    }

    // ── Step 1: Validate engine path ──────────────────────────────────────────
    if (!fs.existsSync(ENGINE_PATH)) {
      await log("error", `❌ Engine not found at: ${ENGINE_PATH}`);
      await log("error", "   Set COMPLIANCE_ENGINE_PATH env var to the cloud-compliance-automation directory.");
      throw new Error(`Engine path not found: ${ENGINE_PATH}`);
    }

    // ── Step 2: Write target config ───────────────────────────────────────────
    await log("info", "⚙️  Writing target_system.yaml configuration...");
    writeTargetConfig(config);
    await log("success", "✅ Configuration written successfully.");

    // ── Step 3: Run evidence collectors ──────────────────────────────────────
    // Layer 1: Cloud API evidence (OCI/AWS/Azure)
    await log("info", "☁️  Layer 1: Collecting cloud infrastructure evidence...");
    await runCommand(
      "python3",
      ["collectors/collect_cloud_api_evidence.py", config.cloudProvider, "/app/evidence/cloud_evidence.json"],
      ENGINE_PATH,
      scanId,
      { CONFIG_PATH: CONFIG_FILE }
    );

    // Layer 2: Application evidence (HIS mock via nginx)
    await log("info", "🏥 Layer 2: Collecting HIS application evidence...");
    await runCommand(
      "python3",
      ["collectors/collect_application_evidence.py"],
      ENGINE_PATH,
      scanId,
      {
        CONFIG_PATH: CONFIG_FILE,
        // Override base_url via env in case the config file has a different value
        HIS_BASE_URL: HIS_MOCK_URL,
      }
    );

    // Layer 3: OS evidence via Node Exporter (optional)
    await log("info", "🖥️  Layer 3: Collecting OS-level evidence via Node Exporter...");
    const osEnv: Record<string, string> = { CONFIG_PATH: CONFIG_FILE };
    if (NODE_EXPORTER_URL) {
      osEnv.NODE_EXPORTER_URL = NODE_EXPORTER_URL;
    }
    await runCommand(
      "python3",
      ["collectors/collect_os_evidence.py"],
      ENGINE_PATH,
      scanId,
      osEnv
    );

    // ── Step 4: Run policy evaluation ─────────────────────────────────────────
    await log("info", "⚖️  Running OPA/Conftest policy evaluation...");

    // Determine which scenario to use as the "main view" in the dashboard.
    // For test scenarios, the scanMode maps directly to a scenario name.
    // For real scans (scanMode === "real" or undefined), live evidence is used.
    const scanMode = (config.configSnapshot?.scanMode as string) ?? "real";
    const evalEnv: Record<string, string> = {};
    if (scanMode !== "real") {
      const scenarioMap: Record<string, string> = {
        scenario_secure:   "scenario_1_secure",
        scenario_insecure: "scenario_2_insecure",
        scenario_mixed:    "scenario_3_mixed",
      };
      const engineScenario = scenarioMap[scanMode] ?? "scenario_2_insecure";
      evalEnv.ACTIVE_SCENARIO = engineScenario;
      await log("info", `🎭 Using test scenario: ${engineScenario}`);
    } else {
      await log("info", "🌐 Using live evidence from real environment");
    }

    await runCommand(
      "python3",
      ["evaluation/generate_dashboard_data.py"],
      ENGINE_PATH,
      scanId,
      evalEnv
    );
    await log("success", "✅ Policy evaluation complete.");

    // ── Step 5: Read and map results ──────────────────────────────────────────
    await log("info", "📊 Reading compliance results...");

    if (!fs.existsSync(RESULTS_FILE)) {
      throw new Error(`Results file not found after evaluation: ${RESULTS_FILE}`);
    }

    const engineOutput: EngineOutput = JSON.parse(fs.readFileSync(RESULTS_FILE, "utf-8"));
    const controlResults = mapEngineResultsToDashboard(engineOutput);

    const passed  = controlResults.filter((r) => r.status === "pass").length;
    const failed  = controlResults.filter((r) => r.status === "fail").length;
    const total   = controlResults.length;
    const score   = Math.round((passed / total) * 100 * 10) / 10;
    const { pillarBreakdown, severityBreakdown, standardBreakdown } = computeBreakdowns(controlResults);

    // ── Step 6: Save results to DB ────────────────────────────────────────────
    await saveScanResult({
      scanId,
      overallScore: score,
      totalControls: total,
      passedControls: passed,
      failedControls: failed,
      controlResults: controlResults as unknown as Record<string, unknown>[],
      pillarBreakdown: pillarBreakdown as unknown as Record<string, unknown>,
      severityBreakdown: severityBreakdown as unknown as Record<string, unknown>,
      standardBreakdown: standardBreakdown as unknown as Record<string, unknown>,
    });

    await updateScan(scanId, { status: "completed", completedAt: new Date() });
    await log("success", `🎉 Compliance check finished! Score: ${score}% (${passed}/${total} controls passed)`);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await log("error", `❌ Fatal error during scan: ${message}`);
    await updateScan(scanId, { status: "failed", completedAt: new Date() });
    throw err;
  }
}
