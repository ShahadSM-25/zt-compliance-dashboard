import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Download,
  Search,
  Filter,
  AlertTriangle,
  Info,
  Clock,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

const PILLAR_COLORS: Record<string, string> = {
  Identity: "#6366f1",
  Devices: "#f59e0b",
  Networks: "#10b981",
  Applications: "#3b82f6",
  "Cross-Cutting": "#8b5cf6",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

const SEVERITY_ORDER = ["critical", "high", "medium", "low"];

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#eab308" : "#ef4444";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={8}
        className="text-muted/30"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        className="rotate-90"
        style={{ transform: `rotate(90deg) translate(0, 0)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
        fill={color}
        fontSize={size * 0.22}
        fontWeight="bold"
      >
        {score}%
      </text>
    </svg>
  );
}

function PillarBadge({ pillar }: { pillar: string }) {
  const map: Record<string, string> = {
    Identity: "pillar-identity",
    Devices: "pillar-devices",
    Networks: "pillar-networks",
    Applications: "pillar-applications",
    "Cross-Cutting": "pillar-crosscutting",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[pillar] ?? "bg-gray-100 text-gray-600"}`}>
      {pillar}
    </span>
  );
}

export default function Results() {
  const params = useParams<{ id: string }>();
  const scanId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPillar, setFilterPillar] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [selectedControl, setSelectedControl] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: scan, isLoading: scanLoading } = trpc.scan.getById.useQuery({ scanId }, { enabled: !!scanId });
  const { data: results, isLoading: resultsLoading } = trpc.results.getByScanId.useQuery({ scanId }, { enabled: !!scanId });

  const isLoading = scanLoading || resultsLoading;

  const controls = useMemo(() => {
    if (!results?.controlResults) return [];
    return results.controlResults as any[];
  }, [results]);

  const filteredControls = useMemo(() => {
    return controls.filter((c) => {
      const matchesSearch =
        !searchQuery ||
        c.controlId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPillar = filterPillar === "all" || c.pillar === filterPillar;
      const matchesStatus = filterStatus === "all" || c.status === filterStatus;
      const matchesSeverity = filterSeverity === "all" || c.severity === filterSeverity;
      return matchesSearch && matchesPillar && matchesStatus && matchesSeverity;
    });
  }, [controls, searchQuery, filterPillar, filterStatus, filterSeverity]);

  const overallScore = useMemo(() => {
    if (!controls.length) return 0;
    const passed = controls.filter((c) => c.status === "pass").length;
    return Math.round((passed / controls.length) * 100);
  }, [controls]);

  const pillarData = useMemo(() => {
    const pillars: Record<string, { pass: number; fail: number }> = {};
    controls.forEach((c) => {
      if (!pillars[c.pillar]) pillars[c.pillar] = { pass: 0, fail: 0 };
      if (c.status === "pass") pillars[c.pillar].pass++;
      else pillars[c.pillar].fail++;
    });
    return Object.entries(pillars).map(([name, v]) => ({
      name: name.replace("Cross-Cutting Capabilities", "Cross-Cutting"),
      ...v,
      total: v.pass + v.fail,
      score: Math.round((v.pass / (v.pass + v.fail)) * 100),
    }));
  }, [controls]);

  const severityData = useMemo(() => {
    return SEVERITY_ORDER.map((sev) => {
      const sevControls = controls.filter((c) => c.severity === sev);
      const failed = sevControls.filter((c) => c.status === "fail").length;
      return { name: sev.charAt(0).toUpperCase() + sev.slice(1), failed, total: sevControls.length };
    }).filter((d) => d.total > 0);
  }, [controls]);

  const pieData = useMemo(() => {
    const passed = controls.filter((c) => c.status === "pass").length;
    const failed = controls.length - passed;
    return [
      { name: "Passed", value: passed, color: "#10b981" },
      { name: "Failed", value: failed, color: "#ef4444" },
    ];
  }, [controls]);

  const handleExport = async (format: "json" | "pdf") => {
    setIsExporting(true);
    try {
      if (format === "json") {
        const blob = new Blob([JSON.stringify({ scan, results }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `compliance-report-${scanId}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("JSON report downloaded");
      } else {
        toast.info("PDF export — feature coming soon");
      }
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <ShieldCheck className="h-10 w-10 animate-pulse text-primary" />
          <p>Loading compliance results…</p>
        </div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
          <p className="font-semibold">Scan not found</p>
          <Button className="mt-4" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
            <div className="h-4 w-px bg-border" />
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="font-semibold hidden sm:block">{scan.systemName}</span>
            <Badge variant="secondary" className="text-xs font-mono">#{scan.id}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport("json")} disabled={isExporting}>
              <Download className="h-4 w-4 mr-1" /> JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} disabled={isExporting}>
              <Download className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {/* ── Overview Cards ─────────────────────────────────────────────── */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Score Ring */}
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardContent className="pt-6 flex flex-col items-center gap-2">
              <ScoreRing score={overallScore} size={110} />
              <div className="text-center">
                <p className="font-semibold text-sm">Overall Compliance</p>
                <p className="text-xs text-muted-foreground">
                  {controls.filter((c) => c.status === "pass").length} / {controls.length} controls passed
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-full bg-emerald-100 p-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-sm font-medium">Passed</span>
              </div>
              <p className="text-3xl font-bold text-emerald-600">
                {controls.filter((c) => c.status === "pass").length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">controls compliant</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-full bg-red-100 p-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <span className="text-sm font-medium">Failed</span>
              </div>
              <p className="text-3xl font-bold text-red-600">
                {controls.filter((c) => c.status === "fail").length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">controls non-compliant</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-full bg-red-100 p-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <span className="text-sm font-medium">Critical Failures</span>
              </div>
              <p className="text-3xl font-bold text-red-600">
                {controls.filter((c) => c.status === "fail" && c.severity === "critical").length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">require immediate action</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Charts Row ─────────────────────────────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Pillar Bar Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Compliance by Pillar</CardTitle>
              <CardDescription className="text-xs">Pass/fail breakdown per Zero Trust pillar</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pillarData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value, name) => [value, name === "pass" ? "Passed" : "Failed"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend formatter={(v) => (v === "pass" ? "Passed" : "Failed")} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="pass" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="fail" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie + Severity */}
          <div className="space-y-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pass / Fail Distribution</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-6">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={pieData} cx={55} cy={55} innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={3}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <div className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                      <span className="text-muted-foreground">{d.name}:</span>
                      <span className="font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Failures by Severity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {severityData.map((d) => (
                  <div key={d.name} className="flex items-center gap-3">
                    <span
                      className="w-16 text-xs font-medium capitalize"
                      style={{ color: SEVERITY_COLORS[d.name.toLowerCase()] }}
                    >
                      {d.name}
                    </span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${d.total > 0 ? (d.failed / d.total) * 100 : 0}%`,
                          background: SEVERITY_COLORS[d.name.toLowerCase()],
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {d.failed}/{d.total}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Pillar Score Cards ──────────────────────────────────────────── */}
        <div>
          <h2 className="text-base font-semibold mb-3">Score by Pillar</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {pillarData.map((p) => (
              <Card key={p.name} className="text-center">
                <CardContent className="pt-4 pb-3">
                  <div
                    className="text-2xl font-bold mb-1"
                    style={{ color: p.score >= 80 ? "#10b981" : p.score >= 60 ? "#eab308" : "#ef4444" }}
                  >
                    {p.score}%
                  </div>
                  <div className="text-xs font-medium text-foreground">{p.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {p.pass}/{p.total} passed
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Controls Table ─────────────────────────────────────────────── */}
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search controls by ID or title…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-28">
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pass">Passed</SelectItem>
                  <SelectItem value="fail">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPillar} onValueChange={setFilterPillar}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Pillar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pillars</SelectItem>
                  {Object.keys(PILLAR_COLORS).map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  {SEVERITY_ORDER.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-2">
            Showing {filteredControls.length} of {controls.length} controls
          </p>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {filteredControls.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No controls match your filters.
                </div>
              ) : (
                filteredControls.map((control) => (
                  <button
                    key={control.controlId}
                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                    onClick={() => setSelectedControl(control)}
                  >
                    {control.status === "pass" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    )}
                    <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
                      {control.controlId}
                    </span>
                    <span className="flex-1 text-sm font-medium truncate">{control.title}</span>
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <PillarBadge pillar={control.pillar?.replace("Cross-Cutting Capabilities", "Cross-Cutting") ?? ""} />
                      <span
                        className="text-xs font-medium capitalize px-1.5 py-0.5 rounded"
                        style={{
                          color: SEVERITY_COLORS[control.severity] ?? "#888",
                          background: `${SEVERITY_COLORS[control.severity]}20`,
                        }}
                      >
                        {control.severity}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Control Detail Dialog ───────────────────────────────────────── */}
      <Dialog open={!!selectedControl} onOpenChange={() => setSelectedControl(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedControl && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  {selectedControl.status === "pass" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <DialogTitle className="text-base leading-snug">
                      {selectedControl.title}
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {selectedControl.controlId}
                    </p>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="flex flex-wrap gap-2">
                  <PillarBadge pillar={selectedControl.pillar?.replace("Cross-Cutting Capabilities", "Cross-Cutting") ?? ""} />
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                    style={{
                      color: SEVERITY_COLORS[selectedControl.severity] ?? "#888",
                      background: `${SEVERITY_COLORS[selectedControl.severity]}20`,
                    }}
                  >
                    {selectedControl.severity}
                  </span>
                  {selectedControl.standards?.map((s: string) => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>

                {selectedControl.description && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Description
                    </h4>
                    <p className="text-sm text-foreground leading-relaxed">{selectedControl.description}</p>
                  </div>
                )}

                {selectedControl.violations && selectedControl.violations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
                      Violations Found
                    </h4>
                    <div className="space-y-1.5">
                      {selectedControl.violations.map((v: string, i: number) => (
                        <div key={i} className="flex gap-2 rounded bg-red-50 border border-red-200 px-3 py-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                          <span className="text-xs text-red-800">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedControl.remediation && (
                  <div>
                    <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                      Remediation Guidance
                    </h4>
                    <div className="rounded bg-blue-50 border border-blue-200 px-3 py-2">
                      <p className="text-xs text-blue-800 leading-relaxed">{selectedControl.remediation}</p>
                    </div>
                  </div>
                )}

                {selectedControl.evidenceSources && selectedControl.evidenceSources.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Evidence Sources
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedControl.evidenceSources.map((src: string) => (
                        <Badge key={src} variant="secondary" className="text-xs">{src}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
