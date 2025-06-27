import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/auth";

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
    const integrationId = searchParams.get('integrationId');
    const securityFindingId = searchParams.get('securityFindingId');
    const hiddenParam = searchParams.get('hidden');

    // Validate required parameters
    if (!integrationId || !securityFindingId) {
      return NextResponse.json({ error: "Integration ID and Security Finding ID are required" }, { status: 400 });
    }

    // Parse hidden parameter
    let hidden: boolean | undefined = undefined;
    if (hiddenParam !== null) {
      hidden = hiddenParam === 'true';
    }

    // Build the query
    const whereClause: any = {
      integrationId,
      securityFindingId,
    };

    // Add hidden filter if provided
    if (hidden !== undefined) {
      whereClause.hidden = hidden;
    }

    // Fetch the findings
    const findings = await prisma.integrationSecurityFindingDetails.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
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
  const findingDetail = await prisma.integrationSecurityFindingDetails.findUnique({
    where: { id: findingId },
    select: {
      id: true,
      hidden: true,
      integrationId: true,
      securityFindingId: true,
    },
  });

  if (!findingDetail) {
    return NextResponse.json({ error: "Finding not found" }, { status: 404 });
  }

  // Update the finding status
  const updatedFinding = await prisma.integrationSecurityFindingDetails.update({
    where: { id: findingId },
    data: { hidden },
  });

  // Get the current counts
  const integrationSecurityFinding = await prisma.integrationSecurityFinding.findFirst({
    where: {
      integrationId: findingDetail.integrationId,
      securityFindingId: findingDetail.securityFindingId,
    },
  });

  if (!integrationSecurityFinding) {
    return NextResponse.json({ error: "Integration security finding not found" }, { status: 404 });
  }

  // Calculate the new counts
  let activeCount = integrationSecurityFinding.activeCount;
  let hiddenCount = integrationSecurityFinding.hiddenCount;

  // If the status changed from active to hidden
  if (hidden && !findingDetail.hidden) {
    activeCount -= 1;
    hiddenCount += 1;
  }
  // If the status changed from hidden to active
  else if (!hidden && findingDetail.hidden) {
    activeCount += 1;
    hiddenCount -= 1;
  }

  // Update the counts
  await prisma.integrationSecurityFinding.update({
    where: { id: integrationSecurityFinding.id },
    data: {
      activeCount,
      hiddenCount,
    },
  });

  return NextResponse.json({
    success: true,
    finding: updatedFinding,
    activeCount,
    hiddenCount,
  });
}

async function handleBulkFindingUpdate(findingIds: string[], hidden: boolean) {
  // Get all the findings
  const findings = await prisma.integrationSecurityFindingDetails.findMany({
    where: {
      id: {
        in: findingIds,
      },
    },
    select: {
      id: true,
      hidden: true,
      integrationId: true,
      securityFindingId: true,
    },
  });

  if (findings.length === 0) {
    return NextResponse.json({ error: "No findings found" }, { status: 404 });
  }

  // Group findings by integration and security finding
  const findingGroups = findings.reduce((groups, finding) => {
    const key = `${finding.integrationId}-${finding.securityFindingId}`;
    if (!groups[key]) {
      groups[key] = {
        integrationId: finding.integrationId,
        securityFindingId: finding.securityFindingId,
        findings: [],
      };
    }
    groups[key].findings.push(finding);
    return groups;
  }, {} as Record<string, { integrationId: string; securityFindingId: string; findings: typeof findings }> );

  // Process each group in a transaction
  const results = await prisma.$transaction(async (tx) => {
    const groupResults = [];

    for (const key in findingGroups) {
      const group = findingGroups[key];

      // Update all findings in this group
      await tx.integrationSecurityFindingDetails.updateMany({
        where: {
          id: {
            in: group.findings.map(f => f.id),
          },
        },
        data: {
          hidden,
        },
      });

      // Get the current counts
      const integrationSecurityFinding = await tx.integrationSecurityFinding.findFirst({
        where: {
          integrationId: group.integrationId,
          securityFindingId: group.securityFindingId,
        },
      });

      if (!integrationSecurityFinding) {
        continue;
      }

      // Calculate count changes
      let activeCountChange = 0;
      let hiddenCountChange = 0;

      for (const finding of group.findings) {
        // If the status changed from active to hidden
        if (hidden && !finding.hidden) {
          activeCountChange -= 1;
          hiddenCountChange += 1;
        }
        // If the status changed from hidden to active
        else if (!hidden && finding.hidden) {
          activeCountChange += 1;
          hiddenCountChange -= 1;
        }
      }

      // Only update if there are changes
      if (activeCountChange !== 0 || hiddenCountChange !== 0) {
        const updatedCounts = await tx.integrationSecurityFinding.update({
          where: { id: integrationSecurityFinding.id },
          data: {
            activeCount: {
              increment: activeCountChange,
            },
            hiddenCount: {
              increment: hiddenCountChange,
            },
          },
          select: {
            activeCount: true,
            hiddenCount: true,
          },
        });

        groupResults.push({
          integrationId: group.integrationId,
          securityFindingId: group.securityFindingId,
          activeCount: updatedCounts.activeCount,
          hiddenCount: updatedCounts.hiddenCount,
        });
      }
    }

    return groupResults;
  });

  // Return the first group's counts (assuming all findings are from the same group)
  const firstResult = results[0] || { activeCount: 0, hiddenCount: 0 };

  return NextResponse.json({
    success: true,
    updatedCount: findingIds.length,
    activeCount: firstResult.activeCount,
    hiddenCount: firstResult.hiddenCount,
  });
}
