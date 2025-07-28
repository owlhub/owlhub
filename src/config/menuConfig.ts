// Menu configuration for the application
// This file centralizes all menu definitions to make them easier to manage and modify

// Define types for menu items
export interface MenuItem {
  name: string;
  path: string;
  icon?: string;
  requiredRole?: 'admin' | 'superuser' | 'any';
}

export interface TopbarMenu {
  name: string;
  path: string;
  requiredRole?: 'admin' | 'superuser' | 'any';
  sidebarItems: MenuItem[];
}

// Define the base topbar menus configuration
const baseTopbarMenus: Omit<TopbarMenu, 'path'>[] = [
  {
    name: "Overview",
    requiredRole: "any", // Visible to all authenticated users
    sidebarItems: [
      { name: "Dashboard", path: "/dashboard", icon: "📊" },
      { name: "Reports", path: "/overview/reports", icon: "📝" },
      { name: "Analytics", path: "/overview/analytics", icon: "📈" }
    ]
  },
  {
    name: "Directory",
    requiredRole: "admin", // Only visible to admin users
    sidebarItems: [
      { name: "Users", path: "/users", icon: "👥" },
      { name: "Roles", path: "/roles", icon: "🔑" },
      { name: "Departments", path: "/departments", icon: "🏢" }
    ]
  },
  {
    name: "CASB",
    requiredRole: "any", // Visible to all authenticated users
    sidebarItems: [
      { name: "Overview",  path: "/casb" },
      { name: "Posture Findings", path: "/casb/posture-findings", icon: "🔒" },
      { name: "Integrations", path: "/integrations", icon: "🔌" }
    ]
  },
  {
    name: "Settings",
    requiredRole: "superuser", // Only visible to superusers
    sidebarItems: [
      { name: "Admin", path: "/admin", icon: "⚙️", requiredRole: "admin" },
      { name: "User Management", path: "/settings/users", icon: "👤" },
      { name: "System", path: "/settings/system", icon: "🖥️" }
    ]
  }
];

// Dynamically set the path of each topbar menu to the path of its first sidebar item
export const topbarMenus: TopbarMenu[] = baseTopbarMenus.map(menu => ({
  ...menu,
  path: menu.sidebarItems.length > 0 ? menu.sidebarItems[0].path : '/'
}));


// Helper function to get sidebar items for the current path
export function getSidebarItemsForPath(pathname: string, isSuperUser: boolean, isAdmin: boolean): MenuItem[] {
  // Initialize empty items array
  const items: MenuItem[] = [];

  // Find which topbar menu is active based on the sidebar items' paths
  const activeMenu = topbarMenus.find(menu => 
    menu.sidebarItems.some(item => pathname === item.path || pathname.startsWith(item.path)) || 
    (menu.name === "Overview" && pathname === "/")
  );

  // If an active menu is found, add its sidebar items if the user has the required role
  if (activeMenu) {
    if (
      activeMenu.requiredRole === 'any' || 
      (activeMenu.requiredRole === 'admin' && isAdmin) || 
      (activeMenu.requiredRole === 'superuser' && isSuperUser)
    ) {
      items.push(...activeMenu.sidebarItems);
    }
  }

  return items;
}

// Helper function to filter topbar menus based on user roles and sidebar items
export function getTopbarMenusForUser(isSuperUser: boolean, isAdmin: boolean): TopbarMenu[] {
  return topbarMenus.filter(menu => 
    // Check if user has required role
    (menu.requiredRole === 'any' || 
    (menu.requiredRole === 'admin' && isAdmin) || 
    (menu.requiredRole === 'superuser' && isSuperUser)) &&
    // Check if menu has sidebar items
    menu.sidebarItems.length > 0
  );
}
