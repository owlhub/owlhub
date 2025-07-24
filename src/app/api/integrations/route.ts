import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/lib/auth";
import { checkApiPermission } from "@/lib/api-permissions";

// Define interface for config fields
interface ConfigField {
  name: string;
  required: boolean;
  [key: string]: unknown;
}

// GET: Fetch all integrations (application-wide)
export async function GET(request: NextRequest) {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

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

  // Get query parameters
  const url = new URL(request.url);
  const appId = url.searchParams.get('appId');
  const onlyActive = url.searchParams.get('onlyActive');

  try {
    // Build where clause based on query parameters
    const whereClause: any = {};

    // Filter by appId if provided
    if (appId) {
      whereClause.appId = appId;
    }

    // Filter by active status if provided
    if (onlyActive === 'true') {
      whereClause.isEnabled = true;
    }

    // Get all integrations (application-wide) without config field
    const integrations = await prisma.integration.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        appId: true,
        isEnabled: true,
        createdAt: true,
        updatedAt: true,
        app: {
          select: {
            id: true,
            name: true,
            icon: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ integrations: integrations });
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

  // Check if the user has permission to access this API route
  const permissionCheck = await checkApiPermission(
    session,
    "/api/integrations",
    "POST"
  );

  if (!permissionCheck.authorized) {
    return NextResponse.json(
      { error: permissionCheck.message },
      { status: 403 }
    );
  }

  try {
    // Parse the request body
    const body = await request.json();
    const { name, appId, config, isEnabled = true } = body;

    // Validate the request body
    if (!name || !appId || !config) {
      return NextResponse.json(
        { error: "Name, appId, and config are required" },
        { status: 400 }
      );
    }

    // Check if the app exists
    const app = await prisma.app.findUnique({
      where: { id: appId }
    });

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    // Validate the config against the app's configFields
    const configFields = JSON.parse(app.configFields) as ConfigField[];
    const requiredFields = configFields
      .filter((field: ConfigField) => field.required)
      .map((field: ConfigField) => field.name);

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
        appId,
        config: JSON.stringify(config),
        isEnabled
      },
      include: {
        app: true
      }
    });

    // Transform the config from JSON string to object
    const transformedIntegration = {
      ...integration,
      config: JSON.parse(integration.config),
      app: {
        ...integration.app,
        configFields: JSON.parse(integration.app.configFields)
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
