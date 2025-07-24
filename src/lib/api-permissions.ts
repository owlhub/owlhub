import { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

// Define the structure of API route permissions
export interface ApiRoutePermission {
  path: string;
  method: string;
  requiredPermissions: {
    resource: string;
    action: string;
  }[];
}

// Define all API routes and their required permissions
export const apiRoutePermissions: ApiRoutePermission[] = [
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
      { resource: "integration", action: "read" },
      { resource: "integration", action: "edit" },
    ]
  },
  {
    path: "/api/casb/posture-findings",
    method: "GET",
    requiredPermissions: [
      { resource: "integration", action: "read" }
    ]
  },
  {
    path: "/api/casb/posture-findings",
    method: "PUT",
    requiredPermissions: [
      { resource: "integration", action: "edit" }
    ]
  }
  // Add more API routes as needed
];

// Helper function to check if a user has permission to access an API route
export async function hasApiRoutePermission(
  session: Session | null,
  userId: string,
  path: string,
  method: string
): Promise<boolean> {
  // If no session or userId, deny access
  if (!session?.user || !userId) return false;

  // Super users have access to all routes
  if (session.user.isSuperUser) return true;

  // Find the API route permission definition
  const routePermission = apiRoutePermissions.find(
    (p) => p.path === path && p.method === method
  );

  // If no permission definition found, deny access
  if (!routePermission) return false;

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
  for (const userRole of userRoles) {
    const permissions = userRole.role.permissions as Record<string, Record<string, boolean>> | null;

    if (!permissions) continue;

    // Check if the role has all required permissions
    const hasAllPermissions = routePermission.requiredPermissions.every(
      ({ resource, action }) => permissions[resource]?.[action] === true
    );

    if (hasAllPermissions) return true;
  }

  return false;
}

// Middleware function to check API route permissions
export async function checkApiPermission(
  session: Session | null,
  path: string,
  method: string
): Promise<{ authorized: boolean; message?: string }> {
  if (!session?.user) {
    return { authorized: false, message: "Unauthorized: No session found" };
  }

  const hasPermission = await hasApiRoutePermission(
    session,
    session.user.id,
    path,
    method
  );

  if (!hasPermission) {
    return { 
      authorized: false, 
      message: "Forbidden: You don't have permission to access this resource" 
    };
  }

  return { authorized: true };
}
