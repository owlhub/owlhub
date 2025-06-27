import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/auth";

// GET: Fetch all integrations (application-wide)
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

  // Only allow super users to access integrations
  const isSuperUser = session.user.isSuperUser;

  if (!isSuperUser) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    // Get all integrations (application-wide)
    const integrations = await prisma.integration.findMany({
      include: {
        appType: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform the config from JSON string to object
    const transformedIntegrations = integrations.map(integration => ({
      ...integration,
      config: JSON.parse(integration.config),
      appType: {
        ...integration.appType,
        configFields: JSON.parse(integration.appType.configFields)
      }
    }));

    return NextResponse.json({ integrations: transformedIntegrations });
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST: Create a new integration
export async function POST(request: NextRequest) {
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

  // Only allow superusers to create integrations
  const isSuperUser = session.user.isSuperUser;

  if (!isSuperUser) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    // Parse the request body
    const body = await request.json();
    const { name, appTypeId, config, isEnabled = true } = body;

    // Validate the request body
    if (!name || !appTypeId || !config) {
      return NextResponse.json(
        { error: "Name, appTypeId, and config are required" },
        { status: 400 }
      );
    }

    // Check if the app type exists
    const appType = await prisma.appType.findUnique({
      where: { id: appTypeId }
    });

    if (!appType) {
      return NextResponse.json(
        { error: "App type not found" },
        { status: 404 }
      );
    }

    // Validate the config against the app type's configFields
    const configFields = JSON.parse(appType.configFields);
    const requiredFields = configFields
      .filter((field: any) => field.required)
      .map((field: any) => field.name);

    // Check if all required fields are present in the config
    const missingFields = requiredFields.filter(field => !config[field]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Create the integration (application-wide, not associated with a specific user)
    const integration = await prisma.integration.create({
      data: {
        name,
        appTypeId,
        config: JSON.stringify(config),
        isEnabled
      },
      include: {
        appType: true
      }
    });

    // Transform the config from JSON string to object
    const transformedIntegration = {
      ...integration,
      config: JSON.parse(integration.config),
      appType: {
        ...integration.appType,
        configFields: JSON.parse(integration.appType.configFields)
      }
    };

    return NextResponse.json({ integration: transformedIntegration }, { status: 201 });
  } catch (error) {
    console.error("Error creating integration:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
