import { execSync } from 'child_process';

/**
 * Script to check if all migrations have been deployed
 * 
 * This script runs `prisma migrate status` and parses the output to determine
 * if there are any pending migrations. It exits with a non-zero status code
 * if there are pending migrations, making it suitable for CI/CD pipelines.
 */

try {
  // Run prisma migrate status and capture the output
  const output = execSync('npx prisma migrate status', { encoding: 'utf8' });
  
  // Check if there are any pending migrations
  if (output.includes('Pending migrations:')) {
    console.error('❌ There are pending migrations that need to be applied.');
    console.error('Run `yarn migrate:deploy` or `npx prisma migrate deploy` to apply them.');
    console.log('\nMigration status:');
    console.log(output);
    process.exit(1);
  } else {
    console.log('✅ All migrations have been applied.');
    console.log('\nMigration status:');
    console.log(output);
    process.exit(0);
  }
} catch (error) {
  console.error('❌ Error checking migration status:', error);
  process.exit(1);
}