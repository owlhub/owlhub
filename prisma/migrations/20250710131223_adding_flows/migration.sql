/*
  Warnings:

  - Made the column `lastDetectedAt` on table `integration_finding_details` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "integration_finding_details" ALTER COLUMN "lastDetectedAt" SET NOT NULL;

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "token" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flows" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentFlowId" TEXT,
    "config" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_runs" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "webhookEventId" TEXT,
    "status" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "output" TEXT,
    "error" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_items" (
    "id" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "flowRunId" TEXT,
    "status" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queue_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_WebhookToFlow" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "webhooks_token_key" ON "webhooks"("token");

-- CreateIndex
CREATE INDEX "webhook_events_webhookId_idx" ON "webhook_events"("webhookId");

-- CreateIndex
CREATE INDEX "webhook_events_status_idx" ON "webhook_events"("status");

-- CreateIndex
CREATE INDEX "flows_parentFlowId_idx" ON "flows"("parentFlowId");

-- CreateIndex
CREATE INDEX "flow_runs_flowId_idx" ON "flow_runs"("flowId");

-- CreateIndex
CREATE INDEX "flow_runs_status_idx" ON "flow_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "queues_name_key" ON "queues"("name");

-- CreateIndex
CREATE INDEX "queue_items_queueId_idx" ON "queue_items"("queueId");

-- CreateIndex
CREATE INDEX "queue_items_flowId_idx" ON "queue_items"("flowId");

-- CreateIndex
CREATE INDEX "queue_items_status_idx" ON "queue_items"("status");

-- CreateIndex
CREATE UNIQUE INDEX "_WebhookToFlow_AB_unique" ON "_WebhookToFlow"("A", "B");

-- CreateIndex
CREATE INDEX "_WebhookToFlow_B_index" ON "_WebhookToFlow"("B");

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flows" ADD CONSTRAINT "flows_parentFlowId_fkey" FOREIGN KEY ("parentFlowId") REFERENCES "flows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_runs" ADD CONSTRAINT "flow_runs_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_runs" ADD CONSTRAINT "flow_runs_webhookEventId_fkey" FOREIGN KEY ("webhookEventId") REFERENCES "webhook_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_items" ADD CONSTRAINT "queue_items_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_items" ADD CONSTRAINT "queue_items_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_items" ADD CONSTRAINT "queue_items_flowRunId_fkey" FOREIGN KEY ("flowRunId") REFERENCES "flow_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WebhookToFlow" ADD CONSTRAINT "_WebhookToFlow_A_fkey" FOREIGN KEY ("A") REFERENCES "flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WebhookToFlow" ADD CONSTRAINT "_WebhookToFlow_B_fkey" FOREIGN KEY ("B") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
