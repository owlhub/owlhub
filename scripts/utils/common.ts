import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

// Function to generate a unique key for security findings
export function generateKey(integrationId: string, findingId: string, findingKey: string): string {
    return crypto.createHash('sha256').update(`${integrationId}-${findingId}-${findingKey}`).digest('hex');
}

/**
 * Fetch security findings from the database for a specific app type
 * @param appTypeId - The ID of the app type
 * @param prisma - The Prisma client instance
 * @returns An array of security findings
 */
export async function fetchAppSecurityFindingsFromDatabase(appTypeId: string, prisma: PrismaClient) {
    try {
        console.log(`Fetching security findings for appTypeId: ${appTypeId}`);

        const findings = await prisma.securityFinding.findMany({
            where: {
                appTypeId
            }
        });

        console.log(`Found ${findings.length} security findings for appTypeId: ${appTypeId}`);
        return findings;
    } catch (error) {
        console.error(`Error fetching security findings for appTypeId ${appTypeId}:`, error);
        return [];
    }
}

/**
 * Add or update security finding details in the IntegrationSecurityFindingDetails table for a specific integration
 * @param integration - The integration to add security finding details for
 * @param securityFindings - The security findings to add details for
 * @param prisma - The Prisma client instance
 * @returns An array of created or updated IntegrationSecurityFindingDetails records
 */
export async function addIntegrationSecurityFindingDetails(
    integration: any, 
    securityFindings: any[], 
    prisma: PrismaClient
) {
    const results = [];

    try {
        console.log(`Adding ${securityFindings.length} security finding details for integration: ${integration.name}`);

        // Fetch all existing security finding details for this integration
        const existingDetails = await prisma.integrationSecurityFindingDetails.findMany({
            where: {
                integrationId: integration.id
            }
        });
        console.log(`Found ${existingDetails.length} existing security finding details for integration: ${integration.name}`);

        // Create a set of keys for the new security findings
        const newFindingKeys = new Set();

        // Process each security finding
        for (const securityFinding of securityFindings) {
            console.log(`Adding security finding detail for: ${securityFinding.name || securityFinding.title} in integration: ${integration.name}`, integration.id, securityFinding.id, securityFinding.key);
            try {
                // Generate a unique key for this security finding detail
                const detailKey = generateKey(integration.id, securityFinding.id, securityFinding.key.toString());

                // Add to the set of new keys
                newFindingKeys.add(detailKey);

                // Check if the integration security finding detail already exists
                const existingDetail = await prisma.integrationSecurityFindingDetails.findUnique({
                    where: { key: detailKey }
                });

                if (!existingDetail) {
                    // Create integration security finding detail
                    const newDetail = await prisma.integrationSecurityFindingDetails.create({
                        data: {
                            integrationId: integration.id,
                            securityFindingId: securityFinding.id,
                            key: detailKey,
                            description: securityFinding.description || 'No description provided',
                            additionalInfo: typeof securityFinding.additionalInfo === 'string' 
                                ? securityFinding.additionalInfo 
                                : JSON.stringify(securityFinding.additionalInfo || {})
                        }
                    });

                    console.log(`Added integration security finding detail for: ${securityFinding.name || securityFinding.title} in integration: ${integration.name}`);
                    results.push(newDetail);
                } else {
                    // Update existing security finding detail with new description and additionalInfo
                    const updatedDetail = await prisma.integrationSecurityFindingDetails.update({
                        where: { key: detailKey },
                        data: {
                            description: securityFinding.description || 'No description provided',
                            additionalInfo: typeof securityFinding.additionalInfo === 'string' 
                                ? securityFinding.additionalInfo 
                                : JSON.stringify(securityFinding.additionalInfo || {})
                        }
                    });
                    console.log(`Updated integration security finding detail for: ${securityFinding.name || securityFinding.title} in integration: ${integration.name}`);
                    results.push(updatedDetail);
                }
            } catch (error) {
                console.error(`Error adding security finding detail for integration ${integration.name}:`, error);
            }
        }

        // Delete security findings that no longer exist
        for (const existingDetail of existingDetails) {
            if (!newFindingKeys.has(existingDetail.key)) {
                console.log(`Deleting security finding detail with key: ${existingDetail.key} as it no longer exists`);
                try {
                    await prisma.integrationSecurityFindingDetails.delete({
                        where: { key: existingDetail.key }
                    });
                    console.log(`Deleted security finding detail with key: ${existingDetail.key}`);
                } catch (error) {
                    console.error(`Error deleting security finding detail with key: ${existingDetail.key}:`, error);
                }
            }
        }

        return results;
    } catch (error) {
        console.error(`Error adding security finding details for integration ${integration.name}:`, error);
        return results;
    }
}

// Function to add users to the database if they don't exist and record their integration membership
export async function addIntegrationMembersToDatabase(integration: any, users: any[], appTypeId: string, prisma: PrismaClient) {
    try {
        console.log(`Processing ${users.length} users for integration: ${integration.name}`);

        // Fetch all existing memberships for this integration
        const existingMemberships = await prisma.integrationMembership.findMany({
            where: {
                integrationId: integration.id
            },
            include: {
                user: true
            }
        });
        console.log(`Found ${existingMemberships.length} existing memberships for integration: ${integration.name}`);

        // Create a set of user emails from the new users list
        const newUserEmails = new Set(users.filter(user => user.email).map(user => user.email.toLowerCase()));

        // Process each user
        for (const user of users) {
            try {
                if (!user.email) {
                    console.log(`Skipping user without email: ${user.username || user.id}`);
                    continue;
                }

                // Check if user already exists
                let dbUser = await prisma.user.findUnique({
                    where: { email: user.email }
                });

                if (!dbUser) {
                    // Create new user
                    dbUser = await prisma.user.create({
                        data: {
                            email: user.email,
                            name: user.name || user.username,
                            image: user.avatar_url,
                            // Set default values for required fields
                            isSuperUser: false,
                            isActive: true
                        }
                    });
                    console.log(`Added user: ${user.email}`);
                }

                // Check if the integration membership already exists
                const existingMembership = await prisma.integrationMembership.findUnique({
                    where: {
                        integrationId_userId: {
                            integrationId: integration.id,
                            userId: dbUser.id
                        }
                    }
                });

                if (!existingMembership) {
                    // Create integration membership
                    await prisma.integrationMembership.create({
                        data: {
                            integrationId: integration.id,
                            appTypeId: appTypeId,
                            userId: dbUser.id,
                            config: JSON.stringify(user.additionalData || {})
                        }
                    });
                    console.log(`Added integration membership for user: ${user.email} in integration: ${integration.name}`);
                }
            } catch (error) {
                console.error(`Error processing user ${user.email}:`, error);
            }
        }

        // Delete memberships for users that are no longer part of the integration
        for (const membership of existingMemberships) {
            if (membership.user && membership.user.email && !newUserEmails.has(membership.user.email.toLowerCase())) {
                console.log(`Deleting membership for user: ${membership.user.email} as they are no longer part of integration: ${integration.name}`);
                try {
                    await prisma.integrationMembership.delete({
                        where: {
                            integrationId_userId: {
                                integrationId: integration.id,
                                userId: membership.userId
                            }
                        }
                    });
                    console.log(`Deleted membership for user: ${membership.user.email} from integration: ${integration.name}`);
                } catch (error) {
                    console.error(`Error deleting membership for user: ${membership.user.email}:`, error);
                }
            }
        }
    } catch (error) {
        console.error(`Error processing users for integration ${integration.name}:`, error);
    }
}
