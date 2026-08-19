import { createServer } from 'http';
import { config } from './config/env.js';
import app from './app.js';
import { connectDB, closeDB } from './config/db.js';
import { logger } from './utils/logger.js';

// 1. Uncaught Exception Handler
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down process immediately...', err);
  process.exit(1);
});

const PORT = config.PORT;
const server = createServer(app);

const startServer = async () => {
  // Connect to MongoDB first
  await connectDB();

  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${config.NODE_ENV} mode`);
  });
};

startServer();

// 2. Unhandled Promise Rejection Handler
process.on('unhandledRejection', (err: unknown) => {
  logger.error('UNHANDLED REJECTION! Shutting down server gracefully...', err);
  
  // Close HTTP server, disconnect MongoDB, then exit
  server.close(async () => {
    await closeDB();
    process.exit(1);
  });
});

// 3. Graceful Shutdown on System Signals
process.on('SIGTERM', () => {
  logger.warn('SIGTERM signal received. Initiating graceful shutdown...');
  server.close(async () => {
    await closeDB();
    logger.info('Process terminated cleanly.');
  });
});
