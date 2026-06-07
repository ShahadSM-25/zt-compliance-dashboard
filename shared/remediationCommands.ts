/**
 * Remediation Commands for HealthComply Controls
 * Each entry provides CLI / Terraform / Console commands to fix a failing control.
 * Supports AWS, OCI, Azure, GCP, sirar, and sccc cloud providers.
 */

export type CloudProvider = "aws" | "oci" | "azure" | "gcp" | "sirar" | "sccc";

export interface RemediationCommand {
  title: string;
  description: string;
  commands: {
    aws?: string;
    oci?: string;
    azure?: string;
    gcp?: string;
    sirar?: string;
    sccc?: string;
    general?: string;
  };
  terraformSnippet?: string;
  consoleSteps?: string;
  references?: string[];
}

// Map of control ID → remediation command
export const REMEDIATION_COMMANDS: Record<string, RemediationCommand> = {
  // ── Identity Controls ──────────────────────────────────────────────────────
  "TC-01": {
    title: "Enable Multi-Factor Authentication (MFA)",
    description: "Enforce MFA for all IAM users and privileged accounts.",
    commands: {
      aws: `# Enable MFA for all IAM users
aws iam list-users --query 'Users[*].UserName' --output text | \\
  xargs -I {} aws iam enable-mfa-device --user-name {} --serial-number arn:aws:iam::ACCOUNT_ID:mfa/{} --authentication-code1 CODE1 --authentication-code2 CODE2

# Enforce MFA via IAM policy
aws iam put-user-policy --user-name USERNAME --policy-name ForceMFA --policy-document '{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "NotAction": ["iam:CreateVirtualMFADevice","iam:EnableMFADevice","iam:GetUser","iam:ListMFADevices","iam:ListVirtualMFADevices","iam:ResyncMFADevice","sts:GetSessionToken"],
    "Resource": "*",
    "Condition": {"BoolIfExists": {"aws:MultiFactorAuthPresent": "false"}}
  }]
}'`,
      oci: `# Enable MFA for OCI users
oci iam user update --user-id <USER_OCID> --is-mfa-activated true

# List users without MFA
oci iam user list --compartment-id <TENANCY_OCID> | jq '.data[] | select(.["is-mfa-activated"] == false) | .name'`,
      azure: `# Enable MFA via Azure AD Conditional Access
az ad user update --id USER_OBJECT_ID --password-policies DisablePasswordExpiration
# Then configure Conditional Access Policy via Azure Portal:
# Azure AD > Security > Conditional Access > New Policy > Grant > Require MFA`,
      gcp: `# Enable 2-Step Verification enforcement
gcloud organizations add-iam-policy-binding ORGANIZATION_ID \\
  --member="domain:yourdomain.com" \\
  --role="roles/iam.securityAdmin"
# Then enforce via Google Admin Console: Security > 2-Step Verification`,
    },
    terraformSnippet: `# AWS - Enforce MFA via IAM Policy
resource "aws_iam_policy" "require_mfa" {
  name = "RequireMFA"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Deny"
      NotAction = ["iam:CreateVirtualMFADevice", "iam:EnableMFADevice", "sts:GetSessionToken"]
      Resource = "*"
      Condition = {
        BoolIfExists = { "aws:MultiFactorAuthPresent" = "false" }
      }
    }]
  })
}`,
    references: ["NCA CCC §3.1", "HIPAA §164.312(d)", "SeHE Authentication Policy §7.3"],
  },

  "TC-02": {
    title: "Implement Role-Based Access Control (RBAC)",
    description: "Ensure least-privilege access using RBAC for all users.",
    commands: {
      aws: `# Review and tighten IAM policies
aws iam get-account-authorization-details --output json > iam_report.json

# Remove overly permissive policies
aws iam detach-user-policy --user-name USERNAME --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Create least-privilege policy
aws iam create-policy --policy-name LeastPrivilegePolicy --policy-document file://least_privilege.json`,
      oci: `# List and review IAM policies
oci iam policy list --compartment-id <TENANCY_OCID>

# Update policy to least privilege
oci iam policy update --policy-id <POLICY_OCID> --statements '["Allow group HealthcareUsers to read buckets in compartment Healthcare"]'`,
      azure: `# Assign least-privilege role
az role assignment create --assignee USER_PRINCIPAL --role "Reader" --scope /subscriptions/SUB_ID/resourceGroups/RG_NAME

# Remove overly permissive role
az role assignment delete --assignee USER_PRINCIPAL --role "Owner" --scope /subscriptions/SUB_ID`,
    },
    terraformSnippet: `# AWS - Create least-privilege IAM role
resource "aws_iam_role" "healthcare_reader" {
  name = "HealthcareReaderRole"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "healthcare_reader_policy" {
  name = "HealthcareReaderPolicy"
  role = aws_iam_role.healthcare_reader.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["s3:GetObject", "s3:ListBucket"]
      Resource = ["arn:aws:s3:::healthcare-data-bucket/*"]
    }]
  })
}`,
    references: ["NCA CCC §3.2", "HIPAA §164.312(a)(1)"],
  },

  "TC-03": {
    title: "Enable Audit Logging",
    description: "Enable comprehensive audit logging for all cloud resources.",
    commands: {
      aws: `# Enable CloudTrail for all regions
aws cloudtrail create-trail --name HealthcareAuditTrail \\
  --s3-bucket-name healthcare-audit-logs \\
  --include-global-service-events \\
  --is-multi-region-trail \\
  --enable-log-file-validation

aws cloudtrail start-logging --name HealthcareAuditTrail

# Enable CloudWatch Logs integration
aws cloudtrail update-trail --name HealthcareAuditTrail \\
  --cloud-watch-logs-log-group-arn arn:aws:logs:REGION:ACCOUNT:log-group:CloudTrail \\
  --cloud-watch-logs-role-arn arn:aws:iam::ACCOUNT:role/CloudTrailRole`,
      oci: `# Enable Audit service (enabled by default in OCI)
# Verify audit retention period (minimum 365 days for compliance)
oci audit config update --compartment-id <TENANCY_OCID> --retention-period-days 365

# List audit events
oci audit event list --compartment-id <COMPARTMENT_OCID> --start-time 2024-01-01T00:00:00Z --end-time 2024-12-31T23:59:59Z`,
      azure: `# Enable Azure Monitor Diagnostic Settings
az monitor diagnostic-settings create \\
  --name HealthcareAuditLogs \\
  --resource /subscriptions/SUB_ID \\
  --logs '[{"category":"Administrative","enabled":true},{"category":"Security","enabled":true}]' \\
  --workspace LOG_ANALYTICS_WORKSPACE_ID`,
    },
    terraformSnippet: `# AWS - Enable CloudTrail
resource "aws_cloudtrail" "healthcare_audit" {
  name                          = "healthcare-audit-trail"
  s3_bucket_name                = aws_s3_bucket.audit_logs.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true

  event_selector {
    read_write_type           = "All"
    include_management_events = true
    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::healthcare-data-bucket/"]
    }
  }
}`,
    references: ["NCA CCC §3.3", "HIPAA §164.312(b)", "SeHE §4.3"],
  },

  "CCC-01": {
    title: "Enable Data Encryption at Rest",
    description: "Encrypt all stored data using AES-256 or equivalent.",
    commands: {
      aws: `# Enable S3 bucket encryption
aws s3api put-bucket-encryption \\
  --bucket healthcare-data-bucket \\
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms",
        "KMSMasterKeyID": "arn:aws:kms:REGION:ACCOUNT:key/KEY_ID"
      },
      "BucketKeyEnabled": true
    }]
  }'

# Enable RDS encryption (must be done at creation)
aws rds create-db-instance \\
  --db-instance-identifier healthcare-db \\
  --storage-encrypted \\
  --kms-key-id arn:aws:kms:REGION:ACCOUNT:key/KEY_ID`,
      oci: `# Enable Object Storage bucket encryption
oci os bucket update --bucket-name healthcare-bucket \\
  --kms-key-id <KMS_KEY_OCID>

# Enable Block Volume encryption
oci bv volume update --volume-id <VOLUME_OCID> \\
  --kms-key-id <KMS_KEY_OCID>`,
      azure: `# Enable Storage Account encryption
az storage account update \\
  --name healthcarestorage \\
  --resource-group HealthcareRG \\
  --encryption-services blob \\
  --encryption-key-source Microsoft.Keyvault \\
  --encryption-key-vault https://healthcare-kv.vault.azure.net/ \\
  --encryption-key-name healthcare-key`,
    },
    terraformSnippet: `# AWS - S3 Bucket with KMS encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "healthcare" {
  bucket = aws_s3_bucket.healthcare_data.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.healthcare.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_kms_key" "healthcare" {
  description             = "Healthcare Data Encryption Key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}`,
    references: ["NCA CCC §4.1", "HIPAA §164.312(a)(2)(iv)", "SeHE §5.2"],
  },

  "CCC-02": {
    title: "Enable Encryption in Transit (TLS 1.2+)",
    description: "Enforce TLS 1.2 or higher for all data in transit.",
    commands: {
      aws: `# Enforce TLS 1.2 on ALB
aws elbv2 modify-listener \\
  --listener-arn arn:aws:elasticloadbalancing:REGION:ACCOUNT:listener/app/healthcare-alb/XXXX \\
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06

# Enforce TLS on S3 bucket
aws s3api put-bucket-policy --bucket healthcare-bucket --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Principal": "*",
    "Action": "s3:*",
    "Resource": ["arn:aws:s3:::healthcare-bucket/*"],
    "Condition": {"Bool": {"aws:SecureTransport": "false"}}
  }]
}'`,
      oci: `# Configure Load Balancer SSL policy
oci lb ssl-cipher-suite create \\
  --load-balancer-id <LB_OCID> \\
  --name TLS12Policy \\
  --ciphers '["ECDHE-RSA-AES256-GCM-SHA384","ECDHE-RSA-AES128-GCM-SHA256"]'`,
      azure: `# Enforce minimum TLS version on Storage Account
az storage account update \\
  --name healthcarestorage \\
  --resource-group HealthcareRG \\
  --min-tls-version TLS1_2

# Enforce HTTPS on App Service
az webapp update \\
  --name healthcare-app \\
  --resource-group HealthcareRG \\
  --https-only true`,
    },
    references: ["NCA CCC §4.2", "HIPAA §164.312(e)(2)(ii)", "SeHE §5.3"],
  },

  "CCC-03": {
    title: "Configure Network Security Groups / Firewall Rules",
    description: "Restrict inbound/outbound traffic to only required ports and sources.",
    commands: {
      aws: `# Review and restrict Security Group rules
aws ec2 describe-security-groups --query 'SecurityGroups[?IpPermissions[?IpRanges[?CidrIp==\`0.0.0.0/0\`]]]'

# Remove overly permissive inbound rule
aws ec2 revoke-security-group-ingress \\
  --group-id sg-XXXXXXXX \\
  --protocol tcp \\
  --port 22 \\
  --cidr 0.0.0.0/0

# Add restricted SSH access
aws ec2 authorize-security-group-ingress \\
  --group-id sg-XXXXXXXX \\
  --protocol tcp \\
  --port 22 \\
  --cidr 10.0.0.0/8`,
      oci: `# Update Security List rules
oci network security-list update \\
  --security-list-id <SL_OCID> \\
  --ingress-security-rules '[{
    "protocol": "6",
    "source": "10.0.0.0/8",
    "tcpOptions": {"destinationPortRange": {"min": 22, "max": 22}}
  }]'`,
      azure: `# Update NSG rule to restrict SSH
az network nsg rule update \\
  --nsg-name HealthcareNSG \\
  --resource-group HealthcareRG \\
  --name AllowSSH \\
  --source-address-prefixes 10.0.0.0/8 \\
  --destination-port-ranges 22`,
    },
    terraformSnippet: `# AWS - Restricted Security Group
resource "aws_security_group" "healthcare_app" {
  name   = "healthcare-app-sg"
  vpc_id = aws_vpc.healthcare.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from anywhere"
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "SSH from internal network only"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}`,
    references: ["NCA CCC §5.1", "HIPAA §164.312(e)(1)", "SeHE §6.2"],
  },

  "CCC-04": {
    title: "Enable Vulnerability Scanning",
    description: "Configure automated vulnerability scanning for all compute resources.",
    commands: {
      aws: `# Enable Amazon Inspector v2
aws inspector2 enable --resource-types EC2 ECR LAMBDA

# Run an on-demand scan
aws inspector2 create-findings-report \\
  --report-format JSON \\
  --s3-destination bucketName=healthcare-reports,keyPrefix=inspector/

# List critical findings
aws inspector2 list-findings \\
  --filter-criteria '{"severity":[{"comparison":"EQUALS","value":"CRITICAL"}]}' \\
  --query 'findings[*].{ID:findingArn,Title:title,Severity:severity}'`,
      oci: `# Enable OCI Vulnerability Scanning Service
oci vss scan-recipe create \\
  --compartment-id <COMPARTMENT_OCID> \\
  --display-name HealthcareScanRecipe \\
  --agent-settings '{"scanLevel":"STANDARD","agentConfigurationDetails":{"scanRecurrenceInterval":"P1D"}}'`,
      azure: `# Enable Microsoft Defender for Cloud
az security pricing create \\
  --name VirtualMachines \\
  --tier Standard

# Get vulnerability assessment recommendations
az security assessment list \\
  --query '[?contains(displayName, \`vulnerability\`)].{Name:displayName,Status:status.code}'`,
    },
    references: ["NCA CCC §5.3", "SeHE §6.4"],
  },

  "CCC-05": {
    title: "Enable Patch Management",
    description: "Ensure all systems are patched within 30 days of patch release.",
    commands: {
      aws: `# Enable AWS Systems Manager Patch Manager
aws ssm create-patch-baseline \\
  --name HealthcarePatchBaseline \\
  --operating-system AMAZON_LINUX_2 \\
  --approval-rules '{"PatchRules":[{"PatchFilterGroup":{"PatchFilters":[{"Key":"SEVERITY","Values":["Critical","High"]}]},"ApproveAfterDays":7}]}'

# Create maintenance window for patching
aws ssm create-maintenance-window \\
  --name WeeklyPatching \\
  --schedule "cron(0 2 ? * SUN *)" \\
  --duration 4 \\
  --cutoff 1 \\
  --allow-unassociated-targets

# Run patch now
aws ssm send-command \\
  --document-name "AWS-RunPatchBaseline" \\
  --targets "Key=tag:Environment,Values=Healthcare" \\
  --parameters '{"Operation":["Install"]}'`,
      oci: `# Use OCI OS Management Service
oci os-management managed-instance install-all-updates \\
  --managed-instance-id <INSTANCE_OCID>

# Schedule recurring updates
oci os-management scheduled-job create \\
  --compartment-id <COMPARTMENT_OCID> \\
  --display-name WeeklyPatching \\
  --schedule-type RECURRING \\
  --interval-type WEEK \\
  --interval-value 1 \\
  --time-next-execution 2024-01-07T02:00:00Z \\
  --operation-type UPDATE_ALL`,
      azure: `# Enable Azure Update Management
az automation update-management-machine-run create \\
  --automation-account-name HealthcareAutomation \\
  --resource-group HealthcareRG \\
  --name WeeklyPatching \\
  --schedule-name WeeklySchedule`,
    },
    references: ["NCA CCC §5.4", "SeHE §6.5"],
  },

  "CCC-06": {
    title: "Configure Intrusion Detection System (IDS)",
    description: "Enable IDS/IPS to detect and alert on suspicious network activity.",
    commands: {
      aws: `# Enable Amazon GuardDuty
aws guardduty create-detector \\
  --enable \\
  --finding-publishing-frequency FIFTEEN_MINUTES

# Enable all threat intelligence feeds
aws guardduty update-detector \\
  --detector-id DETECTOR_ID \\
  --data-sources '{"S3Logs":{"Enable":true},"Kubernetes":{"AuditLogs":{"Enable":true}},"MalwareProtection":{"ScanEc2InstanceWithFindings":{"EbsVolumes":true}}}'

# Create SNS notification for high severity findings
aws guardduty create-threat-intel-set \\
  --detector-id DETECTOR_ID \\
  --format TXT \\
  --location s3://threat-intel-bucket/indicators.txt \\
  --activate`,
      azure: `# Enable Microsoft Sentinel
az sentinel workspace create \\
  --workspace-name HealthcareSentinel \\
  --resource-group HealthcareRG \\
  --location eastus`,
    },
    references: ["NCA CCC §5.5", "HIPAA §164.312(b)"],
  },

  "CCC-14": {
    title: "Enable Backup and Recovery",
    description: "Configure automated backups with tested recovery procedures.",
    commands: {
      aws: `# Create AWS Backup plan
aws backup create-backup-plan --backup-plan '{
  "BackupPlanName": "HealthcareBackupPlan",
  "Rules": [{
    "RuleName": "DailyBackups",
    "TargetBackupVaultName": "healthcare-vault",
    "ScheduleExpression": "cron(0 1 * * ? *)",
    "StartWindowMinutes": 60,
    "CompletionWindowMinutes": 120,
    "Lifecycle": {"DeleteAfterDays": 90},
    "RecoveryPointTags": {"Environment": "Healthcare"}
  }]
}'

# Assign resources to backup plan
aws backup create-backup-selection \\
  --backup-plan-id PLAN_ID \\
  --backup-selection '{
    "SelectionName": "AllHealthcareResources",
    "IamRoleArn": "arn:aws:iam::ACCOUNT:role/AWSBackupRole",
    "ListOfTags": [{"ConditionType":"STRINGEQUALS","ConditionKey":"Environment","ConditionValue":"Healthcare"}]
  }'`,
      oci: `# Create backup policy
oci bv volume-backup-policy create \\
  --compartment-id <COMPARTMENT_OCID> \\
  --display-name HealthcareBackupPolicy \\
  --schedules '[{
    "backupType":"FULL",
    "period":"ONE_WEEK",
    "retentionSeconds":7776000,
    "timeOfDayUtc":"01:00"
  }]'`,
    },
    references: ["NCA CCC §6.2", "HIPAA §164.312(a)(2)(ii)"],
  },

  "CCC-29": {
    title: "Implement Data Loss Prevention (DLP)",
    description: "Configure DLP policies to prevent unauthorized data exfiltration.",
    commands: {
      aws: `# Enable Amazon Macie for S3 data discovery
aws macie2 enable-macie

# Create classification job
aws macie2 create-classification-job \\
  --job-type SCHEDULED \\
  --name HealthcareDLPScan \\
  --schedule-frequency '{"dailySchedule":{}}' \\
  --s3-job-definition '{
    "bucketDefinitions": [{
      "accountId": "ACCOUNT_ID",
      "buckets": ["healthcare-data-bucket"]
    }]
  }'`,
      azure: `# Enable Microsoft Purview DLP
az purview account create \\
  --name HealthcarePurview \\
  --resource-group HealthcareRG \\
  --location eastus`,
    },
    references: ["NCA CCC §7.1", "HIPAA §164.312(c)(1)", "SeHE §8.2"],
  },
};

/**
 * Get remediation command for a specific control and cloud provider.
 * Returns the most relevant command based on the provider.
 */
export function getRemediationCommand(
  controlId: string,
  cloudProvider: CloudProvider = "aws"
): RemediationCommand | null {
  const cmd = REMEDIATION_COMMANDS[controlId];
  if (!cmd) return null;
  return cmd;
}

/**
 * Get the specific CLI command for a control and cloud provider.
 */
export function getCommandForProvider(
  controlId: string,
  cloudProvider: CloudProvider
): string | null {
  const cmd = REMEDIATION_COMMANDS[controlId];
  if (!cmd) return null;

  const providerCmd = cmd.commands[cloudProvider];
  if (providerCmd) return providerCmd;

  // Fallback to general or AWS
  return cmd.commands.general ?? cmd.commands.aws ?? null;
}
