# Scripts

This directory contains utility scripts for managing the application.

## Make First User Super User

The `makeFirstUserSuperUser.ts` script is designed to make the first user in the database a super user. This is useful in scenarios where the first user was created but was not automatically made a super user.

### What the script does:

1. Finds the first user in the database (based on the earliest `createdAt` timestamp)
2. Updates the user to set `isSuperUser` to `true`
3. Finds or creates the "Super Admin" role
4. Assigns the "Super Admin" role to the user if they don't already have it

### How to run the script:

```bash
# Install dependencies first if you haven't already
npm install

# Run the script
npm run make-first-user-super-user
```

> **Note:** The script uses `npx` to run `ts-node`, ensuring it works even if `ts-node` is not installed globally.

### Expected output:

If the script runs successfully, you should see output similar to:

```
Finding the first user...
Found first user: user@example.com (clg3a5x9c0000qw3a5x9c0000)
Updated the first user to be a super user.
Super Admin role already exists.
Assigned the Super Admin role to the first user.
Operation completed successfully.
Script execution completed.
```

If the user is already a super user, you'll see:

```
Finding the first user...
Found first user: user@example.com (clg3a5x9c0000qw3a5x9c0000)
The first user is already a super user.
Super Admin role already exists.
The first user already has the Super Admin role.
Operation completed successfully.
Script execution completed.
```

### Troubleshooting:

If you encounter any errors, check the following:

1. Make sure your database is properly set up and accessible
2. Ensure you have the necessary permissions to update the database
3. Check that the Prisma schema matches your database schema
4. Verify that there is at least one user in the database
5. If you see a "ts-node: command not found" error, make sure you're using the updated script that includes `npx` or install ts-node globally with `npm install -g ts-node`
6. If you see an error about "Unknown file extension '.ts'", this is related to module resolution in an ESM context. The script command in package.json uses a separate TypeScript configuration file (`tsconfig.scripts.json`) that is specifically set up for CommonJS module resolution. This ensures that ts-node can properly process TypeScript files regardless of the main project's module system.
