"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { TopbarMenu, topbarMenus } from "@/src/config/menuConfig";

interface BreadcrumbItem {
  name: string;
  path: string;
  isActive: boolean;
}

export default function Breadcrumb() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // If user is not authenticated, don't show the breadcrumb
  if (!session?.user) {
    return null;
  }

  const isSuperUser = session.user.isSuperUser;
  const hasAdminRole = session.user.roles?.some(role => 
    role.name === "Super Admin" || role.name === "Admin"
  );
  const isAdmin = isSuperUser || hasAdminRole;

  // Generate breadcrumb items based on the current path
  const breadcrumbItems = generateBreadcrumbItems(pathname, isSuperUser, isAdmin);

  if (breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center text-sm px-4 py-2" style={{ background: 'var(--background)' }}>
      {breadcrumbItems.map((item, index) => (
        <div key={`${item.path}-${index}`} className="flex items-center">
          {index > 0 && <span className="mx-2 text-gray-500">/</span>}
          {item.isActive ? (
            <span className="text-gray-700">{item.name}</span>
          ) : (
            <Link href={item.path} className="text-gray-500 hover:text-gray-700">
              {item.name}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

function generateBreadcrumbItems(pathname: string, isSuperUser: boolean, isAdmin: boolean): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [];

  // Filter topbar menus based on user roles
  const filteredTopbarMenus = topbarMenus.filter(menu => 
    (menu.requiredRole === 'any' || 
    (menu.requiredRole === 'admin' && isAdmin) || 
    (menu.requiredRole === 'superuser' && isSuperUser))
  );

  // Find which topbar menu is active based on the sidebar items' paths
  const activeTopbarMenu = filteredTopbarMenus.find(menu => 
    menu.sidebarItems.some(item => pathname === item.path || pathname.startsWith(item.path + "/"))
  );

  if (activeTopbarMenu) {
    // Add the topbar menu item
    items.push({
      name: activeTopbarMenu.name,
      path: activeTopbarMenu.path,
      isActive: pathname === activeTopbarMenu.path
    });

    // Find the active sidebar item
    const activeSidebarItem = activeTopbarMenu.sidebarItems.find(item => 
      pathname === item.path || pathname.startsWith(item.path + "/")
    );

    if (activeSidebarItem) {
      // Always add the sidebar item, even if it's the same as the topbar menu path
      items.push({
        name: activeSidebarItem.name,
        path: activeSidebarItem.path,
        isActive: pathname === activeSidebarItem.path
      });
    }

    // If the current path is deeper than the sidebar item, add additional segments
    if (activeSidebarItem && pathname !== activeSidebarItem.path) {
      const remainingPath = pathname.slice(activeSidebarItem.path.length);
      const segments = remainingPath.split('/').filter(Boolean);

      if (segments.length > 0) {
        let currentPath = activeSidebarItem.path;

        segments.forEach((segment, index) => {
          currentPath += `/${segment}`;
          items.push({
            name: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
            path: currentPath,
            isActive: index === segments.length - 1
          });
        });
      }
    }
  }

  return items;
}
