import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/lib/auth";
import { checkApiPermission } from "@/lib/api-permissions";

// Define interface for where clause for summary findings
interface WhereClause {
  OR?: Array<{ activeCount: { gt: number } } | { hiddenCount: { gt: number } }>;
  integration?: { id: string };
  appFinding?: { severity: { in: string[] } };
  lastDetectedAt?: { gte?: Date; lte?: Date };
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    // Get the session
    const session = await auth();

    // Check if the user has permission to access this API route
    const permissionCheck = await checkApiPermission(session, "/api/casb/posture-findings", request.method);

    if (!permissionCheck.authorized) {
      console.log(`API Route: Permission denied for GET /api/posture-findings/ - ${permissionCheck.message}`);
      return NextResponse.json({
        error: permissionCheck.message
      }, { status: 403 });
    }


    // Get query parameters
    const searchParams = request.nextUrl.searchParams;

    // Get filter parameters
    const status = searchParams.get('status')?.split(',') || ['active'];
    const severity = searchParams.get('severity')?.split(',') || ['critical', 'high', 'medium', 'low'];
    const integrationId = searchParams.get('integration') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    // Build the where clause
    const whereClause: WhereClause = {};

    // Add status filter (active/hidden)
    if (status.length > 0) {
      if (status.includes('active') && status.includes('hidden')) {
        whereClause.OR = [
          { activeCount: { gt: 0 } },
          { hiddenCount: { gt: 0 } }
        ];
      } else if (status.includes('active')) {
        whereClause.OR = [{ activeCount: { gt: 0 } }];
      } else if (status.includes('hidden')) {
        whereClause.OR = [{ hiddenCount: { gt: 0 } }];
      }
    }

    // Add integration filter
    if (integrationId) {
      whereClause.integration = { id: integrationId };
    }

    // Add severity filter
    if (severity.length > 0 && severity.length < 4) {
      whereClause.appFinding = { severity: { in: severity } };
    }

    // Add date range filter
    if (dateFrom || dateTo) {
      whereClause.lastDetectedAt = {};

      if (dateFrom) {
        whereClause.lastDetectedAt.gte = new Date(dateFrom);
      }

      if (dateTo) {
        // Add one day to include the end date
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        whereClause.lastDetectedAt.lte = endDate;
      }
    }

    // Fetch the findings with filters
    const findings = await prisma.integrationFinding.findMany({
      where: whereClause,
      include: {
        integration: {
          include: {
            app: true
          }
        },
        appFinding: true
      },
      orderBy: {
        lastDetectedAt: 'desc'
      }
    });

    // Convert Date objects to strings for the findings
    const formattedFindings = findings.map(finding => ({
      ...finding,
      lastDetectedAt: finding.lastDetectedAt ? finding.lastDetectedAt.toISOString() : null
    }));

    return NextResponse.json({
      success: true,
      findings: formattedFindings,
    });
  } catch (error) {
    console.error("Error fetching findings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
