import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/lib/auth";

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
    // Check authentication
    const session = await auth().catch(error => {
      console.error("Auth error:", error);
      return null;
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth().catch(error => {
      console.error("Auth error:", error);
      return null;
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { findingId, findingIds, hidden } = body;

    // Handle single finding update
    if (findingId) {
      return await handleSingleFindingUpdate(findingId, hidden);
    }

    // Handle bulk finding update
    if (findingIds && Array.isArray(findingIds) && findingIds.length > 0) {
      return await handleBulkFindingUpdate(findingIds, hidden);
    }

    return NextResponse.json({ error: "Finding ID or Finding IDs are required" }, { status: 400 });
  } catch (error) {
    console.error("Error updating finding status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleSingleFindingUpdate(findingId: string, hidden: boolean) {
  // Get the finding details
  const findingDetail = await prisma.integrationFindingDetail.findUnique({
    where: { id: findingId },
    select: {
      id: true,
      hidden: true,
      integrationId: true,
      appFindingId: true,
    },
  });

  if (!findingDetail) {
    return NextResponse.json({ error: "Finding not found" }, { status: 404 });
  }

  // Update the finding status
  const updatedFinding = await prisma.integrationFindingDetail.update({
    where: { id: findingId },
    data: { hidden },
  });

  // Get updated counts for this integration and app finding
  const [activeCount, hiddenCount] = await Promise.all([
    prisma.integrationFindingDetail.count({
      where: {
        integrationId: findingDetail.integrationId,
        appFindingId: findingDetail.appFindingId,
        hidden: false,
      },
    }),
    prisma.integrationFindingDetail.count({
      where: {
        integrationId: findingDetail.integrationId,
        appFindingId: findingDetail.appFindingId,
        hidden: true,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    finding: updatedFinding,
    activeCount,
    hiddenCount,
  });
}

async function handleBulkFindingUpdate(findingIds: string[], hidden: boolean) {
  // Get all the findings
  const findings = await prisma.integrationFindingDetail.findMany({
    where: {
      id: {
        in: findingIds,
      },
    },
    select: {
      id: true,
      hidden: true,
      integrationId: true,
      appFindingId: true,
    },
  });

  if (findings.length === 0) {
    return NextResponse.json({ error: "No findings found" }, { status: 404 });
  }

  // Group findings by integration and app finding
  const findingGroups = findings.reduce((groups, finding) => {
    const key = `${finding.integrationId}-${finding.appFindingId}`;
    if (!groups[key]) {
      groups[key] = {
        integrationId: finding.integrationId,
        appFindingId: finding.appFindingId,
        findings: [],
      };
    }
    groups[key].findings.push(finding);
    return groups;
  }, {} as Record<string, { integrationId: string; appFindingId: string; findings: typeof findings }> );

  // Process each group in a transaction
  await prisma.$transaction(async (tx) => {
    const groupResults = [];

    for (const key in findingGroups) {
      const group = findingGroups[key];

      // Update all findings in this group
      await tx.integrationFindingDetail.updateMany({
        where: {
          id: {
            in: group.findings.map(f => f.id),
          },
        },
        data: {
          hidden,
        },
      });

      groupResults.push({
        integrationId: group.integrationId,
        appFindingId: group.appFindingId,
      });
    }

    return groupResults;
  });

  // For bulk updates, we'll use the first finding's integration and app finding IDs
  // to calculate the counts, assuming all findings in the bulk update belong to the same group
  // If there are multiple groups, this will return counts for the first group
  if (findings.length > 0) {
    const firstFinding = findings[0];

    // Get updated counts for this integration and app finding
    const [activeCount, hiddenCount] = await Promise.all([
      prisma.integrationFindingDetail.count({
        where: {
          integrationId: firstFinding.integrationId,
          appFindingId: firstFinding.appFindingId,
          hidden: false,
        },
      }),
      prisma.integrationFindingDetail.count({
        where: {
          integrationId: firstFinding.integrationId,
          appFindingId: firstFinding.appFindingId,
          hidden: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      updatedCount: findingIds.length,
      activeCount,
      hiddenCount,
    });
  }

  return NextResponse.json({
    success: true,
    updatedCount: findingIds.length,
  });
}