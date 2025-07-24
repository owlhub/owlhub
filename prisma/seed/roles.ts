import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define predefined roles with permissions
const predefinedRoles = [
  {
    name: "Super Administrator - All Privileges",
    description: "Can edit any OwlHub setting, and manage memberships. Super Administrators can revoke the access of other Super Administrators.",
    permissions: {
      integration: {
        read: true,
        edit: true,
        install: true
      },
      member: {
        read: true,
        edit: true
      }
    }
  },
  {
    name: "Administrator",
    description: "Can access the full account, except for membership management.",
    permissions: {
      integration: {
        read: true,
        edit: true,
        install: true
      },
      member: {
        read: true,
        edit: false
      }
    }
  },
  {
    name: "Administrator Read Only",
    description: "Can access the full account in read only mode",
    permissions: {
      integration: {
        read: true,
        edit: false,
        install: false
      },
      member: {
        read: true,
        edit: false
      }
    }
  },
];

// Function to seed predefined roles
export async function seedPredefinedRoles() {
  try {
    console.log("Seeding predefined roles...");

    for (const roleData of predefinedRoles) {
      // Check if role already exists
      let existingRole = await prisma.role.findUnique({
        where: { name: roleData.name }
      });

      if (existingRole) {
        // Update existing role with permissions
        existingRole = await prisma.role.update({
          where: { id: existingRole.id },
          data: {
            description: roleData.description,
            permissions: roleData.permissions
          }
        });
        console.log(`Updated role: ${existingRole.name}`);
      } else {
        // Create new role
        const newRole = await prisma.role.create({
          data: roleData
        });
        console.log(`Created role: ${newRole.name}`);
      }
    }

    console.log("Predefined roles seeded successfully.");
  } catch (error) {
    console.error("Error seeding predefined roles:", error);
  }
}

// Function to find the Super Administrator role
export async function findOrCreateSuperAdminRole() {
  let superAdminRole = await prisma.role.findUnique({
    where: { name: "Super Administrator - All Privileges" }
  });

  if (!superAdminRole) {
    console.log("Super Administrator role not found. Roles should be created earlier by seedPredefinedRoles.");
  } else {
    console.log("Super Administrator role already exists.");
  }

  return superAdminRole;
}

// Function to assign Super Admin role to a user
export async function assignSuperAdminRoleToUser(userId: string) {
  const superAdminRole = await findOrCreateSuperAdminRole();

  if (!superAdminRole) {
    console.error("Cannot assign Super Administrator role: role not found");
    return;
  }

  // Check if the user already has the Super Admin role
  const existingUserRole = await prisma.userRole.findFirst({
    where: {
      userId: userId,
      roleId: superAdminRole.id
    }
  });

  if (existingUserRole) {
    console.log("The user already has the Super Administrator role.");
    return;
  }

  // Assign the Super Admin role to the user
  await prisma.userRole.create({
    data: {
      userId: userId,
      roleId: superAdminRole.id
    }
  });
  console.log("Assigned the Super Administrator role to the user.");
}
