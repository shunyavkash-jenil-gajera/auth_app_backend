import type { Response, NextFunction } from 'express';
import { AppError } from '../utils/appError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { userRepository } from '../repositories/user.repository.js';
import { HttpStatus } from '../constants/http-status.enum.js';
import { Environment } from '../constants/environment.enum.js';
import type { AuthenticatedRequest } from '../controllers/auth.controller.js';

/**
 * Authorization Guard Middleware.
 */
export const protect = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      throw new AppError('Please sign in to access this page.', HttpStatus.UNAUTHORIZED);
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      const clearOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === Environment.PRODUCTION,
        sameSite: 'strict' as const,
        path: '/',
      };
      res.clearCookie('accessToken', clearOptions);
      throw new AppError(
        'Your session has expired. Please sign in again.',
        HttpStatus.UNAUTHORIZED
      );
    }

    // Use Repository Pattern for user lookup
    const currentUser = await userRepository.findByIdWithSessionKeys(decoded.userId);

    if (!currentUser) {
      throw new AppError(
        'The user belonging to this session no longer exists.',
        HttpStatus.UNAUTHORIZED
      );
    }

    if (currentUser.tokenVersion !== decoded.tokenVersion) {
      const clearOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === Environment.PRODUCTION,
        sameSite: 'strict' as const,
        path: '/',
      };
      res.clearCookie('accessToken', clearOptions);
      res.clearCookie('refreshToken', clearOptions);
      throw new AppError('Session has expired. Please log in again.', HttpStatus.UNAUTHORIZED);
    }

    req.user = {
      id: currentUser._id.toString(),
      tokenVersion: currentUser.tokenVersion,
    };

    next();
  } catch (err) {
    next(err);
  }
};
