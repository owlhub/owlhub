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
  { params }: { params: { id: string } }
) {
  try {
    // Get the session
    const session = await auth();

    // Check if the user has permission to access this API route
    const permissionCheck = await checkApiPermission(session, "/api/casb/posture-findings/:id/findings", "GET");

    if (!permissionCheck.authorized) {
      console.log(`API Route: Permission denied for GET /api/casb/posture-findings/${params.id}/findings - ${permissionCheck.message}`);
      return NextResponse.json({
        error: permissionCheck.message
      }, { status: 403 });
    }

    // Get the integration finding ID from the route parameters
    const integrationFindingId = params.id;

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