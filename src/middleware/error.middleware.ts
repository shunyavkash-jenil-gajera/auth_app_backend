import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';
import { HttpStatus } from '../constants/http-status.enum.js';
import { Environment } from '../constants/environment.enum.js';

interface AppMiddlewareError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  code?: number;
  path?: string;
  errors?: Record<string, { message: string }>;
}

/**
 * Formats and sends verbose error details for development environment.
 */
const sendErrorDev = (err: AppMiddlewareError, res: Response): void => {
  const statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
  res.status(statusCode).json({
    code: statusCode,
    success: false,
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

/**
 * Formats and sends clean, restricted messages for production environment.
 */
const sendErrorProd = (err: AppMiddlewareError, res: Response): void => {
  if (err.isOperational) {
    res.status(err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: err.statusCode,
      success: false,
      message: err.message,
    });
    return;
  }

  logger.error('PRODUCTION PROGRAMMING ERROR:', err);

  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    code: HttpStatus.INTERNAL_SERVER_ERROR,
    success: false,
    message: 'Something went wrong, please try again',
  });
};

const handleCastErrorDB = (err: AppMiddlewareError): AppError => {
  return new AppError(`Invalid value for path: ${err.path}`, HttpStatus.BAD_REQUEST);
};

const handleDuplicateKeyErrorDB = (): AppError => {
  return new AppError('This username is already taken. Please choose another username.', HttpStatus.CONFLICT);
};

const handleValidationErrorDB = (err: AppMiddlewareError): AppError => {
  const errors = err.errors ? Object.values(err.errors).map((el) => el.message) : [];
  return new AppError(`Validation failure: ${errors.join('. ')}`, HttpStatus.UNPROCESSABLE_ENTITY);
};

const handleJWTError = (): AppError => {
  return new AppError('Invalid token. Please log in again.', HttpStatus.UNAUTHORIZED);
};

const handleJWTExpiredError = (): AppError => {
  return new AppError('Session expired. Please log in again.', HttpStatus.UNAUTHORIZED);
};

/**
 * Express Global Error Handling Middleware.
 */
export const globalErrorHandler = (
  err: AppMiddlewareError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  err.statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
  err.status = err.status || 'error';

  if (config.NODE_ENV === Environment.DEVELOPMENT) {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.isOperational = err.isOperational ?? false;
    error.statusCode = err.statusCode;

    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateKeyErrorDB();
    if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};
