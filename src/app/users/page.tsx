import { auth } from "@/auth";
import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import UsersTable from "./components/UsersTable";
import {redirect} from "next/navigation";

export default async function UsersPage() {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

  // Check if the user is authenticated
  if (!session?.user) {
    // Redirect to home page with the current URL as a parameter
    redirect("/?redirect=/users");
  }

  // Only allow super users or users with admin roles to access the user list
  // Use the session data directly
  const isSuperUser = session.user.isSuperUser;
  const hasAdminRole = session.user.roles && session.user.roles.some(role => 
    role.name === "Super Admin" || role.name === "Admin"
  );

  if (!isSuperUser && !hasAdminRole) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold mb-8">Access Denied</h1>
        <p className="text-lg mb-8">
          You do not have permission to view the user list.
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

  // Fetch users directly from the database (server component)
  const users = await prisma.user.findMany({
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h3 className="text-3xl font-bold">Users</h3>
        <p>Users are anyone who have access to your organization applications.</p>
      </header>

      <UsersTable users={users} rowsPerPage={20} />
    </div>
  );
}
