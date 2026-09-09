import jwt from 'jsonwebtoken';
import type { CookieOptions } from 'express';
import { config } from '../config/env.js';
import { Environment } from '../constants/environment.enum.js';

export interface TokenPayload {
  userId: string;
  tokenVersion: number;
}

/**
 * Generates a short-lived access token (expires in 10 minutes).
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: '10m',
  });
};

/**
 * Generates a longer-lived refresh token (expires in 7 days).
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
};

/**
 * Verifies an access token signature and parses its payload.
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
 * Generates cookie configurations.
 */
export const getCookieOptions = (maxAgeMs: number): CookieOptions => {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === Environment.PRODUCTION,
    sameSite: 'strict',
    maxAge: maxAgeMs,
    path: '/',
  };
};

export const ACCESS_TOKEN_MAX_AGE = 10 * 60 * 1000;
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
