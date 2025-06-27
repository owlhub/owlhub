import { auth } from "@/auth";
import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import {notFound, redirect} from "next/navigation";
import UserStatusToggle from "../components/UserStatusToggle";
import IntegrationMembershipsTable from "./IntegrationMembershipsTable";

export default async function UserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

  // Check if the user is authenticated and has permission
  if (!session?.user) {
    // Redirect to home page with the current URL as a parameter
    redirect("/?redirect=/users");
  }

  // Only allow super users or users with admin roles to access user details
  const isSuperUser = session.user.isSuperUser;
  const hasAdminRole = session.user.roles && session.user.roles.some(role => 
    role.name === "Super Admin" || role.name === "Admin"
  );

  if (!isSuperUser && !hasAdminRole) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold mb-8">Access Denied</h1>
        <p className="text-lg mb-8">
          You do not have permission to view user details.
        </p>
        <Link
          href="/"
          className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-[var(--primary-blue)] text-white gap-2 hover:bg-[var(--secondary-blue)] font-medium text-lg h-12 px-6"
        >
          Go to Home
        </Link>
      </div>
    );
  }

  // Fetch the user by ID
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
      integrationMemberships: {
        include: {
          integration: {
            include: {
              appType: true,
            },
          },
        },
      },
    },
  });

  // If the user doesn't exist, show a 404 page
  if (!user) {
    notFound();
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">User Details</h1>
          <Link
            href="/users"
            className="rounded-full border border-solid border-[var(--border-color)] transition-colors flex items-center justify-center hover:bg-[var(--sidebar-hover)] hover:border-transparent font-medium text-base h-10 px-4"
          >
            Back to Users
          </Link>
        </div>
      </header>

      <div className="w-full bg-[var(--sidebar-bg)] p-6 rounded-lg shadow-sm border border-[var(--border-color)] mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{user.name || user.email}</h2>
          <UserStatusToggle userId={user.id} isActive={user.isActive} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">Basic Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-[var(--sidebar-text)] opacity-70">ID</p>
                <p className="font-medium">{user.id}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--sidebar-text)] opacity-70">Name</p>
                <p className="font-medium">{user.name || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--sidebar-text)] opacity-70">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--sidebar-text)] opacity-70">Status</p>
                <p className="font-medium">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.isActive 
                      ? "bg-[#e3f5ea] text-[var(--success)]" 
                      : "bg-[#ffebe6] text-[var(--error)]"
                  }`}>
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--sidebar-text)] opacity-70">Super User</p>
                <p className="font-medium">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.isSuperUser 
                      ? "bg-[#e0e8ff] text-[var(--primary-blue)]" 
                      : "bg-[var(--sidebar-hover)] text-[var(--sidebar-text)]"
                  }`}>
                    {user.isSuperUser ? "Yes" : "No"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Roles</h3>
            {user.userRoles.length > 0 ? (
              <ul className="space-y-2">
                {user.userRoles.map((userRole) => (
                  <li key={userRole.id} className="bg-[var(--card-bg)] p-3 rounded-lg shadow-sm border border-[var(--border-color)]">
                    <p className="font-medium">{userRole.role.name}</p>
                    {userRole.role.description && (
                      <p className="text-sm text-[var(--sidebar-text)] opacity-70">{userRole.role.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[var(--sidebar-text)] opacity-70">No roles assigned</p>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
          <h3 className="text-xl font-semibold mb-4">Account Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[var(--sidebar-text)] opacity-70">Created At</p>
              <p className="font-medium">
                {(() => {
                  const date = new Date(user.createdAt);
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const hours = String(date.getHours()).padStart(2, '0');
                  const minutes = String(date.getMinutes()).padStart(2, '0');
                  const seconds = String(date.getSeconds()).padStart(2, '0');
                  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                })()}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--sidebar-text)] opacity-70">Last Updated</p>
              <p className="font-medium">
                {(() => {
                  const date = new Date(user.updatedAt);
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const hours = String(date.getHours()).padStart(2, '0');
                  const minutes = String(date.getMinutes()).padStart(2, '0');
                  const seconds = String(date.getSeconds()).padStart(2, '0');
                  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                })()}
              </p>
            </div>
            {user.emailVerified && (
              <div>
                <p className="text-sm text-[var(--sidebar-text)] opacity-70">Email Verified</p>
                <p className="font-medium">
                  {(() => {
                    const date = new Date(user.emailVerified);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    const seconds = String(date.getSeconds()).padStart(2, '0');
                    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                  })()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">List of integration user is member of.</h3>
        {user.integrationMemberships.length > 0 ? (
          <IntegrationMembershipsTable memberships={user.integrationMemberships} />
        ) : (
          <p className="text-[var(--sidebar-text)] opacity-70">No integrations assigned</p>
        )}
      </div>
    </div>
  );
}
