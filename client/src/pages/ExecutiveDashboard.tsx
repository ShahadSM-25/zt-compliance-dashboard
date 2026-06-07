import { useLocation } from "wouter";
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Shield, DollarSign, BarChart3, Clock, Building2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { HealthComplyLogo } from "@/components/HealthComplyLogo";

// Utility: derive risk level from score
function getRiskLevel(score: number): { label: string; color: string; bg: string } {
  if (score >= 85) return { label: "Low Risk", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" };
  if (score >= 65) return { label: "Medium Risk", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" };
  if (score >= 40) return { label: "High Risk", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" };
  return { label: "Critical Risk", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" };
}

// Utility: estimate financial risk
function estimateFinancialRisk(failedCritical: number, failedHigh: number): string {
  const base = failedCritical * 500000 + failedHigh * 150000;
  if (base === 0) return "Minimal (< SAR 50K)";
  if (base < 500000) return `SAR ${(base / 1000).toFixed(0)}K – ${((base * 1.5) / 1000).toFixed(0)}K`;
  return `SAR ${(base / 1000000).toFixed(1)}M – ${((base * 1.5) / 1000000).toFixed(1)}M`;
}

export default function ExecutiveDashboard() {
  const [, navigate] = useLocation();

  // Load recent scans
  const { data: scans, isLoading } = trpc.scan.list.useQuery();

  // Use the most recent completed scan
  const latestScan = scans?.find((s: any) => s.status === "completed");
  const { data: results } = trpc.results.getByScanId.useQuery(
    { scanId: latestScan?.id ?? 0 },
    { enabled: !!latestScan?.id }
  );

  // Compute KPIs
  const controls = (results?.controlResults as any[]) ?? [];
  const totalControls = controls.length;
  const passedControls = controls.filter((c: any) => c.status === "pass").length;
  const failedControls = controls.filter((c: any) => c.status === "fail").length;
  const complianceScore = totalControls > 0 ? Math.round((passedControls / totalControls) * 100) : 0;
  const risk = getRiskLevel(complianceScore);

  const criticalFailures = controls
    .filter((c: any) => c.status === "fail" && c.severity === "critical")
    .slice(0, 5);
  const highFailures = controls
    .filter((c: any) => c.status === "fail" && c.severity === "high")
    .slice(0, 3);

  const financialRisk = estimateFinancialRisk(
    controls.filter((c: any) => c.status === "fail" && c.severity === "critical").length,
    controls.filter((c: any) => c.status === "fail" && c.severity === "high").length
  );

  // Breakdown by framework
  const frameworks = ["NCA CCC", "SeHE", "HIPAA"];
  const frameworkStats = frameworks.map((fw) => {
    const fwControls = controls.filter((c: any) => c.framework === fw || c.controlId?.startsWith(fw.split(" ")[0]));
    const fwPassed = fwControls.filter((c: any) => c.status === "pass").length;
    const fwTotal = fwControls.length;
    const fwScore = fwTotal > 0 ? Math.round((fwPassed / fwTotal) * 100) : null;
    return { fw, fwPassed, fwTotal, fwScore };
  });

  const scanDate = latestScan?.createdAt
    ? new Date(latestScan.createdAt).toLocaleDateString("en-SA", { year: "numeric", month: "long", day: "numeric" })
    : "N/A";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <HealthComplyLogo size={90} showText={false} />
            <span className="font-semibold text-lg">Executive Compliance Dashboard</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last scan: {scanDate}
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-6xl">
        {isLoading && (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto mb-3 animate-pulse" />
              <p>Loading compliance data...</p>
            </div>
          </div>
        )}

        {!isLoading && !latestScan && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No Completed Scans Found</p>
              <p className="text-sm mt-2 mb-4">Run a compliance scan to populate this executive view.</p>
              <Button onClick={() => navigate("/scan/new")}>Start New Scan</Button>
            </div>
          </div>
        )}

        {!isLoading && latestScan && (
          <>
            {/* Executive Summary Banner */}
            <div className={`rounded-xl border p-6 mb-8 ${risk.bg}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Overall Compliance Posture</p>
                  <div className="flex items-baseline gap-3">
                    <span className={`text-7xl font-black ${risk.color}`}>{complianceScore}</span>
                    <span className="text-3xl text-muted-foreground">/100</span>
                  </div>
                  <Badge className={`mt-2 text-sm border ${risk.bg} ${risk.color}`}>
                    {risk.label}
                  </Badge>
                </div>
                <div className="text-right space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Organization: </span>
                    <span className="font-medium">{latestScan.organizationName ?? "Default Org"}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Cloud Provider: </span>
                    <span className="font-medium">{latestScan.cloudProvider ?? "AWS"}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Scan Date: </span>
                    <span className="font-medium">{scanDate}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/results/${latestScan.id}`)}
                    className="mt-2"
                  >
                    Full Technical Report <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-sm text-muted-foreground">Controls Passed</span>
                  </div>
                  <p className="text-3xl font-bold text-green-400">{passedControls}</p>
                  <p className="text-xs text-muted-foreground mt-1">of {totalControls} total</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-red-400" />
                    <span className="text-sm text-muted-foreground">Controls Failed</span>
                  </div>
                  <p className="text-3xl font-bold text-red-400">{failedControls}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {controls.filter((c: any) => c.status === "fail" && c.severity === "critical").length} critical
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-yellow-400" />
                    <span className="text-sm text-muted-foreground">Financial Risk</span>
                  </div>
                  <p className="text-lg font-bold text-yellow-400">{financialRisk}</p>
                  <p className="text-xs text-muted-foreground mt-1">Estimated regulatory exposure</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                    <span className="text-sm text-muted-foreground">Compliance Trend</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-400">
                    {complianceScore >= 70 ? "↑" : "↓"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {complianceScore >= 70 ? "On track" : "Needs attention"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Two-column: Critical Failures + Framework Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Top Critical Failures */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    Top Critical Failures
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {criticalFailures.length === 0 ? (
                    <div className="text-center text-muted-foreground py-6">
                      <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-400" />
                      <p className="text-sm">No critical failures detected</p>
                    </div>
                  ) : (
                    criticalFailures.map((c: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                        <span className="text-red-400 font-bold text-sm mt-0.5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.controlId ?? c.id}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.description ?? c.title}</p>
                        </div>
                        <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30 flex-shrink-0">
                          Critical
                        </Badge>
                      </div>
                    ))
                  )}
                  {highFailures.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2">High Severity</p>
                      {highFailures.map((c: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 py-1.5 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                          <span className="truncate text-muted-foreground">{c.controlId ?? c.id}: {c.title ?? c.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Framework Compliance Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-5 w-5 text-blue-400" />
                    Framework Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {frameworkStats.map(({ fw, fwPassed, fwTotal, fwScore }) => {
                    const score = fwScore ?? complianceScore;
                    const r = getRiskLevel(score);
                    return (
                      <div key={fw}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium">{fw}</span>
                          <div className="flex items-center gap-2">
                            {fwTotal > 0 && (
                              <span className="text-xs text-muted-foreground">{fwPassed}/{fwTotal}</span>
                            )}
                            <span className={`text-sm font-bold ${r.color}`}>{score}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              score >= 85 ? "bg-green-500" : score >= 65 ? "bg-yellow-500" : score >= 40 ? "bg-orange-500" : "bg-red-500"
                            }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-3">Compliance by Severity</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {["critical", "high", "medium", "low"].map((sev) => {
                        const total = controls.filter((c: any) => c.severity === sev).length;
                        const passed = controls.filter((c: any) => c.severity === sev && c.status === "pass").length;
                        const pct = total > 0 ? Math.round((passed / total) * 100) : 100;
                        const colors: Record<string, string> = {
                          critical: "text-red-400",
                          high: "text-orange-400",
                          medium: "text-yellow-400",
                          low: "text-blue-400",
                        };
                        return (
                          <div key={sev} className="flex items-center justify-between p-2 rounded bg-muted/30">
                            <span className={`capitalize font-medium ${colors[sev]}`}>{sev}</span>
                            <span className="text-muted-foreground">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Executive Summary Text */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-5 w-5 text-purple-400" />
                  Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-muted-foreground leading-relaxed">
                    The latest compliance assessment of your cloud infrastructure returned an overall score of{" "}
                    <strong className={risk.color}>{complianceScore}/100</strong>, indicating a{" "}
                    <strong>{risk.label.toLowerCase()}</strong> posture.{" "}
                    {failedControls > 0 ? (
                      <>
                        Out of <strong>{totalControls}</strong> evaluated controls,{" "}
                        <strong className="text-red-400">{failedControls}</strong> failed, including{" "}
                        <strong className="text-red-400">
                          {controls.filter((c: any) => c.status === "fail" && c.severity === "critical").length} critical
                        </strong>{" "}
                        and{" "}
                        <strong className="text-orange-400">
                          {controls.filter((c: any) => c.status === "fail" && c.severity === "high").length} high
                        </strong>{" "}
                        severity issues that require immediate executive attention.
                      </>
                    ) : (
                      <>
                        All <strong className="text-green-400">{totalControls}</strong> evaluated controls passed successfully.
                      </>
                    )}
                  </p>
                  {failedControls > 0 && (
                    <p className="text-muted-foreground leading-relaxed mt-3">
                      The estimated regulatory and financial exposure from unresolved findings is{" "}
                      <strong className="text-yellow-400">{financialRisk}</strong>. Immediate remediation of critical
                      controls is strongly recommended to reduce regulatory risk under NCA CCC, SeHE, and HIPAA
                      frameworks applicable to your organization.
                    </p>
                  )}
                  <p className="text-muted-foreground leading-relaxed mt-3">
                    Detailed technical findings, remediation commands, and AI-generated explanations are available
                    in the full compliance report accessible to your security and IT teams.
                  </p>
                </div>
                <div className="mt-4 flex gap-3">
                  <Button onClick={() => navigate(`/results/${latestScan.id}`)}>
                    View Full Technical Report
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/scan/new")}>
                    Run New Assessment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
