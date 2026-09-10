import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';
import { HttpStatus } from '../constants/http-status.enum.js';
import { AppError } from '../utils/appError.js';

/** Cookie-authenticated state changes must come from the configured browser origin. */
export const requireTrustedOrigin = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.get('origin') !== config.CLIENT_URL) {
    next(new AppError('Request origin is not allowed', HttpStatus.FORBIDDEN));
    return;
  }
  next();
};
