-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isSuperUser" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_token" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_role" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_type" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "configFields" TEXT NOT NULL,
    "guide" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_finding" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "appTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "appTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "appTypeId" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_membership" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "appTypeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "config" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_security_finding" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "securityFindingId" TEXT NOT NULL,
    "activeCount" INTEGER NOT NULL DEFAULT 0,
    "hiddenCount" INTEGER NOT NULL DEFAULT 0,
    "lastDetectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_security_finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_security_finding_details" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "securityFindingId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "additionalInfo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_security_finding_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "account_provider_providerAccountId_key" ON "account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "session_sessionToken_key" ON "session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_token_token_key" ON "verification_token"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_token_identifier_token_key" ON "verification_token"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "role_name_key" ON "role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_userId_roleId_key" ON "user_role"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "page_path_key" ON "page"("path");

-- CreateIndex
CREATE UNIQUE INDEX "page_role_pageId_roleId_key" ON "page_role"("pageId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "app_type_name_key" ON "app_type"("name");

-- CreateIndex
CREATE UNIQUE INDEX "security_finding_key_key" ON "security_finding"("key");

-- CreateIndex
CREATE UNIQUE INDEX "integration_membership_integrationId_userId_key" ON "integration_membership"("integrationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_security_finding_integrationId_securityFindingI_key" ON "integration_security_finding"("integrationId", "securityFindingId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_security_finding_details_key_key" ON "integration_security_finding_details"("key");

-- CreateIndex
CREATE INDEX "integration_security_finding_details_integrationId_idx" ON "integration_security_finding_details"("integrationId");

-- CreateIndex
CREATE INDEX "integration_security_finding_details_securityFindingId_idx" ON "integration_security_finding_details"("securityFindingId");

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_role" ADD CONSTRAINT "page_role_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_role" ADD CONSTRAINT "page_role_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_finding" ADD CONSTRAINT "security_finding_appTypeId_fkey" FOREIGN KEY ("appTypeId") REFERENCES "app_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action" ADD CONSTRAINT "action_appTypeId_fkey" FOREIGN KEY ("appTypeId") REFERENCES "app_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration" ADD CONSTRAINT "integration_appTypeId_fkey" FOREIGN KEY ("appTypeId") REFERENCES "app_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_membership" ADD CONSTRAINT "integration_membership_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_membership" ADD CONSTRAINT "integration_membership_appTypeId_fkey" FOREIGN KEY ("appTypeId") REFERENCES "app_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_membership" ADD CONSTRAINT "integration_membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_security_finding" ADD CONSTRAINT "integration_security_finding_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_security_finding" ADD CONSTRAINT "integration_security_finding_securityFindingId_fkey" FOREIGN KEY ("securityFindingId") REFERENCES "security_finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_security_finding_details" ADD CONSTRAINT "integration_security_finding_details_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_security_finding_details" ADD CONSTRAINT "integration_security_finding_details_securityFindingId_fkey" FOREIGN KEY ("securityFindingId") REFERENCES "security_finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
