#!/bin/bash

# Change to the project root directory
cd "$(dirname "$0")/.."

# Create logs directory if it doesn't exist
mkdir -p logs

# Run the script and log output
echo "Starting security scan at $(date)" > logs/security-scan.log
npx ts-node -P tsconfig.scripts.json scripts/fetchSecurityFindings.ts >> logs/security-scan.log 2>&1
echo "Completed security scan at $(date)" >> logs/security-scan.log