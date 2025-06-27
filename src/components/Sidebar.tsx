"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { getSidebarItemsForPath } from "@/src/config/menuConfig";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  // If user is not authenticated, don't show the sidebar
  if (!session?.user) {
    return null;
  }

  // Use the session data directly
  const isSuperUser = session.user.isSuperUser;
  const hasAdminRole = session.user.roles?.some(role => 
    role.name === "Super Admin" || role.name === "Admin"
  );
  const isAdmin = isSuperUser || hasAdminRole;

  // Get navigation items from the centralized configuration
  const navItems = getSidebarItemsForPath(pathname, isSuperUser, isAdmin);

  // Find the most specific matching path
  let mostSpecificPath = "";
  navItems.forEach(item => {
    if (pathname === item.path || pathname.startsWith(`${item.path}/`)) {
      if (item.path.length > mostSpecificPath.length) {
        mostSpecificPath = item.path;
      }
    }
  });

  return (
    <div className="h-full w-64 flex flex-col" style={{ 
      background: 'var(--sidebar-bg)',
      color: 'var(--sidebar-text)',
      font: 'var(--sidebar-font)'
    }}>
      {/* Navigation section */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                href={item.path}
                className={`flex items-center p-2 rounded-md transition-colors duration-150 w-full sidebar-nav-item ${
                  item.path === mostSpecificPath ? 'active' : ''
                }`}
                style={{ 
                  color: 'var(--sidebar-text)'
                }}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
