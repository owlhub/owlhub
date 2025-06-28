"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import UsersTable from "./components/UsersTable";
import {useSession} from "next-auth/react";

export default function UsersPage() {
  const router = useRouter();
  const {data: session, status} = useSession({
    required: true,
    onUnauthenticated: () => {
      router.push("/login?redirect=/users");
    },
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch users from the API
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/users');

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        // Transform the data to match the expected format for UsersTable
        const transformedUsers = data.users.map(user => ({
          ...user,
          userRoles: user.roles ? user.roles.map(role => ({
            id: `${user.id}-${role.id}`, // Generate a unique ID
            role: role
          })) : []
        }));
        setUsers(transformedUsers);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch users:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (status === "loading") {
    return (
       <></>
    );
  }

  // Show loading state
  if (loading) {
    return (
       <div className="p-8 max-w-6xl mx-auto">
         <header className="mb-8">
           <h3 className="text-3xl font-bold">Users</h3>
           <p>Loading users...</p>
         </header>
       </div>
    );
  }

  // Show error state
  if (error) {
    return (
       <div className="p-8 max-w-6xl mx-auto">
         <header className="mb-8">
           <h3 className="text-3xl font-bold">Error</h3>
           <p>Failed to load users: {error}</p>
         </header>
         <Link
            href="/"
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-[var(--primary-blue)] text-white gap-2 hover:bg-[var(--secondary-blue)] font-medium text-lg h-12 px-6 inline-block"
         >
           Go to Home
         </Link>
       </div>
    );
  }

  // Show access denied if the user doesn't have permission
  if (status === "authenticated" &&
     !session.user.isSuperUser &&
     !(session.user.roles && session.user.roles.some(role =>
        role.name === "Super Admin" || role.name === "Admin"
     ))) {
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

  return (
     <div className="p-8 max-w-6xl mx-auto">
       <header className="mb-8">
         <h3 className="text-3xl font-bold">Users</h3>
         <p>Users are anyone who have access to your organization applications.</p>
       </header>

       <UsersTable users={users} rowsPerPage={20}/>
     </div>
  );
}
