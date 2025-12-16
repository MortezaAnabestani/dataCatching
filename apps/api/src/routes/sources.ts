import { FastifyInstance } from 'fastify';
import { SourceModel } from '@media-intelligence/database';
import { SourceSchema, SourceType, SourceStatus } from '@media-intelligence/shared';
import { QueueService } from '../services/queue';
import { logger } from '../config/logger';

export async function sourcesRoutes(fastify: FastifyInstance) {
  // Get all sources
  fastify.get('/sources', async (request, reply) => {
    try {
      const sources = await SourceModel.find().sort({ createdAt: -1 });

      return {
        success: true,
        data: sources,
      };
    } catch (error) {
      logger.error('Failed to fetch sources', { error });
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to fetch sources',
          code: 'FETCH_ERROR',
        },
      });
    }
  });

  // Get source by ID
  fastify.get<{ Params: { id: string } }>('/sources/:id', async (request, reply) => {
    try {
      const source = await SourceModel.findById(request.params.id);

      if (!source) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Source not found',
            code: 'NOT_FOUND',
          },
        });
      }

      return {
        success: true,
        data: source,
      };
    } catch (error) {
      logger.error('Failed to fetch source', { error, id: request.params.id });
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to fetch source',
          code: 'FETCH_ERROR',
        },
      });
    }
  });

  // Create new source
  fastify.post<{ Body: any }>('/sources', async (request, reply) => {
    try {
      // Validate request body
      const validatedData = SourceSchema.parse(request.body);

      // Create source
      const source = await SourceModel.create(validatedData);

      logger.info('Source created', { sourceId: source._id, name: source.name });

      // Queue initial scrape
      await QueueService.addScraperJob(source._id.toString(), 10);

      return reply.status(201).send({
        success: true,
        data: source,
      });
    } catch (error) {
      logger.error('Failed to create source', { error });
      return reply.status(400).send({
        success: false,
        error: {
          message: 'Failed to create source',
          code: 'VALIDATION_ERROR',
          details: error,
        },
      });
    }
  });

  // Update source
  fastify.put<{ Params: { id: string }; Body: any }>('/sources/:id', async (request, reply) => {
    try {
      const source = await SourceModel.findByIdAndUpdate(request.params.id, request.body, {
        new: true,
        runValidators: true,
      });

      if (!source) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Source not found',
            code: 'NOT_FOUND',
          },
        });
      }

      logger.info('Source updated', { sourceId: source._id });

      return {
        success: true,
        data: source,
      };
    } catch (error) {
      logger.error('Failed to update source', { error, id: request.params.id });
      return reply.status(400).send({
        success: false,
        error: {
          message: 'Failed to update source',
          code: 'UPDATE_ERROR',
          details: error,
        },
      });
    }
  });

  // Delete source
  fastify.delete<{ Params: { id: string } }>('/sources/:id', async (request, reply) => {
    try {
      const source = await SourceModel.findByIdAndDelete(request.params.id);

      if (!source) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Source not found',
            code: 'NOT_FOUND',
          },
        });
      }

      logger.info('Source deleted', { sourceId: source._id });

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      logger.error('Failed to delete source', { error, id: request.params.id });
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to delete source',
          code: 'DELETE_ERROR',
        },
      });
    }
  });

  // Trigger scrape for a source
  fastify.post<{ Params: { id: string } }>('/sources/:id/scrape', async (request, reply) => {
    try {
      const source = await SourceModel.findById(request.params.id);

      if (!source) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Source not found',
            code: 'NOT_FOUND',
          },
        });
      }

      // Queue scrape job
      const job = await QueueService.addScraperJob(source._id.toString(), 10);

      logger.info('Scrape job queued', { sourceId: source._id, jobId: job.id });

      return {
        success: true,
        data: {
          jobId: job.id,
          sourceId: source._id,
        },
      };
    } catch (error) {
      logger.error('Failed to queue scrape job', { error, id: request.params.id });
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to queue scrape job',
          code: 'QUEUE_ERROR',
        },
      });
    }
  });
}
