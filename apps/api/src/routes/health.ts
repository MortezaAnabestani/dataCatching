import { FastifyInstance } from 'fastify';
import { db } from '@media-intelligence/database';
import { QueueService } from '../services/queue';

export async function healthRoutes(fastify: FastifyInstance) {
  // Health check
  fastify.get('/health', async (request, reply) => {
    try {
      const dbHealthy = db.isReady();
      const queueStats = await QueueService.getQueueStats();

      return {
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: dbHealthy ? 'healthy' : 'unhealthy',
          queues: queueStats,
        },
      };
    } catch (error) {
      return reply.status(503).send({
        success: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
      });
    }
  });

  // Queue statistics
  fastify.get('/queue/stats', async (request, reply) => {
    try {
      const stats = await QueueService.getQueueStats();

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to fetch queue stats',
          code: 'QUEUE_ERROR',
        },
      });
    }
  });
}
