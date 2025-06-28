"use client";

import { useEffect, useState } from "react";
import {signIn, useSession} from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Store redirect parameter in localStorage when present
  useEffect(() => {
    const redirectPath = searchParams.get('redirect');
    if (redirectPath && typeof window !== 'undefined') {
      localStorage.setItem('loginRedirectPath', redirectPath);
    }
  }, [searchParams]);


  useEffect(() => {
    if (session?.user) {
      let redirectPath = '/';

      if (typeof window !== 'undefined') {
        redirectPath = localStorage.getItem('loginRedirectPath') || '/';
        localStorage.removeItem('loginRedirectPath');
      }

      router.push(redirectPath);

    }
  }, [session, router]);

  // We removed auto-login functionality as per requirements
  // Now login only happens when the user clicks the button

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
          <h1 className="text-4xl font-bold mb-8">Welcome to OwlHub</h1>
          <p className="text-lg mb-8">
            {isRedirecting 
              ? "Redirecting to the authentication provider..." 
              : "Please click the button below to sign in"}
          </p>
          <button
            onClick={() => {
              setIsRedirecting(true);
              // Get the redirect path from localStorage if it exists
              let redirectPath = '/';

              if (typeof window !== 'undefined') {
                redirectPath = localStorage.getItem('loginRedirectPath') || '/';
                localStorage.removeItem('loginRedirectPath');
              }

              console.log('Redirecting to:', redirectPath);

              signIn("oidc", {
                redirectTo: redirectPath,
              }).catch(err => {
                console.error("Sign in error:", err);
                setError("Failed to sign in. Please try again.");
                setIsRedirecting(false);
              });
            }}
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:text-[#383838] dark:hover:bg-[#ccc] font-medium text-lg h-12 px-6"
            disabled={isRedirecting}
          >
            {isRedirecting ? "Signing in..." : "Sign in with OIDC"}
          </button>
        </>
      )}
    </div>
  );
}
