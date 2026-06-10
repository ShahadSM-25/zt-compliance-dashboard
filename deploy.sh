#!/bin/bash
# =============================================================================
# HealthComply AWS EC2 Deployment Script
# =============================================================================

echo "🚀 Starting HealthComply AWS Deployment..."

# 1. Check if both repositories exist
if [ ! -d "../cloud-compliance-automation" ]; then
  echo "❌ Error: cloud-compliance-automation repository not found."
  echo "Please clone it in the parent directory: git clone https://github.com/ShahadSM-25/cloud-compliance-automation.git ../cloud-compliance-automation"
  exit 1
fi

# 2. Update code
echo "📦 Pulling latest code..."
git pull origin main
cd ../cloud-compliance-automation && git pull origin main && cd ../zt-compliance-dashboard

# 3. Setup pnpm store (needed for offline build)
echo "🛠️ Setting up pnpm store..."
chmod +x setup-pnpm-store.sh
./setup-pnpm-store.sh

# 4. Ask for AWS Credentials (for Bedrock)
echo ""
echo "☁️  AWS Bedrock Configuration"
echo "To enable the AI Policy Engine, please provide your AWS credentials."
echo "(Press Enter to skip if already configured or using IAM Role)"

read -p "AWS_ACCESS_KEY_ID: " input_ak
if [ ! -z "$input_ak" ]; then export AWS_ACCESS_KEY_ID="$input_ak"; fi

read -p "AWS_SECRET_ACCESS_KEY: " input_sk
if [ ! -z "$input_sk" ]; then export AWS_SECRET_ACCESS_KEY="$input_sk"; fi

read -p "AWS_SESSION_TOKEN (required for AWS Academy/SSO): " input_st
if [ ! -z "$input_st" ]; then export AWS_SESSION_TOKEN="$input_st"; fi

export AWS_REGION="us-east-1"

# 5. Start with Docker Compose
echo "🐳 Starting Docker containers..."
docker compose -f docker-compose.aws.yml down
docker compose -f docker-compose.aws.yml up -d --build

echo ""
echo "✅ Deployment complete!"
echo "🌍 The dashboard should now be accessible on port 80 (http://YOUR_EC2_IP)"
echo "Logs: docker compose -f docker-compose.aws.yml logs -f"
