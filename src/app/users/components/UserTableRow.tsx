"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserTableRowProps {
  user: {
    id: string;
    name?: string | null;
    email: string;
    isActive: boolean;
    isSuperUser: boolean;
    createdAt: Date;
    userRoles: {
      id: string;
      role: {
        id: string;
        name: string;
      };
    }[];
  };
}

export default function UserTableRow({ user }: UserTableRowProps) {
  const router = useRouter();

  const handleRowClick = () => {
    router.push(`/users/${user.id}`);
  };

  return (
    <tr 
      key={user.id} 
      className="hover:bg-[var(--sidebar-hover)] cursor-pointer" 
      onClick={handleRowClick}
    >
      <td className="py-3 px-4">
        <Link href={`/users/${user.id}`} className="text-[var(--primary-blue)] hover:underline">
          {user.name || "Not provided"}
        </Link>
      </td>
      <td className="py-3 px-4">{user.email}</td>
      <td className="py-3 px-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          user.isActive 
            ? "bg-[#e3f5ea] text-[var(--success)]" 
            : "bg-[#ffebe6] text-[var(--error)]"
        }`}>
          {user.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="py-3 px-4">{user.isSuperUser ? "Yes" : "No"}</td>
      <td className="py-3 px-4">
        {user.userRoles.length > 0 ? (
          <ul className="list-disc pl-5">
            {user.userRoles.map((userRole) => (
              <li key={userRole.id}>{userRole.role.name}</li>
            ))}
          </ul>
        ) : (
          "No roles"
        )}
      </td>
      <td className="py-3 px-4">
        {(() => {
          const date = new Date(user.createdAt);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })()}
      </td>
    </tr>
  );
}
