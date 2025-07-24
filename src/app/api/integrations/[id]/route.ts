import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/lib/auth";
import {checkApiPermission} from "@/lib/api-permissions";

// Define interface for config fields
interface ConfigField {
  name: string;
  required: boolean;
  [key: string]: unknown;
}

// GET: Retrieve a single integration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

  // Check if the user has permission to access this API route
  const permissionCheck = await checkApiPermission(
     session,
     "/api/integrations/:id",
     "GET"
  );

  if (!permissionCheck.authorized) {
    return NextResponse.json(
       { error: permissionCheck.message },
       { status: 403 }
    );
  }

  try {
    const { id } = await params;
    // Retrieve the integration
    const integration = await prisma.integration.findFirst({
      where: {
        id: id
      },
      include: {
        app: true
      }
    });

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    // Transform the config from JSON string to object
    const transformedIntegration = {
      ...integration,
      config: JSON.parse(integration.config),
      app: {
        ...integration.app,
        configFields: JSON.parse(integration.app.configFields)
      }
    };

    return NextResponse.json({ integration: transformedIntegration });
  } catch (error) {
    console.error("Error retrieving integration:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Define interface for update data
interface UpdateData {
  name?: string;
  isEnabled?: boolean;
  config?: string;
  [key: string]: unknown;
}

// PATCH: Update an integration
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

  // Check if the user has permission to access this API route
  const permissionCheck = await checkApiPermission(
     session,
     "/api/integrations/:id",
     "PATCH"
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
    const { name, config, isEnabled } = body;

    const { id } = await params;
    // Check if the integration exists
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        id: id
      },
      include: {
        app: true
      }
    });

    if (!existingIntegration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: UpdateData = {};
    if (name !== undefined) updateData.name = name;
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;

    // If config is provided, validate it against the app's configFields
    if (config !== undefined) {
      const configFields = JSON.parse(existingIntegration.app.configFields) as ConfigField[];
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

      updateData.config = JSON.stringify(config);
    }

    // Update the integration
    const updatedIntegration = await prisma.integration.update({
      where: {
        id: id
      },
      data: updateData,
      include: {
        app: true
      }
    });

    // Transform the config from JSON string to object
    const transformedIntegration = {
      ...updatedIntegration,
      config: JSON.parse(updatedIntegration.config),
      app: {
        ...updatedIntegration.app,
        configFields: JSON.parse(updatedIntegration.app.configFields)
      }
    };

    return NextResponse.json({ integration: transformedIntegration });
  } catch (error) {
    console.error("Error updating integration:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete an integration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

  // Check if the user has permission to access this API route
  const permissionCheck = await checkApiPermission(
     session,
     "/api/integrations/:id",
     "DELETE"
  );

  if (!permissionCheck.authorized) {
    return NextResponse.json(
       { error: permissionCheck.message },
       { status: 403 }
    );
  }

  try {
    const { id } = await params;
    // Check if the integration exists
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        id: id
      }
    });

    if (!existingIntegration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    // Delete the integration
    await prisma.integration.delete({
      where: {
        id: id
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting integration:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
