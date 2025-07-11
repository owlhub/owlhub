import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/lib/auth";

// GET: Fetch all webhooks (for admin use)
export async function GET() {
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
    // Get all webhooks
    const webhooks = await prisma.webhook.findMany({
      include: {
        flows: {
          select: {
            id: true,
            name: true,
            isEnabled: true
          }
        },
        _count: {
          select: {
            events: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Remove tokens from the response
    const webhooksWithoutTokens = webhooks.map((webhook) => {
      const { token, ...webhookWithoutToken } = webhook;
      return webhookWithoutToken;
    });

    return NextResponse.json({ webhooks: webhooksWithoutTokens });
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST: Create a new webhook
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
    const { name, description, isEnabled = true } = body;

    // Validate the request body
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Generate a secure random token for webhook authentication
    const token = generateSecureToken();

    // Create the webhook
    const webhook = await prisma.webhook.create({
      data: {
        name,
        description,
        token,
        isEnabled
      }
    });

    return NextResponse.json({ webhook }, { status: 201 });
  } catch (error) {
    console.error("Error creating webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Helper function to generate a secure random token
function generateSecureToken(): string {
  // In a real implementation, use a secure random generator
  // This is a simple implementation for demonstration purposes
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
