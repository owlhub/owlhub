# Security Findings Background Scripts

This directory contains scripts that run in the background to fetch security findings from various integrations.

## fetchSecurityFindings.ts

This script fetches security findings and users from GitLab integrations and stores them in the database.

### Features

- Connects to all enabled GitLab integrations
- Fetches users and vulnerabilities from the GitLab API
- Adds new users to the database
- Adds new security findings to the database
- Avoids duplicates by using a unique key for each finding

### Prerequisites

- Node.js
- TypeScript
- Access to the application's database

### How to Run

You can run the script manually:

```bash
# From the project root
npx ts-node scripts/fetchSecurityFindings.ts
```

### Setting Up as a Background Process

To run the script periodically in the background, you can use a cron job:

1. Create a shell script wrapper:

```bash
# Create a file called run-security-scan.sh
#!/bin/bash
cd /path/to/your/project
npx ts-node scripts/fetchSecurityFindings.ts >> logs/security-scan.log 2>&1
```

2. Make the script executable:

```bash
chmod +x run-security-scan.sh
```

3. Add a cron job to run it periodically:

```bash
# Edit crontab
crontab -e

# Add a line to run the script every hour
0 * * * * /path/to/your/project/run-security-scan.sh
```

### Extending to Other Integrations

To add support for other integrations:

1. Create a new function similar to `fetchGitLabData` for the new integration
2. Add a new processing function similar to `processGitLabIntegrations`
3. Call the new processing function from the main script

## Troubleshooting

If you encounter issues:

1. Check the logs for error messages
2. Verify that the integration credentials are correct
3. Ensure the GitLab API endpoints are accessible from your server