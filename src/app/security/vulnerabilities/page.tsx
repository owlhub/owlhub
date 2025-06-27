import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function VulnerabilitiesPage() {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

  // Check if the user is authenticated
  if (!session?.user) {
    // Redirect to home page with the current URL as a parameter
    redirect("/?redirect=/security/vulnerabilities");
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Security Vulnerabilities</h1>
          <Link
            href="/security"
            className="rounded-md border border-solid transition-colors flex items-center justify-center hover:border-transparent font-medium text-sm h-10 px-4"
            style={{ 
              borderColor: 'var(--border-color)',
              color: 'var(--foreground)',
              background: 'var(--card-bg)'
            }}
          >
            Back to Security Dashboard
          </Link>
        </div>
      </header>

      <div className="p-6 rounded-lg shadow-sm" style={{ background: 'var(--card-bg)', color: 'var(--foreground)' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Detected Vulnerabilities</h2>
          <div className="flex space-x-2">
            <button 
              className="rounded-md border border-solid transition-colors flex items-center justify-center hover:border-transparent font-medium text-sm h-10 px-4"
              style={{ 
                borderColor: 'var(--border-color)',
                color: 'var(--foreground)',
                background: 'var(--card-bg)'
              }}
            >
              Filter
            </button>
            <button className="rounded-md border-0 transition-colors flex items-center justify-center gap-2 font-medium text-sm h-10 px-4 shadow-sm hover:shadow-md hover:bg-[var(--secondary-blue)]" style={{ background: 'var(--primary-blue)', color: 'white' }}>
              Scan Now
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full rounded-lg overflow-hidden" style={{ 
            background: 'var(--card-bg)', 
            color: 'var(--foreground)',
            borderColor: 'var(--border-color)'
          }}>
            <thead style={{ background: 'var(--primary-blue)', opacity: 0.1 }}>
              <tr>
                <th className="py-3 px-4 text-left" style={{ color: 'var(--foreground)' }}>Severity</th>
                <th className="py-3 px-4 text-left" style={{ color: 'var(--foreground)' }}>Title</th>
                <th className="py-3 px-4 text-left" style={{ color: 'var(--foreground)' }}>Source</th>
                <th className="py-3 px-4 text-left" style={{ color: 'var(--foreground)' }}>Status</th>
                <th className="py-3 px-4 text-left" style={{ color: 'var(--foreground)' }}>Detected</th>
                <th className="py-3 px-4 text-left" style={{ color: 'var(--foreground)' }}>Actions</th>
              </tr>
            </thead>
            <tbody style={{ borderTop: '1px solid var(--border-color)' }}>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(220, 38, 38, 0.1)', color: 'rgb(220, 38, 38)' }}>
                    Critical
                  </span>
                </td>
                <td className="py-3 px-4">SQL Injection Vulnerability</td>
                <td className="py-3 px-4">GitLab Security Scanner</td>
                <td className="py-3 px-4">Open</td>
                <td className="py-3 px-4">2023-10-15</td>
                <td className="py-3 px-4">
                  <button className="mr-2" style={{ color: 'var(--primary-blue)' }}>View</button>
                  <button style={{ color: 'var(--accent-green)' }}>Resolve</button>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(234, 179, 8, 0.1)', color: 'rgb(234, 179, 8)' }}>
                    Medium
                  </span>
                </td>
                <td className="py-3 px-4">Outdated Dependencies</td>
                <td className="py-3 px-4">Dependency Scanner</td>
                <td className="py-3 px-4">In Progress</td>
                <td className="py-3 px-4">2023-10-10</td>
                <td className="py-3 px-4">
                  <button className="mr-2" style={{ color: 'var(--primary-blue)' }}>View</button>
                  <button style={{ color: 'var(--accent-green)' }}>Resolve</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
