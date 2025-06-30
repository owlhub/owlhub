# OwlHub

A [Next.js](https://nextjs.org) application with OIDC authentication, role-based access control, and external service integrations.

## Features

- **OIDC Authentication**: Secure login using OpenID Connect
- **Role-Based Access Control**: Granular permissions for different pages
- **Protected Routes**: All pages are protected after login
- **Super User**: First user is automatically assigned super user privileges
- **Integrations Management**: Connect and configure external services and applications
- **User Management**: Administer users and their roles
- **Modern UI**: Built with TailwindCSS and FontAwesome icons

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- PostgreSQL 12.x or later
- This project uses cutting-edge versions:
  - React 19.0.0
  - Next.js 15.3.4
  - TailwindCSS 4
  - NextAuth.js 5.0.0-beta.4
  - Prisma ORM 5.0.0

### Running with Docker Compose

The easiest way to run the application locally is using Docker Compose, which will automatically set up the database, run migrations, and seed the database.

#### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

#### Steps

1. Clone the repository
2. Start the application using Docker Compose:

```bash
docker-compose up
```

This command will:
- Build the application image
- Start a PostgreSQL database
- Run database migrations automatically
- Seed the database with initial data
- Start the application server

3. Access the application at [http://localhost:3000](http://localhost:3000)

To stop the application, press `Ctrl+C` in the terminal where Docker Compose is running, or run:

```bash
docker-compose down
```

To remove all data volumes and start fresh:

```bash
docker-compose down -v
```

### Manual Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up environment variables by copying `.env` and filling in the values:

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-at-least-32-chars-long

OIDC_ISSUER=https://your-oidc-provider.com
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret

DATABASE_URL="postgresql://username:password@localhost:5432/owlhub"

# AWS Credentials (required for AWS integrations)
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
```

4. Initialize the database:

```bash
npx prisma migrate dev --name init
```

5. Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Authentication and Authorization

### Authentication Flow

1. All pages are protected by the middleware
2. Unauthenticated users are redirected to the login page
3. The login page redirects to the OIDC provider
4. After successful authentication, users are redirected back to the application
5. The first user to sign in is automatically assigned super user privileges

### Authorization System

#### Roles

- Roles are created in the database
- Each user can be assigned multiple roles
- The first user is automatically assigned the "Super Admin" role

#### Pages

- Each page can be associated with specific roles
- Users can only access pages if they have at least one of the required roles
- Super users have access to all pages

#### Managing Roles and Permissions

Super users can manage roles and permissions through the admin interface:

1. Create new roles
2. Assign roles to users
3. Define which roles have access to which pages

### Making the First User a Super User

If the first user was not automatically made a super user during creation, you can use the provided script to make them a super user:

```bash
# Install dependencies first if you haven't already
npm install

# Run the script
npm run make-first-user-super-user
```

> **Note:** The script uses `npx` to run `ts-node`, ensuring it works even if `ts-node` is not installed globally.

This script will:
1. Find the first user in the database (based on the earliest creation date)
2. Make them a super user
3. Assign them the "Super Admin" role

For more details, see the [script documentation](scripts/README-makeFirstUserSuperUser.md).

## Project Structure

- `prisma/schema.prisma`: Database schema definition
  - Contains models for User, Integration, AppType, SecurityFinding, and IntegrationMembership
  - IntegrationMembership tracks users found in specific integrations
- `src/lib/prisma.ts`: Prisma client initialization
- `auth.config.ts`: NextAuth.js configuration
- `auth.ts`: Authentication utilities
- `middleware.ts`: Route protection middleware
- `src/app/login/page.tsx`: Login page
- `src/app/unauthorized/page.tsx`: Unauthorized access page
- `src/app/admin/page.tsx`: Example protected admin page
- `src/app/integrations/`: Integrations management
  - `page.tsx`: Main integrations listing and management page
  - `new/page.tsx`: Page for adding new integrations
- `src/app/roles/`: Role management pages
- `src/app/users/`: User management pages
- `src/app/api/`: API endpoints for various features
  - `auth/`: Authentication endpoints
  - `integrations/`: Integrations API
  - `apps/`: App types API
- `src/scripts/`: Utility scripts for managing the application
  - `makeFirstUserSuperUser.ts`: Script to make the first user a super user
- `scripts/`: Background scripts for automated tasks
  - `fetchSecurityFindings.ts`: Script to fetch security findings from GitLab
  - `run-security-scan.sh`: Shell script wrapper for running the security scan
- `public/app-icons/`: SVG icons for app types
- `src/components/`: Reusable components
  - `AppIcon.tsx`: Component for displaying app icons
  - `Popup.tsx`: Modal dialog component

## Development

### Database Schema and Models

The application uses Prisma ORM with PostgreSQL as the database provider. The following key models are defined in the schema:

- **User**: Represents a user in the system
- **Integration**: Represents a connection to an external service
- **AppType**: Defines the type of external service (e.g., GitLab, Jira)
- **SecurityFinding**: Stores security vulnerabilities found in integrations
- **IntegrationMembership**: Tracks users found in specific integrations
  - Links users to the integrations they belong to
  - Stores additional information about the user in that integration
  - Used by the security findings script to track which users are found in which integrations

#### Integration Membership

The `IntegrationMembership` model is used to track users found in specific integrations. It has the following fields:

- `integrationId`: The ID of the integration
- `appTypeId`: The ID of the app type
- `userId`: The ID of the user
- `config`: JSON string containing additional information about the user in that integration
  - For GitLab, this includes the GitLab user ID, username, state, and web URL

This model is populated by the `fetchSecurityFindings.ts` script when it finds users in GitLab integrations.

### Database Setup

#### PostgreSQL Setup

This project uses PostgreSQL as the database provider. You'll need to create a database and user before running the application:

```sql
CREATE DATABASE owlhub;
CREATE USER owlhub_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE owlhub TO owlhub_user;
ALTER USER owlhub_user CREATEDB;
```

Replace `'your_password'` with a secure password and update your `.env` file with the correct connection string.

#### Database Migrations

When making changes to the database schema in `prisma/schema.prisma`, you need to create and apply a migration. The project includes several scripts to simplify this process:

```bash
# Complete migration workflow: create migration, deploy it, and seed the database
npm run migrate

# Create a new migration with a custom name
npm run migrate:create your_migration_name

# Deploy existing migrations without creating new ones
npm run migrate:deploy

# Reset the database and reapply all migrations
npm run migrate:reset

# Run only the seed script to populate the database with initial data
npm run seed

# Check if all migrations have been deployed
npm run migrate:check
```

The `migrate:check` command is particularly useful in CI/CD pipelines to ensure all migrations have been deployed before deploying the application. It will exit with a non-zero status code if there are pending migrations.

You can also use the Prisma CLI directly:

```bash
# Create a new migration with a descriptive name
npx prisma migrate dev --name your_migration_name

# This will:
# 1. Generate a new migration file in prisma/migrations
# 2. Apply the migration to your database
# 3. Regenerate the Prisma client
```

### Background Scripts

The application includes background scripts for automated tasks:

#### Security Findings Script

The `fetchSecurityFindings.ts` script is used to fetch security findings and users from GitLab integrations:

- Located in the `scripts/` directory
- Runs periodically to scan all enabled GitLab integrations
- Fetches users from each GitLab instance
- Adds users to the database if they don't already exist
- Records user membership in the `IntegrationMembership` table
- Fetches security vulnerabilities (currently commented out)
- Can be run manually using the `run-security-scan.sh` shell script

To run the script manually:

```bash
./scripts/run-security-scan.sh
```

The script logs its output to `logs/security-scan.log`.

### UI Components

#### App Icons

The application uses SVG icons for app types in the integrations pages. These icons are stored in the `public/app-icons/` directory and are named after the app type (e.g., `gitlab.svg`, `jira.svg`).

#### FontAwesome Icons

The project uses FontAwesome for general UI icons. The following FontAwesome packages are included:

- `@fortawesome/fontawesome-svg-core`
- `@fortawesome/free-solid-svg-icons`
- `@fortawesome/free-regular-svg-icons`
- `@fortawesome/free-brands-svg-icons`
- `@fortawesome/react-fontawesome`

To use FontAwesome icons in your components:

```tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';

// In your component:
<FontAwesomeIcon icon={faUser} className="mr-2" />
```

#### TailwindCSS

The project uses TailwindCSS v4 for styling. Utility classes are used throughout the components for consistent styling.

#### Adding a New App Icon

1. Create an SVG file for the app type and save it in the `public/app-icons/` directory
2. Name the file after the app type, using lowercase (e.g., `github.svg`)
3. In the database, set the `icon` field of the AppType to the name of the icon file without the extension (e.g., `github`)

#### Using the AppIcon Component

The `AppIcon` component is used to display app icons in the UI:

```tsx
import AppIcon from "@/src/components/AppIcon";

// In your component:
<AppIcon iconName="gitlab" size={36} className="mr-3" />
```

The component will automatically load the SVG file from the `public/app-icons/` directory and display it. If the icon file is not found, it will display a fallback icon.

### Integrations Management

The application includes a comprehensive integrations management system that allows users to connect and configure external services:

#### Features

- **List Integrations**: View all configured integrations
- **Add New Integrations**: Connect to new external services
- **Enable/Disable Integrations**: Toggle the active status of integrations
- **Configure Integrations**: Update connection settings and credentials
- **Delete Integrations**: Remove unwanted integrations

#### Integration Types

Each integration is associated with an app type that defines:
- Name and icon
- Required configuration fields
- Field types (text, password, etc.)
- Validation rules

#### Managing Integrations

To add a new integration:
1. Navigate to the Integrations page
2. Click "Add New Integration"
3. Select an app type
4. Fill in the required configuration fields
5. Save the integration

To update an existing integration:
1. Find the integration in the list
2. Use the menu to select "Configure"
3. Update the configuration fields
4. Save the changes

### Adding a New Protected Page

1. Create a new page in the `src/app` directory
2. The middleware will automatically protect it
3. Super users need to assign roles to the page for other users to access it

### Creating a New Role

Super users can create new roles through the admin interface or directly in the database:

```typescript
import { prisma } from "@/src/lib/prisma";

await prisma.role.create({
  data: {
    name: "Editor",
    description: "Can edit content",
  },
});
```

### Assigning a Role to a User

```typescript
import { prisma } from "@/src/lib/prisma";

await prisma.userRole.create({
  data: {
    userId: "user-id",
    roleId: "role-id",
  },
});
```

### Assigning a Role to a Page

```typescript
import { prisma } from "@/src/lib/prisma";

await prisma.pageRole.create({
  data: {
    pageId: "page-id",
    roleId: "role-id",
  },
});
```

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [NextAuth.js Documentation](https://next-auth.js.org/getting-started/introduction) - learn about NextAuth.js authentication.
- [Prisma Documentation](https://www.prisma.io/docs) - learn about Prisma ORM.

## Upcoming Features and Improvements

OwlHub is continuously evolving with new features and improvements planned for future releases:

### Enhanced Security Scanning

- **AWS Security Scanning**: Expanded security scanning for AWS resources including:
  - Detection of IAM users with access keys not rotated for more than 90 days
  - Identification of security vulnerabilities in AWS configurations
  - Comprehensive security posture assessment

- **GitLab Security Scanning**: Enhanced security scanning for GitLab repositories including:
  - Vulnerability detection in code repositories
  - User access management and monitoring
  - Integration with GitLab's security features

### New Integrations

- **GitHub Integration**: Connect and monitor GitHub repositories
  - User management
  - Repository scanning
  - Security vulnerability detection

- **Microsoft 365 Integration**: Connect and monitor Microsoft 365 resources
  - User management
  - Security configuration assessment
  - Compliance monitoring

- **Slack Integration**: Notifications and alerts through Slack
  - Real-time security alerts
  - Integration status updates
  - User-friendly notifications

### Platform Improvements

- **Enhanced Dashboard**: Improved visualization of security findings
  - Customizable widgets
  - Interactive charts and graphs
  - Filtering and sorting options

- **Reporting System**: Comprehensive reporting capabilities
  - Scheduled reports
  - Exportable formats (PDF, CSV)
  - Customizable report templates

- **API Enhancements**: Expanded API capabilities
  - More endpoints for integration management
  - Improved documentation
  - Authentication and authorization improvements

## Deployment

### CI/CD Integration

The project includes a GitHub Actions workflow file (`.github/workflows/check-migrations.yml`) that demonstrates how to use the `migrate:check` script in a CI/CD pipeline:

```yaml
name: Check Database Migrations

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  check-migrations:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'yarn'

    - name: Install dependencies
      run: yarn install --frozen-lockfile

    - name: Generate Prisma Client
      run: npx prisma generate

    - name: Check migrations
      run: yarn migrate:check
      # This will fail the workflow if there are pending migrations
```

This workflow runs on pushes to main/master branches, pull requests to main/master branches, and can be triggered manually. It checks if all migrations have been deployed and fails the workflow if there are pending migrations.

### Docker Deployment

The application includes a Dockerfile for containerized deployment. The Docker image is automatically built and pushed to GitHub Container Registry (GHCR) using GitHub Actions.

#### Using the Docker Image

You can pull the latest Docker image from GHCR:

```bash
docker pull ghcr.io/[your-github-username]/owlhub:latest
```

To run the container:

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://username:password@host:5432/owlhub" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  -e NEXTAUTH_SECRET="your-secret-key" \
  -e OIDC_ISSUER="https://your-oidc-provider.com" \
  -e OIDC_CLIENT_ID="your-client-id" \
  -e OIDC_CLIENT_SECRET="your-client-secret" \
  ghcr.io/[your-github-username]/owlhub:latest
```

### Deploying to Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fowlhub%2Fowlhub)

> **Note**: The build script in package.json includes `prisma generate` to ensure that the Prisma Client is properly generated during the Vercel build process. This is necessary because Vercel caches dependencies, which can lead to an outdated Prisma Client if the generation step is not explicitly included.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
