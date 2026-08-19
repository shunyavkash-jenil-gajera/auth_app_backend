import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.controller.js';
import { AuthService } from '../services/auth.service.js';
import SendResponse from '../utils/response.js';
import { AppError } from '../utils/appError.js';

/**
 * Retrieve welcome data for the authenticated user's dashboard.
 */
export const getDashboardData = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    // Load active user profile details
    const user = await AuthService.getUserProfile(req.user.id);

    // Return exact welcome payload properties required by UI pg 14
    SendResponse(
      res,
      200,
      true,
      'Dashboard data retrieved successfully',
      {
        fullName: user.fullName,
        username: user.username,
      }
    );
  } catch (err) {
    next(err);
  }
};
