import {fetchAllPages} from './utils';
import {json} from "node:stream/consumers";


/**
 * Fetch all security findings from GitLab
 * @param gitlabUrl - The base URL of the GitLab instance
 * @param personalAccessToken - The personal access token for authentication
 * @returns An array of vulnerabilities
 */
export async function fetchGitLabSecurityFindings(gitlabUrl: string, personalAccessToken: string): Promise<any[]> {
  try {
    console.log('Fetching security findings from GitLab');

    // First, get all accessible projects with pagination
    const projects = await fetchAllPages(`${gitlabUrl}/api/v4/projects`, personalAccessToken);
    console.log(`Found ${projects.length} accessible projects`);

    const allSecurityFindings: any[] = [];

    // For each project, get its vulnerabilities
    for (const project of projects) {
      // console.log(project)
      try {
        if (project.visibility == 'public') {
          allSecurityFindings.push({
            id: 'gitlab_public_project',
            key: `gitlab-public-repo-${project.id}`,
            title: `Repository is public.`,
            description: `${project.name_with_namespace} is public repo`,
            additionalInfo: {
              project: {
                id: project.id,
                name: project.name,
                name_with_namespace: project.name_with_namespace,
                web_url: project.web_url,
                path: project.path,
                path_with_namespace: project.path_with_namespace
              },
            }
          })
        }

        // Check if the default branch is not protected
        if (project.default_branch) {
          try {
            console.log(`Checking if default branch '${project.default_branch}' is protected for project: ${project.name} (ID: ${project.id})`);

            // Fetch protected branches for the project
            const protectedBranches = await fetchAllPages(
              `${gitlabUrl}/api/v4/projects/${project.id}/protected_branches`,
              personalAccessToken
            );

            console.log(`Found ${protectedBranches.length} protected branches for project ${project.name}`);


            // Check if the default branch is in the list of protected branches
            const defaultBranchProtection = protectedBranches.find(
              (branch) => branch.name === project.default_branch
            );

            const isDefaultBranchProtected = !!defaultBranchProtection;

            // Check if the default branch allows direct push or force push
            let allowsDirectOrForcePush = false;
            if (isDefaultBranchProtected) {
              allowsDirectOrForcePush = defaultBranchProtection.allow_force_push;

              if (!allowsDirectOrForcePush && defaultBranchProtection.push_access_levels) {
                // Check if any access level allows direct push (access level 30 is Developer, 40 is Maintainer)
                allowsDirectOrForcePush = defaultBranchProtection.push_access_levels.some(
                    (level: { access_level: number; }) => level.access_level > 0 && level.access_level < 40
                );
              }
            }

            // Check if the default branch is not protected or allows direct/force push
            if (!isDefaultBranchProtected || allowsDirectOrForcePush) {
              // Determine the appropriate title and description based on the issue
              let title = '';
              let description = '';

              if (!isDefaultBranchProtected) {
                title = `Default branch is not protected`;
                description = `The default branch '${project.default_branch}' in ${project.name_with_namespace} is not protected.`;
              } else {
                title = `Default branch allows direct or force push`;
                description = `The default branch '${project.default_branch}' in ${project.name_with_namespace} allows direct or force push by developers or lower roles.`;
              }
              // Create a security finding for unprotected default branch
              const securityFinding = {
                id: 'gitlab_unprotected_default_branch',
                key: `gitlab-unprotected-default-branch-${project.id}`,
                title: title,
                description: description,
                additionalInfo: {
                  project: {
                    id: project.id,
                    name: project.name,
                    name_with_namespace: project.name_with_namespace,
                    web_url: project.web_url,
                    path: project.path,
                    path_with_namespace: project.path_with_namespace,
                    default_branch: project.default_branch
                  },
                  defaultBranchProtection: defaultBranchProtection,
                }
              };

              allSecurityFindings.push(securityFinding);
              console.log(`Added security finding: ${title} for branch '${project.default_branch}' in project ${project.name}`);
            }
          } catch (error) {
            console.error(`Error checking protected branches for project ${project.name}:`, error);
          }
        }

        console.log(`Fetching members for project: ${project.name} (ID: ${project.id})`);

        // Fetch all pages of project members
        const members = await fetchAllPages(`${gitlabUrl}/api/v4/projects/${project.id}/members/all`, personalAccessToken);
        console.log(`Found ${members.length} members in project ${project.name}`);


        // Add members to the unique users map
        for (const member of members) {
          // For Owners
          if (member.access_level == 50) {
            if (member.expires_at) {
              // Create a security finding for members without expiry
              const securityFinding = {
                id: 'gitlab_repo_owner_with_expiry',
                key: `gitlab-owner-expiry-${project.id}-${member.id}`,
                title: `Repo Owner have expiry date on repository`,
                description: `${member.name} (${member.email || 'No email'}) is owner of ${project.name_with_namespace} have expiry set.`,
                additionalInfo: {
                  user: {
                    id: member.id,
                    name: member.name,
                    username: member.username,
                    email: member.email,
                    avatar_url: member.avatar_url,
                    web_url: member.web_url,
                    access_level: member.access_level,
                    created_at: member.created_at,
                  },
                  project: {
                    id: project.id,
                    name: project.name,
                    name_with_namespace: project.name_with_namespace,
                    web_url: project.web_url,
                    path: project.path,
                    path_with_namespace: project.path_with_namespace
                  },
                }
              };

              allSecurityFindings.push(securityFinding);


              console.log(`Added security finding for user ${member.name} without expiry on repo ${project.name}`);
            }
          } else {
            // console.log(member)

            // Check if member does not have expiry
            if (!member.expires_at) {
              // Create a security finding for members without expiry
              const securityFinding = {
                id: 'gitlab_repo_access_without_expiry',
                key: `gitlab-no-expiry-${project.id}-${member.id}`,
                title: `User without expiry date on repository`,
                description: `${member.name} (${member.email || 'No email'}) does not have expiry on repo ${project.name_with_namespace}`,
                additionalInfo: {
                  user: {
                    id: member.id,
                    name: member.name,
                    username: member.username,
                    email: member.email,
                    avatar_url: member.avatar_url,
                    web_url: member.web_url,
                    access_level: member.access_level,
                    created_at: member.created_at,
                  },
                  project: {
                    id: project.id,
                    name: project.name,
                    name_with_namespace: project.name_with_namespace,
                    web_url: project.web_url,
                    path: project.path,
                    path_with_namespace: project.path_with_namespace
                  },
                }
              };

              allSecurityFindings.push(securityFinding);


              console.log(`Added security finding for user ${member.name} without expiry on repo ${project.name}`);
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching vulnerabilities for project ${project.name}:`, error);
      }
    }

    console.log(`Total security findings found: ${allSecurityFindings.length}`);
    return allSecurityFindings;
  } catch (error) {
    console.error('Error fetching GitLab security findings:', error);
    return [];
  }
}
