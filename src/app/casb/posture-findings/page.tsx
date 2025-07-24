"use client";

import { useSession } from "next-auth/react";
import ClientWrapper from "./ClientWrapper";
import { useRouter } from "next/navigation";

export default function PostureFindingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated: () => router.push('/login?redirect=/casb/posture-findings'),
  });

  if (status === "loading") {
    return <></>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Posture Findings</h1>
        </div>
      </header>

      <p className="mb-4">Review and take action against security issues found in your application or cloud</p>

      <ClientWrapper />
    </div>
  );
}