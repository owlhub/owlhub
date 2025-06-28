import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/src/components/SessionProvider";
import Sidebar from "@/src/components/Sidebar";
import MobileNav from "@/src/components/MobileNav";
import Topbar from "@/src/components/Topbar";
import Breadcrumb from "@/src/components/Breadcrumb";
import { auth } from "@/lib/auth";
// Import Font Awesome configuration
import "@/src/lib/fontawesome";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OwlHub",
  description: "A Next.js application with OIDC authentication and role-based access control",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });
  const isAuthenticated = !!session?.user;

  return (
    <html lang="en" className="light">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <div className="flex flex-col h-screen">
            {/* Mobile navigation - only visible on small screens */}
            {isAuthenticated && <MobileNav />}

            {/* Topbar - visible on all screen sizes when authenticated */}
            {isAuthenticated && <Topbar />}

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar - hidden on small screens, visible on medium and up */}
              {isAuthenticated && (
                <aside className="hidden md:block shadow-lg">
                  <Sidebar />
                </aside>
              )}

              {/* Main content area */}
              <main className="flex-1 overflow-auto">
                <div className="min-h-full" style={{ background: 'var(--background)' }}>
                  {/* Breadcrumb - visible at the top of main content area */}
                  {isAuthenticated && <Breadcrumb />}
                  {children}

                  <div className="p-8 max-w-6xl mx-auto">
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
                </div>
              </main>
            </div>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
