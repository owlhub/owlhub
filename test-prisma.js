const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAppTypeQuery() {
  try {
    // Get the first app type from the database
    const appType = await prisma.appType.findFirst({
      include: {
        securityFindings: true,
        actions: true
      }
    });

    console.log("AppType query successful!");
    console.log("AppType:", {
      id: appType?.id,
      name: appType?.name,
      securityFindingsCount: appType?.securityFindings?.length,
      actionsCount: appType?.actions?.length
    });
  } catch (error) {
    console.error("Error querying AppType:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testAppTypeQuery();