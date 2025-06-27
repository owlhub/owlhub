import { prisma } from "@/lib/prisma";

async function makeFirstUserSuperUser() {
  try {
    console.log("Finding the first user...");
    
    // Find the first user by sorting by createdAt timestamp
    const firstUser = await prisma.user.findFirst({
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (!firstUser) {
      console.error("No users found in the database.");
      return;
    }

    console.log(`Found first user: ${firstUser.name || firstUser.email} (${firstUser.id})`);
    
    // Check if the user is already a super user
    if (firstUser.isSuperUser) {
      console.log("The first user is already a super user.");
    } else {
      // Update the user to be a super user
      await prisma.user.update({
        where: { id: firstUser.id },
        data: { isSuperUser: true }
      });
      console.log("Updated the first user to be a super user.");
    }

    // Find or create the Super Admin role
    let superAdminRole = await prisma.role.findUnique({
      where: { name: "Super Admin" }
    });

    if (!superAdminRole) {
      superAdminRole = await prisma.role.create({
        data: {
          name: "Super Admin",
          description: "Has access to all pages and features"
        }
      });
      console.log("Created the Super Admin role.");
    } else {
      console.log("Super Admin role already exists.");
    }

    // Check if the user already has the Super Admin role
    const existingUserRole = await prisma.userRole.findFirst({
      where: {
        userId: firstUser.id,
        roleId: superAdminRole.id
      }
    });

    if (existingUserRole) {
      console.log("The first user already has the Super Admin role.");
    } else {
      // Assign the Super Admin role to the user
      await prisma.userRole.create({
        data: {
          userId: firstUser.id,
          roleId: superAdminRole.id
        }
      });
      console.log("Assigned the Super Admin role to the first user.");
    }

    console.log("Operation completed successfully.");
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
makeFirstUserSuperUser()
  .then(() => {
    console.log("Script execution completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script execution failed:", error);
    process.exit(1);
  });