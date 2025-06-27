import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/auth";

// GET: Fetch security findings and actions for a specific app type
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

  // Get the app type ID from the query parameters
  const url = new URL(request.url);
  const appTypeId = url.searchParams.get('appTypeId');

  if (!appTypeId) {
    return NextResponse.json(
      { error: "App type ID is required" },
      { status: 400 }
    );
  }

  try {
    // Get the app type with its security findings and actions
    const appType = await prisma.appType.findUnique({
      where: { id: appTypeId },
      include: {
        securityFindings: true,
        actions: true
      }
    });

    if (!appType) {
      return NextResponse.json(
        { error: "App type not found" },
        { status: 404 }
      );
    }

    // Transform the configFields from JSON string to object
    const transformedAppType = {
      ...appType,
      configFields: JSON.parse(appType.configFields)
    };

    return NextResponse.json({
      appType: transformedAppType,
      securityFindings: appType.securityFindings,
      actions: appType.actions
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
