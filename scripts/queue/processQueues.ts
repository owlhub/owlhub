import { PrismaClient } from '@prisma/client';
import { processQueue } from '../../src/lib/queue/processor';

const prisma = new PrismaClient();

/**
 * Process all active queues
 */
async function processQueues() {
  try {
    console.log('Starting queue processing...');

    // Create a background job record
    const job = await prisma.backgroundJob.create({
      data: {
        name: 'process-queues',
        status: 'running',
        metadata: JSON.stringify({
          startedAt: new Date().toISOString()
        })
      }
    });

    try {
      // Get all active queues
      const queues = await prisma.queue.findMany({
        where: {
          isEnabled: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      console.log(`Found ${queues.length} active queues`);

      // Process each queue
      const results = [];
      for (const queue of queues) {
        console.log(`Processing queue: ${queue.name}`);
        const processedCount = await processQueue(queue.name);
        results.push({
          queueId: queue.id,
          queueName: queue.name,
          processedCount
        });
      }

      // Update the job record
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          endTime: new Date(),
          metadata: JSON.stringify({
            startedAt: new Date(job.startTime).toISOString(),
            completedAt: new Date().toISOString(),
            results
          })
        }
      });

      console.log('Queue processing completed successfully');
      console.log('Results:', results);
    } catch (error) {
      // Update the job record with error
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          endTime: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
          metadata: JSON.stringify({
            startedAt: new Date(job.startTime).toISOString(),
            failedAt: new Date().toISOString()
          })
        }
      });

      console.error('Error processing queues:', error);
    }
  } catch (error) {
    console.error('Error in processQueues:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  processQueues()
    .then(() => {
      console.log('Queue processing script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Unhandled error in queue processing script:', error);
      process.exit(1);
    });
}

// Export the function for use in other scripts
export { processQueues };