import { auth } from "@/lib/auth";
import Link from "next/link";

export default async function AdminPage() {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </header>

      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-8 w-full">
        <h2 className="text-2xl font-bold mb-4">Welcome to the Admin Area</h2>
        <p className="mb-4">
          This is a protected page that requires admin privileges. If you can see this, you have the necessary permissions.
        </p>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-yellow-700">
            <strong>Note:</strong> This page is only accessible to users with admin roles or super users.
          </p>
        </div>

        <h3 className="text-xl font-semibold mb-2">Your User Information:</h3>
        <ul className="list-disc pl-5 mb-6">
          <li><strong>Name:</strong> {session?.user?.name || "Not provided"}</li>
          <li><strong>Email:</strong> {session?.user?.email}</li>
          <li><strong>Super User:</strong> {session?.user?.isSuperUser ? "Yes" : "No"}</li>
          <li><strong>Roles:</strong> {session?.user?.roles?.map(role => role.name).join(", ") || "No roles"}</li>
        </ul>

        <div className="flex gap-4">
          <Link
            href="/"
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-base h-10 px-4"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
