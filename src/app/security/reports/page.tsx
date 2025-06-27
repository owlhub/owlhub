import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

  // Check if the user is authenticated
  if (!session?.user) {
    // Redirect to home page with the current URL as a parameter
    redirect("/?redirect=/security/reports");
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Security Reports</h1>
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
        <h2 className="text-2xl font-bold mb-4">Generate New Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Report Type</label>
            <select className="w-full p-2 rounded-md" style={{ 
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--foreground)'
            }}>
              <option>Vulnerability Summary</option>
              <option>Compliance Report</option>
              <option>Security Posture</option>
              <option>Risk Assessment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Time Period</label>
            <select className="w-full p-2 rounded-md" style={{ 
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--foreground)'
            }}>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
              <option>Custom Range</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Format</label>
            <select className="w-full p-2 rounded-md" style={{ 
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--foreground)'
            }}>
              <option>PDF</option>
              <option>CSV</option>
              <option>HTML</option>
              <option>JSON</option>
            </select>
          </div>
        </div>
        <button className="rounded-md border-0 transition-colors flex items-center justify-center gap-2 font-medium text-sm h-10 px-4 shadow-sm hover:shadow-md hover:bg-[var(--secondary-blue)]" style={{ background: 'var(--primary-blue)', color: 'white' }}>
          Generate Report
        </button>
      </div>

      <div className="p-6 rounded-lg shadow-sm" style={{ background: 'var(--card-bg)', color: 'var(--foreground)' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Recent Reports</h2>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="rounded-lg p-4 hover:shadow-md transition-shadow" style={{ 
            border: '1px solid var(--border-color)',
            background: 'var(--card-bg)',
            color: 'var(--foreground)'
          }}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold">Vulnerability Summary</h3>
              <span className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.6 }}>Oct 15, 2023</span>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              Summary of all vulnerabilities detected in the last 30 days.
            </p>
            <div className="flex justify-between items-center">
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'rgb(59, 130, 246)' }}>PDF</span>
              <div>
                <button className="text-sm mr-2" style={{ color: 'var(--primary-blue)' }}>View</button>
                <button className="text-sm" style={{ color: 'var(--accent-green)' }}>Download</button>
              </div>
            </div>
          </div>

          <div className="rounded-lg p-4 hover:shadow-md transition-shadow" style={{ 
            border: '1px solid var(--border-color)',
            background: 'var(--card-bg)',
            color: 'var(--foreground)'
          }}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold">Compliance Report</h3>
              <span className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.6 }}>Oct 10, 2023</span>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              Security compliance status report for regulatory requirements.
            </p>
            <div className="flex justify-between items-center">
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'rgb(59, 130, 246)' }}>PDF</span>
              <div>
                <button className="text-sm mr-2" style={{ color: 'var(--primary-blue)' }}>View</button>
                <button className="text-sm" style={{ color: 'var(--accent-green)' }}>Download</button>
              </div>
            </div>
          </div>

          <div className="rounded-lg p-4 hover:shadow-md transition-shadow" style={{ 
            border: '1px solid var(--border-color)',
            background: 'var(--card-bg)',
            color: 'var(--foreground)'
          }}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold">Security Posture</h3>
              <span className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.6 }}>Oct 5, 2023</span>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              Overall security posture assessment with recommendations.
            </p>
            <div className="flex justify-between items-center">
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'rgb(59, 130, 246)' }}>HTML</span>
              <div>
                <button className="text-sm mr-2" style={{ color: 'var(--primary-blue)' }}>View</button>
                <button className="text-sm" style={{ color: 'var(--accent-green)' }}>Download</button>
              </div>
            </div>
          </div>

          <div className="rounded-lg p-4 hover:shadow-md transition-shadow" style={{ 
            border: '1px solid var(--border-color)',
            background: 'var(--card-bg)',
            color: 'var(--foreground)'
          }}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold">Risk Assessment</h3>
              <span className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.6 }}>Sep 28, 2023</span>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              Detailed risk assessment of all identified security issues.
            </p>
            <div className="flex justify-between items-center">
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'rgb(59, 130, 246)' }}>PDF</span>
              <div>
                <button className="text-sm mr-2" style={{ color: 'var(--primary-blue)' }}>View</button>
                <button className="text-sm" style={{ color: 'var(--accent-green)' }}>Download</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
