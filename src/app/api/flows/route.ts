import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/lib/auth";

// GET: Fetch all webhooks
export async function GET(request: NextRequest) {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

  // Check if the user is authenticated
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Only allow super users to access webhooks
  const isSuperUser = session.user.isSuperUser;

  if (!isSuperUser) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('webhookId');
    const parentFlowId = searchParams.get('parentFlowId');

    // Build the query
    const where: {
      parentFlowId?: string | null;
    } = {};
    if (parentFlowId) {
      where.parentFlowId = parentFlowId;
    }

    // If webhookId is provided, we need to filter webhooks that are connected to this webhook
    if (webhookId) {
      // First get the webhook with its connected webhooks
      const webhook = await prisma.webhook.findUnique({
        where: { id: webhookId },
        include: {
          flows: {
            include: {
              parentFlow: {
                select: {
                  id: true,
                  name: true
                }
              },
              _count: {
                select: {
                  childFlows: true,
                  flowRuns: true,
                  queueItems: true
                }
              }
            }
          }
        }
      });

      if (!webhook) {
        return NextResponse.json({ flows: [] });
      }

      // Return the webhooks from the webhook
      return NextResponse.json({ flows: webhook.flows });
    }

    // Get all webhooks if no webhookId is provided
    const flows = await prisma.flow.findMany({
      where,
      include: {
        webhooks: {
          select: {
            id: true,
            name: true
          }
        },
        parentFlow: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            childFlows: true,
            flowRuns: true,
            queueItems: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ flows });
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST: Create a new flow
export async function POST(request: NextRequest) {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

  // Check if the user is authenticated
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Only allow superusers to create webhooks
  const isSuperUser = session.user.isSuperUser;

  if (!isSuperUser) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    // Parse the request body
    const body = await request.json();
    const { name, description, webhookId, parentFlowId, config, isEnabled = true } = body;

    // Validate the request body
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Validate config
    if (!config) {
      return NextResponse.json(
        { error: "Config is required" },
        { status: 400 }
      );
    }

    // If webhookId is provided, check if it exists
    if (webhookId) {
      const webhook = await prisma.webhook.findUnique({
        where: { id: webhookId }
      });

      if (!webhook) {
        return NextResponse.json(
          { error: "Webhook not found" },
          { status: 404 }
        );
      }
    }

    // If parentFlowId is provided, check if it exists
    if (parentFlowId) {
      const parentFlow = await prisma.flow.findUnique({
        where: { id: parentFlowId }
      });

      if (!parentFlow) {
        return NextResponse.json(
          { error: "Parent flow not found" },
          { status: 404 }
        );
      }
    }

    // Create the flow
    const flowData: {
      name: string;
      description?: string | null;
      parentFlowId?: string | null;
      config: string;
      isEnabled: boolean;
      webhooks?: {
        connect: { id: string };
      };
    } = {
      name,
      description,
      parentFlowId,
      config: typeof config === 'string' ? config : JSON.stringify(config),
      isEnabled
    };

    // If webhookId is provided, we need to connect the flow to the webhook
    if (webhookId) {
      flowData.webhooks = {
        connect: { id: webhookId }
      };
    }

    const flow = await prisma.flow.create({
      data: flowData,
      include: {
        webhooks: {
          select: {
            id: true,
            name: true
          }
        },
        parentFlow: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({ flow }, { status: 201 });
  } catch (error) {
    console.error("Error creating flow:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
