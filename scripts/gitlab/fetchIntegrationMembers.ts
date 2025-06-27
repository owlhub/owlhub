import {fetchAllPages} from './utils';

/**
 * Fetches all users from a GitLab instance using the membership API
 * @param gitlabUrl - The base URL of the GitLab instance
 * @param personalAccessToken - The personal access token for authentication
 * @returns An array of GitLab users
 */
export async function fetchIntegrationMembers(gitlabUrl: string, personalAccessToken: string): Promise<any[]> {
  try {
    // First, get all accessible projects with pagination
    const projects = await fetchAllPages(`${gitlabUrl}/api/v4/projects`, personalAccessToken);
    console.log(`Found ${projects.length} accessible projects`);

    // Set to store unique users
    const uniqueUsers = new Map();

    // For each project, get its members
    for (const project of projects) {
      try {
        console.log(`Fetching members for project: ${project.name} (ID: ${project.id})`);

        // Fetch all pages of project members
        const members = await fetchAllPages(`${gitlabUrl}/api/v4/projects/${project.id}/members/all`, personalAccessToken);
        console.log(`Found ${members.length} members in project ${project.name}`);

        // Add members to the unique users map
        for (const member of members) {
          console.log(`Adding member ${member.id} (${member.name}) to the unique users map`);
          if (!uniqueUsers.has(member.id)) {
            uniqueUsers.set(member.id, member);
          }
        }
      } catch (error) {
        console.error(`Error fetching members for project ${project.name}:`, error);
      }
    }

    // Also fetch group members if available
    try {
      // Fetch all pages of groups
      const groups = await fetchAllPages(`${gitlabUrl}/api/v4/groups`, personalAccessToken);
        console.log(`Found ${groups.length} accessible groups`);

        for (const group of groups) {
          try {
            console.log(`Fetching members for group: ${group.name} (ID: ${group.id})`);

            // Fetch all pages of group members
            const groupMembers = await fetchAllPages(`${gitlabUrl}/api/v4/groups/${group.id}/members/all`, personalAccessToken);
            console.log(`Found ${groupMembers.length} members in group ${group.name}`);

            // Add group members to the unique users map
            for (const member of groupMembers) {
              if (!uniqueUsers.has(member.id)) {
                uniqueUsers.set(member.id, member);
              }
            }
          } catch (error) {
            console.error(`Error fetching members for group ${group.name}:`, error);
          }
        }
      // No else block needed as fetchAllPages will throw an error if the request fails
    } catch (error) {
      console.error('Error fetching groups:', error);
    }

    // Convert map values to array
    const users = Array.from(uniqueUsers.values());
    console.log(`Total unique users found: ${users.length}`);

    // For each user, fetch additional details if needed
    const enhancedUsers = await Promise.all(
      users.map(async (user) => {
        try {
          // If the user object is missing email or other important details, fetch them
          if (!user.email) {
            const userResponse = await fetch(`${gitlabUrl}/api/v4/users/${user.id}`, {
              headers: {
                'PRIVATE-TOKEN': personalAccessToken
              }
            });

            if (userResponse.ok) {
              const userDetails = await userResponse.json();

              user.additionalInfo = {
                email: user.email,
                username: user.username,
                name: user.name,
                avatarUrl: user.avatar_url,
                webUrl: user.web_url,
                state: user.state,
                createdAt: user.created_at,
                updatedAt: user.updated_at,
              }

              return { ...user, ...userDetails };
            }
          }

          user.additionalInfo = {
            email: user.email,
            username: user.username,
            name: user.name,
            avatarUrl: user.avatar_url,
            webUrl: user.web_url,
            state: user.state,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
          }
          return user;
        } catch (error) {
          console.error(`Error fetching details for user ${user.id}:`, error);

          user.additionalInfo = {
            email: user.email,
            username: user.username,
            name: user.name,
            avatarUrl: user.avatar_url,
            webUrl: user.web_url,
            state: user.state,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
          }

          return user;
        }
      })
    );

    return enhancedUsers;
  } catch (error) {
    console.error('Error fetching GitLab users:', error);
    throw error;
  }
}
