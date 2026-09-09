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

// Validate and construct config object
export const config: Config = {
  NODE_ENV: (process.env.NODE_ENV as Environment) || Environment.DEVELOPMENT,
  PORT: parseInt(process.env.PORT || '8000', 10),
  MONGO_URI: getRequiredEnv('MONGO_URI'),
  JWT_SECRET: getRequiredEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET: getRequiredEnv('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};
