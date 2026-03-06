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
} from "lucide-react";
import { getLoginUrl } from "@/const";

type CloudProvider = "oci" | "aws" | "azure";
type AuthMethod = "oauth2" | "api_key" | "bearer";
type AgentType = "node_exporter" | "osquery" | "none";

interface HostEntry {
  id: string;
  name: string;
  ip: string;
  agentPort: string;
  agentType: AgentType;
}

const STEPS = [
  { id: 1, label: "System Info", icon: Info },
  { id: 2, label: "Cloud Config", icon: Cloud },
  { id: 3, label: "Application API", icon: Server },
  { id: 4, label: "Target Hosts", icon: ShieldCheck },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, idx) => {
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
            {idx < STEPS.length - 1 && (
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

  // Step 1: System Info
  const [systemName, setSystemName] = useState("");
  const [systemDescription, setSystemDescription] = useState("");

  // Step 2: Cloud Config
  const [cloudProvider, setCloudProvider] = useState<CloudProvider>("oci");
  const [ociCompartmentId, setOciCompartmentId] = useState("");
  const [awsAccountId, setAwsAccountId] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [azureSubscriptionId, setAzureSubscriptionId] = useState("");
  const [azureTenantId, setAzureTenantId] = useState("");

  // Step 3: Application API
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("oauth2");
  const [tokenUrl, setTokenUrl] = useState("");
  const [clientIdEnv, setClientIdEnv] = useState("HIS_CLIENT_ID");
  const [clientSecretEnv, setClientSecretEnv] = useState("HIS_CLIENT_SECRET");
  const [apiKeyEnv, setApiKeyEnv] = useState("HIS_API_KEY");

  // Step 4: Target Hosts
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

  const canProceed = () => {
    if (step === 1) return systemName.trim().length > 0;
    if (step === 2) {
      if (cloudProvider === "oci") return ociCompartmentId.trim().length > 0;
      if (cloudProvider === "aws") return awsAccountId.trim().length > 0;
      if (cloudProvider === "azure") return azureSubscriptionId.trim().length > 0;
    }
    if (step === 3) return apiBaseUrl.trim().length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const configSnapshot = {
        system: { name: systemName, description: systemDescription },
        cloud: {
          provider: cloudProvider,
          ...(cloudProvider === "oci" && { compartmentId: ociCompartmentId }),
          ...(cloudProvider === "aws" && { accountId: awsAccountId, region: awsRegion }),
          ...(cloudProvider === "azure" && {
            subscriptionId: azureSubscriptionId,
            tenantId: azureTenantId,
          }),
        },
        application: {
          baseUrl: apiBaseUrl,
          authentication: {
            method: authMethod,
            ...(authMethod === "oauth2" && { tokenUrl, clientIdEnv, clientSecretEnv }),
            ...(authMethod === "api_key" && { apiKeyEnv }),
          },
        },
        hosts: hosts.map((h) => ({
          name: h.name,
          ip: h.ip,
          agentPort: parseInt(h.agentPort) || 9100,
          agentType: h.agentType,
        })),
      };

      const scan = await createScan.mutateAsync({
        systemName,
        systemDescription,
        cloudProvider,
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
        <StepIndicator current={step} />

        {/* ── Step 1: System Info ─────────────────────────────────────────── */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                System Information
              </CardTitle>
              <CardDescription>
                Identify the healthcare system you want to assess for compliance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="sysname">
                  System Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sysname"
                  placeholder="e.g. National HIS — Production"
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
                <strong>What will be assessed:</strong> 84 Zero Trust controls across Identity,
                Devices, Networks, Applications, and Cross-Cutting Capabilities — mapped to CCC,
                HIPAA, and SeHE standards.
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Cloud Config ────────────────────────────────────────── */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-primary" />
                Cloud Infrastructure
              </CardTitle>
              <CardDescription>
                Configure access to your cloud provider for infrastructure evidence collection.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Cloud Provider</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(["oci", "aws", "azure"] as CloudProvider[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCloudProvider(p)}
                      className={`rounded-lg border-2 p-3 text-center transition-all ${
                        cloudProvider === p
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/40"
                      }`}
                    >
                      <div className="font-bold text-sm uppercase">{p}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {p === "oci" ? "Oracle Cloud" : p === "aws" ? "Amazon Web Services" : "Microsoft Azure"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {cloudProvider === "oci" && (
                <div className="space-y-2">
                  <Label htmlFor="compartment">
                    Compartment OCID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="compartment"
                    placeholder="ocid1.compartment.oc1..aaaa..."
                    value={ociCompartmentId}
                    onChange={(e) => setOciCompartmentId(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Found in OCI Console → Identity → Compartments. Credentials are read from{" "}
                    <code className="bg-muted px-1 rounded">~/.oci/config</code>.
                  </p>
                </div>
              )}

              {cloudProvider === "aws" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="awsacct">
                      AWS Account ID <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="awsacct"
                      placeholder="123456789012"
                      value={awsAccountId}
                      onChange={(e) => setAwsAccountId(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="awsregion">Region</Label>
                    <Input
                      id="awsregion"
                      placeholder="us-east-1"
                      value={awsRegion}
                      onChange={(e) => setAwsRegion(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Credentials are read from <code className="bg-muted px-1 rounded">AWS_ACCESS_KEY_ID</code> and{" "}
                    <code className="bg-muted px-1 rounded">AWS_SECRET_ACCESS_KEY</code> environment variables.
                  </p>
                </div>
              )}

              {cloudProvider === "azure" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="azsub">
                      Subscription ID <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="azsub"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      value={azureSubscriptionId}
                      onChange={(e) => setAzureSubscriptionId(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aztenant">Tenant ID</Label>
                    <Input
                      id="aztenant"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      value={azureTenantId}
                      onChange={(e) => setAzureTenantId(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Application API ─────────────────────────────────────── */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                Application API Configuration
              </CardTitle>
              <CardDescription>
                Configure access to the HIS application API for runtime evidence collection.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="apiurl">
                  API Base URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="apiurl"
                  placeholder="https://api.your-his.com/v1"
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
                    <SelectItem value="bearer">Static Bearer Token</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {authMethod === "oauth2" && (
                <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/30">
                  <div className="space-y-2">
                    <Label htmlFor="tokenurl">Token URL</Label>
                    <Input
                      id="tokenurl"
                      placeholder="https://auth.your-his.com/oauth/token"
                      value={tokenUrl}
                      onChange={(e) => setTokenUrl(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="clientidenv">Client ID Env Var</Label>
                      <Input
                        id="clientidenv"
                        value={clientIdEnv}
                        onChange={(e) => setClientIdEnv(e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientsecretenv">Client Secret Env Var</Label>
                      <Input
                        id="clientsecretenv"
                        value={clientSecretEnv}
                        onChange={(e) => setClientSecretEnv(e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {authMethod === "api_key" && (
                <div className="space-y-2 rounded-lg border border-border p-4 bg-muted/30">
                  <Label htmlFor="apikeyenv">API Key Environment Variable</Label>
                  <Input
                    id="apikeyenv"
                    value={apiKeyEnv}
                    onChange={(e) => setApiKeyEnv(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    The tool will read the API key from this environment variable at runtime.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Step 4: Target Hosts ────────────────────────────────────────── */}
        {step === 4 && (
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
                {hosts.length} host{hosts.length !== 1 ? "s" : ""}. The scan will evaluate all 84
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

          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="px-8">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting Scan...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" /> Start Compliance Scan
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
