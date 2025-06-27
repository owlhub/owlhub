import Image from "next/image";
import { auth } from "@/auth";
import Link from "next/link";
import { getUserAccessiblePages } from "@/auth";
import ClientWrapper from "./ClientWrapper";

export default async function Home() {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });
  const isAuthenticated = !!session?.user;

  // Get accessible pages if authenticated
  let accessiblePages: string[] = [];

  if (isAuthenticated && session.user.id) {
    accessiblePages = await getUserAccessiblePages(session.user.id);
  }

  return (
    <ClientWrapper>
      <div className="p-8 max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            {!isAuthenticated && (
              <Link
                href="/login"
                className="rounded-md border-0 transition-colors flex items-center justify-center gap-2 font-medium text-sm h-10 px-4 shadow-sm hover:shadow-md hover:bg-[var(--secondary-blue)]"
                style={{ 
                  background: 'var(--primary-blue)', 
                  color: 'white'
                }}
              >
                Sign In
              </Link>
            )}
          </div>
        </header>

        <main className="flex flex-col gap-[32px] row-start-2 items-center w-full max-w-4xl">
          <h1 className="text-4xl font-bold text-center">Welcome to OwlHub</h1>

          {isAuthenticated ? (
            <div className="w-full">
              <div className="p-6 rounded-lg shadow-sm mb-8" style={{ background: 'var(--card-bg)', borderLeft: '4px solid var(--primary-blue)' }}>
                <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--primary-blue)' }}>Your Account</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Profile</h3>
                    <p><strong>Id:</strong> {session.user.id || "Not provided"}</p>
                    <p><strong>Name:</strong> {session.user.name || "Not provided"}</p>
                    <p><strong>Email:</strong> {session.user.email}</p>
                    <p><strong>Super User:</strong> {session.user.isSuperUser ? 
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Yes</span> : 
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">No</span>}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Roles</h3>
                    {session.user.roles && session.user.roles.length > 0 ? (
                      <ul className="space-y-1">
                        {session.user.roles.map((role) => (
                          <li key={role.id} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium mr-2 mb-2" style={{ background: 'var(--secondary-blue)', color: 'white' }}>
                            {role.name}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No roles assigned</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg shadow-sm" style={{ background: 'var(--card-bg)', borderLeft: '4px solid var(--accent-orange)' }}>
                <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--accent-orange)' }}>Accessible Pages</h2>
                {accessiblePages.length > 0 ? (
                  <ul className="space-y-2">
                    {accessiblePages.map((page) => (
                      <li key={page} className="mb-2">
                        <Link href={page} className="flex items-center p-2 rounded-md hover:bg-opacity-10 hover:bg-blue-500 transition-colors" style={{ color: 'var(--secondary-blue)' }}>
                          <span className="mr-2">📄</span> {page}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No pages accessible</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-lg mb-8">
                Please sign in to access protected content.
              </p>
              <Link
                href="/login"
                className="rounded-md border-0 transition-colors flex items-center justify-center gap-2 font-medium text-lg h-12 px-6 mx-auto shadow-sm hover:shadow-md hover:bg-[var(--secondary-blue)]"
                style={{ 
                  background: 'var(--primary-blue)', 
                  color: 'white'
                }}
              >
                Sign In with OIDC
              </Link>
            </div>
          )}
        </main>

        <footer className="mt-12 py-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm opacity-70 mb-2 md:mb-0">
              © {new Date().getFullYear()} OwlHub. All rights reserved.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-sm hover:underline" style={{ color: 'var(--primary-blue)' }}>Privacy Policy</a>
              <a href="#" className="text-sm hover:underline" style={{ color: 'var(--primary-blue)' }}>Terms of Service</a>
              <a href="#" className="text-sm hover:underline" style={{ color: 'var(--primary-blue)' }}>Contact Us</a>
            </div>
          </div>
        </footer>
      </div>
    </ClientWrapper>
  );
}
