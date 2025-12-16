import { startServer } from './app';
import { logger } from './config/logger';

// Import workers to start them
import './workers/scraperWorker';
import './workers/analyzerWorker';

logger.info('Starting Media Intelligence Platform API...');

startServer().catch((error) => {
  logger.error('Fatal error during startup', { error });
  process.exit(1);
});
