import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

// GET: Fetch all available apps
export async function GET() {
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
