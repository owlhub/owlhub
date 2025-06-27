import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from './auth';
import { hasPageAccess } from './auth';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  try {
    // Check if this is an authentication-related path to avoid potential loops
    const isAuthPath = request.nextUrl.pathname.startsWith('/api/auth') || 
                       request.nextUrl.pathname === '/login' ||
                       request.nextUrl.pathname === '/error';

    if (isAuthPath) {
      // Don't apply middleware to authentication paths
      return NextResponse.next();
    }

    const session = await auth({ req: request });

    // If the user is not logged in, redirect to the home page
    if (!session?.user) {
      console.log(`Middleware: User not authenticated, redirecting to home page from ${request.nextUrl.pathname}`);
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }

  // Check if the user has access to the requested page
  const hasAccess = await hasPageAccess(session.user.id, request.nextUrl.pathname);

  // If the user doesn't have access, check if they're a super user from the session
  if (!hasAccess) {
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
    // Redirect to error page in case of middleware errors
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
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login|error|unauthorized).*)',
  ],
};
