// ============================================================
// Real Zero Trust controls — auto-generated from
// cloud-compliance-automation/mappings/controls_map.yaml
// ============================================================

export type Pillar =
  | "Identity"
  | "Devices"
  | "Networks"
  | "Applications & Workloads"
  | "Cross-Cutting Capabilities";
export type Severity = "critical" | "high" | "medium" | "low";
export type Standard = "CCC" | "HIPAA" | "SeHE";
export type ControlStatus = "pass" | "fail" | "skipped";

export interface Control {
  id: string;           // e.g. "IDN-001"
  controlId: string;    // e.g. "CCC-2-2-P-1-6"
  pillar: Pillar;
  severity: Severity;
  standards: Standard[];
  title: string;
  description: string;
  evidenceSource: string[];
  remediationGuidance: string;
}

export interface ControlResult extends Control {
  status: ControlStatus;
  violations: string[];
}

export const CONTROLS: Control[] = [
  // ── Identity (13) ──────────────────────────────────────────────────
  { id: "IDN-001", controlId: "CCC-2-2-P-1-6", pillar: "Identity", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "IAM (Provisioning/Deprovisioning)", description: "Compliance control: IAM (Provisioning/Deprovisioning)", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate IAM (Provisioning/Deprovisioning). References: 164.308(a)(3) Workforce Security, SeHE 6.3.2, SeHE 6.3.5." },
  { id: "IDN-002", controlId: "CCC-2-2-P-1-9", pillar: "Identity", severity: "critical", standards: ["CCC", "HIPAA", "SeHE"], title: "Privileged Access Management (PAM) / Approval Workflow", description: "Compliance control: Privileged Access Management (PAM) / Approval Workflow", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Privileged Access Management (PAM) / Approval Workflow. References: 164.308(a)(3) Workforce Security, SeHE 7.3.2, SeHE 8.3.4." },
  { id: "IDN-003", controlId: "CCC-2-2-T-1-2", pillar: "Identity", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Identity Federation / SSO", description: "Compliance control: Identity Federation / SSO", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Identity Federation / SSO. References: 164.312(d) Authentication, SeHE 6.3.4." },
  { id: "IDN-004", controlId: "CCC-2-2-P-1-7", pillar: "Identity", severity: "critical", standards: ["CCC", "HIPAA", "SeHE"], title: "RBAC/ABAC + MFA", description: "Compliance control: RBAC/ABAC + MFA", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate RBAC/ABAC + MFA. References: 164.308(a)(4) Info Access Mgmt + 164.312(d) Authentication, SeHE 7.3.4, SeHE 7.3.5." },
  { id: "IDN-005", controlId: "CCC-2-2-P-1-11", pillar: "Identity", severity: "critical", standards: ["CCC", "HIPAA", "SeHE"], title: "MFA (Authentication Strength)", description: "Compliance control: MFA (Authentication Strength)", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate MFA (Authentication Strength). References: 164.312(d) Person/Entity Authentication, SeHE 7.3.4, SeHE 7.3.5." },
  { id: "IDN-006", controlId: "CCC-2-2-T-1-2", pillar: "Identity", severity: "critical", standards: ["CCC", "HIPAA", "SeHE"], title: "Encryption + IAM Binding", description: "Compliance control: Encryption + IAM Binding", evidenceSource: ["tfplan", "checkov"], remediationGuidance: "Review and remediate Encryption + IAM Binding. References: 164.312(a)(2)(iv) Encryption/Decryption, SeHE 6.3.1, SeHE 6.3.3." },
  { id: "IDN-007", controlId: "CCC-2-2-P-1-10", pillar: "Identity", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Session Management (Timeout, Lockout)", description: "Compliance control: Session Management (Timeout, Lockout)", evidenceSource: ["runtime"], remediationGuidance: "Review and remediate Session Management (Timeout, Lockout). References: 164.312(a)(2)(iii) Automatic Logoff, SeHE 7.3.1, SeHE 7.3.2." },
  { id: "IDN-008", controlId: "CCC-2-2-T-1-3", pillar: "Identity", severity: "critical", standards: ["CCC", "HIPAA", "SeHE"], title: "Session Policies (Re-authentication, Step-up MFA)", description: "Compliance control: Session Policies (Re-authentication, Step-up MFA)", evidenceSource: ["runtime"], remediationGuidance: "Review and remediate Session Policies (Re-authentication, Step-up MFA). References: 164.312(a)(2)(iii) Automatic Logoff, SeHE 7.3.1, SeHE 7.3.2." },
  { id: "IDN-009", controlId: "CCC-2-2-T-1-5", pillar: "Identity", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "SIEM + Identity Logs", description: "Compliance control: SIEM + Identity Logs", evidenceSource: ["runtime"], remediationGuidance: "Review and remediate SIEM + Identity Logs. References: 164.312(b) Audit Controls, SeHE 7.3.1, SeHE 8.3.2." },
  { id: "IDN-010", controlId: "CCC-2-2-P-1-6", pillar: "Identity", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Unique User Identification", description: "Compliance control: Unique User Identification", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Unique User Identification. References: 164.312(a)(2)(i) Unique User ID, SeHE 6.3.2, SeHE 6.3.3." },
  { id: "IDN-011", controlId: "CCC-2-2-P-1-9", pillar: "Identity", severity: "high", standards: ["CCC", "HIPAA", "SeHE"], title: "Emergency Access Procedures (Break Glass)", description: "Compliance control: Emergency Access Procedures (Break Glass)", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Emergency Access Procedures (Break Glass). References: 164.312(a)(2)(ii) Emergency Access, SeHE 7.3.2." },
  { id: "IDN-012", controlId: "CCC-2-2-P-1-7", pillar: "Identity", severity: "high", standards: ["CCC", "HIPAA", "SeHE"], title: "Periodic Access Review", description: "Compliance control: Periodic Access Review", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Periodic Access Review. References: 164.308(a)(3) Workforce Security (Access Review), SeHE 7.3.1." },
  { id: "IDN-013", controlId: "CCC-2-11-P-1-6", pillar: "Identity", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Identity Log Review / Activity Monitoring", description: "Compliance control: Identity Log Review / Activity Monitoring", evidenceSource: ["runtime"], remediationGuidance: "Review and remediate Identity Log Review / Activity Monitoring. References: 164.308(a)(1)(ii)(D) IS Activity Review, SeHE 8.3.2." },
  // ── Devices (13) ──────────────────────────────────────────────────
  { id: "DEV-014", controlId: "CCC-2-1-P-1-1", pillar: "Devices", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Device Inventory & Ownership", description: "Compliance control: Device Inventory & Ownership", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Device Inventory & Ownership. References: 164.310(d)(2)(ii) Media Re-use; 164.310(c) Workstation Security, SeHE 2-1 (Asset Mgmt)." },
  { id: "DEV-015", controlId: "CCC-2-3-P-1-1", pillar: "Devices", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Secure Configuration & Hardening", description: "Compliance control: Secure Configuration & Hardening", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Secure Configuration & Hardening. References: 164.308(a)(1)(ii)(D) Security Config Mgmt, SeHE 2-3 (Information Protection)." },
  { id: "DEV-016", controlId: "CCC-2-3-P-1-10", pillar: "Devices", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Endpoint Detection & Response (EDR)", description: "Compliance control: Endpoint Detection & Response (EDR)", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Endpoint Detection & Response (EDR). References: 164.308(a)(5)(ii)(B) Protection from Malicious Software, SeHE 2-6 (Endpoint/MDM), SeHE 2-9 (Vulnerability Mgmt)." },
  { id: "DEV-017", controlId: "CCC-2-2-P-1-2", pillar: "Devices", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Session Security (lockout/timeout)", description: "Compliance control: Session Security (lockout/timeout)", evidenceSource: ["runtime"], remediationGuidance: "Review and remediate Session Security (lockout/timeout). References: 164.312(a)(2)(iii) Automatic Logoff; 164.312(d) Authentication, SeHE 2-2 (Access Control)." },
  { id: "DEV-018", controlId: "CCC-2-5-P-1-1", pillar: "Devices", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Mobile Device Management (MDM)", description: "Compliance control: Mobile Device Management (MDM)", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Mobile Device Management (MDM). References: 164.310(d)(2)(i) Disposal; 164.310(d)(2)(ii) Re-use, SeHE 2-6 (Mobile Devices Security)." },
  { id: "DEV-019", controlId: "CCC-2-17-P-3-1", pillar: "Devices", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Removable Media Control", description: "Compliance control: Removable Media Control", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Removable Media Control. References: 164.310(d)(2)(i) Disposal; 164.310(d)(2)(ii) Re-use, SeHE 2-14 (Storage Media Security)." },
  { id: "DEV-020", controlId: "CCC-2-13-P-1-1", pillar: "Devices", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Physical Device Security", description: "Compliance control: Physical Device Security", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Physical Device Security. References: 164.310(b) Facility Access; 164.310(c) Workstation Security, SeHE 2-13 (Physical Security)." },
  { id: "DEV-021", controlId: "CCC-2-9-P-1-1", pillar: "Devices", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Vulnerability & Patch Management", description: "Compliance control: Vulnerability & Patch Management", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Vulnerability & Patch Management. References: 164.308(a)(8) Evaluation, SeHE 2-9 (Vulnerability Mgmt)." },
  { id: "DEV-022", controlId: "CCC-2-10-P-1-1", pillar: "Devices", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Penetration Testing", description: "Compliance control: Penetration Testing", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Penetration Testing. References: 164.308(a)(8) Evaluation, SeHE 2-10 (Pen Testing)." },
  { id: "DEV-023", controlId: "CCC-2-6-P-1-1", pillar: "Devices", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Data Use & Export Control", description: "Compliance control: Data Use & Export Control", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Data Use & Export Control. References: 164.312(c)(1) Integrity; 164.312(e)(1) Transmission Security, SeHE 2-3 (Info Protection), SeHE 2-6 (Data Protection)." },
  { id: "DEV-024", controlId: "CCC-2-7-P-1-1", pillar: "Devices", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Cryptography & Certificates", description: "Compliance control: Cryptography & Certificates", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Cryptography & Certificates. References: 164.312(e)(1) Transmission Security; 164.312(a)(2)(iv) Encryption, SeHE 2-7 (Cryptography), SeHE 2-15 (Key Mgmt)." },
  { id: "DEV-025", controlId: "CCC-2-8-P-1-1", pillar: "Devices", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Backup & Recovery Security", description: "Compliance control: Backup & Recovery Security", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Backup & Recovery Security. References: 164.308(a)(7)(ii)(A) Data Backup Plan, SeHE 3-1 (BCM / Backup)." },
  { id: "DEV-026", controlId: "CCC-2-3-P-1-5", pillar: "Devices", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Isolation of Security Functions", description: "Compliance control: Isolation of Security Functions", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Isolation of Security Functions. References: 164.308(a)(1)(ii)(B) Risk Mgmt; 164.312(a)(1) Access Control, SeHE 2-3 (Information Protection)." },
  // ── Networks (9) ──────────────────────────────────────────────────
  { id: "NET-027", controlId: "CCC-2-4-P-1-1", pillar: "Networks", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Network Segmentation & Isolation", description: "Compliance control: Network Segmentation & Isolation", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Network Segmentation & Isolation. References: 164.312(e)(1) Transmission Security; 164.308(a)(1)(ii)(D) Security Mgmt Process, SeHE 2-5 (Network Protection)." },
  { id: "NET-028", controlId: "CCC-2-4-P-1-4", pillar: "Networks", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "DDoS & Traffic Anomaly Protection", description: "Compliance control: DDoS & Traffic Anomaly Protection", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate DDoS & Traffic Anomaly Protection. References: 164.308(a)(1)(ii)(B) Risk Mgmt; 164.308(a)(8) Evaluation, SeHE 2-5 (Network Protection); 2-9 (Threat Mgmt)." },
  { id: "NET-029", controlId: "CCC-2-4-P-1-3", pillar: "Networks", severity: "high", standards: ["CCC", "HIPAA", "SeHE"], title: "Network Access Control (NAC)", description: "Compliance control: Network Access Control (NAC)", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Network Access Control (NAC). References: 164.312(a)(1) Access Control; 164.312(d) Authentication, SeHE 2-2 (Access Control); 2-5 (Network Protection)." },
  { id: "NET-030", controlId: "CCC-2-2-P-1-10", pillar: "Networks", severity: "high", standards: ["CCC", "HIPAA", "SeHE"], title: "Secure Remote Access / VPN", description: "Compliance control: Secure Remote Access / VPN", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Secure Remote Access / VPN. References: 164.312(e)(1) Transmission Security; 164.310(b) Facility Access (remote), SeHE 2-5 (Network Protection)." },
  { id: "NET-031", controlId: "CCC-2-7-T-1-2", pillar: "Networks", severity: "critical", standards: ["CCC", "HIPAA", "SeHE"], title: "Traffic Encryption (TLS/IPSec)", description: "Compliance control: Traffic Encryption (TLS/IPSec)", evidenceSource: ["tfplan", "checkov"], remediationGuidance: "Review and remediate Traffic Encryption (TLS/IPSec). References: 164.312(e)(1) Transmission Security, SeHE 2-7 (Cryptography)." },
  { id: "NET-032", controlId: "CCC-2-4-P-1-6", pillar: "Networks", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Firewall & IDS/IPS Controls", description: "Compliance control: Firewall & IDS/IPS Controls", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Firewall & IDS/IPS Controls. References: 164.308(a)(5)(ii)(B) Protection from Malicious Software; 164.312(c)(1) Integrity, SeHE 2-5 (Network Protection)." },
  { id: "NET-033", controlId: "CCC-2-11-P-1-6", pillar: "Networks", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Network Activity Monitoring & Logging", description: "Compliance control: Network Activity Monitoring & Logging", evidenceSource: ["runtime"], remediationGuidance: "Review and remediate Network Activity Monitoring & Logging. References: 164.312(b) Audit Controls; 164.308(a)(1)(ii)(D) Activity Review, SeHE 7.3.1, SeHE 8.3.2 (Logging & Monitoring)." },
  { id: "NET-034", controlId: "CCC-2-10-P-1-1", pillar: "Networks", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Periodic Network Security Testing", description: "Compliance control: Periodic Network Security Testing", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Periodic Network Security Testing. References: 164.308(a)(8) Evaluation (Technical Testing), SeHE 2-10 (Pen Testing)." },
  { id: "NET-035", controlId: "CCC-2-3-P-1-5", pillar: "Networks", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Segregation of Security & Mgmt Planes", description: "Compliance control: Segregation of Security & Mgmt Planes", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Segregation of Security & Mgmt Planes. References: 164.308(a)(1)(ii)(B) Risk Mgmt; 164.312(a)(1) Access Control, SeHE 2-3 (Info Protection), SeHE 2-5 (Network Protection)." },
  // ── Applications & Workloads (10) ──────────────────────────────────────────────────
  { id: "APP-036", controlId: "CCC-2-1 (Asset Mgmt)", pillar: "Applications & Workloads", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Application Inventory & Ownership", description: "Compliance control: Application Inventory & Ownership", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Application Inventory & Ownership. References: 164.308(a)(1)(ii)(A) Risk Analysis, SeHE 6.4.1, SeHE 6.4.2." },
  { id: "APP-037", controlId: "CCC-2-16-P-1-1", pillar: "Applications & Workloads", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Secure Software Development Lifecycle (SSDLC)", description: "Compliance control: Secure Software Development Lifecycle (SSDLC)", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Secure Software Development Lifecycle (SSDLC). References: 164.308(a)(1)(ii)(D) Information System Activity Review, SeHE 6.4.3, SeHE 6.4.4." },
  { id: "APP-038", controlId: "CCC-2-16-P-1-3", pillar: "Applications & Workloads", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Code Review & Static/Dynamic Analysis", description: "Compliance control: Code Review & Static/Dynamic Analysis", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Code Review & Static/Dynamic Analysis. References: 164.308(a)(8) Evaluation, SeHE 6.4.4." },
  { id: "APP-039", controlId: "CCC-2-9-P-1-1", pillar: "Applications & Workloads", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Application Vulnerability Scanning", description: "Compliance control: Application Vulnerability Scanning", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Application Vulnerability Scanning. References: 164.308(a)(8) Evaluation, SeHE 2-9 (Vulnerability Mgmt)." },
  { id: "APP-040", controlId: "CCC-2-10-P-1-1", pillar: "Applications & Workloads", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Application Penetration Testing", description: "Compliance control: Application Penetration Testing", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Application Penetration Testing. References: 164.308(a)(8) Evaluation, SeHE 2-10 (Pen Testing)." },
  { id: "APP-041", controlId: "CCC-2-16-P-1-5", pillar: "Applications & Workloads", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Runtime Application Protection (RASP/WAF)", description: "Compliance control: Runtime Application Protection (RASP/WAF)", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Runtime Application Protection (RASP/WAF). References: 164.312(c)(1) Integrity; 164.312(e)(1) Transmission Security, SeHE 6.4.5, SeHE 7.3.4." },
  { id: "APP-042", controlId: "CCC-2-16-P-1-2", pillar: "Applications & Workloads", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Secrets & API Key Management", description: "Compliance control: Secrets & API Key Management", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Secrets & API Key Management. References: 164.312(a)(2)(iv) Encryption/Decryption, SeHE 6.4.6." },
  { id: "APP-043", controlId: "CCC-2-16-P-1-6", pillar: "Applications & Workloads", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Container & Cloud Workload Hardening", description: "Compliance control: Container & Cloud Workload Hardening", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Container & Cloud Workload Hardening. References: 164.308(a)(1)(ii)(B) Risk Management, SeHE 6.4.7, SeHE 7.3.4." },
  { id: "APP-044", controlId: "CCC-2-3-P-1-5", pillar: "Applications & Workloads", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Workload Isolation & Segregation", description: "Compliance control: Workload Isolation & Segregation", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Workload Isolation & Segregation. References: 164.312(a)(1) Access Control, SeHE 6.4.7." },
  { id: "APP-045", controlId: "CCC-2-11-P-1-6", pillar: "Applications & Workloads", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Logging & Monitoring of Applications", description: "Compliance control: Logging & Monitoring of Applications", evidenceSource: ["runtime"], remediationGuidance: "Review and remediate Logging & Monitoring of Applications. References: 164.312(b) Audit Controls, SeHE 7.3.1, SeHE 8.3.2." },
  // ── Cross-Cutting Capabilities (10) ──────────────────────────────────────────────────
  { id: "CCC-046", controlId: "CCC-2-11-P-1-6", pillar: "Cross-Cutting Capabilities", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Centralized Logging & SIEM", description: "Compliance control: Centralized Logging & SIEM", evidenceSource: ["runtime"], remediationGuidance: "Review and remediate Centralized Logging & SIEM. References: 164.312(b) Audit Controls, SeHE 7.3.1, SeHE 8.3.2." },
  { id: "CCC-047", controlId: "CCC-2-12-P-1-4", pillar: "Cross-Cutting Capabilities", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Threat Intelligence Integration", description: "Compliance control: Threat Intelligence Integration", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Threat Intelligence Integration. References: 164.308(a)(6)(ii) Response and Reporting, SeHE 2-12 (Threat Intelligence)." },
  { id: "CCC-048", controlId: "CCC-2-12-P-1-1", pillar: "Cross-Cutting Capabilities", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Incident Detection & Response", description: "Compliance control: Incident Detection & Response", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Incident Detection & Response. References: 164.308(a)(6)(ii) Response and Reporting, SeHE 2-12 (Incident Mgmt)." },
  { id: "CCC-049", controlId: "CCC-2-3-P-1-7", pillar: "Cross-Cutting Capabilities", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Automated Policy Enforcement (Policy-as-Code)", description: "Compliance control: Automated Policy Enforcement (Policy-as-Code)", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Automated Policy Enforcement (Policy-as-Code). References: 164.312(c)(1) Integrity; 164.308(a)(1)(ii)(D) IS Activity Review, SeHE 6.3.3, SeHE 6.4.3." },
  { id: "CCC-050", controlId: "CCC-2-9 (Vulnerability Mgmt); 2-11 (Monitoring)", pillar: "Cross-Cutting Capabilities", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Continuous Compliance Monitoring", description: "Compliance control: Continuous Compliance Monitoring", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Continuous Compliance Monitoring. References: 164.308(a)(8) Evaluation, SeHE 7.3.1, SeHE 8.3.2." },
  { id: "CCC-051", controlId: "CCC-2-15 (Key Management)", pillar: "Cross-Cutting Capabilities", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Cryptographic Key Management", description: "Compliance control: Cryptographic Key Management", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Cryptographic Key Management. References: 164.312(a)(2)(iv) Encryption/Decryption, SeHE 2-15 (Key Management)." },
  { id: "CCC-052", controlId: "CCC-2-8 (Backup & Recovery Mgmt)", pillar: "Cross-Cutting Capabilities", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Backup & Recovery (Resilience)", description: "Compliance control: Backup & Recovery (Resilience)", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Backup & Recovery (Resilience). References: 164.308(a)(7)(ii)(A) Data Backup Plan; 164.308(a)(7)(ii)(B) Disaster Recovery, SeHE 3-1 (Business Continuity)." },
  { id: "CCC-053", controlId: "CCC-2-3-P-1-3", pillar: "Cross-Cutting Capabilities", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Configuration & Change Management", description: "Compliance control: Configuration & Change Management", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Configuration & Change Management. References: 164.308(a)(1)(ii)(D) IS Activity Review, SeHE 6.3.3, SeHE 6.4.4." },
  { id: "CCC-054", controlId: "CCC-2-16-P-1-1", pillar: "Cross-Cutting Capabilities", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Security Awareness for Developers/Users (Technical Focus)", description: "Compliance control: Security Awareness for Developers/Users (Technical Focus)", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Security Awareness for Developers/Users (Technical Focus). References: 164.308(a)(5)(ii)(B) Protection from Malicious Software, SeHE 6.4.3." },
  { id: "CCC-055", controlId: "CCC-2-12-P-1-5", pillar: "Cross-Cutting Capabilities", severity: "medium", standards: ["CCC", "HIPAA", "SeHE"], title: "Metrics & Reporting Automation", description: "Compliance control: Metrics & Reporting Automation", evidenceSource: ["tfplan"], remediationGuidance: "Review and remediate Metrics & Reporting Automation. References: 164.308(a)(8) Evaluation, SeHE 7.3.1, SeHE 7.3.2." },
];

export const PILLARS: Pillar[] = [
  "Identity",
  "Devices",
  "Networks",
  "Applications & Workloads",
  "Cross-Cutting Capabilities",
];

export const PILLAR_COLORS: Record<Pillar, string> = {
  Identity: "#6366f1",
  Devices: "#f59e0b",
  Networks: "#10b981",
  "Applications & Workloads": "#3b82f6",
  "Cross-Cutting Capabilities": "#8b5cf6",
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

export function getControlsByPillar(pillar: Pillar) {
  return CONTROLS.filter((c) => c.pillar === pillar);
}

export function generateMockResults(passRate = 0.72): ControlResult[] {
  return CONTROLS.map((control) => {
    const isPassing = Math.random() < passRate;
    return {
      ...control,
      status: isPassing ? "pass" : "fail",
      violations: isPassing
        ? []
        : [`${control.id} violation: ${control.description.split(".")[0]} not satisfied.`],
    };
  });
}

export function computeBreakdowns(results: ControlResult[]) {
  const pillarBreakdown: Record<string, { pass: number; fail: number; total: number }> = {};
  const severityBreakdown: Record<string, { pass: number; fail: number; total: number }> = {};
  const standardBreakdown: Record<string, { pass: number; fail: number; total: number }> = {};
  for (const r of results) {
    if (!pillarBreakdown[r.pillar]) pillarBreakdown[r.pillar] = { pass: 0, fail: 0, total: 0 };
    pillarBreakdown[r.pillar].total++;
    if (r.status === "pass") pillarBreakdown[r.pillar].pass++;
    else pillarBreakdown[r.pillar].fail++;
    if (!severityBreakdown[r.severity]) severityBreakdown[r.severity] = { pass: 0, fail: 0, total: 0 };
    severityBreakdown[r.severity].total++;
    if (r.status === "pass") severityBreakdown[r.severity].pass++;
    else severityBreakdown[r.severity].fail++;
    for (const std of r.standards) {
      if (!standardBreakdown[std]) standardBreakdown[std] = { pass: 0, fail: 0, total: 0 };
      standardBreakdown[std].total++;
      if (r.status === "pass") standardBreakdown[std].pass++;
      else standardBreakdown[std].fail++;
    }
  }
  return { pillarBreakdown, severityBreakdown, standardBreakdown };
}
