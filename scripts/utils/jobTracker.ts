import { PrismaClient } from '@prisma/client';

/**
 * Utility functions for tracking background job execution
 */

/**
 * Create a background job record
 * @param prisma Prisma client instance
 * @param name Name of the job
 * @param metadata Optional metadata about the job (JSON string)
 * @returns The created job record
 */
export async function createJobRecord(prisma: PrismaClient, name: string, metadata?: string) {
  return await prisma.backgroundJob.create({
    data: {
      name,
      status: 'running',
      metadata
    }
  });
}

/**
 * Update a background job record when the job completes
 * @param prisma Prisma client instance
 * @param jobId ID of the job record
 * @param status Status of the job ('completed' or 'failed')
 * @param error Error message if the job failed
 * @param metadata Optional updated metadata about the job (JSON string)
 */
export async function updateJobRecord(
  prisma: PrismaClient, 
  jobId: string, 
  status: 'completed' | 'failed', 
  error?: string,
  metadata?: string
) {
  await prisma.backgroundJob.update({
    where: { id: jobId },
    data: {
      status,
      endTime: new Date(),
      error,
      ...(metadata && { metadata })
    }
  });
}

/**
 * Track a job execution
 * @param prisma Prisma client instance
 * @param name Name of the job
 * @param jobFn The job function to execute
 * @param initialMetadata Optional initial metadata about the job (JSON string)
 * @returns The result of the job function
 */
export async function trackJob<T>(
  prisma: PrismaClient,
  name: string,
  jobFn: () => Promise<T>,
  initialMetadata?: string
): Promise<T> {
  const job = await createJobRecord(prisma, name, initialMetadata);
  console.log(`Created background job record with ID: ${job.id}`);
  
  try {
    const result = await jobFn();
    
    await updateJobRecord(prisma, job.id, 'completed');
    console.log(`Updated background job record ${job.id} as completed`);
    
    return result;
  } catch (error) {
    console.error(`Error in job ${name}:`, error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    await updateJobRecord(prisma, job.id, 'failed', errorMessage);
    console.log(`Updated background job record ${job.id} as failed`);
    
    throw error;
  }
}