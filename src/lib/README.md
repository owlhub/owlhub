# API Route Permission System

This document describes the centralized permission system for API routes in the OwlHub application.

## Overview

The API route permission system allows for centralized definition and checking of permissions for API routes. It works with the existing role-based permission system to determine if a user has the necessary permissions to access a specific API route.

## How It Works

1. API route permissions are defined centrally in `api-permissions.ts`
2. Each API route is associated with one or more required permissions
3. When a user makes a request to an API route, the system checks if the user has the required permissions
4. If the user has the required permissions, the request is allowed to proceed
5. If the user does not have the required permissions, the request is rejected with a 403 Forbidden response

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

To use the permission system in an API route, follow these steps:

1. Import the `checkApiPermission` function from `api-permissions.ts`:

```typescript
import { checkApiPermission } from "@/lib/api-permissions";
```

2. Use the function to check if the user has permission to access the API route:

```typescript
export async function GET(request: NextRequest) {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

  // Check if the user is authenticated
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Check if the user has permission to access this API route
  const permissionCheck = await checkApiPermission(
    session,
    "/api/integrations",
    "GET"
  );

  if (!permissionCheck.authorized) {
    return NextResponse.json(
      { error: permissionCheck.message },
      { status: 403 }
    );
  }

  // Continue with the API route logic
  // ...
}
```

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