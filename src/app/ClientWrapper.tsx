"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectParam = searchParams.get("redirect");

  // Store the redirect URL in localStorage when component mounts
  useEffect(() => {
    if (redirectParam && redirectParam !== "/") {
      localStorage.setItem('auth_redirect_url', redirectParam);
      console.log('Saved redirect URL to localStorage:', redirectParam);
    }
  }, [redirectParam]);

  // Check for session and redirect to stored URL if available
  useEffect(() => {
    if (session) {
      const redirectUrl = localStorage.getItem('auth_redirect_url');
      if (redirectUrl) {
        console.log('Redirecting to stored URL:', redirectUrl);
        localStorage.removeItem('auth_redirect_url'); // Clear after use
        
        // Only redirect if we're not already at the target URL
        if (window.location.pathname !== redirectUrl) {
          router.push(redirectUrl);
        }
      }
    }
  }, [session, router]);

  return <>{children}</>;
}