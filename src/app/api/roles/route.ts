import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/auth";

// GET: Fetch all roles
export async function GET(request: NextRequest) {
  const session = await auth(request).catch(error => {
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

  // Only allow super users or users with admin roles to access the roles list
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
    // Get all roles with their pages and users
    const roles = await prisma.role.findMany({
      include: {
        pageRoles: {
          include: {
            page: true,
          },
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Transform the data to make it more usable on the client
    const transformedRoles = roles.map(role => ({
      ...role,
      pages: role.pageRoles.map(pr => pr.page),
      users: role.userRoles.map(ur => ur.user),
      pageRoles: undefined, // Remove the pageRoles property
      userRoles: undefined, // Remove the userRoles property
    }));

    return NextResponse.json({ roles: transformedRoles });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST: Create a new role
export async function POST(request: NextRequest) {
  const session = await auth(request).catch(error => {
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

  // Only allow super users or users with admin roles to create roles
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
    const { name, description } = body;

    // Validate the request body
    if (!name) {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 }
      );
    }

    // Check if a role with the same name already exists
    const existingRole = await prisma.role.findUnique({
      where: { name },
    });

    if (existingRole) {
      return NextResponse.json(
        { error: "A role with this name already exists" },
        { status: 409 }
      );
    }

    // Create the new role
    const role = await prisma.role.create({
      data: {
        name,
        description,
      },
    });

    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
