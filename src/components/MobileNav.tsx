"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  // If user is not authenticated, don't show the navigation
  if (!session?.user) {
    return null;
  }

  // Use the session data directly
  const isSuperUser = session.user.isSuperUser;
  const hasAdminRole = session.user.roles?.some(role => 
    role.name === "Super Admin" || role.name === "Admin"
  );
  const isAdmin = isSuperUser || hasAdminRole;

  const navItems = [
    { name: "Home", path: "/", icon: "🏠" },
    ...(isAdmin ? [{ name: "Users", path: "/users", icon: "👥" }] : []),
    ...(isAdmin ? [{ name: "Roles", path: "/roles", icon: "🔑" }] : []),
    ...(isAdmin ? [{ name: "Admin", path: "/admin", icon: "⚙️" }] : []),
  ];

  // Find the most specific matching path
  let mostSpecificPath = "";
  navItems.forEach(item => {
    if (pathname === item.path || pathname.startsWith(`${item.path}/`)) {
      if (item.path.length > mostSpecificPath.length) {
        mostSpecificPath = item.path;
      }
    }
  });

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="md:hidden">
      <div className="flex justify-between items-center p-4" style={{ 
        background: 'var(--primary-blue)',
        color: 'white'
      }}>
        <div className="w-8"></div> {/* Empty div for spacing */}
        <button 
          onClick={toggleMenu}
          className="p-2 rounded-md text-white mobile-nav-toggle"
        >
          {isOpen ? "✕" : "☰"}
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-16 left-0 right-0 z-50 shadow-lg" style={{ 
          background: 'var(--sidebar-bg)',
          color: 'var(--sidebar-text)',
          font: 'var(--sidebar-font)'
        }}>
          <nav className="p-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    className={`flex items-center p-2 rounded-md transition-colors duration-150 w-full sidebar-nav-item ${
                      item.path === mostSpecificPath ? 'active' : ''
                    }`}
                    style={{ color: 'var(--sidebar-text)' }}
                    onClick={() => setIsOpen(false)}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
