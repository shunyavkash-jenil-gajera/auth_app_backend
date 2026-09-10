import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { AppError } from '../utils/appError.js';
import SendResponse from '../utils/response.js';
import { HttpStatus } from '../constants/http-status.enum.js';
import { UserMapper } from '../mappers/user.mapper.js';
import { getCookieOptions, ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE } from '../utils/jwt.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tokenVersion: number;
  };
}

/**
 * Controller: Register a new user profile.
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fullName, username, password } = req.body;

    if (!fullName || !username || !password) {
      throw new AppError('Full name, username, and password are required', HttpStatus.BAD_REQUEST);
    }

    const newUser = await authService.registerUser({ fullName, username, password });
    const { accessToken, refreshToken } = await authService.generateAuthTokens(newUser);

    // A newly registered user starts an authenticated session immediately.
    res.cookie('accessToken', accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
    res.cookie('refreshToken', refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));

    const userDto = UserMapper.toResponseDto(newUser);

    SendResponse(res, HttpStatus.CREATED, true, 'User registered successfully', { user: userDto });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Login user and set secure HttpOnly JWT cookies.
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new AppError('Username and password are required', HttpStatus.BAD_REQUEST);
    }

    const user = await authService.loginUser({ username, password });
    const { accessToken, refreshToken } = await authService.generateAuthTokens(user);

    // Set secure HttpOnly cookies
    res.cookie('accessToken', accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
    res.cookie('refreshToken', refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));

    const userDto = UserMapper.toResponseDto(user);

    SendResponse(res, HttpStatus.OK, true, 'Login successful', { user: userDto });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Logout user and invalidate session.
 */
export const logout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.user) {
      await authService.logoutUser(req.user.id);
    }

    const clearOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
    };

    res.clearCookie('accessToken', clearOptions);
    res.clearCookie('refreshToken', clearOptions);

    SendResponse(res, HttpStatus.OK, true, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Refresh access token via Refresh Token Rotation (RTR).
 */
export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      throw new AppError('No refresh token provided', HttpStatus.UNAUTHORIZED);
    }

    try {
      const result = await authService.refreshSession(refreshToken);

      res.cookie('accessToken', result.accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
      res.cookie('refreshToken', result.refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));

      const userDto = UserMapper.toResponseDto(result.user);

      SendResponse(res, HttpStatus.OK, true, 'Token refreshed successfully', { user: userDto });
    } catch (err) {
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
