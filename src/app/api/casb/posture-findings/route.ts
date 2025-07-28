import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

// Define interface for where clause for finding details
interface WhereClause {
  integrationId: string;
  appFindingId: string;
  hidden?: boolean;
  [key: string]: unknown;
}

// Define interface for where clause for summary findings
interface SummaryWhereClause {
  OR?: Array<{ activeCount: { gt: number } } | { hiddenCount: { gt: number } }>;
  integration?: { id: string };
  appFinding?: { severity: { in: string[] } };
  lastDetectedAt?: { gte?: Date; lte?: Date };
  [key: string]: unknown;
}

// Handle summary findings with filtering
async function handleSummaryFindings(searchParams: URLSearchParams) {
  // Get filter parameters
  const status = searchParams.get('status')?.split(',') || ['active'];
  const severity = searchParams.get('severity')?.split(',') || ['critical', 'high', 'medium', 'low'];
  const integrationId = searchParams.get('integration') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';

  // Build the where clause
  const whereClause: SummaryWhereClause = {};

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

  // Extract unique integrations for the filter
  const uniqueIntegrations = Array.from(
    new Map(
      findings.map(finding => [
        finding.integration.id,
        {
          id: finding.integration.id,
          name: finding.integration.name
        }
      ])
    ).values()
  );

  return NextResponse.json({
    success: true,
    findings: formattedFindings,
    integrations: uniqueIntegrations
  });
}

// Handle fetching all active integrations
async function handleAllIntegrations() {
  // Fetch all active integrations
  const integrations = await prisma.integration.findMany({
    where: {
      isEnabled: true
    },
    select: {
      id: true,
      name: true,
      app: {
        select: {
          icon: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  // Format the integrations for the response
  const formattedIntegrations = integrations.map(integration => ({
    id: integration.id,
    name: integration.name,
    app: {
      icon: integration.app.icon
    }
  }));

  return NextResponse.json({
    success: true,
    integrations: formattedIntegrations
  });
}

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('mode') || 'details';

    // Handle integrations mode (for fetching all active integrations)
    if (mode === 'integrations') {
      return await handleAllIntegrations();
    }

    // Handle summary mode (for the main findings list)
    if (mode === 'summary') {
      return await handleSummaryFindings(searchParams);
    }

    // Handle details mode (for specific finding details)
    const integrationId = searchParams.get('integrationId');
    const appFindingId = searchParams.get('appFindingId');
    const hiddenParam = searchParams.get('hidden');

    // Validate required parameters for details mode
    if (!integrationId || !appFindingId) {
      return NextResponse.json({ error: "Integration ID and App Finding ID are required" }, { status: 400 });
    }

    // Parse hidden parameter
    let hidden: boolean | undefined = undefined;
    if (hiddenParam !== null) {
      hidden = hiddenParam === 'true';
    }

    // Build the query
    const whereClause: WhereClause = {
      integrationId,
      appFindingId,
    };

    // Add hidden filter if provided
    if (hidden !== undefined) {
      whereClause.hidden = hidden;
    }

    // Fetch the findings
    const findings = await prisma.integrationFindingDetail.findMany({
      where: whereClause,
      orderBy: {
        lastDetectedAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      findings,
    });
  } catch (error) {
    console.error("Error fetching findings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
