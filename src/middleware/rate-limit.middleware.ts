import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

const message = (value: string) => ({ code: 429, success: false, message: value });

const loginKey = (req: Request): string => {
  const username =
    typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
  return `${ipKeyGenerator(req.ip ?? '')}:${username}`;
};

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Too many requests. Please try again later.'),
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: loginKey,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Too many login attempts. Please try again later.'),
});

export const registrationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Too many registration attempts. Please try again later.'),
});

export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Too many token refresh requests. Please try again later.'),
});
