import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET: Fetch a specific flow by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
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
    const { id } = params;

    // Get the flow
    const flow = await prisma.flow.findUnique({
      where: { id },
      include: {
        webhooks: {
          select: {
            id: true,
            name: true,
            token: true
          }
        },
        parentFlow: {
          select: {
            id: true,
            name: true
          }
        },
        childFlows: {
          select: {
            id: true,
            name: true,
            isEnabled: true
          }
        },
        flowRuns: {
          take: 10,
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            status: true,
            startTime: true,
            endTime: true
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
    });

    if (!flow) {
      return NextResponse.json(
        { error: "Flow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ flow });
  } catch (error) {
    console.error("Error fetching flow:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH: Update a flow
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

  // Only allow superusers to update webhooks
  const isSuperUser = session.user.isSuperUser;

  if (!isSuperUser) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const { id } = params;
    const body = await request.json();
    const { name, description, webhookId, parentFlowId, config, isEnabled } = body;

    // Check if the flow exists
    const existingFlow = await prisma.flow.findUnique({
      where: { id }
    });

    if (!existingFlow) {
      return NextResponse.json(
        { error: "Flow not found" },
        { status: 404 }
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

    // If parentFlowId is provided, check if it exists and is not the same as the flow being updated
    if (parentFlowId) {
      if (parentFlowId === id) {
        return NextResponse.json(
          { error: "A flow cannot be its own parent" },
          { status: 400 }
        );
      }

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

    // Update the flow
    const updateData: {
      name?: string;
      description?: string | null;
      parentFlowId?: string | null;
      config?: string;
      isEnabled?: boolean;
      webhooks?: {
        connect?: { id: string };
      };
    } = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(parentFlowId !== undefined && { parentFlowId }),
      ...(config !== undefined && { 
        config: typeof config === 'string' ? config : JSON.stringify(config)
      }),
      ...(isEnabled !== undefined && { isEnabled })
    };

    // If webhookId is provided, we need to update the webhook connection
    if (webhookId !== undefined) {
      // First disconnect all webhooks, then connect the new one
      updateData.webhooks = {
        ...(webhookId ? { connect: { id: webhookId } } : {})
      };
    }

    const updatedFlow = await prisma.flow.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ flow: updatedFlow });
  } catch (error) {
    console.error("Error updating flow:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a flow
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

  // Only allow superusers to delete webhooks
  const isSuperUser = session.user.isSuperUser;

  if (!isSuperUser) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const { id } = params;

    // Check if the flow exists
    const existingFlow = await prisma.flow.findUnique({
      where: { id },
      include: {
        childFlows: true
      }
    });

    if (!existingFlow) {
      return NextResponse.json(
        { error: "Flow not found" },
        { status: 404 }
      );
    }

    // Check if the flow has child webhooks
    if (existingFlow.childFlows.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete a flow with child webhooks. Please delete the child webhooks first." },
        { status: 400 }
      );
    }

    // Delete the flow (cascades to related entities)
    await prisma.flow.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting flow:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
