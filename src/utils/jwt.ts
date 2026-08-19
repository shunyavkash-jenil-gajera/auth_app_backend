import jwt from 'jsonwebtoken';
import type { CookieOptions } from 'express';
import { config } from '../config/env.js';

export interface TokenPayload {
  userId: string;
  tokenVersion: number;
}

/**
 * Generates a short-lived access token (expires in 10 minutes).
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: '10m', // 10 minutes as per design doc pg 4
  });
};

/**
 * Generates a longer-lived refresh token (expires in 7 days).
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: '7d', // 7 days as per design doc pg 4
  });
};

/**
Verifies an access token signature and parses its payload.
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
};

/**
 * Verifies a refresh token signature and parses its payload.
 */
export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.JWT_REFRESH_SECRET) as TokenPayload;
};

/**
 * Generates cookie configurations matching the security specifications:
 * HttpOnly, Secure, SameSite=Strict.
 */
export const getCookieOptions = (maxAgeMs: number): CookieOptions => {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === 'production', // Enforce secure HTTPS in production
    sameSite: 'strict', // Protects against CSRF attacks
    maxAge: maxAgeMs,
    path: '/', // Ensure cookie is accessible across the entire application domain
  };
};

// Access token cookie maximum lifetime is 10 minutes in ms
export const ACCESS_TOKEN_MAX_AGE = 10 * 60 * 1000;
// Refresh token cookie maximum lifetime is 7 days in ms
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
