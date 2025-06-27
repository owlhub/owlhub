import { auth } from "@/auth";
import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import { redirect } from "next/navigation";

export default async function SecurityPage() {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

  // Check if the user is authenticated
  if (!session?.user) {
    // Redirect to home page with the current URL as a parameter
    redirect("/?redirect=/security");
  }

  // Fetch security data for dashboard widgets
  const enabledIntegrationsCount = await prisma.integration.count({
    where: { isEnabled: true }
  });

  const integrationFindingsCount = await prisma.integrationSecurityFindingDetails.count();

  const criticalFindingsCount = await prisma.integrationSecurityFindingDetails.count({
    where: {
      securityFinding: {
        severity: 'critical'
      }
    }
  });

  const highRiskFindingsCount = await prisma.integrationSecurityFindingDetails.count({
    where: {
      securityFinding: {
        severity: 'high'
      }
    }
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Security Dashboard</h1>
      </header>

      {/* Dashboard Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="p-6 rounded-lg shadow-sm border-t-4" style={{ 
          background: 'var(--card-bg)', 
          borderTopColor: 'var(--primary-blue)',
          color: 'var(--foreground)'
        }}>
          <h2 className="text-lg font-semibold mb-2">Enabled Integrations</h2>
          <p className="text-3xl font-bold">{enabledIntegrationsCount}</p>
        </div>

        <div className="p-6 rounded-lg shadow-sm border-t-4" style={{ 
          background: 'var(--card-bg)', 
          borderTopColor: 'var(--accent-green)',
          color: 'var(--foreground)'
        }}>
          <h2 className="text-lg font-semibold mb-2">Integration Findings</h2>
          <p className="text-3xl font-bold">{integrationFindingsCount}</p>
        </div>

        <div className="p-6 rounded-lg shadow-sm border-t-4" style={{ 
          background: 'var(--card-bg)', 
          borderTopColor: 'var(--error)',
          color: 'var(--foreground)'
        }}>
          <h2 className="text-lg font-semibold mb-2">Critical Findings</h2>
          <p className="text-3xl font-bold">{criticalFindingsCount}</p>
        </div>

        <div className="p-6 rounded-lg shadow-sm border-t-4" style={{ 
          background: 'var(--card-bg)', 
          borderTopColor: 'var(--accent-orange)',
          color: 'var(--foreground)'
        }}>
          <h2 className="text-lg font-semibold mb-2">High Risk Findings</h2>
          <p className="text-3xl font-bold">{highRiskFindingsCount}</p>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/security/vulnerabilities" className="block">
          <div className="p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border-l-4" style={{ 
            background: 'var(--card-bg)', 
            borderLeftColor: 'var(--primary-blue)',
            color: 'var(--foreground)'
          }}>
            <h2 className="text-xl font-bold mb-2">Vulnerabilities</h2>
            <p style={{ color: 'var(--foreground)', opacity: 0.7 }}>View and manage security vulnerabilities</p>
          </div>
        </Link>

        <Link href="/security/scans" className="block">
          <div className="p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border-l-4" style={{ 
            background: 'var(--card-bg)', 
            borderLeftColor: 'var(--accent-orange)',
            color: 'var(--foreground)'
          }}>
            <h2 className="text-xl font-bold mb-2">Scans</h2>
            <p style={{ color: 'var(--foreground)', opacity: 0.7 }}>View security scan history and results</p>
          </div>
        </Link>

        <Link href="/security/reports" className="block">
          <div className="p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border-l-4" style={{ 
            background: 'var(--card-bg)', 
            borderLeftColor: 'var(--accent-green)',
            color: 'var(--foreground)'
          }}>
            <h2 className="text-xl font-bold mb-2">Reports</h2>
            <p style={{ color: 'var(--foreground)', opacity: 0.7 }}>Generate and view security reports</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
