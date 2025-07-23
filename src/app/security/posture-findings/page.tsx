import { auth } from "@/lib/auth";
import { prisma } from "@/src/lib/prisma";
import ClientWrapper from "./ClientWrapper";
import { redirect } from "next/navigation";

export default async function PostureFindingsPage() {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

  // Check if the user is authenticated
  if (!session?.user) {
    // Redirect to home page with the current URL as a parameter
    redirect("/login?redirect=/security/posture-findings");
  }

  // Fetch integration security findings with active or hidden findings
  const findings = await prisma.integrationFinding.findMany({
    where: {
      OR: [
        { activeCount: { gt: 0 } },
        { hiddenCount: { gt: 0 } }
      ]
    },
    include: {
      integration: {
        include: {
          app: true
        }
      },
      appFinding: true
    },
    orderBy: {
      lastDetectedAt: 'desc'
    }
  });

  // Convert Date objects to strings for the findings
  const formattedFindings = findings.map(finding => ({
    ...finding,
    lastDetectedAt: finding.lastDetectedAt ? finding.lastDetectedAt.toISOString() : null
  }));

  // Extract unique integrations for the filter
  const uniqueIntegrations = Array.from(
    new Map(
      findings.map(finding => [
        finding.integration.id,
        {
          id: finding.integration.id,
          name: finding.integration.name
        }
      ])
    ).values()
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Posture Findings</h1>
        </div>
      </header>

      <p className="mb-4">Review and take action against security issues found in your application or cloud</p>

      <ClientWrapper findings={formattedFindings} integrations={uniqueIntegrations} />
    </div>
  );
}
