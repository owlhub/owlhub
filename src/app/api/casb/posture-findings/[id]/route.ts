import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/lib/auth";
import { checkApiPermission } from "@/lib/api-permissions";

// Valid severity levels
const VALID_SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'];

/**
 * GET: Fetch all finding details related to a specific integration finding ID
 *
 * This API endpoint takes an integration finding ID as a parameter and returns
 * all the detailed findings related to that integration finding.
 *
 * @param request - The incoming request object
 * @param params - The route parameters, including the integration finding ID
 * @returns A JSON response with the finding details
 */
export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the session
    const session = await auth();

    // Check if the user has permission to access this API route
    const permissionCheck = await checkApiPermission(session, "/api/casb/posture-findings/:id", request.method);

    // Get the integration finding ID from the route parameters
    const { id } = await params;

    if (!permissionCheck.authorized) {
      console.log(`API Route: Permission denied for GET /api/posture-findings/${id} - ${permissionCheck.message}`);
      return NextResponse.json({
        error: permissionCheck.message
      }, { status: 403 });
    }

    // Use the integration finding ID
    const integrationFindingId = id;

    if (!integrationFindingId) {
      return NextResponse.json({ error: "Integration Finding ID is required" }, { status: 400 });
    }

    // First, get the integration finding to extract integrationId and appFindingId
    const integrationFinding = await prisma.integrationFinding.findUnique({
      where: { id: integrationFindingId },
      select: {
        id: true,
        integrationId: true,
        appFindingId: true,
        severity: true,
        lastDetectedAt: true,
        integration: {
          select: {
            name: true,
            app: {
              select: {
                name: true,
                icon: true
              }
            }
          }
        },
        appFinding: {
          select: {
            name: true,
            severity: true,
            description: true
          }
        }
      }
    });

    if (!integrationFinding) {
      return NextResponse.json({ error: "Integration Finding not found" }, { status: 404 });
    }

    // Count active and hidden findings
    const [activeCount, hiddenCount] = await Promise.all([
      prisma.integrationFindingDetail.count({
        where: {
          integrationId: integrationFinding.integrationId,
          appFindingId: integrationFinding.appFindingId,
          hidden: false
        }
      }),
      prisma.integrationFindingDetail.count({
        where: {
          integrationId: integrationFinding.integrationId,
          appFindingId: integrationFinding.appFindingId,
          hidden: true
        }
      })
    ]);

    // Return the integration finding and its details
    return NextResponse.json({
      success: true,
      integrationFinding: {
        id: integrationFinding.id,
        severity: integrationFinding.severity || integrationFinding.appFinding.severity,
        lastDetectedAt: integrationFinding.lastDetectedAt,
        integration: {
          id: integrationFinding.integrationId,
          name: integrationFinding.integration.name,
          app: integrationFinding.integration.app
        },
        appFinding: {
          id: integrationFinding.appFindingId,
          name: integrationFinding.appFinding.name,
          severity: integrationFinding.appFinding.severity,
          description: integrationFinding.appFinding.description
        }
      },
      activeCount,
      hiddenCount,
    });
  } catch (error) {
    console.error("Error fetching finding details:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH: Update the severity of an integration finding
 *
 * This API endpoint takes an integration finding ID as a parameter and a request body
 * containing a 'severity' value. It updates the finding with the new severity value
 * and returns the updated finding.
 *
 * @param request - The incoming request object
 * @param params - The route parameters, including the integration finding ID
 * @returns A JSON response with the updated finding
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the session
    const session = await auth();

    // Check if the user has permission to access this API route
    const permissionCheck = await checkApiPermission(session, "/api/casb/posture-findings/:id", request.method);

    // Get the integration finding ID from the route parameters
    const { id } = await params;

    if (!permissionCheck.authorized) {
      console.log(`API Route: Permission denied for PATCH /api/posture-findings/${id} - ${permissionCheck.message}`);
      return NextResponse.json({
        error: permissionCheck.message
      }, { status: 403 });
    }

    // Use the integration finding ID
    const integrationFindingId = id;

    if (!integrationFindingId) {
      return NextResponse.json({ error: "Integration Finding ID is required" }, { status: 400 });
    }

    // Parse the request body
    const body = await request.json();

    // Validate the severity value
    if (!body.severity) {
      return NextResponse.json({ error: "Severity is required" }, { status: 400 });
    }

    if (!VALID_SEVERITY_LEVELS.includes(body.severity)) {
      return NextResponse.json({ 
        error: `Invalid severity value. Must be one of: ${VALID_SEVERITY_LEVELS.join(', ')}` 
      }, { status: 400 });
    }

    // Check if the integration finding exists
    const existingFinding = await prisma.integrationFinding.findUnique({
      where: { id: integrationFindingId },
      select: { id: true }
    });

    if (!existingFinding) {
      return NextResponse.json({ error: "Integration Finding not found" }, { status: 404 });
    }

    // Update the severity of the finding
    const updatedFinding = await prisma.integrationFinding.update({
      where: { id: integrationFindingId },
      data: { severity: body.severity },
      select: {
        id: true,
        integrationId: true,
        appFindingId: true,
        severity: true,
        lastDetectedAt: true,
        integration: {
          select: {
            name: true,
            app: {
              select: {
                name: true,
                icon: true
              }
            }
          }
        },
        appFinding: {
          select: {
            name: true,
            severity: true,
            description: true
          }
        }
      }
    });

    // Count active and hidden findings
    const [activeCount, hiddenCount] = await Promise.all([
      prisma.integrationFindingDetail.count({
        where: {
          integrationId: updatedFinding.integrationId,
          appFindingId: updatedFinding.appFindingId,
          hidden: false
        }
      }),
      prisma.integrationFindingDetail.count({
        where: {
          integrationId: updatedFinding.integrationId,
          appFindingId: updatedFinding.appFindingId,
          hidden: true
        }
      })
    ]);

    // Return the updated integration finding
    return NextResponse.json({
      success: true,
      integrationFinding: {
        id: updatedFinding.id,
        severity: updatedFinding.severity,
        lastDetectedAt: updatedFinding.lastDetectedAt,
        integration: {
          id: updatedFinding.integrationId,
          name: updatedFinding.integration.name,
          app: updatedFinding.integration.app
        },
        appFinding: {
          id: updatedFinding.appFindingId,
          name: updatedFinding.appFinding.name,
          severity: updatedFinding.appFinding.severity,
          description: updatedFinding.appFinding.description
        }
      },
      activeCount,
      hiddenCount,
    });
  } catch (error) {
    console.error("Error updating finding severity:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
