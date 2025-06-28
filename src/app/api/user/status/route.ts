import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

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

  try {
    // Use the session data directly
    const userData = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      isSuperUser: session.user.isSuperUser,
      roles: session.user.roles || []
    };

    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error("Error fetching user status:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
