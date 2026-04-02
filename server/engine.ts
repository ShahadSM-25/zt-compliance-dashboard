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
 * In Docker Compose, this is mounted as a volume.
 * In local dev, set COMPLIANCE_ENGINE_PATH env var.
 */
const ENGINE_PATH = process.env.COMPLIANCE_ENGINE_PATH ||
  path.resolve(process.cwd(), "../cloud-compliance-automation");

const RESULTS_FILE = path.join(ENGINE_PATH, "dashboard", "data", "compliance_results.json");
const CONFIG_FILE  = path.join(ENGINE_PATH, "config", "target_system.yaml");

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
      base_url: "http://nginx:8080",
      authentication: { method: "API_Key", api_key_env: "HIS_API_KEY", api_key_header: "X-API-Key" },
      endpoints: { health: "/health", audit_log: "/administration/audit/events" },
    },
    hosts: snapshot.hosts ?? existingConfig.hosts ?? [
      { name: "testbed-node-exporter", ip: "node-exporter", agent_port: 9100, agent_type: "node_exporter" },
    ],
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
 */
function mapEngineResultsToDashboard(engineOutput: EngineOutput): ControlResult[] {
  // Build a lookup: control_id (e.g. "IDN-001") → engine result
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
      status: engineResult.status === "pass" ? "pass" : "fail",
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
    await log("info", "☁️  Layer 1: Collecting cloud infrastructure evidence...");
    await runCommand("python3", ["collectors/collect_cloud_api_evidence.py"], ENGINE_PATH, scanId, {
      CONFIG_PATH: CONFIG_FILE,
    });

    await log("info", "🏥 Layer 2: Collecting HIS application evidence...");
    await runCommand("python3", ["collectors/collect_application_evidence.py"], ENGINE_PATH, scanId, {
      CONFIG_PATH: CONFIG_FILE,
    });

    await log("info", "🖥️  Layer 3: Collecting OS-level evidence via Node Exporter...");
    await runCommand("python3", ["collectors/collect_os_evidence.py"], ENGINE_PATH, scanId, {
      CONFIG_PATH: CONFIG_FILE,
    });

    // ── Step 4: Run policy evaluation ─────────────────────────────────────────
    await log("info", "⚖️  Running OPA/Conftest policy evaluation...");
    await runCommand(
      "python3",
      ["evaluation/generate_dashboard_data.py"],
      ENGINE_PATH,
      scanId
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
    const score   = Math.round((passed / controlResults.length) * 100 * 10) / 10;
    const { pillarBreakdown, severityBreakdown, standardBreakdown } = computeBreakdowns(controlResults);

    // ── Step 6: Save results to DB ────────────────────────────────────────────
    await saveScanResult({
      scanId,
      overallScore: score,
      totalControls: controlResults.length,
      passedControls: passed,
      failedControls: failed,
      controlResults: controlResults as unknown as Record<string, unknown>[],
      pillarBreakdown: pillarBreakdown as unknown as Record<string, unknown>,
      severityBreakdown: severityBreakdown as unknown as Record<string, unknown>,
      standardBreakdown: standardBreakdown as unknown as Record<string, unknown>,
    });

    await updateScan(scanId, { status: "completed", completedAt: new Date() });
    await log("success", `🎉 Compliance check finished! Score: ${score}% (${passed}/${controlResults.length} controls passed)`);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await log("error", `❌ Fatal error during scan: ${message}`);
    await updateScan(scanId, { status: "failed", completedAt: new Date() });
    throw err;
  }
}
