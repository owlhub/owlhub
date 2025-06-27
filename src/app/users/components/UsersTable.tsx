"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Table from "@/src/components/Table";
import { useState, useCallback } from "react";

interface UserRole {
  id: string;
  role: {
    id: string;
    name: string;
  };
}

interface User {
  id: string;
  name?: string | null;
  email: string;
  isActive: boolean;
  isSuperUser: boolean;
  createdAt: Date;
  userRoles: UserRole[];
}

interface UsersTableProps {
  users: User[];
  rowsPerPage?: number;
}

export default function UsersTable({ users, rowsPerPage = 10 }: UsersTableProps) {
  const router = useRouter();
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  const handleRowClick = (user: User) => {
    router.push(`/users/${user.id}`);
  };

  const handleSelectionChange = useCallback((selected: User[]) => {
    setSelectedUsers(selected);
    console.log('Selected users:', selected.length);
  }, []);

  const columns = [
    {
      header: "Name",
      accessor: (user: User) => (
        <Link href={`/users/${user.id}`} className="text-[var(--primary-blue)] hover:underline" onClick={(e) => e.stopPropagation()}>
          {user.name || "Not provided"}
        </Link>
      ),
      sortable: true,
      sortKey: "name" as keyof User,
      width: "150px",
    },
    {
      header: "Email",
      accessor: "email" as keyof User,
      sortable: true,
      width: "200px",
    },
    {
      header: "Status",
      accessor: (user: User) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          user.isActive 
            ? "bg-[#e3f5ea] text-[var(--success)]" 
            : "bg-[#ffebe6] text-[var(--error)]"
        }`}>
          {user.isActive ? "Active" : "Inactive"}
        </span>
      ),
      sortable: false,
      sortKey: "isActive" as keyof User,
      width: "100px",
    },
    {
      header: "Super User",
      accessor: (user: User) => (user.isSuperUser ? "Yes" : "No"),
      sortable: false,
      sortKey: "isSuperUser" as keyof User,
      width: "100px",
    },
    {
      header: "Roles",
      accessor: (user: User) => (
        user.userRoles.length > 0 ? (
          <ul className="list-disc pl-5">
            {user.userRoles.map((userRole) => (
              <li key={userRole.id}>{userRole.role.name}</li>
            ))}
          </ul>
        ) : (
          "No roles"
        )
      ),
      // Not sortable as it's a complex nested structure
      width: "180px",
    },
    {
      header: "Created At",
      accessor: (user: User) => {
        const date = new Date(user.createdAt);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      },
      sortable: true,
      sortKey: "createdAt" as keyof User,
      width: "120px",
    },
  ];

  return (
    <div>
      {selectedUsers.length > 0 && (
        <div className="mb-4 p-2 bg-opacity-10 rounded flex justify-between items-center">
          <span>{selectedUsers.length} users selected</span>
          <button 
            onClick={() => setSelectedUsers([])} 
            className="text-sm text-[var(--primary-blue)] hover:text-[var(--secondary-blue)] flex items-center"
            aria-label="Clear selection"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <Table
        data={users}
        columns={columns}
        onRowClick={handleRowClick}
        keyExtractor={(user) => user.id}
        defaultRowsPerPage={rowsPerPage}
        emptyMessage="No users found"
        selectable={true}
        onSelectionChange={handleSelectionChange}
        selectedItems={selectedUsers}
      />
    </div>
  );
}
