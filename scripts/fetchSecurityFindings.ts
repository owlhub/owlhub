import { PrismaClient } from '@prisma/client';

import { fetchAppSecurityFindingsFromDatabase } from "./utils/common";

import {
  processAWSIntegration
} from "./aws/processAWSIntegration";
import {
  processGitLabIntegration
} from './gitlab/proessGitlabIntegration';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Main function to process all enabled integrations
 * This function finds all enabled integrations and processes them based on their app type
 */
async function processIntegrations() {
  try {
    console.log('Starting to process all enabled integrations');

    // Find all enabled integrations
    const enabledIntegrations = await prisma.integration.findMany({
      where: {
        isEnabled: true
      },
      include: {
        app: true
      }
    });

    console.log(`Found ${enabledIntegrations.length} enabled integrations`);

    // Group integrations by app type
    const integrationsByApp = new Map<string, { app: any, integrations: any[] }>();

    for (const integration of enabledIntegrations) {
      const appId = integration.appId;

      if (!integrationsByApp.has(appId)) {
        integrationsByApp.set(appId, {
          app: integration.app,
          integrations: []
        });
      }

      integrationsByApp.get(appId)?.integrations.push(integration);
    }

    // Process each app type's integrations
    for (const [appId, { app, integrations }] of integrationsByApp.entries()) {
      console.log(`Processing ${integrations.length} integrations for app type: ${app.name}`);

      // Fetch app findings from database for this app
      const appFindings = await fetchAppSecurityFindingsFromDatabase(appId, prisma);

      // Insert app findings in the IntegrationFinding table if not found
      for (const integration of integrations) {
        for (const appFinding of appFindings) {
          // Check if the integration app finding already exists
          const existingIntegrationFinding = await prisma.integrationFinding.findUnique({
            where: {
              integrationId_appFindingId: {
                integrationId: integration.id,
                appFindingId: appFinding.id
              }
            }
          });

          if (!existingIntegrationFinding) {
            // Create integration app finding
            await prisma.integrationFinding.create({
              data: {
                integrationId: integration.id,
                appFindingId: appFinding.id,
                severity: appFinding.severity,
                activeCount: 0,
                hiddenCount: 0,
                lastDetectedAt: new Date()
              }
            });

            console.log(`Added integration app finding for: ${appFinding.name} in integration: ${integration.name}`);
          }
        }
      }

      // Process based on app type
      switch (app.name) {
        case 'GitLab':
          for (const integration of integrations) {
            await processGitLabIntegration(integration, appId, prisma, appFindings);
          }
          break;
        case 'AWS':
          for (const integration of integrations) {
            await processAWSIntegration(integration, appId, prisma, appFindings)
          }
        // Add cases for other app types as they are implemented
        default:
          console.log(`No processor implemented for app type: ${app.name}`);
      }

      console.log('Updating active and hidden counts in integrationFinding table');
      for (const integration of integrations) {
        // Get all security findings for this integration
        const integrationFindings = await prisma.integrationFinding.findMany({
          where: {
            integrationId: integration.id
          }
        });

        for (const finding of integrationFindings) {
          // Count active (non-hidden) findings
          const activeCount = await prisma.integrationFindingDetail.count({
            where: {
              integrationId: integration.id,
              appFindingId: finding.appFindingId,
              hidden: false
            }
          });

          // Count hidden findings
          const hiddenCount = await prisma.integrationFindingDetail.count({
            where: {
              integrationId: integration.id,
              appFindingId: finding.appFindingId,
              hidden: true
            }
          });

          // Update the integrationFinding record
          await prisma.integrationFinding.update({
            where: {
              id: finding.id
            },
            data: {
              activeCount,
              hiddenCount,
              lastDetectedAt: new Date()
            }
          });

          console.log(`Updated counts for integration ${integration.name}, finding ${finding.appFindingId}: active=${activeCount}, hidden=${hiddenCount}`);
        }
      }
    }

    console.log('Completed processing all enabled integrations');
  } catch (error) {
    console.error('Error in processIntegrations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
processIntegrations()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
