import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from './lib/auth';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  // Check if this is an API request
  const isApiRequest = request.nextUrl.pathname.startsWith('/api/');

  try {
    // Check if this is an authentication-related path to avoid potential loops
    const isAuthPath = request.nextUrl.pathname === '/login' ||
      request.nextUrl.pathname === '/error' ||
      request.nextUrl.pathname.startsWith('/api/auth');

    if (isAuthPath) {
      // Don't apply middleware to authentication paths
      return NextResponse.next();
    }

    console.log(`Middleware: ${request.nextUrl.pathname}`);

    if (request.nextUrl.pathname === '/') {
      const homeUrl = new URL('/profile', request.url);
      return NextResponse.redirect(homeUrl);
    }

    const session = await auth();

    console.log(`Middleware: ${request.nextUrl.pathname}`, session);

    // If the user is not logged in
    if (!session?.user) {
      console.log(`Middleware: User not authenticated from ${request.nextUrl.pathname}`);

      // For API requests, return JSON response
      if (isApiRequest) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // For non-API requests, redirect to login page
      const homeUrl = new URL('/login?redirect='+request.nextUrl.pathname, request.url);
      return NextResponse.redirect(homeUrl);
    }

    // For API requests, we don't need to check page access
    if (isApiRequest) {
      return NextResponse.next();
    }

    // For non-API requests, check if the user has access to the requested page
    const apiUrl = new URL('/api/auth/page-access', request.url);
    apiUrl.searchParams.set('path', request.nextUrl.pathname);

    const response = await fetch(apiUrl);
    const data = await response.json();

    // If the user doesn't have access, check if they're a super user from the session
    if (!data.hasAccess) {
      // If they're a super user in the session, allow access
      if (session.user.isSuperUser) {
        return NextResponse.next();
      }

      // Otherwise, redirect to unauthorized page
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);

    // For API requests, return JSON error response
    if (isApiRequest) {
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    // For non-API requests, redirect to error page
    const errorUrl = new URL('/error', request.url);
    errorUrl.searchParams.set('error', 'ServerError');
    errorUrl.searchParams.set('error_description', 'An error occurred while processing your request.');
    return NextResponse.redirect(errorUrl);
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     * - error (error page)
     * - unauthorized (unauthorized page)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login|error|unauthorized|assets).*)',
  ],
};
