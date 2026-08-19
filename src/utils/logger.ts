type LogMeta = unknown[];

/**
 * Production-ready logging utility.
 * In a real-world enterprise setting, this could wrap libraries like Winston or Pino.
 * Here, we build a highly optimized native structure.
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
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔍 [DEBUG] [${new Date().toISOString()}] ${message}`, ...meta);
    }
  },
};
