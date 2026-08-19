import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

/**
 * Formats and sends verbose error details for local development environments.
 */
const sendErrorDev = (err: any, res: Response): void => {
  res.status(err.statusCode || 500).json({
    code: err.statusCode || 500,
    success: false,
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

/**
 * Formats and sends clean, restricted messages for production environments.
 * Prevents system details and database logs from leaking.
 */
const sendErrorProd = (err: any, res: Response): void => {
  // 1. Operational, trusted error: send user-friendly message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      code: err.statusCode,
      success: false,
      message: err.message,
    });
    return;
  }

  // 2. Unknown or programming error: don't leak details. Send general alert.
  logger.error('PRODUCTION PROGRAMMING ERROR:', err);
  
  res.status(500).json({
    code: 500,
    success: false,
    message: 'Something went wrong, please try again', // Exact string required by Spec pg 13
  });
};

/**
 * Translates Mongoose/MongoDB database validation errors into standard operational errors.
 */
const handleCastErrorDB = (err: any): AppError => {
  return new AppError(`Invalid value for path: ${err.path}`, 400);
};

const handleDuplicateKeyErrorDB = (): AppError => {
  // The only unique constraint in our design doc is username
  return new AppError('Username already exists', 409); // Required by Spec pg 13
};

const handleValidationErrorDB = (err: any): AppError => {
  const errors = Object.values(err.errors).map((el: any) => el.message);
  return new AppError(`Validation failure: ${errors.join('. ')}`, 422);
};

const handleJWTError = (): AppError => {
  return new AppError('Invalid token. Please log in again.', 401);
};

const handleJWTExpiredError = (): AppError => {
  return new AppError('Session expired. Please log in again.', 401);
};

/**
 * Express Global Error Handling Middleware.
 */
export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (config.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.isOperational = err.isOperational;
    error.statusCode = err.statusCode;

    // Handle database/MongoDB specific failures cleanly
    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateKeyErrorDB();
    if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};
