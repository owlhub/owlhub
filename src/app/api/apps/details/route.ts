import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/lib/auth";

// GET: Fetch security findings and actions for a specific app
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

  // Allow all authenticated users to access the app details
  // No need to check for super user status for viewing app details

  // Get the app ID from the query parameters
  const url = new URL(request.url);
  const appId = url.searchParams.get('appId');

  if (!appId) {
    return NextResponse.json(
      { error: "App ID is required" },
      { status: 400 }
    );
  }

  try {
    // Get the app with its app findings and actions
    const app = await prisma.app.findUnique({
      where: { id: appId },
      include: {
        appFindings: true,
        actions: true
      }
    });

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    // Transform the configFields from JSON string to object
    const transformedApp = {
      ...app,
      configFields: JSON.parse(app.configFields)
    };

    return NextResponse.json({
      app: transformedApp,
      appFindings: app.appFindings,
      actions: app.actions
    });
  } catch (error) {
    console.error("Error fetching app details:", error);
    // Log more detailed error information
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
