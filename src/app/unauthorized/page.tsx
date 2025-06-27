"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function UnauthorizedPage() {
  const { data: session } = useSession();
  const [accessiblePages, setAccessiblePages] = useState<string[]>([]);

  useEffect(() => {
    // Fetch the pages the user has access to
    if (session?.user?.id) {
      fetch(`/api/user/pages?userId=${session.user.id}`)
        .then((res) => res.json())
        .then((data) => {
          setAccessiblePages(data.pages || []);
        })
        .catch((error) => {
          console.error("Error fetching accessible pages:", error);
        });
    }
  }, [session]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Access Denied</h1>
      <p className="text-lg mb-8">
        You do not have permission to access this page. Please contact your
        administrator if you believe this is an error.
      </p>

      {accessiblePages.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Pages you can access:</h2>
          <ul className="list-disc pl-5">
            {accessiblePages.map((page) => (
              <li key={page} className="mb-2">
                <Link
                  href={page}
                  className="text-blue-500 hover:underline"
                >
                  {page}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-4">
        <Link
          href="/"
          className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-lg h-12 px-6"
        >
          Go to Home
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-lg h-12 px-6"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}