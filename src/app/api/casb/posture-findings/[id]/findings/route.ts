import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/lib/auth";
import { checkApiPermission } from "@/lib/api-permissions";

/**
 * GET: Fetch all findings related to a specific integration finding ID
 *
 * This API endpoint takes an integration finding ID as a parameter and returns
 * all the findings related to that integration finding.
 * It supports a query parameter 'hidden' which defaults to false.
 *
 * @param request - The incoming request object
 * @param params - The route parameters, including the integration finding ID
 * @returns A JSON response with the findings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the session
    const session = await auth();

    // Check if the user has permission to access this API route
    const permissionCheck = await checkApiPermission(session, "/api/casb/posture-findings/:id/findings", request.method);

    // Get the integration finding ID from the route parameters
    const { id } = await params;

    if (!permissionCheck.authorized) {
      console.log(`API Route: Permission denied for GET /api/casb/posture-findings/${id}/findings - ${permissionCheck.message}`);
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
        appFindingId: true
      }
    });

    if (!integrationFinding) {
      return NextResponse.json({ error: "Integration Finding not found" }, { status: 404 });
    }

    // Get the hidden parameter from the request URL, default to false
    const hiddenParam = request.nextUrl.searchParams.get('hidden');
    const hidden = hiddenParam === 'true';

    // Build the where clause
    const whereClause = {
      integrationId: integrationFinding.integrationId,
      appFindingId: integrationFinding.appFindingId,
      hidden: hidden
    };

    // Fetch all the finding details related to this integration finding
    const findings = await prisma.integrationFindingDetail.findMany({
      where: whereClause,
      orderBy: {
        lastDetectedAt: 'desc'
      }
    });

    // Return the findings
    return NextResponse.json({
      success: true,
      findings: findings
    });
  } catch (error) {
    console.error("Error fetching findings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH: Update the 'hidden' status of multiple findings in bulk
 *
 * This API endpoint takes an integration finding ID as a parameter and a request body
 * containing an array of finding IDs and a 'hidden' boolean value. It updates all
 * the specified findings with the new 'hidden' value and returns the updated counts.
 *
 * @param request - The incoming request object
 * @param params - The route parameters, including the integration finding ID
 * @returns A JSON response with the updated active and hidden counts
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the session
    const session = await auth();

    // Check if the user has permission to access this API route
    const permissionCheck = await checkApiPermission(session, "/api/casb/posture-findings/:id/findings", request.method);

    // Get the integration finding ID from the route parameters
    const { id } = await params;

    if (!permissionCheck.authorized) {
      console.log(`API Route: Permission denied for PATCH /api/casb/posture-findings/${id}/findings - ${permissionCheck.message}`);
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

    // Validate the request body
    if (!body.findingIds || !Array.isArray(body.findingIds) || body.findingIds.length === 0) {
      return NextResponse.json({ error: "Finding IDs array is required" }, { status: 400 });
    }

    if (typeof body.hidden !== 'boolean') {
      return NextResponse.json({ error: "Hidden status must be a boolean" }, { status: 400 });
    }

    // First, get the integration finding to extract integrationId and appFindingId
    const integrationFinding = await prisma.integrationFinding.findUnique({
      where: { id: integrationFindingId },
      select: {
        id: true,
        integrationId: true,
        appFindingId: true
      }
    });

    if (!integrationFinding) {
      return NextResponse.json({ error: "Integration Finding not found" }, { status: 404 });
    }

    // Update all the specified findings with the new 'hidden' value
    await prisma.integrationFindingDetail.updateMany({
      where: {
        id: { in: body.findingIds },
        integrationId: integrationFinding.integrationId,
        appFindingId: integrationFinding.appFindingId
      },
      data: {
        hidden: body.hidden
      }
    });

    // Count active and hidden findings after the update
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

    // Return the updated counts
    return NextResponse.json({
      success: true,
      activeCount,
      hiddenCount
    });
  } catch (error) {
    console.error("Error updating findings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
