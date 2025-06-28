import { NextRequest, NextResponse } from 'next/server';
import { auth, hasPageAccess } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get the page path from the query parameters
    const pagePath = request.nextUrl.searchParams.get('path');
    
    if (!pagePath) {
      return NextResponse.json(
        { error: 'Page path is required' },
        { status: 400 }
      );
    }

    // Get the current session
    const session = await auth();

    // If the user is not logged in, return unauthorized
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if the user has access to the page
    const hasAccess = await hasPageAccess(session, session.user.id, pagePath);

    // Return the result
    return NextResponse.json({ hasAccess });
  } catch (error) {
    console.error('Error checking page access:', error);
    return NextResponse.json(
      { error: 'An error occurred while checking page access' },
      { status: 500 }
    );
  }
}