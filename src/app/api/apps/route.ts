import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/lib/auth";
import { checkApiPermission } from "@/lib/api-permissions";

// GET: Fetch all available apps
export async function GET(request: NextRequest) {
  // Get the session
  const session = await auth();

  // Check if the user has permission to access this API route
  const permissionCheck = await checkApiPermission(session, "/api/apps", request.method);

  if (!permissionCheck.authorized) {
    console.log(`API Route: Permission denied for GET /api/apps - ${permissionCheck.message}`);
    return NextResponse.json({
      error: permissionCheck.message
    }, { status: 403 });
  }
  try {
    // Get all apps
    const apps = await prisma.app.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    // Transform the configFields from JSON string to object
    const transformedApps = apps.map(app => ({
      ...app,
      configFields: JSON.parse(app.configFields)
    }));

    return NextResponse.json({ apps: transformedApps });
  } catch (error) {
    console.error("Error fetching apps:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
