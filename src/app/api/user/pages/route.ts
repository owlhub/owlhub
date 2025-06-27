import { NextRequest, NextResponse } from "next/server";
import { getUserAccessiblePages } from "@/auth";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  const session = await auth(request);

  // Check if the user is authenticated
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Get the userId from the query parameter or use the current user's ID
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId") || session.user.id;

  // Only allow super users to check other users' accessible pages
  if (userId !== session.user.id && !session.user.isSuperUser) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    // Get the pages the user has access to
    const pages = await getUserAccessiblePages(userId);

    return NextResponse.json({ pages });
  } catch (error) {
    console.error("Error fetching accessible pages:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
