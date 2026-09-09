import { Environment } from '../constants/environment.enum.js';

type LogMeta = unknown[];

/**
 * Production-ready logging utility.
 */
export const logger = {
  info: (message: string, ...meta: LogMeta): void => {
    console.log(`💚 [INFO] [${new Date().toISOString()}] ${message}`, ...meta);
  },

  warn: (message: string, ...meta: LogMeta): void => {
    console.warn(`⚠️ [WARN] [${new Date().toISOString()}] ${message}`, ...meta);
  },

  error: (message: string, error?: unknown): void => {
    console.error(`💥 [ERROR] [${new Date().toISOString()}] ${message}`);
    if (error instanceof Error) {
      console.error(error.stack);
    } else if (error) {
      console.error(error);
    }
  },

  debug: (message: string, ...meta: LogMeta): void => {
    if (process.env.NODE_ENV !== Environment.PRODUCTION) {
      console.log(`🔍 [DEBUG] [${new Date().toISOString()}] ${message}`, ...meta);
    }
  },
};
