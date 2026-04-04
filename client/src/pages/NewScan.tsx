import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShieldCheck,
  Cloud,
  Server,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Info,
  FlaskConical,
  Globe,
  ShieldAlert,
  ShieldOff,
  Shuffle,
} from "lucide-react";
import { getLoginUrl } from "@/const";

type CloudProvider = "oci" | "aws" | "azure";
type AuthMethod = "oauth2" | "api_key" | "bearer";
type AgentType = "node_exporter" | "osquery" | "none";
type ScanMode = "scenario_secure" | "scenario_insecure" | "scenario_mixed" | "real";

interface HostEntry {
  id: string;
  name: string;
  ip: string;
  agentPort: string;
  agentType: AgentType;
}

// ── Scenario definitions ──────────────────────────────────────────────────────
const SCENARIOS: {
  id: ScanMode;
  label: string;
  description: string;
  badge: string;
  badgeColor: string;
  icon: React.ElementType;
  expectedScore: string;
  details: string[];
}[] = [
  {
    id: "scenario_secure",
    label: "Secure Environment",
    description: "Simulates a fully hardened HIS deployment with all security controls properly configured.",
    badge: "Test Scenario",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: ShieldCheck,
    expectedScore: "~85%",
    details: [
      "MFA enforced on all accounts",
      "TLS 1.2+ on all endpoints",
      "Audit logging fully enabled",
      "Encryption at rest configured",
      "Role-based access control active",
    ],
  },
  {
    id: "scenario_insecure",
    label: "Insecure Environment",
    description: "Simulates a poorly configured HIS with multiple security gaps — useful for demonstrating violation detection.",
    badge: "Test Scenario",
    badgeColor: "bg-red-100 text-red-700 border-red-200",
    icon: ShieldOff,
    expectedScore: "~15%",
    details: [
      "No MFA configured",
      "Weak authentication methods",
      "Missing audit logs",
      "Unencrypted data at rest",
      "Overly permissive access policies",
    ],
  },
  {
    id: "scenario_mixed",
    label: "Mixed Environment",
    description: "Simulates a partially hardened HIS — some controls pass, others fail. Reflects a typical real-world state.",
    badge: "Test Scenario",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Shuffle,
    expectedScore: "~50%",
    details: [
      "MFA on some accounts only",
      "Partial TLS coverage",
      "Incomplete audit logging",
      "Mixed encryption posture",
      "Some access controls missing",
    ],
  },
  {
    id: "real",
    label: "Real Environment",
    description: "Connect to your actual HIS system and cloud infrastructure for a live compliance assessment.",
    badge: "Live Scan",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Globe,
    expectedScore: "Actual",
    details: [
      "Connects to your real HIS API",
      "Collects live cloud infrastructure evidence",
      "Evaluates OS-level metrics via Node Exporter",
      "Results reflect your actual compliance posture",
      "Requires valid credentials and network access",
    ],
  },
];

const STEPS = [
  { id: 1, label: "Scan Mode", icon: FlaskConical },
  { id: 2, label: "System Info", icon: Info },
  { id: 3, label: "Cloud Config", icon: Cloud },
  { id: 4, label: "Application API", icon: Server },
  { id: 5, label: "Target Hosts", icon: ShieldCheck },
];

// For test scenarios, steps 3-5 are skipped
const REAL_STEPS = STEPS;
const SCENARIO_STEPS = [
  { id: 1, label: "Scan Mode", icon: FlaskConical },
  { id: 2, label: "System Info", icon: Info },
];

function StepIndicator({ current, isReal }: { current: number; isReal: boolean }) {
  const steps = isReal ? REAL_STEPS : SCENARIO_STEPS;
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isCompleted = current > step.id;
        const isCurrent = current === step.id;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCurrent
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted-foreground/30 bg-background text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={`mt-1 text-xs font-medium hidden sm:block ${
                  isCurrent ? "text-primary" : isCompleted ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 w-12 sm:w-20 mx-1 mb-4 transition-all ${
                  current > step.id ? "bg-primary" : "bg-muted-foreground/20"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function NewScan() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Scan Mode
  const [scanMode, setScanMode] = useState<ScanMode | null>(null);
  const isReal = scanMode === "real";

  // Step 2: System Info
  const [systemName, setSystemName] = useState("");
  const [systemDescription, setSystemDescription] = useState("");

  // Step 3: Cloud Config (real only)
  const [cloudProvider, setCloudProvider] = useState<CloudProvider>("oci");
  const [ociCompartmentId, setOciCompartmentId] = useState("");
  const [awsAccountId, setAwsAccountId] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [azureSubscriptionId, setAzureSubscriptionId] = useState("");
  const [azureTenantId, setAzureTenantId] = useState("");

  // Step 4: Application API (real only)
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("oauth2");
  const [tokenUrl, setTokenUrl] = useState("");
  const [clientIdEnv, setClientIdEnv] = useState("HIS_CLIENT_ID");
  const [clientSecretEnv, setClientSecretEnv] = useState("HIS_CLIENT_SECRET");
  const [apiKeyEnv, setApiKeyEnv] = useState("HIS_API_KEY");

  // Step 5: Target Hosts (real only)
  const [hosts, setHosts] = useState<HostEntry[]>([
    { id: "1", name: "app-server-01", ip: "", agentPort: "9100", agentType: "node_exporter" },
  ]);

  const createScan = trpc.scan.create.useMutation();
  const startScan = trpc.scan.start.useMutation();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-sm text-center p-8">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Please sign in to start a compliance scan.
          </p>
          <Button onClick={() => { window.location.href = getLoginUrl(); }} className="w-full">
            Sign In to Continue
          </Button>
        </Card>
      </div>
    );
  }

  const addHost = () => {
    setHosts((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "", ip: "", agentPort: "9100", agentType: "node_exporter" },
    ]);
  };

  const removeHost = (id: string) => {
    setHosts((prev) => prev.filter((h) => h.id !== id));
  };

  const updateHost = (id: string, field: keyof HostEntry, value: string) => {
    setHosts((prev) => prev.map((h) => (h.id === id ? { ...h, [field]: value } : h)));
  };

  // Max step depends on mode
  const maxStep = isReal ? 5 : 2;

  const canProceed = () => {
    if (step === 1) return scanMode !== null;
    if (step === 2) return systemName.trim().length > 0;
    if (step === 3) {
      if (cloudProvider === "oci") return ociCompartmentId.trim().length > 0;
      if (cloudProvider === "aws") return awsAccountId.trim().length > 0;
      if (cloudProvider === "azure") return azureSubscriptionId.trim().length > 0;
    }
    if (step === 4) return apiBaseUrl.trim().length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const configSnapshot: Record<string, unknown> = {
        scanMode,
        system: { name: systemName, description: systemDescription },
      };

      if (isReal) {
        configSnapshot.cloud = {
          provider: cloudProvider,
          ...(cloudProvider === "oci" && { compartmentId: ociCompartmentId }),
          ...(cloudProvider === "aws" && { accountId: awsAccountId, region: awsRegion }),
          ...(cloudProvider === "azure" && {
            subscriptionId: azureSubscriptionId,
            tenantId: azureTenantId,
          }),
        };
        configSnapshot.application = {
          baseUrl: apiBaseUrl,
          authentication: {
            method: authMethod,
            ...(authMethod === "oauth2" && { tokenUrl, clientIdEnv, clientSecretEnv }),
            ...(authMethod === "api_key" && { apiKeyEnv }),
          },
        };
        configSnapshot.hosts = hosts.map((h) => ({
          name: h.name,
          ip: h.ip,
          agentPort: parseInt(h.agentPort) || 9100,
          agentType: h.agentType,
        }));
      }

      const scan = await createScan.mutateAsync({
        systemName,
        systemDescription,
        cloudProvider: isReal ? cloudProvider : "oci",
        configSnapshot,
      });

      if (!scan) throw new Error("Failed to create scan");

      await startScan.mutateAsync({ scanId: scan.id });
      toast.success("Scan started successfully!");
      navigate(`/scan/${scan.id}`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to start scan");
      setIsSubmitting(false);
    }
  };

  const selectedScenario = SCENARIOS.find((s) => s.id === scanMode);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="font-semibold">New Compliance Scan</span>
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-2xl mx-auto">
        <StepIndicator current={step} isReal={isReal} />

        {/* ── Step 1: Scan Mode ───────────────────────────────────────────── */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-primary" />
                Choose Scan Mode
              </CardTitle>
              <CardDescription>
                Select a pre-defined test scenario to evaluate the engine, or connect to your real
                environment for a live compliance assessment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {SCENARIOS.map((scenario) => {
                const Icon = scenario.icon;
                const isSelected = scanMode === scenario.id;
                return (
                  <button
                    key={scenario.id}
                    onClick={() => setScanMode(scenario.id)}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all hover:border-primary/60 focus:outline-none ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{scenario.label}</span>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${scenario.badgeColor}`}
                          >
                            {scenario.badge}
                          </span>
                          <span className="ml-auto text-xs text-muted-foreground font-mono">
                            Expected: {scenario.expectedScore}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          {scenario.description}
                        </p>
                        {isSelected && (
                          <ul className="mt-2 space-y-0.5">
                            {scenario.details.map((d, i) => (
                              <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                                {d}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      )}
                    </div>
                  </button>
                );
              })}

              {scanMode && !isReal && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                  <strong>Test Scenario:</strong> This will run the compliance engine against
                  pre-defined evidence files. No real system credentials are required. Results are
                  deterministic and reproducible.
                </div>
              )}
              {isReal && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
                  <strong>Live Scan:</strong> You will be asked to provide your HIS API URL, cloud
                  credentials, and target host details in the next steps.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: System Info ─────────────────────────────────────────── */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                System Information
              </CardTitle>
              <CardDescription>
                {isReal
                  ? "Identify the healthcare system you want to assess for compliance."
                  : `Running: ${selectedScenario?.label} — give this scan a name for your records.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {selectedScenario && (
                <div
                  className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                    isReal
                      ? "bg-blue-50 border-blue-200 text-blue-800"
                      : "bg-muted/40 border-border text-muted-foreground"
                  }`}
                >
                  {(() => {
                    const Icon = selectedScenario.icon;
                    return <Icon className="h-4 w-4 shrink-0" />;
                  })()}
                  <span>
                    <strong>{selectedScenario.label}</strong>
                    {!isReal && ` — Expected score: ${selectedScenario.expectedScore}`}
                  </span>
                  <span
                    className={`ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${selectedScenario.badgeColor}`}
                  >
                    {selectedScenario.badge}
                  </span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="sysname">
                  System Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sysname"
                  placeholder={isReal ? "e.g. National HIS — Production" : `e.g. ${selectedScenario?.label} Test`}
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sysdesc">Description (optional)</Label>
                <Textarea
                  id="sysdesc"
                  placeholder="Brief description of the system and its environment..."
                  rows={3}
                  value={systemDescription}
                  onChange={(e) => setSystemDescription(e.target.value)}
                />
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
                <strong>What will be assessed:</strong> 98 Zero Trust controls across Identity,
                Devices, Networks, Applications, and Cross-Cutting Capabilities — mapped to CCC,
                HIPAA, and SeHE standards.
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Cloud Config (real only) ────────────────────────────── */}
        {step === 3 && isReal && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-primary" />
                Cloud Provider
              </CardTitle>
              <CardDescription>
                Select your cloud provider and provide the necessary identifiers for evidence
                collection.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Cloud Provider</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["oci", "aws", "azure"] as CloudProvider[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setCloudProvider(p)}
                      className={`rounded-lg border-2 py-3 text-sm font-semibold uppercase tracking-wide transition-all ${
                        cloudProvider === p
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {cloudProvider === "oci" && (
                <div className="space-y-2">
                  <Label htmlFor="oci-compartment">
                    Compartment ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="oci-compartment"
                    placeholder="ocid1.compartment.oc1..aaaa..."
                    value={ociCompartmentId}
                    onChange={(e) => setOciCompartmentId(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              )}
              {cloudProvider === "aws" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="aws-account">
                      AWS Account ID <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="aws-account"
                      placeholder="123456789012"
                      value={awsAccountId}
                      onChange={(e) => setAwsAccountId(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aws-region">Region</Label>
                    <Input
                      id="aws-region"
                      placeholder="us-east-1"
                      value={awsRegion}
                      onChange={(e) => setAwsRegion(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </>
              )}
              {cloudProvider === "azure" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="azure-sub">
                      Subscription ID <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="azure-sub"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      value={azureSubscriptionId}
                      onChange={(e) => setAzureSubscriptionId(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="azure-tenant">Tenant ID</Label>
                    <Input
                      id="azure-tenant"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      value={azureTenantId}
                      onChange={(e) => setAzureTenantId(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Step 4: Application API (real only) ─────────────────────────── */}
        {step === 4 && isReal && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                HIS Application API
              </CardTitle>
              <CardDescription>
                Configure how the compliance engine connects to your Health Information System.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="api-url">
                  Base URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="api-url"
                  placeholder="https://his.hospital.sa/api/v1"
                  value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Authentication Method</Label>
                <Select value={authMethod} onValueChange={(v) => setAuthMethod(v as AuthMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oauth2">OAuth 2.0 Client Credentials</SelectItem>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {authMethod === "oauth2" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="token-url">Token URL</Label>
                    <Input
                      id="token-url"
                      placeholder="https://auth.hospital.sa/oauth/token"
                      value={tokenUrl}
                      onChange={(e) => setTokenUrl(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="client-id-env">Client ID Env Var</Label>
                      <Input
                        id="client-id-env"
                        placeholder="HIS_CLIENT_ID"
                        value={clientIdEnv}
                        onChange={(e) => setClientIdEnv(e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client-secret-env">Client Secret Env Var</Label>
                      <Input
                        id="client-secret-env"
                        placeholder="HIS_CLIENT_SECRET"
                        value={clientSecretEnv}
                        onChange={(e) => setClientSecretEnv(e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </>
              )}
              {authMethod === "api_key" && (
                <div className="space-y-2">
                  <Label htmlFor="api-key-env">API Key Env Var</Label>
                  <Input
                    id="api-key-env"
                    placeholder="HIS_API_KEY"
                    value={apiKeyEnv}
                    onChange={(e) => setApiKeyEnv(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Step 5: Target Hosts (real only) ────────────────────────────── */}
        {step === 5 && isReal && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Target Hosts
              </CardTitle>
              <CardDescription>
                Add the servers to assess for OS-level compliance. Each host needs a monitoring
                agent (Node Exporter or osquery) installed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hosts.map((host, idx) => (
                <div
                  key={host.id}
                  className="rounded-lg border border-border p-4 space-y-3 bg-muted/20"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      Host {idx + 1}
                    </Badge>
                    {hosts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => removeHost(host.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Hostname</Label>
                      <Input
                        placeholder="app-server-01"
                        value={host.name}
                        onChange={(e) => updateHost(host.id, "name", e.target.value)}
                        className="h-8 text-sm font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">IP Address</Label>
                      <Input
                        placeholder="10.0.1.10"
                        value={host.ip}
                        onChange={(e) => updateHost(host.id, "ip", e.target.value)}
                        className="h-8 text-sm font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Agent Type</Label>
                      <Select
                        value={host.agentType}
                        onValueChange={(v) => updateHost(host.id, "agentType", v)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="node_exporter">Node Exporter</SelectItem>
                          <SelectItem value="osquery">osquery</SelectItem>
                          <SelectItem value="none">No Agent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Agent Port</Label>
                      <Input
                        placeholder="9100"
                        value={host.agentPort}
                        onChange={(e) => updateHost(host.id, "agentPort", e.target.value)}
                        className="h-8 text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={addHost} className="w-full">
                <Plus className="h-4 w-4 mr-2" /> Add Another Host
              </Button>

              {/* Summary */}
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
                <strong>Ready to scan:</strong> {systemName} on {cloudProvider.toUpperCase()} with{" "}
                {hosts.length} host{hosts.length !== 1 ? "s" : ""}. The scan will evaluate all 98
                controls and generate a full compliance report.
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Navigation Buttons ──────────────────────────────────────────── */}
        <div className="mt-6 flex justify-between">
          <Button
            variant="outline"
            onClick={() => (step > 1 ? setStep(step - 1) : navigate("/dashboard"))}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {step === 1 ? "Cancel" : "Back"}
          </Button>

          {step < maxStep ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting || !canProceed()} className="px-8">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting Scan...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  {isReal ? "Start Live Scan" : "Run Test Scenario"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
