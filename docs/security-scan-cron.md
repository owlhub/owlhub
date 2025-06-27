# Security Scan Cron Job Configuration

This document explains how the automated security scanning is configured in the OwlHub application.

## Overview

The application includes a script (`fetchSecurityFindings.ts`) that scans all enabled integrations for security findings. This script is configured to run automatically on a daily basis using Vercel's Cron Jobs feature.

## How It Works

1. **API Endpoint**: An API route has been created at `/api/security/scan` that executes the security scanning script.

2. **Vercel Cron Configuration**: A `vercel.json` file has been added to the project root with the following configuration:

```json
{
  "version": 2,
  "crons": [
    {
      "path": "/api/security/scan",
      "schedule": "0 0 * * *"
    }
  ]
}
```

This configuration tells Vercel to call the `/api/security/scan` endpoint at midnight (00:00) every day.

## Cron Schedule Explanation

The schedule `0 0 * * *` follows the standard cron syntax:

- First `0`: Minute (0-59)
- Second `0`: Hour (0-23)
- First `*`: Day of month (1-31)
- Second `*`: Month (1-12)
- Third `*`: Day of week (0-6, where 0 is Sunday)

So `0 0 * * *` means "at 00:00 (midnight) every day".

## Modifying the Schedule

If you need to change the frequency of the security scan, you can modify the `schedule` value in the `vercel.json` file. Here are some common examples:

- `0 */12 * * *`: Every 12 hours
- `0 0 */2 * *`: Every 2 days at midnight
- `0 0 * * 1`: Every Monday at midnight
- `0 0 1 * *`: First day of every month at midnight

## Manual Execution

You can also trigger the security scan manually by:

1. Making a GET request to the `/api/security/scan` endpoint
2. Running the script directly: `npx ts-node -P tsconfig.scripts.json scripts/fetchSecurityFindings.ts`
3. Using the shell script: `./scripts/run-security-scan.sh`

## Logs

When the cron job runs, logs will be available in the Vercel dashboard under the "Functions" tab.