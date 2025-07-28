import { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

/**
 * API Route Permission System
 * 
 * This module provides a centralized way to define and check permissions for API routes.
 * It uses a pattern-matching approach to match API routes and check if the user has the required permissions.
 * 
 * Key features:
 * - Define API routes with path patterns (e.g., "/api/integrations/:id")
 * - Pre-compile regex patterns for efficient matching
 * - Extract path parameters from URLs
 * - Check if a user has the required permissions for a route
 * - Return extracted path parameters along with the authorization result
 * 
 * Usage:
 * ```typescript
 * // In your API route handler
 * export async function GET(request: NextRequest) {
 *   const session = await auth();
 *   const path = request.nextUrl.pathname;
 *   const method = request.method;
 *   
 *   const permissionCheck = await checkApiPermission(session, path, method);
 *   
 *   if (!permissionCheck.authorized) {
 *     return NextResponse.json({ error: permissionCheck.message }, { status: 403 });
 *   }
 *   
 *   // Access path parameters
 *   const { id } = permissionCheck.params || {};
 *   
 *   // Continue with the API route logic
 * }
 * ```
 */

// Define the structure of API route permissions
export interface ApiRoutePermission {
  path: string;
  method: string;
  requiredPermissions: {
    resource: string;
    action: string;
  }[];
  // Compiled regex pattern for efficient matching
  pathRegex?: RegExp;
}

/**
 * Converts a route pattern to a regular expression pattern
 * 
 * @param pattern - The route pattern (e.g., "/api/integrations/:id")
 * @returns A RegExp object that can be used to match paths against the pattern
 * 
 * @example
 * const regex = routePatternToRegex("/api/integrations/:id");
 * regex.test("/api/integrations/123"); // true
 * regex.test("/api/integrations/abc"); // true
 * regex.test("/api/integrations"); // false
 */
function routePatternToRegex(pattern: string): RegExp {
  // Replace route parameters (e.g., :id) with regex pattern
  const regexPattern = pattern
    .replace(/:[^/]+/g, '([^/]+)') // Replace :param with capture group
    .replace(/\//g, '\\/');        // Escape forward slashes

  return new RegExp(`^${regexPattern}$`);
}

// Define all API routes and their required permissions
export const apiRoutePermissions: ApiRoutePermission[] = [
  {
    path: "/api/apps",
    method: "GET",
    requiredPermissions: []  // Allow any authenticated user
  },
  {
    path: "/api/apps/details",
    method: "GET",
    requiredPermissions: []  // Allow any authenticated user
  },
  {
    path: "/api/apps/guide",
    method: "GET",
    requiredPermissions: []  // Allow any authenticated user
  },
  {
    path: "/api/integrations",
    method: "GET",
    requiredPermissions: [
      { resource: "integration", action: "read" },
    ]
  },
  {
    path: "/api/integrations",
    method: "POST",
    requiredPermissions: [
      { resource: "integration", action: "edit" },
      { resource: "integration", action: "install" },
    ]
  },
  {
    path: "/api/integrations/:id",
    method: "GET",
    requiredPermissions: [
      { resource: "integration", action: "read" },
      { resource: "integration", action: "edit" },
    ]
  },
  {
    path: "/api/integrations/:id",
    method: "PATCH",
    requiredPermissions: [
      { resource: "integration", action: "read" },
      { resource: "integration", action: "edit" },
    ]
  },
  {
    path: "/api/integrations/:id",
    method: "DELETE",
    requiredPermissions: [
      { resource: "integration", action: "edit" },
    ]
  },
  {
    path: "/api/casb/overview",
    method: "GET",
    requiredPermissions: [
      { resource: "casb", action: "read" },
    ]
  },
  {
    path: "/api/casb/posture-findings",
    method: "GET",
    requiredPermissions: [
      { resource: "casb", action: "read" },
    ]
  },
  {
    path: "/api/casb/posture-findings/:id",
    method: "GET",
    requiredPermissions: [
      { resource: "casb", action: "read" },
    ]
  },
  {
    path: "/api/casb/posture-findings/:id",
    method: "PATCH",
    requiredPermissions: [
      { resource: "casb", action: "read" },
      { resource: "casb", action: "edit" },
    ]
  },
  {
    path: "/api/casb/posture-findings/:id/findings",
    method: "GET",
    requiredPermissions: [
      { resource: "casb", action: "read" },
    ]
  },
  {
    path: "/api/casb/posture-findings/:id/findings",
    method: "PATCH",
    requiredPermissions: [
      { resource: "casb", action: "read" },
      { resource: "casb", action: "edit" },
    ]
  }
  // Add more API routes as needed
];

// Pre-compile regex patterns for all routes
apiRoutePermissions.forEach(route => {
  route.pathRegex = routePatternToRegex(route.path);
});

/**
 * Checks if a path matches a route pattern
 * 
 * @param path - The actual path to check (e.g., "/api/integrations/123")
 * @param route - The route permission object containing the pattern and pre-compiled regex
 * @returns True if the path matches the route pattern, false otherwise
 * 
 * @example
 * const route = {
 *   path: "/api/integrations/:id",
 *   method: "GET",
 *   requiredPermissions: [...],
 *   pathRegex: /^\/api\/integrations\/([^/]+)$/
 * };
 * matchPath("/api/integrations/123", route); // true
 * matchPath("/api/integrations", route); // false
 */
function matchPath(path: string, route: ApiRoutePermission): boolean {
  if (!route.pathRegex) {
    console.error(`Route ${route.path} does not have a pre-compiled regex pattern`);
    return false;
  }

  const matches = route.pathRegex.test(path);

  // Log for debugging
  console.log(`Matching path: ${path} against pattern: ${route.path} => ${matches ? 'MATCH' : 'NO MATCH'}`);

  if (matches) {
    // Extract path parameters for debugging
    const params = extractPathParams(path, route.path);
    if (Object.keys(params).length > 0) {
      console.log(`  Extracted parameters:`, params);
    }
  }

  return matches;
}

/**
 * Extracts path parameters from a URL based on a route pattern
 * 
 * @param path - The actual path (e.g., "/api/integrations/123")
 * @param routePattern - The route pattern (e.g., "/api/integrations/:id")
 * @returns An object containing the extracted parameters (e.g., { id: "123" })
 * 
 * @example
 * extractPathParams("/api/integrations/123", "/api/integrations/:id");
 * // Returns { id: "123" }
 * 
 * extractPathParams("/api/users/456/posts/789", "/api/users/:userId/posts/:postId");
 * // Returns { userId: "456", postId: "789" }
 */
export function extractPathParams(path: string, routePattern: string): Record<string, string> {
  const params: Record<string, string> = {};

  // Convert route pattern to regex with named capture groups
  const paramNames: string[] = [];
  const regexPattern = routePattern.replace(/:[^/]+/g, (match) => {
    const paramName = match.slice(1); // Remove the leading ':'
    paramNames.push(paramName);
    return '([^/]+)';
  }).replace(/\//g, '\\/');

  const regex = new RegExp(`^${regexPattern}$`);
  const matches = path.match(regex);

  if (matches) {
    // Skip the first match (the full string)
    for (let i = 1; i < matches.length; i++) {
      if (i - 1 < paramNames.length) {
        params[paramNames[i - 1]] = matches[i];
      }
    }
  }

  return params;
}

/**
 * Checks if a user has the required permissions for a route
 * 
 * @param userId - The ID of the user to check permissions for
 * @param route - The route permission object containing the required permissions
 * @returns A promise that resolves to true if the user has the required permissions, false otherwise
 * 
 * @example
 * const route = findMatchingRoute("/api/integrations/123", "GET");
 * if (route) {
 *   const hasPermission = await checkUserPermissions(userId, route);
 *   if (hasPermission) {
 *     // User has permission, proceed with the request
 *   } else {
 *     // User does not have permission, return 403 Forbidden
 *   }
 * }
 */
export async function checkUserPermissions(
  userId: string,
  route: ApiRoutePermission
): Promise<boolean> {
  console.log(`Checking permissions for user ${userId} and route ${route.path}`);
  console.log(`Required permissions:`, route.requiredPermissions);

  // Get user roles with permissions
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    select: {
      id: true,
      roleId: true,
      role: {
        select: {
          id: true,
          name: true,
          permissions: true
        }
      }
    }
  });

  // Check if any of the user's roles have the required permissions
  console.log(`User has ${userRoles.length} roles, checking permissions for each role`);

  for (const userRole of userRoles) {
    console.log(`Checking role: ${userRole.role.name}`);

    const permissions = userRole.role.permissions as Record<string, Record<string, boolean>> | null;

    if (!permissions) {
      console.log(`Role ${userRole.role.name} has no permissions defined, skipping`);
      continue;
    }

    // Check if the role has all required permissions
    let hasAllPermissions = true;

    for (const { resource, action } of route.requiredPermissions) {
      const hasPermission = permissions[resource]?.[action] === true;
      console.log(`  Checking permission: ${resource}.${action} => ${hasPermission ? 'GRANTED' : 'DENIED'}`);

      if (!hasPermission) {
        hasAllPermissions = false;
        break;
      }
    }

    if (hasAllPermissions) {
      console.log(`Role ${userRole.role.name} has all required permissions, granting access`);
      return true;
    }
  }

  console.log('No role has all required permissions, denying access');
  return false;
}

// Legacy helper function for backward compatibility
export async function hasApiRoutePermission(
  session: Session | null,
  userId: string,
  path: string,
  method: string
): Promise<boolean> {
  console.log(`[DEPRECATED] Using hasApiRoutePermission. Consider using checkApiPermission instead.`);

  // If no session or userId, deny access
  if (!session?.user || !userId) {
    return false;
  }

  // Super users have access to all routes
  if (session.user.isSuperUser) {
    return true;
  }

  // Find the matching route
  const matchingRoute = findMatchingRoute(path, method);

  // If no matching route found, deny access
  if (!matchingRoute) {
    return false;
  }

  // Check if the user has the required permissions
  return await checkUserPermissions(userId, matchingRoute);
}

/**
 * Finds the matching route for a path and method
 * 
 * @param path - The actual path (e.g., "/api/integrations/123")
 * @param method - The HTTP method (e.g., "GET", "POST")
 * @returns The matching route permission object, or null if no match is found
 * 
 * @example
 * const route = findMatchingRoute("/api/integrations/123", "GET");
 * if (route) {
 *   // Route found, check permissions
 * } else {
 *   // No matching route found
 * }
 */
export function findMatchingRoute(path: string, method: string): ApiRoutePermission | null {
  // Find the API route permission definition
  const routePermission = apiRoutePermissions.find(
    (p) => p.method === method && matchPath(path, p)
  );

  return routePermission || null;
}

/**
 * Middleware function to check API route permissions
 * 
 * This function is the main entry point for the API permission system.
 * It checks if a user has permission to access an API route based on their roles and permissions.
 * It also extracts path parameters from the URL and returns them along with the authorization result.
 * 
 * @param session - The user's session object from NextAuth
 * @param path - The actual path of the request (e.g., "/api/integrations/123")
 * @param method - The HTTP method of the request (e.g., "GET", "POST")
 * @returns A promise that resolves to an object containing:
 *   - authorized: boolean - Whether the user is authorized to access the route
 *   - message: string (optional) - A message explaining why access was denied
 *   - params: Record<string, string> (optional) - The extracted path parameters
 * 
 * @example
 * // In an API route handler
 * export async function GET(request: NextRequest) {
 *   const session = await auth();
 *   const path = request.nextUrl.pathname;
 *   const method = request.method;
 *   
 *   const permissionCheck = await checkApiPermission(session, path, method);
 *   
 *   if (!permissionCheck.authorized) {
 *     return NextResponse.json({ error: permissionCheck.message }, { status: 403 });
 *   }
 *   
 *   // Access path parameters
 *   const { id } = permissionCheck.params || {};
 *   
 *   // Continue with the API route logic
 * }
 */
export async function checkApiPermission(
  session: Session | null,
  path: string,
  method: string
): Promise<{ authorized: boolean; message?: string; params?: Record<string, string> }> {
  method = method.toUpperCase();
  console.log(`\n=== API Permission Check ===`);
  console.log(`Path: ${path}`);
  console.log(`Method: ${method}`);

  // Find the matching route first
  const matchingRoute = findMatchingRoute(path, method);

  if (!matchingRoute) {
    console.log(`Result: NOT FOUND (No matching route definition)`);
    return { 
      authorized: false, 
      message: "Not Found: No matching route definition" 
    };
  }

  console.log(`Matching route: ${matchingRoute.path}`);

  // Extract path parameters
  const params = extractPathParams(path, matchingRoute.path);
  if (Object.keys(params).length > 0) {
    console.log(`Path parameters:`, params);
  }

  if (!session?.user) {
    console.log(`Result: UNAUTHORIZED (No session found)`);
    return {
      authorized: false, 
      message: "Unauthorized",
      params 
    };
  }

  console.log(`User: ${session.user.name || session.user.email} (${session.user.id})`);
  console.log(`Is Super User: ${session.user.isSuperUser ? 'Yes' : 'No'}`);

  // Super users have access to all routes
  if (session.user.isSuperUser) {
    console.log(`Result: AUTHORIZED (Super User)`);
    console.log(`=== End API Permission Check ===\n`);
    return { authorized: true, params };
  }

  // Check if the user has the required permissions
  const hasPermission = await checkUserPermissions(
    session.user.id,
    matchingRoute
  );

  if (!hasPermission) {
    console.log(`Result: FORBIDDEN (Insufficient permissions)`);
    return { 
      authorized: false, 
      message: "Forbidden: You don't have permission to access this resource",
      params
    };
  }

  console.log(`Result: AUTHORIZED`);
  console.log(`=== End API Permission Check ===\n`);

  return { authorized: true, params };
}
