# API Route Permission System

This document describes the centralized permission system for API routes in the OwlHub application.

## Overview

The API route permission system allows for centralized definition and checking of permissions for API routes. It works with the existing role-based permission system to determine if a user has the necessary permissions to access a specific API route.

## How It Works

1. API route permissions are defined centrally in `api-permissions.ts`
2. Each API route is associated with one or more required permissions
3. When a user makes a request to an API route, the middleware automatically checks if the user has the required permissions
4. If the user has the required permissions, the request is allowed to proceed to the API route handler
5. If the user does not have the required permissions, the middleware rejects the request with a 403 Forbidden response

## Permission Structure

Permissions are structured as follows:

```typescript
{
  resource: string;  // e.g., "integration", "member"
  action: string;    // e.g., "read", "edit", "install"
}
```

Each role has a set of permissions defined in the database. The permissions are stored as a JSON object in the `permissions` field of the `Role` model.

## API Route Permission Definition

API route permissions are defined in `api-permissions.ts` as follows:

```typescript
export const apiRoutePermissions: ApiRoutePermission[] = [
  {
    path: "/api/integrations",
    method: "GET",
    requiredPermissions: [
      { resource: "integration", action: "read" }
    ]
  },
  {
    path: "/api/integrations",
    method: "POST",
    requiredPermissions: [
      { resource: "integration", action: "edit" },
      { resource: "integration", action: "install" }
    ]
  },
  // Add more API routes as needed
];
```

## Using the Permission System in API Routes

With the middleware-based approach, you don't need to add any permission checking code to your API routes. The middleware automatically handles authentication and permission checks for all API routes.

Here's an example of a simple API route:

```typescript
export async function GET(request: NextRequest) {
  // Authentication and permission checks are handled by middleware

  try {
    // Your API route logic here
    const data = await fetchSomeData();

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error in API route:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
```

The middleware will:
1. Check if the user is authenticated
2. If authenticated, check if the user has permission to access the API route
3. If authorized, allow the request to proceed to your API route handler
4. If not authorized, return a 403 Forbidden response with an appropriate error message

## Middleware Implementation

The permission system is implemented in the middleware (`src/middleware.ts`), which intercepts all API requests before they reach the API route handlers. Here's how it works:

1. The middleware identifies API requests by checking if the path starts with `/api/`
2. For API requests, it first checks if the user is authenticated
3. If the user is authenticated, it extracts the path and method from the request
4. It then calls the `checkApiPermission` function to check if the user has permission to access the API route
5. If the user has permission, the middleware allows the request to proceed to the API route handler
6. If the user doesn't have permission, the middleware returns a 403 Forbidden response with an appropriate error message

The middleware also includes special handling for `/api/auth/` routes, which are excluded from permission checks since they handle authentication.

## Adding New API Routes

To add a new API route to the permission system, add a new entry to the `apiRoutePermissions` array in `api-permissions.ts`:

```typescript
{
  path: "/api/your-new-route",
  method: "GET",
  requiredPermissions: [
    { resource: "your-resource", action: "read" }
  ]
}
```

Make sure that the resource and action match the permissions defined in the roles.

## Predefined Roles and Permissions

The system comes with predefined roles and permissions:

1. **Super Administrator - All Privileges**: Has full access to all resources and actions
2. **Administrator**: Has full access to integrations, but cannot edit members
3. **Administrator Read Only**: Can only read resources, not edit or install

These roles are defined in `prisma/seed/roles.ts` and are created when the application is seeded.
