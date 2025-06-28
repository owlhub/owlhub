import { PrismaClient } from '@prisma/client';
import {fetchIntegrationMembers} from './fetchIntegrationMembers';
import {fetchGitLabSecurityFindings} from './fetchGitLabSecurityFindings';
import {
  addIntegrationMembersToDatabase,
  addIntegrationFindingDetails
} from "../utils/common";

/**
 * Process a GitLab integration
 * @param integration - The GitLab integration to process
 * @param appId - The ID of the GitLab app
 * @param prisma - The Prisma client instance
 * @param securityFindings - App findings for this app type
 */
export async function processGitLabIntegration(integration: any, appId: string, prisma: PrismaClient, appFindings: any[] = []) {
  try {
    console.log(`Processing GitLab integration: ${integration.name}`);

    const config = JSON.parse(integration.config);
    const gitlabUrl = config.gitlabUrl;
    const personalAccessToken = config.personalAccessToken;

    if (!gitlabUrl || !personalAccessToken) {
      console.error(`Integration ${integration.name} is missing required configuration`);
      return;
    }

    // If appFindings is not provided, return
    if (appFindings.length === 0) {
      return
    }

    console.log(`Found ${appFindings.length} app findings for this app type`);

    // Fetch users from GitLab
    const members = await fetchIntegrationMembers(gitlabUrl, personalAccessToken);

    // Add users to database and record their integration membership
    await addIntegrationMembersToDatabase(integration, members, appId, prisma);

    // Fetch vulnerabilities from GitLab
    const foundAppFindings = await fetchGitLabSecurityFindings(gitlabUrl, personalAccessToken);

    console.log(`Found ${foundAppFindings.length} app findings in GitLab`, foundAppFindings);

    // Create a new array with updated IDs to ensure changes persist
    const updatedAppFindings = foundAppFindings.map(foundAppFinding => {
      // Create a copy of the finding to avoid reference issues
      const updatedFinding = { ...foundAppFinding };

      // Update the ID based on key match
      for (const appFinding of appFindings) {
        if (updatedFinding.id === appFinding.key) {
          console.log(`Updating ID for app finding with key ${updatedFinding.key} from ${updatedFinding.id} to ${appFinding.id}`);
          updatedFinding.id = appFinding.id;
          updatedFinding.severity = appFinding.severity;
          break; // Exit the loop once a match is found
        }
      }

      return updatedFinding;
    });

    await addIntegrationFindingDetails(integration, updatedAppFindings, prisma);

    console.log(`Completed processing GitLab integration: ${integration.name}`);
  } catch (error) {
    console.error(`Error processing GitLab integration ${integration.name}:`, error);
  }
}
