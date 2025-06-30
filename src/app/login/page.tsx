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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

  // Get the redirect path from localStorage if it exists
  const getRedirectPath = () => {
    let redirectPath = '/';
    if (typeof window !== 'undefined') {
      redirectPath = localStorage.getItem('loginRedirectPath') || '/';
    }
    return redirectPath;
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    try {
      const redirectPath = getRedirectPath();
      const result = await signIn("credentials", {
        username: username,
        password: password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid username or password. Please try again.");
        setIsLoggingIn(false);
      }
      // No need to redirect here as the session effect will handle it
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to sign in. Please try again.");
      setIsLoggingIn(false);
    }
  };

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

          {/* Username/Password Login Form */}
          <div className="w-full max-w-md mb-8 p-6 bg-white bg-gray-800 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-6 text-center">Sign in with Username</h2>
            <form onSubmit={handleCredentialsLogin} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium mb-1">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {isLoggingIn ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>

          <p className="text-lg mb-4">
            {isRedirecting 
              ? "Redirecting to the authentication provider..." 
              : "Or sign in with your organization account"}
          </p>
          <button
            onClick={() => {
              setIsRedirecting(true);
              const redirectPath = getRedirectPath();
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
