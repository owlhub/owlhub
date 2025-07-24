import { auth } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CASBScansPage() {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

  // Check if the user is authenticated
  if (!session?.user) {
    // Redirect to login page with the current URL as a parameter
    redirect("/?redirect=/casb/scans");
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">CASB Scans</h1>
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

      {/* Scan Controls */}
      <div className="mb-8 p-6 rounded-lg shadow-sm" style={{ background: 'var(--card-bg)', color: 'var(--foreground)' }}>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h2 className="text-xl font-bold mb-2">Scan Controls</h2>
            <p className="text-sm mb-4 md:mb-0" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              Run on-demand scans or schedule automated scans
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Run New Scan
            </button>
            <button 
              className="px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-md transition-colors"
            >
              Schedule Scan
            </button>
          </div>
        </div>
      </div>

      {/* Scan History */}
      <h2 className="text-xl font-bold mb-4">Scan History</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full" style={{ color: 'var(--foreground)' }}>
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <th className="py-3 px-4 text-left">Scan ID</th>
              <th className="py-3 px-4 text-left">Type</th>
              <th className="py-3 px-4 text-left">Target</th>
              <th className="py-3 px-4 text-left">Started</th>
              <th className="py-3 px-4 text-left">Duration</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-left">Findings</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <td className="py-3 px-4">SCAN-1234</td>
              <td className="py-3 px-4">Full</td>
              <td className="py-3 px-4">AWS Production</td>
              <td className="py-3 px-4">2023-07-15 09:30</td>
              <td className="py-3 px-4">45m 12s</td>
              <td className="py-3 px-4">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Completed</span>
              </td>
              <td className="py-3 px-4">12</td>
              <td className="py-3 px-4">
                <button className="text-blue-600 hover:text-blue-800">View Results</button>
              </td>
            </tr>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <td className="py-3 px-4">SCAN-1233</td>
              <td className="py-3 px-4">Quick</td>
              <td className="py-3 px-4">GitLab Repositories</td>
              <td className="py-3 px-4">2023-07-14 14:15</td>
              <td className="py-3 px-4">12m 05s</td>
              <td className="py-3 px-4">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Completed</span>
              </td>
              <td className="py-3 px-4">3</td>
              <td className="py-3 px-4">
                <button className="text-blue-600 hover:text-blue-800">View Results</button>
              </td>
            </tr>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <td className="py-3 px-4">SCAN-1232</td>
              <td className="py-3 px-4">Custom</td>
              <td className="py-3 px-4">API Gateway</td>
              <td className="py-3 px-4">2023-07-13 10:00</td>
              <td className="py-3 px-4">30m 47s</td>
              <td className="py-3 px-4">
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Partial</span>
              </td>
              <td className="py-3 px-4">8</td>
              <td className="py-3 px-4">
                <button className="text-blue-600 hover:text-blue-800">View Results</button>
              </td>
            </tr>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <td className="py-3 px-4">SCAN-1231</td>
              <td className="py-3 px-4">Full</td>
              <td className="py-3 px-4">All Resources</td>
              <td className="py-3 px-4">2023-07-10 00:00</td>
              <td className="py-3 px-4">1h 12m</td>
              <td className="py-3 px-4">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Completed</span>
              </td>
              <td className="py-3 px-4">24</td>
              <td className="py-3 px-4">
                <button className="text-blue-600 hover:text-blue-800">View Results</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Scheduled Scans */}
      <h2 className="text-xl font-bold mt-8 mb-4">Scheduled Scans</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full" style={{ color: 'var(--foreground)' }}>
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <th className="py-3 px-4 text-left">Name</th>
              <th className="py-3 px-4 text-left">Type</th>
              <th className="py-3 px-4 text-left">Target</th>
              <th className="py-3 px-4 text-left">Schedule</th>
              <th className="py-3 px-4 text-left">Last Run</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <td className="py-3 px-4">Daily AWS Scan</td>
              <td className="py-3 px-4">Quick</td>
              <td className="py-3 px-4">AWS Production</td>
              <td className="py-3 px-4">Daily at 01:00</td>
              <td className="py-3 px-4">2023-07-15 01:00</td>
              <td className="py-3 px-4">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>
              </td>
              <td className="py-3 px-4">
                <button className="text-blue-600 hover:text-blue-800 mr-2">Edit</button>
                <button className="text-red-600 hover:text-red-800">Disable</button>
              </td>
            </tr>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <td className="py-3 px-4">Weekly Full Scan</td>
              <td className="py-3 px-4">Full</td>
              <td className="py-3 px-4">All Resources</td>
              <td className="py-3 px-4">Sunday at 00:00</td>
              <td className="py-3 px-4">2023-07-09 00:00</td>
              <td className="py-3 px-4">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>
              </td>
              <td className="py-3 px-4">
                <button className="text-blue-600 hover:text-blue-800 mr-2">Edit</button>
                <button className="text-red-600 hover:text-red-800">Disable</button>
              </td>
            </tr>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <td className="py-3 px-4">Monthly Compliance Check</td>
              <td className="py-3 px-4">Compliance</td>
              <td className="py-3 px-4">All Resources</td>
              <td className="py-3 px-4">1st of month at 02:00</td>
              <td className="py-3 px-4">2023-07-01 02:00</td>
              <td className="py-3 px-4">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>
              </td>
              <td className="py-3 px-4">
                <button className="text-blue-600 hover:text-blue-800 mr-2">Edit</button>
                <button className="text-red-600 hover:text-red-800">Disable</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}