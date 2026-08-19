import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { AppError } from '../utils/appError.js';
import SendResponse from '../utils/response.js';
import { getCookieOptions, ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE } from '../utils/jwt.js';

// Extend Express Request definition for token-authorized requests
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tokenVersion: number;
  };
}

/**
 * Register a new user profile.
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fullName, username, password } = req.body;

    // 1. Basic validation (express-validator will handle this in Step 14)
    if (!fullName || !username || !password) {
      throw new AppError('Full name, username, and password are required', 400);
    }

    // 2. Delegate to the Service Layer
    const newUser = await AuthService.registerUser({ fullName, username, password });

    // 3. Format response using your custom helper
    SendResponse(res, 201, true, 'User registered successfully', {
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        username: newUser.username,
        createdAt: newUser.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Login an existing user and deliver Access & Refresh JWTs via secure HttpOnly cookies.
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, password } = req.body;

    // 1. Basic validation
    if (!username || !password) {
      throw new AppError('Username and password are required', 400);
    }

    // 2. Authenticate user via service layer
    const user = await AuthService.loginUser({ username, password });

    // 3. Generate Access and Refresh tokens
    const { accessToken, refreshToken } = await AuthService.generateAuthTokens(user);

    // 4. Attach tokens as secure HttpOnly cookies (never in response body)
    res.cookie('accessToken', accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
    res.cookie('refreshToken', refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));

    // 5. Send successful login response
    SendResponse(res, 200, true, 'Login successful', {
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Logout user session.
 * Clears cookies on the client and invalidates tokens in the database.
 */
export const logout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // If request contains verified user (from auth guard), invalidate tokens in DB
    if (req.user) {
      await AuthService.logoutUser(req.user.id);
    }

    // Options matching the cookies we want to delete
    const clearOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
    };

    res.clearCookie('accessToken', clearOptions);
    res.clearCookie('refreshToken', clearOptions);

    SendResponse(res, 200, true, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Refresh access token using refresh token cookie.
 * Performs Refresh Token Rotation (RTR).
 */
export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      throw new AppError('No refresh token provided', 401);
    }

    try {
      // Execute rotation logic in the service layer
      const result = await AuthService.refreshSession(refreshToken);

      // Set rotated Access and Refresh tokens in cookies
      res.cookie('accessToken', result.accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
      res.cookie('refreshToken', result.refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));

      SendResponse(res, 200, true, 'Token refreshed successfully', {
        user: {
          id: result.user._id,
          fullName: result.user.fullName,
          username: result.user.username,
        },
      });
    } catch (err) {
      // Security measure: if refresh fails (compromised or expired), wipe cookies immediately
      const clearOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/',
      };
      res.clearCookie('accessToken', clearOptions);
      res.clearCookie('refreshToken', clearOptions);
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieve current user profile (protected profile endpoint).
 */
export const getMe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const user = await AuthService.getUserProfile(req.user.id);

    SendResponse(res, 200, true, 'User profile retrieved successfully', {
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};
