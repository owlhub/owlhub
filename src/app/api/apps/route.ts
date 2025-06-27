import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/auth";

// GET: Fetch all available app types
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

  // Allow all authenticated users to access the app types
  // No need to check for super user status for viewing app types

  try {
    // Get all app types
    const appTypes = await prisma.appType.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    // Transform the configFields from JSON string to object
    const transformedAppTypes = appTypes.map(appType => ({
      ...appType,
      configFields: JSON.parse(appType.configFields)
    }));

    return NextResponse.json({ appTypes: transformedAppTypes });
  } catch (error) {
    console.error("Error fetching app types:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
