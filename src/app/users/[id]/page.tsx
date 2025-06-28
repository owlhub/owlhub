"use client";

import React, {useEffect, useState} from "react";
import Link from "next/link";
import {useRouter, notFound} from "next/navigation";
import {useSession} from "next-auth/react";
import UserStatusToggle from "../components/UserStatusToggle";
import IntegrationMembershipsTable from "./IntegrationMembershipsTable";
import { Role } from "@prisma/client";

interface UserRole {
  id: string;
  role: {
    id: string;
    name: string;
    description?: string;
  };
}

interface IntegrationMembership {
  id: string;
  integration: {
    name: string;
    app: {
      name: string;
      icon?: string | null;
    };
  };
}

interface User {
  id: string;
  name?: string | null;
  email: string;
  isActive: boolean;
  isSuperUser: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  emailVerified?: string | Date | null;
  image?: string | null;
  userRoles: UserRole[];
  integrationMemberships: IntegrationMembership[];
}

export default function UserDetailPage({
                                         params,
                                       }: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const {data: session, status} = useSession({
    required: true,
    onUnauthenticated: () => {
      router.push("/login?redirect=/users");
    },
  });

  const {id} = React.use(params);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the user by ID
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/users/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            notFound();
          }
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        // Transform the data to match the expected format
        const transformedUser = {
          ...data.user,
          userRoles: data.user.roles ? data.user.roles.map((role: Role) => ({
            id: `${data.user.id}-${role.id}`, // Generate a unique ID
            role: role
          })) : []
        };
        setUser(transformedUser);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch user:", err);
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

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
           <h1 className="text-3xl font-bold">User Details</h1>
           <p>Loading user details...</p>
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
           <p>Failed to load user details: {error}</p>
         </header>
         <Link
            href="/users"
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-[var(--primary-blue)] text-white gap-2 hover:bg-[var(--secondary-blue)] font-medium text-lg h-12 px-6 inline-block"
         >
           Back to Users
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

  // If the user doesn't exist or hasn't been loaded yet, don't render anything
  if (!user) {
    return null;
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
           <UserStatusToggle userId={user.id} isActive={user.isActive}/>
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
                     <li key={userRole.id}
                         className="bg-[var(--card-bg)] p-3 rounded-lg shadow-sm border border-[var(--border-color)]">
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
            <IntegrationMembershipsTable memberships={user.integrationMemberships}/>
         ) : (
            <p className="text-[var(--sidebar-text)] opacity-70">No integrations assigned</p>
         )}
       </div>
     </div>
  );
}
