import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/lib/auth";
import { checkApiPermission } from "@/lib/api-permissions";

/**
 * CASB Overview API
 * 
 * This API provides an overview of CASB (Cloud Access Security Broker) findings.
 * It returns aggregated statistics and recent findings that can be used to build
 * a dashboard or overview page.
 * 
 * Endpoint: GET /api/casb/overview
 * 
 * Response format:
 * {
 *   success: boolean,
 *   overview: {
 *     totalFindings: number,
 *     totalActive: number,
 *     totalHidden: number,
 *     severityCounts: {
 *       [severity: string]: {
 *         active: number,
 *         hidden: number,
 *         total: number
 *       }
 *     },
 *     integrationCounts: [
 *       {
 *         integrationId: string,
 *         integrationName: string,
 *         appName: string,
 *         appIcon: string | null,
 *         active: number,
 *         hidden: number,
 *         total: number
 *       }
 *     ],
 *     recentFindings: [
 *       {
 *         id: string,
 *         key: string,
 *         description: string,
 *         hidden: boolean,
 *         lastDetectedAt: Date,
 *         integration: {
 *           id: string,
 *           name: string,
 *           app: {
 *             name: string,
 *             icon: string | null
 *           }
 *         },
 *         finding: {
 *           id: string,
 *           name: string,
 *           severity: string
 *         }
 *       }
 *     ]
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  // Get the session
  const session = await auth();

  // Check if the user has permission to access this API route
  const permissionCheck = await checkApiPermission(session, "/api/casb/overview", "GET");

  if (!permissionCheck.authorized) {
    console.log(`API Route: Permission denied for GET /api/casb/overview - ${permissionCheck.message}`);
    return NextResponse.json({
      error: permissionCheck.message
    }, { status: 403 });
  }

  try {
    // Get counts by severity
    const severityCounts = await prisma.integrationFinding.groupBy({
      by: ['severity'],
      _sum: {
        activeCount: true,
        hiddenCount: true
      }
    });

    // Format severity counts
    const formattedSeverityCounts = severityCounts.reduce((acc, item) => {
      acc[item.severity] = {
        active: item._sum.activeCount || 0,
        hidden: item._sum.hiddenCount || 0,
        total: (item._sum.activeCount || 0) + (item._sum.hiddenCount || 0)
      };
      return acc;
    }, {} as Record<string, { active: number; hidden: number; total: number }>);

    // Get total counts
    const totalActive = severityCounts.reduce((sum, item) => sum + (item._sum.activeCount || 0), 0);
    const totalHidden = severityCounts.reduce((sum, item) => sum + (item._sum.hiddenCount || 0), 0);
    const totalFindings = totalActive + totalHidden;

    // Get counts by integration
    const integrationCounts = await prisma.integrationFinding.groupBy({
      by: ['integrationId'],
      _sum: {
        activeCount: true,
        hiddenCount: true
      }
    });

    // Get integration details
    const integrations = await prisma.integration.findMany({
      where: {
        id: {
          in: integrationCounts.map(item => item.integrationId)
        }
      },
      select: {
        id: true,
        name: true,
        app: {
          select: {
            name: true,
            icon: true
          }
        }
      }
    });

    // Format integration counts
    const formattedIntegrationCounts = integrationCounts.map(item => {
      const integration = integrations.find(i => i.id === item.integrationId);
      return {
        integrationId: item.integrationId,
        integrationName: integration?.name || 'Unknown',
        appName: integration?.app.name || 'Unknown',
        appIcon: integration?.app.icon || null,
        active: item._sum.activeCount || 0,
        hidden: item._sum.hiddenCount || 0,
        total: (item._sum.activeCount || 0) + (item._sum.hiddenCount || 0)
      };
    }).sort((a, b) => b.total - a.total); // Sort by total count descending

    // Get recent findings (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentFindings = await prisma.integrationFindingDetail.findMany({
      where: {
        lastDetectedAt: {
          gte: sevenDaysAgo
        }
      },
      include: {
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
            severity: true
          }
        }
      },
      orderBy: {
        lastDetectedAt: 'desc'
      },
      take: 10 // Limit to 10 most recent findings
    });

    // Format recent findings
    const formattedRecentFindings = recentFindings.map(finding => ({
      id: finding.id,
      key: finding.key,
      description: finding.description,
      hidden: finding.hidden,
      lastDetectedAt: finding.lastDetectedAt,
      integration: {
        id: finding.integrationId,
        name: finding.integration.name,
        app: {
          name: finding.integration.app.name,
          icon: finding.integration.app.icon
        }
      },
      finding: {
        id: finding.appFindingId,
        name: finding.appFinding.name,
        severity: finding.appFinding.severity
      }
    }));

    // Return the overview data
    return NextResponse.json({
      success: true,
      overview: {
        totalFindings,
        totalActive,
        totalHidden,
        severityCounts: formattedSeverityCounts,
        integrationCounts: formattedIntegrationCounts,
        recentFindings: formattedRecentFindings
      }
    });
  } catch (error) {
    console.error("Error fetching CASB overview:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
