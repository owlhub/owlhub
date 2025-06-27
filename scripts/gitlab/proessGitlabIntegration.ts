import { PrismaClient } from '@prisma/client';
import {fetchIntegrationMembers} from './fetchIntegrationMembers';
import {fetchGitLabSecurityFindings} from './fetchGitLabSecurityFindings';
import {
  addIntegrationMembersToDatabase,
  addIntegrationSecurityFindingDetails
} from "../utils/common";

/**
 * Process a GitLab integration
 * @param integration - The GitLab integration to process
 * @param appTypeId - The ID of the GitLab app type
 * @param prisma - The Prisma client instance
 * @param securityFindings - Security findings for this app type
 */
export async function processGitLabIntegration(integration: any, appTypeId: string, prisma: PrismaClient, securityFindings: any[] = []) {
  try {
    console.log(`Processing GitLab integration: ${integration.name}`);

    const config = JSON.parse(integration.config);
    const gitlabUrl = config.gitlabUrl;
    const personalAccessToken = config.personalAccessToken;

    if (!gitlabUrl || !personalAccessToken) {
      console.error(`Integration ${integration.name} is missing required configuration`);
      return;
    }

    // If securityFindings is not provided, return
    if (securityFindings.length === 0) {
      return
    }

    console.log(`Found ${securityFindings.length} security findings for this app type`);

    // Fetch users from GitLab
    const members = await fetchIntegrationMembers(gitlabUrl, personalAccessToken);

    // Add users to database and record their integration membership
    await addIntegrationMembersToDatabase(integration, members, appTypeId, prisma);

    // Fetch vulnerabilities from GitLab
    const foundSecurityFindings = await fetchGitLabSecurityFindings(gitlabUrl, personalAccessToken);

    console.log(`Found ${foundSecurityFindings.length} security findings in GitLab`, foundSecurityFindings);

    // Create a new array with updated IDs to ensure changes persist
    const updatedSecurityFindings = foundSecurityFindings.map(foundSecurityFinding => {
      // Create a copy of the finding to avoid reference issues
      const updatedFinding = { ...foundSecurityFinding };

      // Update the ID based on key match
      for (const securityFinding of securityFindings) {
        if (updatedFinding.id === securityFinding.key) {
          console.log(`Updating ID for security finding with key ${updatedFinding.key} from ${updatedFinding.id} to ${securityFinding.id}`);
          updatedFinding.id = securityFinding.id;
          updatedFinding.severity = securityFinding.severity;
          break; // Exit the loop once a match is found
        }
      }

      return updatedFinding;
    });

    await addIntegrationSecurityFindingDetails(integration, updatedSecurityFindings, prisma);

    console.log(`Completed processing GitLab integration: ${integration.name}`);
  } catch (error) {
    console.error(`Error processing GitLab integration ${integration.name}:`, error);
  }
}
