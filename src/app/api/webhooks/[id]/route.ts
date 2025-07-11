import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET: Fetch a specific webhook by ID
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

    // Get the webhook
    const webhook = await prisma.webhook.findUnique({
      where: { id },
      include: {
        flows: {
          select: {
            id: true,
            name: true,
            description: true,
            isEnabled: true,
            config: true,
            createdAt: true,
            updatedAt: true
          }
        },
        events: {
          take: 10,
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            status: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            events: true
          }
        }
      }
    });

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    // Redact token (only show first 8 characters)
    const redactedWebhook = {
      ...webhook,
      token: webhook.token.substring(0, 8) + '...'
    };

    return NextResponse.json({ webhook: redactedWebhook });
  } catch (error) {
    console.error("Error fetching webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH: Update a webhook
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
    const { name, description, isEnabled } = body;

    // Check if the webhook exists
    const existingWebhook = await prisma.webhook.findUnique({
      where: { id }
    });

    if (!existingWebhook) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: {
      name?: string;
      description?: string | null;
      isEnabled?: boolean;
    } = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(isEnabled !== undefined && { isEnabled })
    };

    // Update the webhook
    const updatedWebhook = await prisma.webhook.update({
      where: { id },
      data: updateData
    });

    // Return the updated webhook
    return NextResponse.json({ 
      webhook: updatedWebhook
    });
  } catch (error) {
    console.error("Error updating webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a webhook
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

    // Check if the webhook exists
    const existingWebhook = await prisma.webhook.findUnique({
      where: { id }
    });

    if (!existingWebhook) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    // Delete the webhook (cascades to related entities)
    await prisma.webhook.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

