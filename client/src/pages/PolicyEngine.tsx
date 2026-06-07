import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Upload, FileText, Cpu, CheckCircle2, Copy, Download, Loader2, AlertCircle, Sparkles, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { HealthComplyLogo } from "@/components/HealthComplyLogo";

interface ExtractedRule {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  regoCode: string;
  evidenceRequired: string[];
  testCases: { description: string; expected: "pass" | "fail" }[];
}

interface PolicyAnalysisResult {
  policyName: string;
  policyType: string;
  summary: string;
  totalRules: number;
  rules: ExtractedRule[];
  warnings: string[];
}

export default function PolicyEngine() {
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputMode, setInputMode] = useState<"upload" | "text">("upload");
  const [policyText, setPolicyText] = useState("");
  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<PolicyAnalysisResult | null>(null);
  const [selectedRule, setSelectedRule] = useState<ExtractedRule | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const analyzePolicy = trpc.ai.analyzePolicy.useMutation();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setPolicyText(text);
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async () => {
    if (!policyText.trim()) {
      toast.error("Please provide a policy document to analyze.");
      return;
    }
    setIsProcessing(true);
    setResult(null);
    try {
      const res = await analyzePolicy.mutateAsync({ policyText, fileName });
      setResult(res as PolicyAnalysisResult);
      if (res.rules.length > 0) setSelectedRule(res.rules[0] as ExtractedRule);
      toast.success(`Extracted ${res.rules.length} compliance rules successfully!`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to analyze policy");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadAllRego = () => {
    if (!result) return;
    const combined = result.rules
      .map((r) => `# Rule: ${r.id} - ${r.title}\n# Severity: ${r.severity}\n# Category: ${r.category}\n\n${r.regoCode}`)
      .join("\n\n" + "=".repeat(60) + "\n\n");
    const blob = new Blob([combined], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.policyName.replace(/\s+/g, "_")}_rego_policies.rego`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded all Rego policies!");
  };

  const severityColor: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
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
            <HealthComplyLogo size={90} showText={false} />
            <span className="font-semibold text-lg">AI Policy-to-Code Engine</span>
          </div>
          <Badge variant="outline" className="ml-auto bg-purple-500/10 text-purple-400 border-purple-500/30">
            <Sparkles className="h-3 w-3 mr-1" /> AI-Powered
          </Badge>
        </div>
      </div>

      <div className="container py-8 max-w-7xl">
        {/* Hero */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 text-sm text-purple-400 mb-4">
            <Cpu className="h-4 w-4" />
            Powered by Large Language Models
          </div>
          <h1 className="text-3xl font-bold mb-2">Policy-to-Code Automation</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Upload any regulatory policy document (NCA CCC, SeHE, HIPAA, ISO 27001, internal hospital policies) and our AI engine will automatically extract compliance rules and generate executable Rego code ready for OPA enforcement.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-400" />
                  Policy Input
                </CardTitle>
                <CardDescription>
                  Provide your policy document as a file upload or paste the text directly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "upload" | "text")}>
                  <TabsList className="w-full">
                    <TabsTrigger value="upload" className="flex-1">
                      <Upload className="h-4 w-4 mr-2" /> Upload File
                    </TabsTrigger>
                    <TabsTrigger value="text" className="flex-1">
                      <FileText className="h-4 w-4 mr-2" /> Paste Text
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="mt-4">
                    <div
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                      {fileName ? (
                        <div>
                          <p className="font-medium text-purple-400">{fileName}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {policyText.length.toLocaleString()} characters loaded
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium">Drop your policy file here</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Supports .txt, .md, .pdf (text), .docx (text)
                          </p>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.md,.pdf,.docx,.doc"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="text" className="mt-4">
                    <Textarea
                      placeholder="Paste your policy text here...&#10;&#10;Example:&#10;3.1 Access Control&#10;All systems must enforce multi-factor authentication for administrative access. Passwords must be at least 12 characters and rotated every 90 days..."
                      className="min-h-[200px] font-mono text-sm"
                      value={policyText}
                      onChange={(e) => setPolicyText(e.target.value)}
                    />
                  </TabsContent>
                </Tabs>

                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={handleAnalyze}
                  disabled={isProcessing || !policyText.trim()}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing Policy...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Extract Rules & Generate Rego
                    </>
                  )}
                </Button>

                {isProcessing && (
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-purple-400">AI Processing Pipeline</p>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>✓ Parsing policy document structure...</p>
                      <p>✓ Identifying compliance control statements...</p>
                      <p className="animate-pulse">⟳ Generating Rego policies with OPA syntax...</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Example Policies */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Try an Example Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "NCA CCC - Access Control Section", text: "CCC-01: Access Control Policy\n\nAll cloud-hosted systems must enforce role-based access control (RBAC). Administrative access must require multi-factor authentication (MFA). Service accounts must use dedicated credentials and must not share passwords with human users. Privileged access must be logged and audited. Access reviews must be conducted quarterly. Inactive accounts must be disabled after 90 days of inactivity." },
                  { label: "SeHE - Patient Data Protection", text: "SeHE Article 12: Patient Health Data Protection\n\nAll patient health records stored in cloud environments must be encrypted at rest using AES-256 or equivalent. Data transmission must use TLS 1.2 or higher. Patient data must not be stored outside the Kingdom of Saudi Arabia without explicit patient consent and regulatory approval. Access to patient records must be logged with timestamp, user identity, and purpose of access." },
                  { label: "Internal Hospital IT Policy", text: "Hospital IT Security Policy v2.1\n\nSection 4: Cloud Security Requirements\n4.1 All cloud storage buckets must have public access disabled.\n4.2 Database instances must not be publicly accessible.\n4.3 All API endpoints must require authentication.\n4.4 Security patches must be applied within 30 days of release.\n4.5 Backup retention must be at least 90 days.\n4.6 Firewall rules must follow least-privilege principle." },
                ].map((ex) => (
                  <Button
                    key={ex.label}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-2 text-xs"
                    onClick={() => { setPolicyText(ex.text); setInputMode("text"); }}
                  >
                    <FileText className="h-3 w-3 mr-2 flex-shrink-0" />
                    {ex.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="space-y-4">
            {!result && !isProcessing && (
              <Card className="h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center text-muted-foreground p-8">
                  <Code2 className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">Awaiting Policy Input</p>
                  <p className="text-sm mt-2">
                    Upload a policy document or paste text to begin AI-powered rule extraction and Rego code generation.
                  </p>
                </div>
              </Card>
            )}

            {result && (
              <>
                {/* Summary Card */}
                <Card className="border-purple-500/30 bg-purple-500/5">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{result.policyName}</h3>
                        <Badge variant="outline" className="mt-1 text-xs">{result.policyType}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={downloadAllRego}>
                          <Download className="h-4 w-4 mr-1" /> Download All
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{result.summary}</p>
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-400 font-medium">{result.totalRules} rules extracted</span>
                      <span className="text-red-400">{result.rules.filter(r => r.severity === "critical").length} critical</span>
                      <span className="text-orange-400">{result.rules.filter(r => r.severity === "high").length} high</span>
                    </div>
                    {result.warnings.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {result.warnings.map((w, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-yellow-400">
                            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            {w}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Rules List + Detail */}
                <div className="grid grid-cols-5 gap-3">
                  {/* Rules List */}
                  <div className="col-span-2 space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {result.rules.map((rule) => (
                      <div
                        key={rule.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedRule?.id === rule.id
                            ? "border-purple-500/50 bg-purple-500/10"
                            : "border-border hover:border-purple-500/30 hover:bg-purple-500/5"
                        }`}
                        onClick={() => setSelectedRule(rule)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono font-bold text-purple-400">{rule.id}</span>
                          <Badge className={`text-xs border ${severityColor[rule.severity]}`}>
                            {rule.severity}
                          </Badge>
                        </div>
                        <p className="text-xs font-medium line-clamp-2">{rule.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{rule.category}</p>
                      </div>
                    ))}
                  </div>

                  {/* Rule Detail */}
                  <div className="col-span-3">
                    {selectedRule && (
                      <Card className="h-full">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-mono text-purple-400">{selectedRule.id}</span>
                              <CardTitle className="text-sm mt-1">{selectedRule.title}</CardTitle>
                            </div>
                            <Badge className={`text-xs border ${severityColor[selectedRule.severity]}`}>
                              {selectedRule.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{selectedRule.description}</p>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Rego Code */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-green-400 flex items-center gap-1">
                                <Code2 className="h-3 w-3" /> Generated Rego Policy
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs"
                                onClick={() => copyToClipboard(selectedRule.regoCode, selectedRule.id)}
                              >
                                {copiedId === selectedRule.id ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                            <pre className="bg-black/40 rounded p-3 text-xs font-mono overflow-x-auto max-h-[180px] overflow-y-auto text-green-300 border border-green-500/20">
                              {selectedRule.regoCode}
                            </pre>
                          </div>

                          {/* Evidence Required */}
                          <div>
                            <p className="text-xs font-medium mb-1 text-blue-400">Evidence Required</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedRule.evidenceRequired.map((e) => (
                                <Badge key={e} variant="outline" className="text-xs bg-blue-500/10 border-blue-500/30 text-blue-400">
                                  {e}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Test Cases */}
                          {selectedRule.testCases.length > 0 && (
                            <div>
                              <p className="text-xs font-medium mb-1 text-yellow-400">Test Cases</p>
                              <div className="space-y-1">
                                {selectedRule.testCases.map((tc, i) => (
                                  <div key={i} className="flex items-start gap-2 text-xs">
                                    <span className={tc.expected === "pass" ? "text-green-400" : "text-red-400"}>
                                      {tc.expected === "pass" ? "✓" : "✗"}
                                    </span>
                                    <span className="text-muted-foreground">{tc.description}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
