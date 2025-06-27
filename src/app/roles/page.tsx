import { auth } from "@/auth";
import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import RoleManagement from "./components/RoleManagement";

export default async function RolesPage() {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

  // Check if the user is authenticated and has permission
  if (!session?.user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold mb-8">Unauthorized</h1>
        <p className="text-lg mb-8">
          You need to be logged in to view this page.
        </p>
        <Link
          href="/login"
          className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-lg h-12 px-6"
        >
          Sign In
        </Link>
      </div>
    );
  }

  // Only allow super users or users with admin roles to access the roles list
  const isSuperUser = session.user.isSuperUser;
  const hasAdminRole = session.user.roles && session.user.roles.some(role => 
    role.name === "Super Admin" || role.name === "Admin"
  );

  if (!isSuperUser && !hasAdminRole) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold mb-8">Access Denied</h1>
        <p className="text-lg mb-8">
          You do not have permission to view the roles list.
        </p>
        <Link
          href="/"
          className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-lg h-12 px-6"
        >
          Go to Home
        </Link>
      </div>
    );
  }

  // Fetch roles directly from the database (server component)
  const roles = await prisma.role.findMany({
    include: {
      pageRoles: {
        include: {
          page: true,
        },
      },
      userRoles: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Role Management</h1>
      </header>

      {/* Role Management Component */}
      <RoleManagement />

      {/* Display roles table */}
      <div className="w-full bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm mt-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">All Roles</h2>
          <p className="text-sm text-gray-500">Total: {roles.length} roles</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="py-3 px-4 text-left">Name</th>
                <th className="py-3 px-4 text-left">Description</th>
                <th className="py-3 px-4 text-left">Pages</th>
                <th className="py-3 px-4 text-left">Users</th>
                <th className="py-3 px-4 text-left">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-3 px-4 font-medium">{role.name}</td>
                  <td className="py-3 px-4">{role.description || "No description"}</td>
                  <td className="py-3 px-4">
                    {role.pageRoles.length > 0 ? (
                      <ul className="list-disc pl-5">
                        {role.pageRoles.map((pageRole) => (
                          <li key={pageRole.id}>{pageRole.page.name || pageRole.page.path}</li>
                        ))}
                      </ul>
                    ) : (
                      "No pages"
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {role.userRoles.length > 0 ? (
                      <ul className="list-disc pl-5">
                        {role.userRoles.map((userRole) => (
                          <li key={userRole.id}>{userRole.user.name || userRole.user.email}</li>
                        ))}
                      </ul>
                    ) : (
                      "No users"
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {(() => {
                      const date = new Date(role.createdAt);
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      return `${year}-${month}-${day}`;
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <Link
            href="/"
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-base h-10 px-4 w-fit"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
