import dotenv from 'dotenv';
import { Environment } from '../constants/environment.enum.js';

// Load variables from .env file
dotenv.config();

// Define a strict TypeScript interface for our validated configurations
interface Config {
  NODE_ENV: Environment;
  PORT: number;
  MONGO_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  CLIENT_URL: string;
}

// Utility helper to guarantee required variables exist
const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`🔥 Configuration Error: Missing required environment variable "${key}"`);
  }
  return value;
};

const getEnvironment = (): Environment => {
  const value = process.env.NODE_ENV || Environment.DEVELOPMENT;
  if (!Object.values(Environment).includes(value as Environment)) {
    throw new Error('Configuration Error: NODE_ENV must be development, test, or production');
  }
  return value as Environment;
};

const getPort = (): number => {
  const value = Number(process.env.PORT || '8000');
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error('Configuration Error: PORT must be an integer between 1 and 65535');
  }
  return value;
};

const getMongoUri = (): string => {
  const value = getRequiredEnv('MONGO_URI');
  if (!/^mongodb(\+srv)?:\/\//.test(value)) {
    throw new Error('Configuration Error: MONGO_URI must use mongodb:// or mongodb+srv://');
  }
  return value;
};

const getSecret = (key: string): string => {
  const value = getRequiredEnv(key);
  const weakValues = new Set(['secret', 'changeme', 'change-me', 'default', 'password']);
  if (value.length < 32 || weakValues.has(value.toLowerCase())) {
    throw new Error(
      `Configuration Error: ${key} must be a strong secret of at least 32 characters`
    );
  }
  return value;
};

const getClientUrl = (environment: Environment): string => {
  const value = process.env.CLIENT_URL || 'http://localhost:5173';
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Configuration Error: CLIENT_URL must be a valid URL');
  }
  if (environment === Environment.PRODUCTION && parsed.protocol !== 'https:') {
    throw new Error('Configuration Error: CLIENT_URL must use HTTPS in production');
  }
  return parsed.origin;
};

// Validate and construct config object
const NODE_ENV = getEnvironment();
export const config: Config = {
  NODE_ENV,
  PORT: getPort(),
  MONGO_URI: getMongoUri(),
  JWT_SECRET: getSecret('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '10m',
  JWT_REFRESH_SECRET: getSecret('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  JWT_ISSUER: process.env.JWT_ISSUER || 'auth-app',
  JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'auth-app-client',
  CLIENT_URL: getClientUrl(NODE_ENV),
};
