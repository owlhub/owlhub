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
        appType: true
      }
    });

    console.log(`Found ${enabledIntegrations.length} enabled integrations`);

    // Group integrations by app type
    const integrationsByAppType = new Map<string, { appType: any, integrations: any[] }>();

    for (const integration of enabledIntegrations) {
      const appTypeId = integration.appTypeId;

      if (!integrationsByAppType.has(appTypeId)) {
        integrationsByAppType.set(appTypeId, {
          appType: integration.appType,
          integrations: []
        });
      }

      integrationsByAppType.get(appTypeId)?.integrations.push(integration);
    }

    // Process each app type's integrations
    for (const [appTypeId, { appType, integrations }] of integrationsByAppType.entries()) {
      console.log(`Processing ${integrations.length} integrations for app type: ${appType.name}`);

      // Fetch security findings from database for this appType
      const securityFindings = await fetchAppSecurityFindingsFromDatabase(appTypeId, prisma);

      // Insert security findings in the IntegrationSecurityFinding table if not found
      for (const integration of integrations) {
        for (const securityFinding of securityFindings) {
          // Check if the integration security finding already exists
          const existingIntegrationFinding = await prisma.integrationSecurityFinding.findUnique({
            where: {
              integrationId_securityFindingId: {
                integrationId: integration.id,
                securityFindingId: securityFinding.id
              }
            }
          });

          if (!existingIntegrationFinding) {
            // Create integration security finding
            await prisma.integrationSecurityFinding.create({
              data: {
                integrationId: integration.id,
                securityFindingId: securityFinding.id,
                activeCount: 0,
                hiddenCount: 0,
                lastDetectedAt: new Date()
              }
            });

            console.log(`Added integration security finding for: ${securityFinding.name} in integration: ${integration.name}`);
          }
        }
      }

      // Process based on app type
      switch (appType.name) {
        case 'GitLab':
          for (const integration of integrations) {
            await processGitLabIntegration(integration, appTypeId, prisma, securityFindings);
          }
          break;
        case 'AWS':
          for (const integration of integrations) {
            await processAWSIntegration(integration, appTypeId, prisma, securityFindings)
          }
        // Add cases for other app types as they are implemented
        default:
          console.log(`No processor implemented for app type: ${appType.name}`);
      }

      console.log('Updating active and hidden counts in integrationSecurityFinding table');
      for (const integration of integrations) {
        // Get all security findings for this integration
        const integrationFindings = await prisma.integrationSecurityFinding.findMany({
          where: {
            integrationId: integration.id
          }
        });

        for (const finding of integrationFindings) {
          // Count active (non-hidden) findings
          const activeCount = await prisma.integrationSecurityFindingDetails.count({
            where: {
              integrationId: integration.id,
              securityFindingId: finding.securityFindingId,
              hidden: false
            }
          });

          // Count hidden findings
          const hiddenCount = await prisma.integrationSecurityFindingDetails.count({
            where: {
              integrationId: integration.id,
              securityFindingId: finding.securityFindingId,
              hidden: true
            }
          });

          // Update the integrationSecurityFinding record
          await prisma.integrationSecurityFinding.update({
            where: {
              id: finding.id
            },
            data: {
              activeCount,
              hiddenCount,
              lastDetectedAt: new Date()
            }
          });

          console.log(`Updated counts for integration ${integration.name}, finding ${finding.securityFindingId}: active=${activeCount}, hidden=${hiddenCount}`);
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
