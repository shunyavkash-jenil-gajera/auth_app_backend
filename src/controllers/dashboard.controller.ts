import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.controller.js';
import { authService } from '../services/auth.service.js';
import SendResponse from '../utils/response.js';
import { AppError } from '../utils/appError.js';
import { HttpStatus } from '../constants/http-status.enum.js';
import { UserMapper } from '../mappers/user.mapper.js';

/**
 * Controller: Retrieve dashboard data for authenticated user.
 */
export const getDashboardData = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', HttpStatus.UNAUTHORIZED);
    }

    const user = await authService.getUserProfile(req.user.id);
    const dashboardDto = UserMapper.toDashboardDto(user);

    SendResponse(res, HttpStatus.OK, true, 'Dashboard data retrieved successfully', dashboardDto);
  } catch (err) {
    next(err);
  }
};
