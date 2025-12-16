import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env';
import { logger } from './config/logger';
import { db } from '@media-intelligence/database';

// Import routes
import { healthRoutes } from './routes/health';
import { sourcesRoutes } from './routes/sources';
import { articlesRoutes } from './routes/articles';

export async function buildApp() {
  const fastify = Fastify({
    logger: logger,
  });

  // Register CORS
  await fastify.register(cors, {
    origin: true,
  });

  // Root route
  fastify.get('/', async () => {
    return {
      name: 'Media Intelligence Platform API',
      version: '1.0.0',
      status: 'running',
    };
  });

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(sourcesRoutes);
  await fastify.register(articlesRoutes);

  // Error handler
  fastify.setErrorHandler((error, request, reply) => {
    logger.error('Request error', {
      url: request.url,
      method: request.method,
      error: error.message,
      stack: error.stack,
    });

    reply.status(error.statusCode || 500).send({
      success: false,
      error: {
        message: error.message || 'Internal Server Error',
        code: 'INTERNAL_ERROR',
      },
    });
  });

  return fastify;
}

export async function startServer() {
  try {
    // Connect to database
    logger.info('Connecting to database...');
    await db.connect({
      uri: env.MONGODB_URI,
    });

    // Build and start server
    const app = await buildApp();

    await app.listen({
      port: parseInt(env.PORT),
      host: env.HOST,
    });

    logger.info(`Server started on http://${env.HOST}:${env.PORT}`);

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down gracefully...`);

        try {
          await app.close();
          await db.disconnect();
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error });
          process.exit(1);
        }
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}
