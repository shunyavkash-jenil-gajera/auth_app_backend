import type { Response, NextFunction } from 'express';
import { AppError } from '../utils/appError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../models/user.js';
import type { AuthenticatedRequest } from '../controllers/auth.controller.js';

/**
 * Authorization Guard Middleware.
 * Intercepts requests on protected endpoints, decodes the JWT access cookie,
 * checks token version validity, and attaches the user details to the request.
 */
export const protect = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Extract Access Token from cookies
    const token = req.cookies.accessToken;

    if (!token) {
      throw new AppError('You are not logged in. Please log in to get access.', 401);
    }

    // 2. Verify token signature and expiry
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      // Security hygiene: clear corrupted or expired token cookies immediately
      const clearOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/',
      };
      res.clearCookie('accessToken', clearOptions);
      throw new AppError('Invalid or expired authentication session', 401);
    }

    // 3. Retrieve user from the database, explicitly fetching the tokenVersion
    const currentUser = await User.findById(decoded.userId).select('+tokenVersion');

    if (!currentUser) {
      throw new AppError('The user belonging to this session no longer exists.', 401);
    }

    // 4. Verify token version matches user's current version (handles logout and RTR)
    if (currentUser.tokenVersion !== decoded.tokenVersion) {
      const clearOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/',
      };
      res.clearCookie('accessToken', clearOptions);
      res.clearCookie('refreshToken', clearOptions);
      throw new AppError('Session has expired. Please log in again.', 401);
    }

    // 5. Grant Access: Attach the verified credentials payload to the request
    req.user = {
      id: currentUser._id.toString(),
      tokenVersion: currentUser.tokenVersion,
    };

    next();
  } catch (err) {
    next(err);
  }
};
