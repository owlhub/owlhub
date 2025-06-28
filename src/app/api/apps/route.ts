import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/lib/auth";

// GET: Fetch all available apps
export async function GET() {
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

  // Allow all authenticated users to access the apps
  // No need to check for super user status for viewing apps

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
