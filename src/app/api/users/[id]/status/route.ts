import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  // Only allow super users or users with admin roles to update user status
  const isSuperUser = session.user.isSuperUser;
  const hasAdminRole = session.user.roles && session.user.roles.some(role => 
    role.name === "Super Admin" || role.name === "Admin"
  );

  if (!isSuperUser && !hasAdminRole) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    // Parse the request body
    const body = await request.json();

    // Validate the request body
    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json(
        { error: "isActive must be a boolean" },
        { status: 400 }
      );
    }

    // Check if the user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update the user's isActive status
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { isActive: body.isActive },
    });

    return NextResponse.json({ 
      user: {
        id: updatedUser.id,
        isActive: updatedUser.isActive
      } 
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
