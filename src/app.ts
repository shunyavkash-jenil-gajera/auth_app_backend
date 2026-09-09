import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { config } from './config/env.js';
import { Environment } from './constants/environment.enum.js';
import { HttpStatus } from './constants/http-status.enum.js';

const app = express();

// 1. Security HTTP Headers
app.use(helmet());

// 2. Cross-Origin Resource Sharing
app.use(
  cors({
    origin: config.CLIENT_URL,
    credentials: true,
  })
);

// 3. Request Logging (Development only)
if (config.NODE_ENV === Environment.DEVELOPMENT) {
  app.use(morgan('dev'));
}

// 4. Request Body Parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// 5. Health Check Endpoint
app.get('/health', (_req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  if (!isDbConnected) {
    res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      status: 'error',
      message: 'Service Unavailable: Database connection is down',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(HttpStatus.OK).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
  });
});

// 6. API Routes
import authRouter from './routes/auth.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/dashboard', dashboardRouter);

// 7. Global Error Handling Middleware (Must be registered last)
import { globalErrorHandler } from './middleware/error.middleware.js';
app.use(globalErrorHandler);

export default app;
