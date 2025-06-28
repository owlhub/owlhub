import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";

export const { auth, signIn, signOut, handlers } = NextAuth(authConfig);

// Helper function to check if a user has access to a specific page
export async function hasPageAccess(session: any, userId: string, pagePath: string): Promise<boolean> {
  console.log(session);
  if (!userId) return false;

  // Check if the user is a super user from the session
  if (session?.user?.isSuperUser) return true;

  // Fallback to database check if session doesn't have the information
  if (session?.user?.isSuperUser === undefined) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperUser: true },
    });

    if (user?.isSuperUser) return true;
  }

  // Find the page
  const page = await prisma.page.findUnique({
    where: { path: pagePath },
    include: {
      pageRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!page) {
    // If the page doesn't exist in the database, create it
    await prisma.page.create({
      data: {
        path: pagePath,
        name: pagePath.split('/').pop() || pagePath,
      },
    });
    return false; // New page, no roles assigned yet
  }

  // Get user roles
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: true,
    },
  });

  const userRoleIds = userRoles.map(ur => ur.roleId);

  // Check if any of the user's roles have access to this page
  const hasAccess = page.pageRoles.some(pr => userRoleIds.includes(pr.roleId));

  return hasAccess;
}

// Helper function to get all pages a user has access to
export async function getUserAccessiblePages(userId: string, session?: any): Promise<string[]> {
  if (!userId) return [];

  // Check if the user is a super user from the session
  if (session?.user?.isSuperUser) {
    // Super users have access to all pages
    const allPages = await prisma.page.findMany();
    return allPages.map(page => page.path);
  }

  // Fallback to database check if session doesn't have the information or is not provided
  if (!session || session?.user?.isSuperUser === undefined) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperUser: true },
    });

    if (user?.isSuperUser) {
      // Super users have access to all pages
      const allPages = await prisma.page.findMany();
      return allPages.map(page => page.path);
    }
  }

  // Get user roles
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    select: { roleId: true },
  });

  const userRoleIds = userRoles.map(ur => ur.roleId);

  // Get pages that the user's roles have access to
  const pageRoles = await prisma.pageRole.findMany({
    where: {
      roleId: {
        in: userRoleIds,
      },
    },
    include: {
      page: true,
    },
  });

  return pageRoles.map(pr => pr.page.path);
}
