import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
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
    algorithm: 'HS256',
    expiresIn: config.JWT_EXPIRES_IN as NonNullable<SignOptions['expiresIn']>,
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
  });
};

/**
 * Generates a longer-lived refresh token (expires in 7 days).
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    expiresIn: config.JWT_REFRESH_EXPIRES_IN as NonNullable<SignOptions['expiresIn']>,
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
  });
};

/**
 * Verifies an access token signature and parses its payload.
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
  }) as TokenPayload;
};

/**
 * Verifies a refresh token signature and parses its payload.
 */
export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.JWT_REFRESH_SECRET, {
    algorithms: ['HS256'],
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
  }) as TokenPayload;
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

const durationToMilliseconds = (duration: string): number => {
  const match = /^(\d+)\s*(ms|s|m|h|d|w|y)?$/i.exec(duration.trim());
  if (!match) throw new Error('JWT expiry must be a positive duration such as 10m or 7d');
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
    w: 604800000,
    y: 31536000000,
  };
  return Number(match[1]) * multipliers[match[2]?.toLowerCase() || 's']!;
};

export const ACCESS_TOKEN_MAX_AGE = durationToMilliseconds(config.JWT_EXPIRES_IN);
export const REFRESH_TOKEN_MAX_AGE = durationToMilliseconds(config.JWT_REFRESH_EXPIRES_IN);
