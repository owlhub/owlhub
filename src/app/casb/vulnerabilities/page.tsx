import { auth } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CASBVulnerabilitiesPage() {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

  // Check if the user is authenticated
  if (!session?.user) {
    // Redirect to login page with the current URL as a parameter
    redirect("/?redirect=/casb/vulnerabilities");
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">CASB Vulnerabilities</h1>
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

      {/* Filters */}
      <div className="mb-8 p-6 rounded-lg shadow-sm" style={{ background: 'var(--card-bg)', color: 'var(--foreground)' }}>
        <h2 className="text-xl font-bold mb-4">Filter Vulnerabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block mb-2 text-sm font-medium">Severity</label>
            <select className="w-full p-2 border rounded-md" style={{ background: 'var(--input-bg)', color: 'var(--foreground)', borderColor: 'var(--border)' }}>
              <option>All Severities</option>
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium">Status</label>
            <select className="w-full p-2 border rounded-md" style={{ background: 'var(--input-bg)', color: 'var(--foreground)', borderColor: 'var(--border)' }}>
              <option>All Statuses</option>
              <option>Open</option>
              <option>In Progress</option>
              <option>Resolved</option>
              <option>Ignored</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium">Source</label>
            <select className="w-full p-2 border rounded-md" style={{ background: 'var(--input-bg)', color: 'var(--foreground)', borderColor: 'var(--border)' }}>
              <option>All Sources</option>
              <option>GitLab Security Scanner</option>
              <option>AWS Security Hub</option>
              <option>Manual Assessment</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium">Date Range</label>
            <select className="w-full p-2 border rounded-md" style={{ background: 'var(--input-bg)', color: 'var(--foreground)', borderColor: 'var(--border)' }}>
              <option>All Time</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
              <option>Custom Range</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Vulnerabilities Table */}
      <h2 className="text-xl font-bold mb-4">Vulnerabilities</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full" style={{ color: 'var(--foreground)' }}>
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <th className="py-3 px-4 text-left">ID</th>
              <th className="py-3 px-4 text-left">Title</th>
              <th className="py-3 px-4 text-left">Severity</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-left">Source</th>
              <th className="py-3 px-4 text-left">Detected</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <td className="py-3 px-4">VUL-1001</td>
              <td className="py-3 px-4">Unencrypted S3 Bucket</td>
              <td className="py-3 px-4">
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Critical</span>
              </td>
              <td className="py-3 px-4">Open</td>
              <td className="py-3 px-4">AWS Security Hub</td>
              <td className="py-3 px-4">2023-07-15</td>
              <td className="py-3 px-4">
                <button className="text-blue-600 hover:text-blue-800 mr-2">View</button>
                <button className="text-green-600 hover:text-green-800">Resolve</button>
              </td>
            </tr>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <td className="py-3 px-4">VUL-1002</td>
              <td className="py-3 px-4">Outdated Dependencies</td>
              <td className="py-3 px-4">
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">High</span>
              </td>
              <td className="py-3 px-4">In Progress</td>
              <td className="py-3 px-4">GitLab Security Scanner</td>
              <td className="py-3 px-4">2023-07-14</td>
              <td className="py-3 px-4">
                <button className="text-blue-600 hover:text-blue-800 mr-2">View</button>
                <button className="text-green-600 hover:text-green-800">Resolve</button>
              </td>
            </tr>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <td className="py-3 px-4">VUL-1003</td>
              <td className="py-3 px-4">Insecure API Endpoint</td>
              <td className="py-3 px-4">
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">High</span>
              </td>
              <td className="py-3 px-4">Open</td>
              <td className="py-3 px-4">Manual Assessment</td>
              <td className="py-3 px-4">2023-07-12</td>
              <td className="py-3 px-4">
                <button className="text-blue-600 hover:text-blue-800 mr-2">View</button>
                <button className="text-green-600 hover:text-green-800">Resolve</button>
              </td>
            </tr>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <td className="py-3 px-4">VUL-1004</td>
              <td className="py-3 px-4">Missing IAM Password Policy</td>
              <td className="py-3 px-4">
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Medium</span>
              </td>
              <td className="py-3 px-4">Resolved</td>
              <td className="py-3 px-4">AWS Security Hub</td>
              <td className="py-3 px-4">2023-07-10</td>
              <td className="py-3 px-4">
                <button className="text-blue-600 hover:text-blue-800 mr-2">View</button>
                <button className="text-gray-600 hover:text-gray-800">Reopen</button>
              </td>
            </tr>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <td className="py-3 px-4">VUL-1005</td>
              <td className="py-3 px-4">Cross-Site Scripting (XSS)</td>
              <td className="py-3 px-4">
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">High</span>
              </td>
              <td className="py-3 px-4">Ignored</td>
              <td className="py-3 px-4">GitLab Security Scanner</td>
              <td className="py-3 px-4">2023-07-05</td>
              <td className="py-3 px-4">
                <button className="text-blue-600 hover:text-blue-800 mr-2">View</button>
                <button className="text-gray-600 hover:text-gray-800">Unignore</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-between items-center">
        <div style={{ color: 'var(--foreground)', opacity: 0.7 }}>
          Showing 1-5 of 24 vulnerabilities
        </div>
        <div className="flex space-x-2">
          <button className="px-3 py-1 border rounded-md" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>Previous</button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded-md">1</button>
          <button className="px-3 py-1 border rounded-md" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>2</button>
          <button className="px-3 py-1 border rounded-md" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>3</button>
          <button className="px-3 py-1 border rounded-md" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>Next</button>
        </div>
      </div>
    </div>
  );
}