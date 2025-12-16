import { FastifyInstance } from 'fastify';
import { ArticleModel, AnalysisResultModel } from '@media-intelligence/database';
import { normalizePagination, calculatePagination } from '@media-intelligence/shared';
import { logger } from '../config/logger';

export async function articlesRoutes(fastify: FastifyInstance) {
  // Get all articles with pagination
  fastify.get<{
    Querystring: {
      page?: string;
      limit?: string;
      sourceId?: string;
      status?: string;
    };
  }>('/articles', async (request, reply) => {
    try {
      const { page: pageStr, limit: limitStr, sourceId, status } = request.query;

      const { page, limit, skip } = normalizePagination({
        page: pageStr ? parseInt(pageStr) : undefined,
        limit: limitStr ? parseInt(limitStr) : undefined,
      });

      // Build query
      const query: any = {};
      if (sourceId) query.sourceId = sourceId;
      if (status) query.status = status;

      // Fetch articles
      const [articles, total] = await Promise.all([
        ArticleModel.find(query).sort({ publishedAt: -1 }).skip(skip).limit(limit).populate('sourceId'),
        ArticleModel.countDocuments(query),
      ]);

      return {
        success: true,
        data: articles,
        pagination: calculatePagination(total, page, limit),
      };
    } catch (error) {
      logger.error('Failed to fetch articles', { error });
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to fetch articles',
          code: 'FETCH_ERROR',
        },
      });
    }
  });

  // Get article by ID
  fastify.get<{ Params: { id: string } }>('/articles/:id', async (request, reply) => {
    try {
      const article = await ArticleModel.findById(request.params.id).populate('sourceId');

      if (!article) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Article not found',
            code: 'NOT_FOUND',
          },
        });
      }

      // Fetch analysis if available
      const analysis = await AnalysisResultModel.findOne({ articleId: article._id });

      return {
        success: true,
        data: {
          article,
          analysis,
        },
      };
    } catch (error) {
      logger.error('Failed to fetch article', { error, id: request.params.id });
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to fetch article',
          code: 'FETCH_ERROR',
        },
      });
    }
  });

  // Search articles
  fastify.get<{
    Querystring: {
      q: string;
      page?: string;
      limit?: string;
      startDate?: string;
      endDate?: string;
    };
  }>('/articles/search', async (request, reply) => {
    try {
      const { q, page: pageStr, limit: limitStr, startDate, endDate } = request.query;

      if (!q || q.trim().length === 0) {
        return reply.status(400).send({
          success: false,
          error: {
            message: 'Search query is required',
            code: 'INVALID_QUERY',
          },
        });
      }

      const { page, limit, skip } = normalizePagination({
        page: pageStr ? parseInt(pageStr) : undefined,
        limit: limitStr ? parseInt(limitStr) : undefined,
      });

      // Build query
      const query: any = {
        $text: { $search: q },
      };

      // Add date filters if provided
      if (startDate || endDate) {
        query.publishedAt = {};
        if (startDate) query.publishedAt.$gte = new Date(startDate);
        if (endDate) query.publishedAt.$lte = new Date(endDate);
      }

      // Fetch articles
      const [articles, total] = await Promise.all([
        ArticleModel.find(query)
          .sort({ score: { $meta: 'textScore' }, publishedAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('sourceId'),
        ArticleModel.countDocuments(query),
      ]);

      return {
        success: true,
        data: articles,
        pagination: calculatePagination(total, page, limit),
      };
    } catch (error) {
      logger.error('Failed to search articles', { error, query: request.query });
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to search articles',
          code: 'SEARCH_ERROR',
        },
      });
    }
  });

  // Get recent articles
  fastify.get<{
    Querystring: {
      hours?: string;
      limit?: string;
    };
  }>('/articles/recent', async (request, reply) => {
    try {
      const hours = request.query.hours ? parseInt(request.query.hours) : 24;
      const limit = request.query.limit ? parseInt(request.query.limit) : 50;

      const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

      const articles = await ArticleModel.find({
        publishedAt: { $gte: startDate },
      })
        .sort({ publishedAt: -1 })
        .limit(limit)
        .populate('sourceId');

      return {
        success: true,
        data: articles,
      };
    } catch (error) {
      logger.error('Failed to fetch recent articles', { error });
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to fetch recent articles',
          code: 'FETCH_ERROR',
        },
      });
    }
  });
}
