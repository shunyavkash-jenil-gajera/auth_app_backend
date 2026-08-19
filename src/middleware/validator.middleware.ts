import type { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AppError } from '../utils/appError.js';

/**
 * Intercepts request validation results.
 * If any rules failed, extracts the first error and returns a 422 Unprocessable Entity.
 */
const validateRequest = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Extract the first error message to match the REST API spec format on page 13
    const firstErrorMessage = errors.array()[0]?.msg || 'Validation failed';
    throw new AppError(firstErrorMessage, 422); // Required by REST API spec pg 13
  }
  next();
};

/**
 * Validation schema chains for User Registration
 */
export const validateRegister = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Full name can only contain letters and spaces'),

  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters') // Exact message format pg 13
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),

  validateRequest,
];

/**
 * Validation schema chains for User Login
 */
export const validateLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  validateRequest,
];
