import { auth } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CASBReportsPage() {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

  // Check if the user is authenticated
  if (!session?.user) {
    // Redirect to login page with the current URL as a parameter
    redirect("/?redirect=/casb/reports");
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">CASB Reports</h1>
        <Link 
          href="/casb"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition-colors flex items-center"
          style={{ color: 'var(--foreground)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to CASB Dashboard
        </Link>
      </header>

      {/* Report Generator */}
      <div className="mb-8 p-6 rounded-lg shadow-sm" style={{ background: 'var(--card-bg)', color: 'var(--foreground)' }}>
        <h2 className="text-xl font-bold mb-4">Generate Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-2 text-sm font-medium">Report Type</label>
            <select className="w-full p-2 border rounded-md" style={{ background: 'var(--input-bg)', color: 'var(--foreground)', borderColor: 'var(--border)' }}>
              <option>Security Posture</option>
              <option>Compliance</option>
              <option>Vulnerability</option>
              <option>Risk Assessment</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium">Time Period</label>
            <select className="w-full p-2 border rounded-md" style={{ background: 'var(--input-bg)', color: 'var(--foreground)', borderColor: 'var(--border)' }}>
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>Custom range</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium">Format</label>
            <select className="w-full p-2 border rounded-md" style={{ background: 'var(--input-bg)', color: 'var(--foreground)', borderColor: 'var(--border)' }}>
              <option>PDF</option>
              <option>CSV</option>
              <option>JSON</option>
            </select>
          </div>
        </div>
        <button 
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          Generate Report
        </button>
      </div>

      {/* Recent Reports */}
      <h2 className="text-xl font-bold mb-4">Recent Reports</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full" style={{ color: 'var(--foreground)' }}>
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <th className="py-3 px-4 text-left">Report Name</th>
              <th className="py-3 px-4 text-left">Type</th>
              <th className="py-3 px-4 text-left">Generated</th>
              <th className="py-3 px-4 text-left">Format</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <td className="py-3 px-4">Compliance Report - Q2 2023</td>
              <td className="py-3 px-4">Compliance</td>
              <td className="py-3 px-4">2023-06-30</td>
              <td className="py-3 px-4">PDF</td>
              <td className="py-3 px-4">
                <button className="text-blue-600 hover:text-blue-800 mr-2">Download</button>
                <button className="text-blue-600 hover:text-blue-800">View</button>
              </td>
            </tr>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <td className="py-3 px-4">Security Posture Assessment</td>
              <td className="py-3 px-4">Security Posture</td>
              <td className="py-3 px-4">2023-06-15</td>
              <td className="py-3 px-4">PDF</td>
              <td className="py-3 px-4">
                <button className="text-blue-600 hover:text-blue-800 mr-2">Download</button>
                <button className="text-blue-600 hover:text-blue-800">View</button>
              </td>
            </tr>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <td className="py-3 px-4">Vulnerability Trends - May 2023</td>
              <td className="py-3 px-4">Vulnerability</td>
              <td className="py-3 px-4">2023-05-31</td>
              <td className="py-3 px-4">CSV</td>
              <td className="py-3 px-4">
                <button className="text-blue-600 hover:text-blue-800 mr-2">Download</button>
                <button className="text-blue-600 hover:text-blue-800">View</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Report Templates */}
      <h2 className="text-xl font-bold mt-8 mb-4">Report Templates</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 border rounded-lg" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
          <h3 className="text-lg font-semibold">Compliance</h3>
          <p className="text-sm mt-2 mb-4" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
            Security compliance status report for regulatory requirements.
          </p>
          <button 
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm"
          >
            Use Template
          </button>
        </div>
        <div className="p-4 border rounded-lg" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
          <h3 className="text-lg font-semibold">Security Posture</h3>
          <p className="text-sm mt-2 mb-4" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
            Overall security posture assessment with recommendations.
          </p>
          <button 
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm"
          >
            Use Template
          </button>
        </div>
        <div className="p-4 border rounded-lg" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
          <h3 className="text-lg font-semibold">Risk Assessment</h3>
          <p className="text-sm mt-2 mb-4" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
            Detailed risk assessment of all identified security issues.
          </p>
          <button 
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm"
          >
            Use Template
          </button>
        </div>
      </div>
    </div>
  );
}