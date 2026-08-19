import mongoose from 'mongoose';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

/** Establishes connection to MongoDB Atlas or local MongoDB instance. */
export const connectDB = async (): Promise<void> => {
  try {
    // Monitor database connection state events using our structured logger
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connection established successfully');
    });

    mongoose.connection.on('error', (err: Error) => {
      logger.error('MongoDB connection error', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection disconnected');
    });

    // Establish the connection
    await mongoose.connect(config.MONGO_URI);
  } catch (error) {
    logger.error('Failed to connect to MongoDB during startup', error);
    process.exit(1);
  }
};

/** Closes the MongoDB connection pool safely. */
export const closeDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed cleanly');
  } catch (error) {
    logger.error('Error closing MongoDB connection', error);
  }
};
