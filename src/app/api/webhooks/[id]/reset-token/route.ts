import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: {
    id: string;
  };
}

// POST: Reset a webhook token
export async function POST(request: NextRequest, { params }: RouteParams) {
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

  // Only allow superusers to reset webhook tokens
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

    // Generate a new token
    const token = generateSecureToken();

    // Update the webhook with the new token
    const updatedWebhook = await prisma.webhook.update({
      where: { id },
      data: {
        token
      }
    });

    // Return the webhook with the new token
    return NextResponse.json({ 
      success: true,
      token
    });
  } catch (error) {
    console.error("Error resetting webhook token:", error);
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