"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Check for session and redirect to home page
  useEffect(() => {
    if (session) {
      router.push('/');
    }
  }, [session, router]);

  // Handle login
  useEffect(() => {
    // Skip auto-redirect if user is already signed in
    if (session) return;

    // Add a small delay before redirecting
    const timer = setTimeout(() => {
      if (!error && !isRedirecting && !session) {
        setIsRedirecting(true);
        signIn("oidc").catch(err => {
          console.error("Sign in error:", err);
          setError("Failed to sign in. Please try again.");
          setIsRedirecting(false);
        });
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [error, isRedirecting, session]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      {error ? (
        <>
          <h1 className="text-4xl font-bold mb-8 text-red-600">Authentication Error</h1>
          <p className="text-lg mb-8 text-center">
            {error}
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setError(null);
              }}
              className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-lg h-12 px-6"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-lg h-12 px-6"
            >
              Go Home
            </button>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-4xl font-bold mb-8">Redirecting to login...</h1>
          <p className="text-lg mb-8">
            {isRedirecting 
              ? "Redirecting to the authentication provider..." 
              : "Preparing to redirect to the login page..."}
          </p>
          {!isRedirecting && (
            <button
              onClick={() => {
                setIsRedirecting(true);
                signIn("oidc");
              }}
              className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-lg h-12 px-6"
            >
              Sign in with OIDC
            </button>
          )}
        </>
      )}
    </div>
  );
}
