import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

interface RouteParams {
  params: {
    id: string;
  };
}

// POST: Receive webhook events
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    
    // Get the token from the HTTP header
    const token = request.headers.get('OWLHUB-TOKEN');
    
    if (!token) {
      return NextResponse.json(
        { error: "Authentication token is required" },
        { status: 401 }
      );
    }

    // Find the webhook by ID and verify the token
    const webhook = await prisma.webhook.findUnique({
      where: { id },
      include: {
        flows: {
          where: { isEnabled: true },
          select: {
            id: true,
            name: true,
            config: true
          }
        }
      }
    });

    // If webhook not found or disabled, return 404
    if (!webhook || !webhook.isEnabled) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    // Verify the token
    if (webhook.token !== token) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    // Get the payload from the request
    let payload;
    try {
      payload = await request.json();
    } catch (error) {
      console.error("Error parsing webhook payload:", error);
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    // Create a webhook event
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        webhookId: webhook.id,
        payload: JSON.stringify(payload),
        status: 'pending'
      }
    });

    // Process webhooks associated with this webhook
    if (webhook.flows.length > 0) {
      // Create flow runs for each flow
      const flowRunPromises = webhook.flows.map(flow => {
        return prisma.flowRun.create({
          data: {
            flowId: flow.id,
            webhookEventId: webhookEvent.id,
            status: 'pending',
            input: JSON.stringify(payload)
          }
        });
      });

      const flowRuns = await Promise.all(flowRunPromises);

      // Create queue items for each flow run
      const queueItemPromises = flowRuns.map(async (flowRun) => {
        // Find the default queue or create one if it doesn't exist
        let defaultQueue = await prisma.queue.findFirst({
          where: { name: 'default' }
        });

        if (!defaultQueue) {
          defaultQueue = await prisma.queue.create({
            data: {
              name: 'default',
              description: 'Default queue for processing webhook events'
            }
          });
        }

        // Create a queue item
        return prisma.queueItem.create({
          data: {
            queueId: defaultQueue.id,
            flowId: flowRun.flowId,
            flowRunId: flowRun.id,
            status: 'pending',
            payload: JSON.stringify(payload)
          }
        });
      });

      await Promise.all(queueItemPromises);

      // Update the webhook event status
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: 'processing' }
      });
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Webhook received and processing started",
      eventId: webhookEvent.id
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// GET: Verify webhook is active (for testing)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    
    // Get the token from the HTTP header
    const token = request.headers.get('OWLHUB-TOKEN');
    
    if (!token) {
      return NextResponse.json(
        { error: "Authentication token is required" },
        { status: 401 }
      );
    }

    // Find the webhook by ID
    const webhook = await prisma.webhook.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        token: true,
        isEnabled: true,
        _count: {
          select: {
            flows: {
              where: { isEnabled: true }
            }
          }
        }
      }
    });

    // If webhook not found or disabled, return 404
    if (!webhook || !webhook.isEnabled) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    // Verify the token
    if (webhook.token !== token) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    // Return webhook info (without sensitive data)
    return NextResponse.json({
      success: true,
      webhook: {
        id: webhook.id,
        name: webhook.name,
        isEnabled: webhook.isEnabled,
        activeFlows: webhook._count.flows
      }
    });
  } catch (error) {
    console.error("Error verifying webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}