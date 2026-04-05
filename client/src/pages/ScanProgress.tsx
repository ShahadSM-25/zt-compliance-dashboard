import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { HealthComplyLogo } from "@/components/HealthComplyLogo";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Clock,
  Cloud,
  Server,
  Layers,
  BarChart3,
  ShieldCheck,
} from "lucide-react";

const SCAN_STAGES = [
  { label: "Cloud Infrastructure", icon: Cloud, keywords: ["Layer 1", "Cloud API", "IAM", "network", "storage"] },
  { label: "Application API", icon: Server, keywords: ["Layer 2", "HIS API", "RBAC", "audit log", "endpoint"] },
  { label: "OS & Runtime", icon: Layers, keywords: ["Layer 3", "OS monitoring", "patch", "system config"] },
  { label: "Policy Evaluation", icon: ShieldCheck, keywords: ["OPA", "policy evaluation", "pillar"] },
  { label: "Report Generation", icon: BarChart3, keywords: ["report", "compliance score", "finished"] },
];

function getStageProgress(logs: string[]): number {
  const combined = logs.join(" ").toLowerCase();
  if (combined.includes("finished") || combined.includes("compliance score")) return 100;
  if (combined.includes("report")) return 90;
  if (combined.includes("opa") || combined.includes("policy evaluation")) return 72;
  if (combined.includes("layer 3") || combined.includes("os monitoring")) return 52;
  if (combined.includes("layer 2") || combined.includes("his api")) return 34;
  if (combined.includes("layer 1") || combined.includes("cloud api")) return 16;
  if (combined.includes("starting") || combined.includes("loading")) return 5;
  return 0;
}

function LogLine({ message, level }: { message: string; level: string }) {
  const color =
    level === "success"
      ? "text-emerald-400"
      : level === "error"
      ? "text-red-400"
      : level === "warn"
      ? "text-yellow-400"
      : "text-slate-300";
  return (
    <div className={`terminal-log ${color} leading-relaxed`}>
      <span className="text-slate-500 select-none mr-2">$</span>
      {message}
    </div>
  );
}

export default function ScanProgress() {
  const params = useParams<{ id: string }>();
  const scanId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();
  const [lastLogId, setLastLogId] = useState<number | undefined>(undefined);
  const [allLogs, setAllLogs] = useState<Array<{ id: number; message: string; level: string }>>([]);
  const [pollingActive, setPollingActive] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  const { data: scan, refetch: refetchScan } = trpc.scan.status.useQuery(
    { scanId },
    { enabled: !!scanId, refetchInterval: pollingActive ? 2000 : false }
  );

  const { data: newLogs } = trpc.scan.logs.useQuery(
    { scanId, afterId: lastLogId },
    { enabled: !!scanId && pollingActive, refetchInterval: 1500 }
  );

  useEffect(() => {
    if (newLogs && newLogs.length > 0) {
      setAllLogs((prev) => {
        const existingIds = new Set(prev.map((l) => l.id));
        const fresh = newLogs.filter((l) => !existingIds.has(l.id));
        if (fresh.length === 0) return prev;
        setLastLogId(fresh[fresh.length - 1].id);
        return [...prev, ...fresh];
      });
    }
  }, [newLogs]);

  useEffect(() => {
    if (scan?.status === "completed" || scan?.status === "failed") {
      setPollingActive(false);
    }
  }, [scan?.status]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allLogs]);

  const isRunning = scan?.status === "running" || scan?.status === "pending";
  const isCompleted = scan?.status === "completed";
  const isFailed = scan?.status === "failed";

  const logMessages = allLogs.map((l) => l.message);
  const progress = isCompleted ? 100 : isFailed ? 0 : getStageProgress(logMessages);

  const formatDuration = () => {
    if (!scan?.startedAt) return null;
    const start = new Date(scan.startedAt).getTime();
    const end = scan.completedAt ? new Date(scan.completedAt).getTime() : Date.now();
    const secs = Math.round((end - start) / 1000);
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <HealthComplyLogo size={36} showText={false} />
            <span className="font-semibold">Compliance Scan</span>
            {scan && (
              <Badge variant="secondary" className="text-xs font-mono">
                #{scan.id}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isRunning && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Running
              </Badge>
            )}
            {isCompleted && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Completed
              </Badge>
            )}
            {isFailed && (
              <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
                <XCircle className="h-3 w-3" /> Failed
              </Badge>
            )}
            {formatDuration() && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {formatDuration()}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-3xl mx-auto space-y-6">
        {/* System Info */}
        {scan && (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{scan.systemName}</h1>
              <p className="text-sm text-muted-foreground">
                {scan.cloudProvider?.toUpperCase()} · Started{" "}
                {scan.startedAt ? new Date(scan.startedAt).toLocaleString() : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <Card>
          <CardContent className="pt-5 pb-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span className="text-muted-foreground font-mono">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            {/* Stage indicators */}
            <div className="grid grid-cols-5 gap-1 pt-1">
              {SCAN_STAGES.map((stage) => {
                const Icon = stage.icon;
                const isActive = stage.keywords.some((kw) =>
                  logMessages.some((m) => m.toLowerCase().includes(kw.toLowerCase()))
                );
                return (
                  <div
                    key={stage.label}
                    className={`flex flex-col items-center gap-1 text-center transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground/40"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] leading-tight hidden sm:block">{stage.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Live Terminal Log */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <span className="text-muted-foreground font-mono text-xs">scan.log</span>
              {isRunning && (
                <span className="ml-auto flex items-center gap-1 text-xs text-blue-600">
                  <Loader2 className="h-3 w-3 animate-spin" /> Live
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 rounded-lg p-4 min-h-[280px] max-h-[400px] overflow-y-auto">
              {allLogs.length === 0 ? (
                <div className="terminal-log text-slate-500 flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Waiting for scan to start...
                </div>
              ) : (
                allLogs.map((log) => (
                  <LogLine key={log.id} message={log.message} level={log.level} />
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {isCompleted && (
          <div className="flex justify-center">
            <Button
              size="lg"
              className="px-10"
              onClick={() => navigate(`/results/${scanId}`)}
            >
              View Compliance Results
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {isFailed && (
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
            <Button onClick={() => navigate("/scan/new")}>Try Again</Button>
          </div>
        )}

        {isRunning && (
          <p className="text-center text-sm text-muted-foreground">
            The scan is running in the background. You can leave this page and come back later —
            the results will be saved automatically.
          </p>
        )}
      </div>
    </div>
  );
}
