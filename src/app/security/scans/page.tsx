import { auth } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ScansPage() {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

  // Check if the user is authenticated
  if (!session?.user) {
    // Redirect to home page with the current URL as a parameter
    redirect("/?redirect=/security/scans");
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Security Scans</h1>
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

      <div className="p-6 rounded-lg shadow-sm mb-6" style={{ background: 'var(--card-bg)', color: 'var(--foreground)' }}>
        <h2 className="text-2xl font-bold mb-4">Run New Scan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Scan Type</label>
            <select className="w-full p-2 rounded-md" style={{ 
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--foreground)'
            }}>
              <option>Full System Scan</option>
              <option>Dependency Scan</option>
              <option>Code Analysis</option>
              <option>Infrastructure Scan</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Target</label>
            <select className="w-full p-2 rounded-md" style={{ 
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--foreground)'
            }}>
              <option>All Projects</option>
              <option>Frontend</option>
              <option>Backend</option>
              <option>Infrastructure</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Priority</label>
            <select className="w-full p-2 rounded-md" style={{ 
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--foreground)'
            }}>
              <option>Normal</option>
              <option>High</option>
              <option>Low</option>
            </select>
          </div>
        </div>
        <button className="rounded-md border-0 transition-colors flex items-center justify-center gap-2 font-medium text-sm h-10 px-4 shadow-sm hover:shadow-md hover:bg-[var(--secondary-blue)]" style={{ background: 'var(--primary-blue)', color: 'white' }}>
          Start Scan
        </button>
      </div>

      <div className="p-6 rounded-lg shadow-sm" style={{ background: 'var(--card-bg)', color: 'var(--foreground)' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Scan History</h2>
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
                <th className="py-3 px-4 text-left" style={{ color: 'var(--foreground)' }}>Scan ID</th>
                <th className="py-3 px-4 text-left" style={{ color: 'var(--foreground)' }}>Type</th>
                <th className="py-3 px-4 text-left" style={{ color: 'var(--foreground)' }}>Target</th>
                <th className="py-3 px-4 text-left" style={{ color: 'var(--foreground)' }}>Status</th>
                <th className="py-3 px-4 text-left" style={{ color: 'var(--foreground)' }}>Started</th>
                <th className="py-3 px-4 text-left" style={{ color: 'var(--foreground)' }}>Duration</th>
                <th className="py-3 px-4 text-left" style={{ color: 'var(--foreground)' }}>Findings</th>
                <th className="py-3 px-4 text-left" style={{ color: 'var(--foreground)' }}>Actions</th>
              </tr>
            </thead>
            <tbody style={{ borderTop: '1px solid var(--border-color)' }}>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td className="py-3 px-4">SCAN-001</td>
                <td className="py-3 px-4">Full System</td>
                <td className="py-3 px-4">All Projects</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'rgb(34, 197, 94)' }}>
                    Completed
                  </span>
                </td>
                <td className="py-3 px-4">2023-10-15 09:30</td>
                <td className="py-3 px-4">45m 12s</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-1" style={{ background: 'rgba(220, 38, 38, 0.1)', color: 'rgb(220, 38, 38)' }}>
                    3 Critical
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(234, 179, 8, 0.1)', color: 'rgb(234, 179, 8)' }}>
                    5 Medium
                  </span>
                </td>
                <td className="py-3 px-4">
                  <button style={{ color: 'var(--primary-blue)' }}>View Report</button>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td className="py-3 px-4">SCAN-002</td>
                <td className="py-3 px-4">Dependency</td>
                <td className="py-3 px-4">Frontend</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'rgb(34, 197, 94)' }}>
                    Completed
                  </span>
                </td>
                <td className="py-3 px-4">2023-10-10 14:15</td>
                <td className="py-3 px-4">12m 45s</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(234, 179, 8, 0.1)', color: 'rgb(234, 179, 8)' }}>
                    2 Medium
                  </span>
                </td>
                <td className="py-3 px-4">
                  <button style={{ color: 'var(--primary-blue)' }}>View Report</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
