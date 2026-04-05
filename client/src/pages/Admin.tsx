import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { HealthComplyLogo } from "@/components/HealthComplyLogo";
import {
  ArrowLeft,
  Users,
  BarChart3,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Cloud,
  Shield,
  Eye,
} from "lucide-react";
import { getLoginUrl } from "@/const";

function StatusBadge({ status }: { status: string }) {
  if (status === "completed")
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1 text-xs"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>;
  if (status === "running")
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1 text-xs"><Loader2 className="h-3 w-3 animate-spin" /> Running</Badge>;
  if (status === "failed")
    return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1 text-xs"><XCircle className="h-3 w-3" /> Failed</Badge>;
  return <Badge variant="secondary" className="gap-1 text-xs"><Clock className="h-3 w-3" /> Pending</Badge>;
}

export default function Admin() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const { data: allScans, isLoading: scansLoading } = trpc.admin.listAllScans.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });
  const { data: allUsers, isLoading: usersLoading } = trpc.admin.listAllUsers.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-sm text-center p-8">
          <div className="mx-auto mb-4 flex justify-center"><HealthComplyLogo size={70} showText={false} /></div>
          <h2 className="text-xl font-bold mb-2">Sign In Required</h2>
          <Button onClick={() => { window.location.href = getLoginUrl(); }} className="w-full mt-4">Sign In</Button>
        </Card>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-sm text-center p-8">
          <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground text-sm mb-4">You need admin privileges to access this page.</p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  const completedScans = allScans?.filter((s) => s.status === "completed").length ?? 0;
  const runningScans = allScans?.filter((s) => s.status === "running" || s.status === "pending").length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Button>
          <div className="h-4 w-px bg-border" />
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold">Admin Panel</span>
          <Badge className="bg-purple-100 text-purple-700 text-xs">Admin</Badge>
        </div>
      </div>

      <div className="container py-8 space-y-6">
        <h1 className="text-2xl font-bold">System Overview</h1>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card><CardContent className="pt-5">
            <p className="text-sm text-muted-foreground mb-1">Total Scans</p>
            <p className="text-3xl font-bold">{allScans?.length ?? 0}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <p className="text-sm text-muted-foreground mb-1">Completed</p>
            <p className="text-3xl font-bold text-emerald-600">{completedScans}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <p className="text-sm text-muted-foreground mb-1">Running</p>
            <p className="text-3xl font-bold text-blue-600">{runningScans}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <p className="text-sm text-muted-foreground mb-1">Total Users</p>
            <p className="text-3xl font-bold text-purple-600">{allUsers?.length ?? 0}</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="scans">
          <TabsList>
            <TabsTrigger value="scans" className="gap-2">
              <BarChart3 className="h-4 w-4" /> All Scans
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" /> Users
            </TabsTrigger>
          </TabsList>

          {/* All Scans Tab */}
          <TabsContent value="scans" className="mt-4">
            {scansLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="divide-y divide-border">
                  {!allScans || allScans.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">No scans found.</div>
                  ) : (
                    allScans.map((scan) => (
                      <div key={scan.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{scan.systemName}</span>
                            <StatusBadge status={scan.status} />
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Cloud className="h-3 w-3" />{scan.cloudProvider?.toUpperCase()}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{scan.createdAt ? new Date(scan.createdAt).toLocaleString() : "—"}</span>
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" />User #{scan.userId}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {scan.status === "completed" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/results/${scan.id}`)}>
                              <Eye className="h-3 w-3 mr-1" /> Results
                            </Button>
                          )}
                          {(scan.status === "running" || scan.status === "pending") && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/scan/${scan.id}`)}>
                              <Eye className="h-3 w-3 mr-1" /> Watch
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-4">
            {usersLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="divide-y divide-border">
                  {!allUsers || allUsers.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">No users found.</div>
                  ) : (
                    allUsers.map((u) => (
                      <div key={u.id} className="flex items-center gap-4 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{u.name ?? "—"}</span>
                            {u.role === "admin" && (
                              <Badge className="bg-purple-100 text-purple-700 text-xs">Admin</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{u.email ?? u.openId}</p>
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0">
                          Joined {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
