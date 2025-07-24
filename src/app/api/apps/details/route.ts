import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

// GET: Fetch security findings and actions for a specific app
export async function GET(request: NextRequest) {
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
