import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  ShieldCheck,
  Cloud,
  Cpu,
  Network,
  AppWindow,
  Layers,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  FileText,
  Zap,
  Lock,
  Globe,
  Database,
} from "lucide-react";

const PILLARS = [
  {
    icon: Lock,
    name: "Identity",
    color: "text-indigo-600",
    bg: "bg-indigo-50 border-indigo-200",
    controls: 22,
    description:
      "IAM provisioning, MFA enforcement, privileged access management, RBAC, and Zero Trust identity verification across all users and service accounts.",
  },
  {
    icon: Cpu,
    name: "Devices",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    controls: 5,
    description:
      "Endpoint security, MDM compliance, EDR coverage, patch management, device hardening, and full disk encryption for all managed endpoints.",
  },
  {
    icon: Network,
    name: "Networks",
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
    controls: 5,
    description:
      "Microsegmentation, encrypted transit, WAF, DDoS protection, network monitoring, and clinical network isolation for healthcare environments.",
  },
  {
    icon: AppWindow,
    name: "Applications & Workloads",
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    controls: 29,
    description:
      "Vulnerability management, secure SDLC, API security, container scanning, secrets management, and HL7/FHIR interface security.",
  },
  {
    icon: Database,
    name: "Data",
    color: "text-rose-600",
    bg: "bg-rose-50 border-rose-200",
    controls: 17,
    description:
      "Data classification, encryption at rest and in transit, backup & recovery, data integrity, and ePHI protection aligned with HIPAA requirements.",
  },
  {
    icon: Layers,
    name: "Visibility & Analytics",
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200",
    controls: 20,
    description:
      "SIEM, audit logging, continuous monitoring, incident response, key management, and compliance dashboards for real-time security visibility.",
  },
];

const STANDARDS = [
  { name: "CCC", full: "Cloud Controls Catalog", color: "bg-blue-600" },
  { name: "HIPAA", full: "Health Insurance Portability & Accountability Act", color: "bg-green-600" },
  { name: "SeHE", full: "Saudi Health eHealth Standards", color: "bg-purple-600" },
];

const FEATURES = [
  {
    icon: Zap,
    title: "Real-Time Evidence Collection",
    description:
      "Connects directly to your cloud provider APIs (OCI, AWS, Azure), HIS application endpoints, and OS monitoring agents to gather live evidence.",
  },
  {
    icon: ShieldCheck,
    title: "OPA Policy Evaluation",
    description:
      "Uses Open Policy Agent with Rego policies to evaluate each control deterministically against your actual infrastructure configuration.",
  },
  {
    icon: BarChart3,
    title: "Multi-Dimensional Reporting",
    description:
      "View compliance scores broken down by Zero Trust pillar, severity level, and regulatory standard (CCC, HIPAA, SeHE) in interactive charts.",
  },
  {
    icon: FileText,
    title: "Exportable Audit Reports",
    description:
      "Generate PDF and JSON compliance reports with control status, violation details, and remediation guidance ready for auditors.",
  },
  {
    icon: Globe,
    title: "Multi-Cloud Support",
    description:
      "Supports Oracle Cloud Infrastructure, Amazon Web Services, and Microsoft Azure with cloud-native API integrations for each provider.",
  },
  {
    icon: CheckCircle2,
    title: "Scan History & Comparison",
    description:
      "Track compliance posture over time with persistent scan history. Compare any two assessments to measure improvement or detect regressions.",
  },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const handleStartScan = () => {
    if (isAuthenticated) {
      navigate("/scan/new");
    } else {
      window.location.href = getLoginUrl();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold tracking-tight">HealthComply</span>
            <Badge variant="secondary" className="text-xs font-mono">SA</Badge>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {user?.name ?? user?.email}
                </span>
                <Button onClick={() => navigate("/dashboard")} size="sm">
                  Dashboard <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button onClick={() => { window.location.href = getLoginUrl(); }} size="sm">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 py-24 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0di00aC0ydjRoLTR2Mmg0djRoMnYtNGg0di0yaC00em0wLTMwVjBoLTJ2NGgtNHYyaDR2NGgyVjZoNFY0aC00ek02IDM0di00SDR2NEgwdjJoNHY0aDJWNDBoNHYtMkg2ek02IDRWMEg0djRIMHYyaDR2NGgyVjZoNFY0SDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-6 border-blue-400/30 bg-blue-500/20 text-blue-200 hover:bg-blue-500/20">
              98 Controls · 6 Zero Trust Pillars · 3 Standards
            </Badge>
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Zero Trust Compliance
              <span className="block text-blue-400">Assessment Platform</span>
            </h1>
            <p className="mb-8 text-lg text-slate-300 sm:text-xl">
              Assess your healthcare system's compliance against 98 Zero Trust security controls
              spanning Identity, Devices, Networks, Applications, Data, and Visibility &amp; Analytics —
              aligned with CCC, HIPAA, and Saudi SeHE standards.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="bg-blue-500 text-white hover:bg-blue-400 px-8"
                onClick={handleStartScan}
              >
                Start Compliance Scan
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              {isAuthenticated && (
                <Button
                  size="lg"
                  variant="outline"className="border-white/20 text-white hover:bg-white/10 bg-transparent"
                  onClick={() => navigate("/history")}
                >
                  View Scan History
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ──────────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4">
            {[
              { value: "98", label: "Security Controls" },
              { value: "6", label: "Zero Trust Pillars" },
              { value: "3", label: "Regulatory Standards" },
              { value: "3", label: "Cloud Providers" },
            ].map((stat) => (
              <div key={stat.label} className="py-6 text-center">
                <div className="text-3xl font-bold text-primary">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Zero Trust Pillars ─────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Zero Trust Framework Coverage</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              The assessment evaluates your infrastructure across all six Zero Trust pillars as
              defined by the Saudi National Cybersecurity Authority (NCA) Cloud Controls Catalog.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <Card key={pillar.name} className={`border ${pillar.bg} transition-shadow hover:shadow-md`}>
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <div className={`rounded-lg p-2 ${pillar.bg}`}>
                        <Icon className={`h-5 w-5 ${pillar.color}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{pillar.name}</h3>
                        <span className="text-xs text-muted-foreground">{pillar.controls} controls</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
                  </CardContent>
                </Card>
              );
            })}
            {/* Standards card */}
            <Card className="border bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 transition-shadow hover:shadow-md sm:col-span-2 lg:col-span-1">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-slate-200 p-2">
                    <FileText className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Regulatory Standards</h3>
                    <span className="text-xs text-muted-foreground">3 frameworks mapped</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {STANDARDS.map((std) => (
                    <div key={std.name} className="flex items-start gap-2">
                      <span className={`mt-0.5 rounded px-1.5 py-0.5 text-xs font-bold text-white ${std.color}`}>
                        {std.name}
                      </span>
                      <span className="text-sm text-muted-foreground">{std.full}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-muted/20 py-20">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              A fully automated compliance engine that collects real evidence from your infrastructure
              and evaluates it against policy rules — no manual questionnaires.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex gap-4">
                  <div className="shrink-0 rounded-lg bg-primary/10 p-2.5 h-fit">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="border-t border-border py-20">
        <div className="container text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Ready to assess your compliance posture?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Configure your target system once, run the scan, and get a detailed compliance report
            in minutes. No agents to install — just API credentials.
          </p>
          <Button size="lg" className="px-10" onClick={handleStartScan}>
            Start Your First Scan
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            <span>HealthComply — Zero Trust Compliance Platform</span>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>CCC Framework</span>
            <span>·</span>
            <span>HIPAA</span>
            <span>·</span>
            <span>SeHE Standards</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
