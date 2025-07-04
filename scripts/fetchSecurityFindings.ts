import { PrismaClient } from '@prisma/client';

import { fetchAppSecurityFindingsFromDatabase } from "./utils/common";
import { trackJob } from "./utils/jobTracker";

import {
  processAWSIntegration
} from "./aws/processAWSIntegration";
import {
  processGitLabIntegration
} from './gitlab/proessGitlabIntegration';

// Helper function to process integrations in batches
async function processBatch(batch: any[], fn: (item: any) => Promise<any>) {
  return Promise.all(batch.map(fn));
}

/**
 * Process a single integration
 * @param integration - The integration to process
 * @param appId - The ID of the app
 * @param app - The app object
 * @param appFindings - App findings for this app type
 * @param prisma - The Prisma client instance
 */
async function processIntegration(integration: any, appId: string, app: any, appFindings: any[], prisma: PrismaClient) {
  try {
    console.log(`Processing integration: ${integration.name}`);

    // Insert app findings in the IntegrationFinding table if not found
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

    // Process based on app type
    switch (app.name) {
      case 'GitLab':
        await processGitLabIntegration(integration, appId, prisma, appFindings);
        break;
      case 'AWS':
        await processAWSIntegration(integration, appId, prisma, appFindings);
        break;
      default:
        console.log(`No processor implemented for app type: ${app.name}`);
    }

    console.log(`Completed processing integration: ${integration.name}`);
  } catch (error) {
    console.error(`Error processing integration ${integration.name}:`, error);
    // Don't rethrow the error to prevent one failure from stopping other integrations
  }
}

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Main function to process all enabled integrations
 * This function finds all enabled integrations and processes them based on their app type
 */
async function processIntegrations() {
  try {
    // Use the trackJob utility to handle job tracking
    await trackJob(prisma, 'fetchSecurityFindings', async () => {
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

        // Process all integrations with a maximum concurrency of 10
        const MAX_CONCURRENCY = 2;
        console.log(`Processing ${integrations.length} integrations with max concurrency of ${MAX_CONCURRENCY}`);

        // Create a queue of integrations to process
        const queue = [...integrations];
        const activePromises: Promise<any>[] = [];
        const results: any[] = [];

        // Process integrations with dynamic concurrency
        while (queue.length > 0 || activePromises.length > 0) {
          // Fill up to MAX_CONCURRENCY
          while (queue.length > 0 && activePromises.length < MAX_CONCURRENCY) {
            const integration = queue.shift()!;
            console.log(`Starting integration: ${integration.name}`);

            // Create a promise that will be removed from activePromises when it completes
            const promise = processIntegration(integration, appId, app, appFindings, prisma)
              .then(result => {
                // Remove this promise from activePromises when it completes
                const index = activePromises.indexOf(promise);
                if (index !== -1) {
                  activePromises.splice(index, 1);
                }
                console.log(`Completed integration: ${integration.name}, ${activePromises.length} still active`);
                return result;
              })
              .catch(error => {
                // Remove this promise from activePromises when it fails
                const index = activePromises.indexOf(promise);
                if (index !== -1) {
                  activePromises.splice(index, 1);
                }
                console.error(`Failed integration: ${integration.name}`, error);
                // Don't rethrow to prevent one failure from stopping other integrations
              });

            activePromises.push(promise);
            results.push(promise);
          }

          // Wait for at least one promise to complete if we've reached MAX_CONCURRENCY
          if (activePromises.length >= MAX_CONCURRENCY || (queue.length === 0 && activePromises.length > 0)) {
            await Promise.race(activePromises);
          }
        }

        // Wait for all results
        await Promise.all(results);
        console.log(`Completed processing all ${integrations.length} integrations`);
      }

      console.log('Completed processing all enabled integrations');
    });
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
