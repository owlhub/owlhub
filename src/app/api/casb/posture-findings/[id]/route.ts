import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/lib/auth";
import { checkApiPermission } from "@/lib/api-permissions";

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
