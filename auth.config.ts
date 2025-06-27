import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/src/lib/prisma";
import { Role, User } from "@prisma/client";

// Create a custom adapter that extends the PrismaAdapter
function CustomPrismaAdapter(p: typeof prisma) {
  const adapter = PrismaAdapter(p);

  return {
    ...adapter,
    createUser: async (data: any) => {
      // Create the user first
      if (!adapter.createUser) {
        throw new Error("createUser method is not defined in the adapter");
      }
      const user = await adapter.createUser(data);

      // If user creation failed, throw an error
      if (!user) {
        throw new Error("Failed to create user");
      }

      // Check if this is the first user (count should be 1 if this is the first user)
      const userCount = await p.user.count();

      if (userCount === 1) {
        console.log("First user detected, making them a super user");

        // This is the first user, make them a super user
        await p.user.update({
          where: { id: user.id },
          data: { isSuperUser: true },
        });

        // Create a super admin role if it doesn't exist
        let superAdminRole = await p.role.findUnique({
          where: { name: "Super Admin" },
        });

        if (!superAdminRole) {
          superAdminRole = await p.role.create({
            data: {
              name: "Super Admin",
              description: "Has access to all pages and features",
            },
          });
        }

        // Assign the super admin role to the first user
        await p.userRole.create({
          data: {
            userId: user.id,
            roleId: superAdminRole.id,
          },
        });

        // Return the updated user
        const updatedUser = await p.user.findUnique({
          where: { id: user.id },
        });

        // If we couldn't find the updated user, throw an error
        if (!updatedUser) {
          throw new Error("Failed to retrieve updated user");
        }

        return updatedUser;
      }

      return user;
    },
  };
};

export const authConfig: NextAuthConfig = {
  adapter: CustomPrismaAdapter(prisma),
  providers: [
    {
      id: "oidc",
      name: "OIDC Provider",
      type: "oidc",
      issuer: process.env.OIDC_ISSUER,
      clientId: process.env.OIDC_CLIENT_ID,
      clientSecret: process.env.OIDC_CLIENT_SECRET,
      wellKnown: `${process.env.OIDC_ISSUER}/.well-known/openid-configuration`,
      authorization: { 
        params: { 
          scope: "openid email profile",
          // Explicitly set the redirect_uri to match what's registered with the OIDC provider
          redirect_uri: process.env.NEXTAUTH_URL + "/api/auth/callback/oidc"
        } 
      },
      idToken: true,
      checks: ["pkce", "state"],
      // Allow linking accounts with the same email address
      // This prevents the "OAuthAccountNotLinked" error
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          // Don't use profile.sub as the user ID
          // Instead, let the adapter generate a random ID
          // This ensures that if we change OIDC providers, users can still be mapped by email
          name: profile.name ?? profile.preferred_username,
          email: profile.email,
          image: profile.picture,
        };
      },
    },
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Log authentication information for debugging
      console.log("SignIn callback called with:");
      console.log("- User:", user ? JSON.stringify(user, null, 2) : "No user");
      console.log("- Account:", account ? JSON.stringify(account, null, 2) : "No account");
      console.log("- Profile:", profile ? JSON.stringify(profile, null, 2) : "No profile");

      // The first user will be made a super user by the custom adapter
      // when they are created in the database
      return true;
    },
    async session({ session, user }) {
      console.log("Session callback called with user:", JSON.stringify(user, null, 2));
      console.log("Current session:", JSON.stringify(session, null, 2));

      if (session.user && user) {
        try {
          // Add user ID to the session
          session.user.id = user.id;

          // Get the latest user data from the database
          const userFromDb = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
              userRoles: {
                include: {
                  role: true,
                },
              },
            },
          });

          if (userFromDb) {
            console.log(`Session update for user ${user.id}: isSuperUser=${userFromDb.isSuperUser}, roles=${userFromDb.userRoles.length}`);
            // Add super user status and roles to the session
            session.user.isSuperUser = userFromDb.isSuperUser;
            session.user.roles = userFromDb.userRoles.map(ur => ur.role);
            console.log("Updated session:", JSON.stringify(session, null, 2));
          } else {
            console.warn(`User ${user.id} not found in database during session update`);
            // Set default values to prevent errors
            session.user.isSuperUser = false;
            session.user.roles = [];
          }
        } catch (error) {
          console.error("Error updating session:", error);
          // Set default values to prevent errors
          session.user.isSuperUser = false;
          session.user.roles = [];
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/error",
  },
  session: {
    strategy: "database",
    // Set a shorter maxAge to ensure the session is refreshed more frequently
    // This helps keep the session data in sync with the database
    maxAge: 1 * 60 * 60, // 12 hours in seconds
  },
  debug: process.env.NODE_ENV === "development",
};

// For TypeScript
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isSuperUser: boolean;
      roles: Role[];
    };
  }
}
