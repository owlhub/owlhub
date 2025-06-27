"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [errorDetails] = useState({
    error: searchParams.get("error") || "Unknown error",
    description: searchParams.get("error_description") || "An unknown error occurred during authentication."
  });

  // Reset the redirect count when arriving at the error page
  useEffect(() => {
    localStorage.setItem('auth_redirect_count', '0');
  }, []);

  // Map error codes to more user-friendly messages
  const getErrorMessage = (error: string) => {
    const errorMessages: Record<string, string> = {
      "Configuration": "There is a problem with the server configuration. Please contact support.",
      "AccessDenied": "Access was denied. You may not have permission to access this resource.",
      "Verification": "The verification failed. Please try signing in again.",
      "OAuthSignin": "There was a problem with the OAuth sign-in. Please try again.",
      "OAuthCallback": "There was a problem with the OAuth callback. Please try again.",
      "OAuthCreateAccount": "There was a problem creating your account. Please try again.",
      "EmailCreateAccount": "There was a problem creating your account. Please try again.",
      "Callback": "There was a problem with the authentication callback. Please try again.",
      "OAuthAccountNotLinked": "An account with this email already exists. We've linked your accounts so you can sign in with either method.",
      "EmailSignin": "There was a problem sending the email. Please try again.",
      "CredentialsSignin": "The sign in failed. Please check your credentials and try again.",
      "SessionRequired": "Please sign in to access this page.",
      "Default": "An unknown error occurred during authentication."
    };

    return errorMessages[error] || errorMessages["Default"];
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-2xl w-full">
        <h1 className="text-3xl font-bold mb-6 text-red-600">Authentication Error</h1>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Error: {errorDetails.error}</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {getErrorMessage(errorDetails.error)}
          </p>
          {errorDetails.description && (
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md">
              <p className="text-sm font-mono">{errorDetails.description}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/login"
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-base h-10 px-4 text-center"
          >
            Try Again
          </Link>
          <button
            onClick={() => router.push('/')}
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-base h-10 px-4"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
