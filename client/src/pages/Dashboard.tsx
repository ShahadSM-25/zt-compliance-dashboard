import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { HealthComplyLogo } from "@/components/HealthComplyLogo";
import {
  Plus,
  BarChart3,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Cloud,
  MoreVertical,
  Trash2,
  Eye,
  RefreshCw,
  LogOut,
  User,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

function StatusBadge({ status }: { status: string }) {
  if (status === "completed")
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1 text-xs">
        <CheckCircle2 className="h-3 w-3" /> Completed
      </Badge>
    );
  if (status === "running")
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1 text-xs">
        <Loader2 className="h-3 w-3 animate-spin" /> Running
      </Badge>
    );
  if (status === "failed")
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 gap-1 text-xs">
        <XCircle className="h-3 w-3" /> Failed
      </Badge>
    );
  return (
    <Badge variant="secondary" className="gap-1 text-xs">
      <Clock className="h-3 w-3" /> Pending
    </Badge>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground text-sm">—</span>;
  const color = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600";
  return <span className={`font-bold text-sm ${color}`}>{score}%</span>;
}

export default function Dashboard() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const [deleteScanId, setDeleteScanId] = useState<number | null>(null);

  const { data: scans, isLoading, refetch } = trpc.scan.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });
  const { data: stats } = trpc.scan.stats.useQuery(undefined, { enabled: isAuthenticated });

  const deleteMutation = trpc.scan.delete.useMutation({
    onSuccess: () => {
      toast.success("Scan deleted");
      refetch();
      setDeleteScanId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-sm text-center p-8">
          <div className="mx-auto mb-4 flex justify-center"><HealthComplyLogo size={90} showText={false} /></div>
          <h2 className="text-xl font-bold mb-2">Sign In Required</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Please sign in to access your compliance dashboard.
          </p>
          <Button onClick={() => { window.location.href = getLoginUrl(); }} className="w-full">
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  const runningScans = scans?.filter((s) => s.status === "running" || s.status === "pending") ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Nav ─────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <HealthComplyLogo size={90} />
            <Badge variant="secondary" className="text-xs font-mono hidden sm:flex">SA</Badge>
          </div>
          <div className="flex items-center gap-2">
            {runningScans.length > 0 && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" /> {runningScans.length} running
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:block max-w-32 truncate">{user?.name ?? user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user?.role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Shield className="h-4 w-4 mr-2" /> Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="h-4 w-4 mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Compliance Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Monitor and manage your Zero Trust compliance assessments.
            </p>
          </div>
          <Button onClick={() => navigate("/scan/new")}>
            <Plus className="h-4 w-4 mr-2" /> New Scan
          </Button>
        </div>

        {/* ── Stats Cards ─────────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-full bg-primary/10 p-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Total Scans</span>
              </div>
              <p className="text-3xl font-bold">{stats?.total ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-full bg-emerald-100 p-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Completed</span>
              </div>
              <p className="text-3xl font-bold text-emerald-600">{stats?.completed ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-full bg-blue-100 p-2">
                  <HealthComplyLogo size={16} showText={false} />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Avg. Score</span>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                —
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-full bg-amber-100 p-2">
                  <Loader2 className="h-4 w-4 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Running</span>
              </div>
              <p className="text-3xl font-bold text-amber-600">{runningScans.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Running Scans Alert ─────────────────────────────────────────── */}
        {runningScans.length > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <div>
                <p className="text-sm font-semibold text-blue-800">
                  {runningScans.length} scan{runningScans.length > 1 ? "s" : ""} in progress
                </p>
                <p className="text-xs text-blue-600">
                  {runningScans.map((s) => s.systemName).join(", ")}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
              onClick={() => navigate(`/scan/${runningScans[0].id}`)}
            >
              View Progress
            </Button>
          </div>
        )}

        {/* ── Scan History Table ──────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Scan History</h2>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading scans…
            </div>
          ) : !scans || scans.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="mx-auto mb-4 flex justify-center opacity-30"><HealthComplyLogo size={90} showText={false} /></div>
                <h3 className="font-semibold text-muted-foreground mb-2">No scans yet</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Run your first compliance assessment to see results here.
                </p>
                <Button onClick={() => navigate("/scan/new")}>
                  <Plus className="h-4 w-4 mr-2" /> Start First Scan
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="divide-y divide-border">
                {scans.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center gap-4 px-4 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{scan.systemName}</span>
                        <StatusBadge status={scan.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Cloud className="h-3 w-3" />
                          {scan.cloudProvider?.toUpperCase() ?? "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {scan.createdAt ? new Date(scan.createdAt).toLocaleString() : "—"}
                        </span>
                        {scan.systemDescription && (
                          <span className="hidden sm:block truncate max-w-48">{scan.systemDescription}</span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right hidden sm:block">
                      <ScoreBadge score={null} />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {(scan.status === "running" || scan.status === "pending") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => navigate(`/scan/${scan.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Watch
                        </Button>
                      )}
                      {scan.status === "completed" && (
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => navigate(`/results/${scan.id}`)}
                        >
                          <BarChart3 className="h-3.5 w-3.5 mr-1" /> Results
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {scan.status === "completed" && (
                            <DropdownMenuItem onClick={() => navigate(`/results/${scan.id}`)}>
                              <Eye className="h-4 w-4 mr-2" /> View Results
                            </DropdownMenuItem>
                          )}
                          {(scan.status === "running" || scan.status === "pending") && (
                            <DropdownMenuItem onClick={() => navigate(`/scan/${scan.id}`)}>
                              <Eye className="h-4 w-4 mr-2" /> Watch Progress
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteScanId(scan.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteScanId !== null} onOpenChange={() => setDeleteScanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scan</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the scan and all its results. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteScanId && deleteMutation.mutate({ scanId: deleteScanId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
