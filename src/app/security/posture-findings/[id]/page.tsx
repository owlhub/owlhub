import { auth } from "@/lib/auth";
import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import { notFound, redirect } from "next/navigation";
import ClientWrapper from "./ClientWrapper";

export default async function PostureFindingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

  // Check if the user is authenticated
  if (!session?.user) {
    // Redirect to home page with the current URL as a parameter
    redirect(`/?redirect=/security/posture-findings`);
  }

  // Fetch the integration security finding
  const { id } = await params;
  const integrationSecurityFinding = await prisma.integrationFinding.findUnique({
    where: {
      id: id,
    },
    include: {
      integration: {
        include: {
          app: true,
        },
      },
      appFinding: true,
    },
  });

  if (!integrationSecurityFinding) {
    return notFound();
  }

  // We no longer fetch detailed findings on the server side
  // They will be fetched on the client side based on the active tab

  // Format severity for display
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { bg: 'rgba(220, 38, 38, 0.1)', color: 'rgb(220, 38, 38)' };
      case 'high':
        return { bg: 'rgba(234, 88, 12, 0.1)', color: 'rgb(234, 88, 12)' };
      case 'medium':
        return { bg: 'rgba(234, 179, 8, 0.1)', color: 'rgb(234, 179, 8)' };
      default:
        return { bg: 'rgba(34, 197, 94, 0.1)', color: 'rgb(34, 197, 94)' };
    }
  };

  const severityStyle = getSeverityStyle(integrationSecurityFinding.appFinding.severity);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link
          href="/security/posture-findings"
          className="text-blue-600 hover:underline flex items-center gap-1"
        >
          ← Back to Posture Findings
        </Link>
      </div>

      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{integrationSecurityFinding.appFinding.name}</h1>
          <span 
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium" 
            style={{ 
              background: severityStyle.bg,
              color: severityStyle.color
            }}
          >
            {integrationSecurityFinding.appFinding.severity.charAt(0).toUpperCase() + 
             integrationSecurityFinding.appFinding.severity.slice(1)}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 rounded-lg shadow-sm" style={{ background: 'var(--card-bg)', color: 'var(--foreground)' }}>
          <h2 className="text-xl font-semibold mb-4">Integration Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Integration</p>
              <p className="font-medium">{integrationSecurityFinding.integration.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Integration Type</p>
              <p className="font-medium">{integrationSecurityFinding.integration.app.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Detected</p>
              <p className="font-medium">
                {integrationSecurityFinding.lastDetectedAt 
                  ? (() => {
                      const date = new Date(integrationSecurityFinding.lastDetectedAt);
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      return `${year}-${month}-${day}`;
                    })() 
                  : 'Never'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg shadow-sm" style={{ background: 'var(--card-bg)', color: 'var(--foreground)' }}>
          <h2 className="text-xl font-semibold mb-4">Description</h2>
          <p>{integrationSecurityFinding.appFinding.description}</p>
        </div>
      </div>

        <ClientWrapper 
          integrationId={integrationSecurityFinding.integrationId}
          appFindingId={integrationSecurityFinding.appFindingId}
          initialActiveCount={integrationSecurityFinding.activeCount}
          initialHiddenCount={integrationSecurityFinding.hiddenCount}
        />
    </div>
  );
}
