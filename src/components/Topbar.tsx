"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import styles from './Topbar.module.css';
import { getTopbarMenusForUser } from "@/src/config/menuConfig";

export default function Topbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside of the profile dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    // Add event listener if dropdown is open
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);

  // If user is not authenticated, don't show the topbar
  if (!session?.user) {
    return null;
  }

  const isSuperUser = session.user.isSuperUser;
  const hasAdminRole = session.user.roles?.some(role => 
    role.name === "Super Admin" || role.name === "Admin"
  );
  const isAdmin = isSuperUser || hasAdminRole;

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  return (
    <div className={styles.topbar}>
      <div className="flex justify-between items-center px-4">
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/" className="text-xl font-bold" style={{ color: 'var(--primary-blue)' }}>
            OwlHub
          </Link>
        </div>

        {/* Center: Navigation Menu */}
        <div className="flex-1 flex justify-center">
          {/* Dynamically render topbar menu items based on user roles */}
          {getTopbarMenusForUser(isSuperUser, isAdmin).map((menu) => (
            <div 
              key={menu.path} 
              className={`relative ${
                menu.sidebarItems.some(item => pathname === item.path || pathname.startsWith(item.path)) || 
                (menu.name === 'Overview' && pathname === '/') ? styles.active : ''
              }`}
            >
              <Link
                href={menu.sidebarItems[0]?.path || menu.path}
                className={`flex items-center space-x-2 p-4 mx-2 my-2 rounded-md ${styles.navItem}`}
                aria-label={menu.name}
                style={{ color: 'var(--sidebar-text)' }}
              >
                <span className="font-medium">{menu.name}</span>
              </Link>
            </div>
          ))}
        </div>

        {/* Right side: Notification and Profile */}
        <div className="flex items-center space-x-4">
          {/* Notification Bell */}
          <button 
            className={`p-2 rounded-full relative ${styles.navItem}`}
            aria-label="Notifications"
            style={{ color: 'var(--sidebar-text)' }}
          >
            <span className="text-lg">🔔</span>
            {/* Notification indicator */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileDropdownRef}>
            <button 
              onClick={toggleProfile}
              className={`flex items-center space-x-2 p-2 rounded-full ${styles.navItem}`}
              aria-label="Profile menu"
              style={{ color: 'var(--sidebar-text)' }}
            >
              {session.user.image ? (
                <Image 
                  src={session.user.image} 
                  alt="Profile" 
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ 
                  background: 'var(--primary-blue)',
                  color: 'white'
                }}>
                  {session.user.name ? session.user.name[0].toUpperCase() : session.user.email?.[0].toUpperCase()}
                </div>
              )}
              <span className="hidden sm:inline-block">{session.user.name || session.user.email}</span>
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg z-50" style={{ 
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)'
              }}>
                <div className="p-3" style={{ 
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  <p className="font-medium" style={{ color: 'var(--foreground)' }}>{session.user.name || "User"}</p>
                  <p className="text-sm truncate" style={{ color: 'var(--foreground)', opacity: 0.7 }}>{session.user.email}</p>
                </div>
                <div className="py-1">
                  <Link 
                    href="/profile" 
                    className={`block px-4 py-2 text-sm ${styles.navItem} ${styles.profileDropdownItem}`}
                    style={{ color: 'var(--foreground)' }}
                    onClick={() => setIsProfileOpen(false)}
                  >
                    Profile
                  </Link>
                  <button 
                    onClick={() => signOut()}
                    className={`block w-full text-left px-4 py-2 text-sm ${styles.navItem} ${styles.profileDropdownItem}`}
                    style={{ color: 'var(--error)' }}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
